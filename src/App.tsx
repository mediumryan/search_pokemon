import React, { useState, useEffect, useRef } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchPokemonList,
  fetchPokemonByType,
  getTypeIdList,
  TYPE_MAP,
  getTypeEffectiveness,
} from './api/getData';
import type { PokemonData } from './api/getData';

const PAGE_SIZE = 100;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 10, // 10 minutes cache
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Pokedex />
    </QueryClientProvider>
  );
}

// ─────────────────────────────────────────────
// Sub-component: "All" mode – standard paginated list
// ─────────────────────────────────────────────
function AllModeGrid({
  searchQuery,
  onSelect,
}: {
  searchQuery: string;
  onSelect: (p: PokemonData) => void;
}) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['pokemonList'],
    queryFn: ({ pageParam = 0 }) =>
      fetchPokemonList(PAGE_SIZE, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
  });

  const allPokemon = data ? data.pages.flatMap((p) => p) : [];
  const filtered = allPokemon.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nameJa.includes(searchQuery) ||
      p.id.toString().includes(searchQuery),
  );

  return (
    <PokemonSection
      pokemon={filtered}
      isLoading={isLoading}
      isError={isError}
      error={error}
      isFetchingNextPage={isFetchingNextPage}
      hasNextPage={hasNextPage ?? false}
      onLoadMore={() => fetchNextPage()}
      onRetry={() => refetch()}
      onSelect={onSelect}
    />
  );
}

// ─────────────────────────────────────────────
// Sub-component: Type-filtered mode
// ─────────────────────────────────────────────
function TypeModeGrid({
  typeName,
  searchQuery,
  onSelect,
}: {
  typeName: string;
  searchQuery: string;
  onSelect: (p: PokemonData) => void;
}) {
  // Step 1: fetch the complete ID list for this type (lightweight, cached)
  const {
    data: typeIds,
    isLoading: isLoadingIds,
    isError: isErrorIds,
  } = useQuery({
    queryKey: ['typeIds', typeName],
    queryFn: () => getTypeIdList(typeName),
    staleTime: Infinity,
  });

  // Track how many pages we've loaded (offset pointer)
  const [offset, setOffset] = useState(0);
  const [loadedPokemon, setLoadedPokemon] = useState<PokemonData[]>([]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isLoadingFirst, setIsLoadingFirst] = useState(false);
  const [isError, setIsError] = useState(false);
  const prevTypeRef = useRef(typeName);

  // Reset when type changes
  useEffect(() => {
    if (prevTypeRef.current !== typeName) {
      prevTypeRef.current = typeName;
      setOffset(0);
      setLoadedPokemon([]);
      setIsError(false);
    }
  }, [typeName]);

  // Fetch first page once typeIds are available (or whenever reset occurs)
  useEffect(() => {
    if (!typeIds || typeIds.length === 0) return;
    if (loadedPokemon.length > 0) return; // already loaded

    let cancelled = false;
    setIsLoadingFirst(true);
    setIsError(false);

    fetchPokemonByType(typeIds, PAGE_SIZE, 0)
      .then((results) => {
        if (!cancelled) {
          setLoadedPokemon(results);
          setOffset(PAGE_SIZE);
          setIsLoadingFirst(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsError(true);
          setIsLoadingFirst(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeIds, typeName]);

  const handleLoadMore = async () => {
    if (!typeIds || isFetchingMore) return;
    setIsFetchingMore(true);
    try {
      const more = await fetchPokemonByType(typeIds, PAGE_SIZE, offset);
      setLoadedPokemon((prev) => [...prev, ...more]);
      setOffset((prev) => prev + PAGE_SIZE);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const hasNextPage = typeIds ? offset < typeIds.length : false;
  const combinedLoading = isLoadingIds || isLoadingFirst;

  const filtered = loadedPokemon.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nameJa.includes(searchQuery) ||
      p.id.toString().includes(searchQuery),
  );

  return (
    <PokemonSection
      pokemon={filtered}
      isLoading={combinedLoading}
      isError={isError || isErrorIds}
      error={null}
      isFetchingNextPage={isFetchingMore}
      hasNextPage={hasNextPage}
      onLoadMore={handleLoadMore}
      onRetry={() => {
        setLoadedPokemon([]);
        setOffset(0);
        setIsError(false);
      }}
      onSelect={onSelect}
    />
  );
}

// ─────────────────────────────────────────────
// Shared rendering component
// ─────────────────────────────────────────────
function PokemonSection({
  pokemon,
  isLoading,
  isError,
  error,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
  onRetry,
  onSelect,
}: {
  pokemon: PokemonData[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onSelect: (p: PokemonData) => void;
}) {
  const renderSkeletons = (count: number) =>
    Array.from({ length: count }).map((_, idx) => (
      <div
        key={`skeleton-${idx}`}
        className="relative h-[360px] bg-bg-card rounded-3xl border border-white/6 p-6 flex flex-col items-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent animate-shimmer" />
        <div className="w-28 h-28 rounded-full bg-white/5 mt-6 mb-6" />
        <div className="h-4 bg-white/5 rounded-md mb-3 w-2/3" />
        <div className="h-4 bg-white/5 rounded-md mb-3 w-1/2" />
        <div className="w-full flex flex-col gap-2 pt-4">
          <div className="h-3 bg-white/5 rounded-md w-[90%]" />
          <div className="h-3 bg-white/5 rounded-md w-[90%]" />
          <div className="h-3 bg-white/5 rounded-md w-[90%]" />
        </div>
      </div>
    ));

  if (isLoading)
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-12">
        {renderSkeletons(12)}
      </div>
    );

  if (isError)
    return (
      <div
        className="text-center py-12 px-6 bg-bg-secondary rounded-3xl border border-white/6 my-8"
        id="error-message"
      >
        <h2 className="text-2xl font-bold mb-2 text-gray-100">
          エラーが発生しました
        </h2>
        <p className="text-sm text-gray-400">
          {error instanceof Error
            ? error.message
            : 'データの読み込みに失敗しました。'}
        </p>
        <button
          className="mt-6 px-6 py-2.5 rounded-lg bg-accent-color text-white font-semibold cursor-pointer transition-all duration-300 hover:opacity-90"
          onClick={onRetry}
        >
          もう一度試す
        </button>
      </div>
    );

  if (pokemon.length === 0)
    return (
      <div
        className="text-center py-12 px-6 bg-bg-secondary rounded-3xl border border-white/6 my-8"
        id="empty-message"
      >
        <h2 className="text-2xl font-bold mb-2 text-gray-100">
          ポケモンが見つかりません
        </h2>
        <p className="text-sm text-gray-400">
          入力された検索条件に一致するポケモンが見つかりませんでした。
        </p>
      </div>
    );

  return (
    <>
      <div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-12"
        id="pokemon-grid-list"
      >
        {pokemon.map((p) => {
          const primaryType = p.types[0] || 'normal';
          const typeInfo = TYPE_MAP[primaryType] || {
            color: '#6366f1',
            glowColor: 'rgba(99,102,241,0.4)',
            nameJa: primaryType,
          };

          return (
            <motion.article
              key={p.id}
              id={`pokemon-card-${p.id}`}
              layoutId={`pokemon-card-${p.id}`}
              onClick={() => onSelect(p)}
              className="relative bg-bg-card rounded-3xl border border-white/6 p-6 flex flex-col items-center overflow-hidden cursor-pointer shadow-lg group pokemon-card-glow"
              style={
                {
                  '--card-type-color': typeInfo.color,
                  '--card-glow': `radial-gradient(circle, ${typeInfo.glowColor} 0%, transparent 65%)`,
                  '--card-glow-intense': `0 12px 30px ${typeInfo.glowColor}`,
                } as React.CSSProperties
              }
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <span className="absolute top-4 left-5 text-xs font-bold text-gray-500 tracking-wider z-10">
                No.{String(p.id).padStart(4, '0')}
              </span>

              <motion.div
                layoutId={`pokemon-image-${p.id}`}
                className="relative w-32 h-32 my-4 flex items-center justify-center z-10"
              >
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.nameJa}
                    className="w-full h-full object-contain filter drop-shadow-[0_8px_12px_rgba(0,0,0,0.15)] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-2"
                    loading="lazy"
                  />
                ) : (
                  <div className="text-gray-500 text-xs">No Image</div>
                )}
              </motion.div>

              <motion.h2
                layoutId={`pokemon-title-${p.id}`}
                className="text-xl font-bold mb-1 text-gray-100 text-center z-10"
              >
                {p.nameJa}
              </motion.h2>
              <span className="text-xs font-medium uppercase text-gray-500 mb-4 tracking-widest z-10">
                {p.name}
              </span>

              <div className="flex gap-2 mb-5 z-10">
                {p.types.map((typeKey) => {
                  const tInfo = TYPE_MAP[typeKey] || {
                    nameJa: typeKey,
                    color: '#788898',
                  };
                  return (
                    <span
                      key={typeKey}
                      className="px-3 py-1 rounded-md text-xs font-bold text-white shadow-sm"
                      style={{ backgroundColor: tInfo.color }}
                    >
                      {tInfo.nameJa}
                    </span>
                  );
                })}
              </div>

              <div className="w-full flex flex-col gap-2 border-t border-white/6 pt-4 z-10">
                {[
                  { label: 'HP', val: p.stats.hp },
                  { label: 'ATK', val: p.stats.attack },
                  { label: 'DEF', val: p.stats.defense },
                  { label: 'SPD', val: p.stats.speed },
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-center text-[11px]">
                    <span className="w-7 font-bold text-gray-500 uppercase">
                      {label}
                    </span>
                    <span className="w-6 text-right font-semibold text-gray-400 mr-2">
                      {val}
                    </span>
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--card-type-color)]"
                        style={{
                          width: `${Math.min(100, (val / 180) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.article>
          );
        })}

        {isFetchingNextPage && renderSkeletons(6)}
      </div>

      {hasNextPage && !isFetchingNextPage && (
        <div className="flex justify-center mb-12">
          <button
            id="btn-load-more"
            className="px-10 py-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-semibold text-base cursor-pointer transition-all duration-300 hover:bg-accent-color hover:text-white hover:shadow-[0_0_20px_var(--color-accent-color)] hover:-translate-y-0.5 active:translate-y-0"
            onClick={onLoadMore}
          >
            もっと見る（次の100匹）
          </button>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// Main Pokédex
// ─────────────────────────────────────────────
function Pokedex() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonData | null>(
    null,
  );

  useEffect(() => {
    document.body.style.overflow = selectedPokemon ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedPokemon]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col min-h-screen font-sans">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-300 via-indigo-500 to-indigo-600 bg-clip-text text-transparent mb-2 filter drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">
          ポケットモンスター 図鑑
        </h1>
        <p className="text-sm text-gray-400 font-normal tracking-widest uppercase">
          PokeAPI & React Powered Pokédex
        </p>
      </header>

      <main>
        {/* Controls */}
        <section className="flex flex-col gap-6 mb-12 bg-bg-secondary backdrop-blur-md border border-white/6 p-6 rounded-3xl shadow-2xl">
          <input
            id="pokemon-search-input"
            type="text"
            className="w-full px-6 py-4 rounded-xl border border-white/6 bg-black/50 text-gray-100 font-sans text-base transition-all duration-300 focus:outline-none focus:border-accent-color focus:shadow-[0_0_15px_var(--color-accent-color)] focus:bg-black/80"
            placeholder="ポケモンの名前(日本語/英語) または 図鑑番号を入力..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="flex flex-wrap gap-2 justify-center">
            {/* All button */}
            <button
              id="filter-type-all"
              className={`px-4 py-2 rounded-full border text-sm font-medium cursor-pointer transition-all duration-300 ${
                selectedType === 'all'
                  ? 'bg-accent-color text-white border-accent-color shadow-[0_0_10px_var(--color-accent-color)]'
                  : 'border-white/6 bg-white/3 text-gray-400 hover:bg-white/8 hover:text-gray-100 hover:border-white/20'
              }`}
              onClick={() => setSelectedType('all')}
            >
              すべて
            </button>

            {Object.entries(TYPE_MAP).map(([key, typeInfo]) => (
              <button
                key={key}
                id={`filter-type-${key}`}
                className={`px-4 py-2 rounded-full border text-sm font-medium cursor-pointer transition-all duration-300 ${
                  selectedType === key
                    ? 'text-white'
                    : 'border-white/6 bg-white/3 text-gray-400 hover:bg-white/8 hover:text-gray-100 hover:border-white/20'
                }`}
                onClick={() => setSelectedType(key)}
                style={{
                  backgroundColor:
                    selectedType === key ? typeInfo.color : undefined,
                  borderColor:
                    selectedType === key ? typeInfo.color : undefined,
                  boxShadow:
                    selectedType === key
                      ? `0 0 10px ${typeInfo.glowColor}`
                      : undefined,
                }}
              >
                {typeInfo.nameJa}
              </button>
            ))}
          </div>
        </section>

        {/* Grid – swap between two modes */}
        {selectedType === 'all' ? (
          <AllModeGrid
            searchQuery={searchQuery}
            onSelect={setSelectedPokemon}
          />
        ) : (
          <TypeModeGrid
            key={selectedType}
            typeName={selectedType}
            searchQuery={searchQuery}
            onSelect={setSelectedPokemon}
          />
        )}
      </main>

      {/* ── Dual-Panel Modal ── */}
      <AnimatePresence>
        {selectedPokemon &&
          (() => {
            const matchups = getTypeEffectiveness(selectedPokemon.types);
            const primaryType = selectedPokemon.types[0] || 'normal';
            const typeInfo = TYPE_MAP[primaryType] || {
              color: '#6366f1',
              glowColor: 'rgba(99,102,241,0.4)',
            };
            const cardStyle = {
              '--card-type-color': typeInfo.color,
              '--card-glow': `radial-gradient(circle, ${typeInfo.glowColor} 0%, transparent 65%)`,
              '--card-glow-intense': `0 12px 30px ${typeInfo.glowColor}`,
            } as React.CSSProperties;

            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/75 backdrop-blur-md">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-0"
                  onClick={() => setSelectedPokemon(null)}
                />

                <div className="relative flex flex-col md:flex-row gap-6 w-full max-w-4xl z-10 items-stretch my-8">
                  {/* Left: Detail Card */}
                  <motion.div
                    layoutId={`pokemon-card-${selectedPokemon.id}`}
                    className="relative w-full md:w-[430px] bg-bg-card rounded-3xl border border-white/10 p-8 flex flex-col items-center overflow-hidden shadow-2xl pokemon-card-glow shrink-0"
                    style={cardStyle}
                  >
                    <button
                      className="absolute top-4 right-4 p-2 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-20 cursor-pointer md:hidden"
                      onClick={() => setSelectedPokemon(null)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>

                    <span className="absolute top-4 left-5 text-sm font-bold text-gray-500 tracking-wider">
                      No.{String(selectedPokemon.id).padStart(4, '0')}
                    </span>

                    <motion.div
                      layoutId={`pokemon-image-${selectedPokemon.id}`}
                      className="relative w-40 h-40 my-3 flex items-center justify-center z-10"
                    >
                      {selectedPokemon.image && (
                        <img
                          src={selectedPokemon.image}
                          alt={selectedPokemon.nameJa}
                          className="w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.3)]"
                        />
                      )}
                    </motion.div>

                    <motion.h2
                      layoutId={`pokemon-title-${selectedPokemon.id}`}
                      className="text-3xl font-extrabold mb-1 text-gray-100 text-center z-10"
                    >
                      {selectedPokemon.nameJa}
                    </motion.h2>
                    <span className="text-sm font-semibold uppercase text-gray-500 mb-4 tracking-widest z-10">
                      {selectedPokemon.name}
                    </span>

                    <div className="flex gap-2 mb-4 z-10">
                      {selectedPokemon.types.map((typeKey) => {
                        const tInfo = TYPE_MAP[typeKey] || {
                          nameJa: typeKey,
                          color: '#788898',
                        };
                        return (
                          <span
                            key={typeKey}
                            className="px-4 py-1 rounded-md text-xs font-bold text-white shadow-md"
                            style={{ backgroundColor: tInfo.color }}
                          >
                            {tInfo.nameJa}
                          </span>
                        );
                      })}
                    </div>

                    <div className="flex gap-12 mb-4 py-2.5 px-8 rounded-2xl bg-white/3 border border-white/5 w-full justify-center z-10">
                      <div className="text-center">
                        <div className="text-[10px] text-gray-500 font-medium mb-0.5">
                          たかさ (Height)
                        </div>
                        <div className="text-sm font-bold text-gray-200">
                          {(selectedPokemon.height / 10).toFixed(1)} m
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-gray-500 font-medium mb-0.5">
                          おもさ (Weight)
                        </div>
                        <div className="text-sm font-bold text-gray-200">
                          {(selectedPokemon.weight / 10).toFixed(1)} kg
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed text-center mb-4 px-4 bg-white/2 p-3.5 rounded-2xl border border-white/4 w-full z-10">
                      {selectedPokemon.descriptionJa}
                    </p>

                    <div className="w-full flex flex-col gap-2 border-t border-white/6 pt-4 z-10">
                      {[
                        { label: 'HP', val: selectedPokemon.stats.hp },
                        {
                          label: 'こうげき',
                          val: selectedPokemon.stats.attack,
                        },
                        {
                          label: 'ぼうぎょ',
                          val: selectedPokemon.stats.defense,
                        },
                        { label: 'トクコウ', val: selectedPokemon.stats.spAtk },
                        { label: 'トクボウ', val: selectedPokemon.stats.spDef },
                        { label: 'すばやさ', val: selectedPokemon.stats.speed },
                      ].map(({ label, val }) => (
                        <div
                          key={label}
                          className="flex items-center text-[10px]"
                        >
                          <span className="w-16 font-bold text-gray-500">
                            {label}
                          </span>
                          <span className="w-8 text-right font-semibold text-gray-400 mr-3">
                            {val}
                          </span>
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.min(100, (val / 180) * 100)}%`,
                              }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                              className="h-full rounded-full bg-[var(--card-type-color)]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Right: Type Effectiveness */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                    className="relative w-full md:w-[430px] bg-bg-card rounded-3xl border border-white/10 p-8 flex flex-col overflow-hidden shadow-2xl pokemon-card-glow"
                    style={cardStyle}
                  >
                    <button
                      className="absolute top-4 right-4 p-2 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-20 cursor-pointer"
                      onClick={() => setSelectedPokemon(null)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>

                    <h3 className="text-xl font-extrabold text-gray-100 mb-1 z-10 flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-indigo-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                      タイプ相性
                    </h3>
                    <p className="text-[10px] text-gray-500 mb-6 uppercase tracking-wider z-10">
                      受けるダメージの倍率
                    </p>

                    <div className="flex flex-col gap-4 overflow-y-auto pr-1 flex-1 z-10 max-h-[50vh] md:max-h-[480px]">
                      {[
                        {
                          key: 'x4',
                          label: '弱点 4x',
                          sub: '効果はバツグン×2',
                          bg: 'bg-red-500/5',
                          border: 'border-red-500/10',
                          badge: 'bg-red-500',
                          text: 'text-red-300',
                          data: matchups.x4,
                        },
                        {
                          key: 'x2',
                          label: '弱点 2x',
                          sub: '効果はバツグン',
                          bg: 'bg-amber-500/5',
                          border: 'border-amber-500/10',
                          badge: 'bg-amber-500',
                          text: 'text-amber-300',
                          data: matchups.x2,
                        },
                        {
                          key: 'x05',
                          label: '耐性 0.5x',
                          sub: '効果はいまひとつ',
                          bg: 'bg-emerald-500/5',
                          border: 'border-emerald-500/10',
                          badge: 'bg-emerald-500',
                          text: 'text-emerald-300',
                          data: matchups.x05,
                        },
                        {
                          key: 'x025',
                          label: '耐性 0.25x',
                          sub: '効果はいまひとつ×2',
                          bg: 'bg-teal-500/5',
                          border: 'border-teal-500/10',
                          badge: 'bg-teal-600',
                          text: 'text-teal-300',
                          data: matchups.x025,
                        },
                        {
                          key: 'x0',
                          label: '無効 0x',
                          sub: '効果なし',
                          bg: 'bg-gray-500/5',
                          border: 'border-gray-500/10',
                          badge: 'bg-gray-600',
                          text: 'text-gray-300',
                          data: matchups.x0,
                        },
                      ]
                        .filter((g) => g.data.length > 0)
                        .map((g) => (
                          <div
                            key={g.key}
                            className={`${g.bg} border ${g.border} rounded-2xl p-4`}
                          >
                            <div className="flex items-center gap-2 mb-2.5">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${g.badge} text-white shadow-sm`}
                              >
                                {g.label}
                              </span>
                              <span className={`text-xs ${g.text} font-bold`}>
                                {g.sub}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {g.data.map((typeKey) => {
                                const tInfo = TYPE_MAP[typeKey] || {
                                  nameJa: typeKey,
                                  color: '#788898',
                                };
                                return (
                                  <span
                                    key={typeKey}
                                    className="px-3 py-1 rounded-md text-[11px] font-bold text-white shadow-sm"
                                    style={{ backgroundColor: tInfo.color }}
                                  >
                                    {tInfo.nameJa}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                    </div>
                  </motion.div>
                </div>
              </div>
            );
          })()}
      </AnimatePresence>
    </div>
  );
}
