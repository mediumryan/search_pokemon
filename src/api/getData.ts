import axios from 'axios';

const BASE_URL = 'https://pokeapi.co/api/v2/';

export interface PokemonTypeInfo {
  nameJa: string;
  color: string;
  bgGradient: string;
  glowColor: string;
}

export const TYPE_MAP: Record<string, PokemonTypeInfo> = {
  grass: {
    nameJa: 'くさ',
    color: '#78C850',
    bgGradient: 'linear-gradient(135deg, #78C850 0%, #5CA838 100%)',
    glowColor: 'rgba(120, 200, 80, 0.4)',
  },
  poison: {
    nameJa: 'どく',
    color: '#A040A0',
    bgGradient: 'linear-gradient(135deg, #A040A0 0%, #803080 100%)',
    glowColor: 'rgba(160, 64, 160, 0.4)',
  },
  fire: {
    nameJa: 'ほのお',
    color: '#F08030',
    bgGradient: 'linear-gradient(135deg, #F08030 0%, #DD6610 100%)',
    glowColor: 'rgba(240, 128, 48, 0.4)',
  },
  water: {
    nameJa: 'みず',
    color: '#6890F0',
    bgGradient: 'linear-gradient(135deg, #6890F0 0%, #4A72D0 100%)',
    glowColor: 'rgba(104, 144, 240, 0.4)',
  },
  bug: {
    nameJa: 'むし',
    color: '#A8B820',
    bgGradient: 'linear-gradient(135deg, #A8B820 0%, #889810 100%)',
    glowColor: 'rgba(168, 184, 32, 0.4)',
  },
  normal: {
    nameJa: 'ノーマル',
    color: '#A8A878',
    bgGradient: 'linear-gradient(135deg, #A8A878 0%, #888858 100%)',
    glowColor: 'rgba(168, 168, 120, 0.3)',
  },
  electric: {
    nameJa: 'でんき',
    color: '#F8D030',
    bgGradient: 'linear-gradient(135deg, #F8D030 0%, #D8B010 100%)',
    glowColor: 'rgba(248, 208, 48, 0.4)',
  },
  ground: {
    nameJa: 'じめん',
    color: '#E0C068',
    bgGradient: 'linear-gradient(135deg, #E0C068 0%, #C0A048 100%)',
    glowColor: 'rgba(224, 192, 104, 0.4)',
  },
  fairy: {
    nameJa: 'フェアリー',
    color: '#EE99AC',
    bgGradient: 'linear-gradient(135deg, #EE99AC 0%, #CD798C 100%)',
    glowColor: 'rgba(238, 153, 172, 0.4)',
  },
  fighting: {
    nameJa: 'かくとう',
    color: '#C03028',
    bgGradient: 'linear-gradient(135deg, #C03028 0%, #902018 100%)',
    glowColor: 'rgba(192, 48, 40, 0.4)',
  },
  psychic: {
    nameJa: 'エスパー',
    color: '#F85888',
    bgGradient: 'linear-gradient(135deg, #F85888 0%, #D83868 100%)',
    glowColor: 'rgba(248, 88, 136, 0.4)',
  },
  rock: {
    nameJa: 'いわ',
    color: '#B8A038',
    bgGradient: 'linear-gradient(135deg, #B8A038 0%, #988018 100%)',
    glowColor: 'rgba(184, 160, 56, 0.4)',
  },
  steel: {
    nameJa: 'はがね',
    color: '#B8B8D0',
    bgGradient: 'linear-gradient(135deg, #B8B8D0 0%, #9898B0 100%)',
    glowColor: 'rgba(184, 184, 208, 0.3)',
  },
  ice: {
    nameJa: 'こおり',
    color: '#98D8D8',
    bgGradient: 'linear-gradient(135deg, #98D8D8 0%, #78B8B8 100%)',
    glowColor: 'rgba(152, 216, 216, 0.4)',
  },
  ghost: {
    nameJa: 'ゴースト',
    color: '#705898',
    bgGradient: 'linear-gradient(135deg, #705898 0%, #503878 100%)',
    glowColor: 'rgba(112, 88, 152, 0.4)',
  },
  dragon: {
    nameJa: 'ドラゴン',
    color: '#7038F8',
    bgGradient: 'linear-gradient(135deg, #7038F8 0%, #5018D8 100%)',
    glowColor: 'rgba(112, 56, 248, 0.4)',
  },
  dark: {
    nameJa: 'あく',
    color: '#705848',
    bgGradient: 'linear-gradient(135deg, #705848 0%, #503828 100%)',
    glowColor: 'rgba(112, 88, 72, 0.4)',
  },
  flying: {
    nameJa: 'ひこう',
    color: '#A890F0',
    bgGradient: 'linear-gradient(135deg, #A890F0 0%, #8870D0 100%)',
    glowColor: 'rgba(168, 144, 240, 0.4)',
  },
};

export interface PokemonData {
  id: number;
  name: string;
  nameJa: string;
  descriptionJa: string;
  image: string;
  types: string[];
  height: number; // decimeters
  weight: number; // hectograms
  stats: {
    hp: number;
    attack: number;
    defense: number;
    spAtk: number;
    spDef: number;
    speed: number;
  };
}

export interface TypeMatchups {
  x4: string[];
  x2: string[];
  x05: string[];
  x025: string[];
  x0: string[];
}

const TYPE_MATCHUPS: Record<
  string,
  { weak: string[]; resistant: string[]; immune: string[] }
> = {
  normal: { weak: ['fighting'], resistant: [], immune: ['ghost'] },
  fire: {
    weak: ['water', 'ground', 'rock'],
    resistant: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'],
    immune: [],
  },
  water: {
    weak: ['grass', 'electric'],
    resistant: ['fire', 'water', 'ice', 'steel'],
    immune: [],
  },
  grass: {
    weak: ['fire', 'ice', 'poison', 'flying', 'bug'],
    resistant: ['water', 'grass', 'electric', 'ground'],
    immune: [],
  },
  electric: {
    weak: ['ground'],
    resistant: ['electric', 'flying', 'steel'],
    immune: [],
  },
  ice: {
    weak: ['fire', 'fighting', 'rock', 'steel'],
    resistant: ['ice'],
    immune: [],
  },
  fighting: {
    weak: ['flying', 'psychic', 'fairy'],
    resistant: ['bug', 'rock', 'dark'],
    immune: [],
  },
  poison: {
    weak: ['ground', 'psychic'],
    resistant: ['grass', 'fighting', 'poison', 'bug', 'fairy'],
    immune: [],
  },
  ground: {
    weak: ['water', 'grass', 'ice'],
    resistant: ['poison', 'rock'],
    immune: ['electric'],
  },
  flying: {
    weak: ['electric', 'ice', 'rock'],
    resistant: ['grass', 'fighting', 'bug'],
    immune: ['ground'],
  },
  psychic: {
    weak: ['bug', 'ghost', 'dark'],
    resistant: ['fighting', 'psychic'],
    immune: [],
  },
  bug: {
    weak: ['fire', 'flying', 'rock'],
    resistant: ['grass', 'fighting', 'ground'],
    immune: [],
  },
  rock: {
    weak: ['water', 'grass', 'fighting', 'ground', 'steel'],
    resistant: ['normal', 'fire', 'poison', 'flying'],
    immune: [],
  },
  ghost: {
    weak: ['ghost', 'dark'],
    resistant: ['poison', 'bug'],
    immune: ['normal', 'fighting'],
  },
  dragon: {
    weak: ['ice', 'dragon', 'fairy'],
    resistant: ['fire', 'water', 'grass', 'electric'],
    immune: [],
  },
  dark: {
    weak: ['fighting', 'bug', 'fairy'],
    resistant: ['ghost', 'dark'],
    immune: ['psychic'],
  },
  steel: {
    weak: ['fire', 'fighting', 'ground'],
    resistant: [
      'normal',
      'grass',
      'ice',
      'flying',
      'psychic',
      'bug',
      'rock',
      'dragon',
      'steel',
      'fairy',
    ],
    immune: ['poison'],
  },
  fairy: {
    weak: ['poison', 'steel'],
    resistant: ['fighting', 'bug', 'dark'],
    immune: ['dragon'],
  },
};

/**
 * Calculates defensive multipliers against all 18 types for the given pokemon types.
 */
export function getTypeEffectiveness(types: string[]): TypeMatchups {
  const multipliers: Record<string, number> = {};

  // Initialize all types with a 1.0 multiplier
  Object.keys(TYPE_MAP).forEach((type) => {
    multipliers[type] = 1.0;
  });

  // Calculate combined multipliers
  types.forEach((pokemonType) => {
    const matchups = TYPE_MATCHUPS[pokemonType];
    if (matchups) {
      matchups.weak.forEach((t) => {
        multipliers[t] *= 2.0;
      });
      matchups.resistant.forEach((t) => {
        multipliers[t] *= 0.5;
      });
      matchups.immune.forEach((t) => {
        multipliers[t] *= 0.0;
      });
    }
  });

  const result: TypeMatchups = {
    x4: [],
    x2: [],
    x05: [],
    x025: [],
    x0: [],
  };

  // Group types by final multiplier
  Object.entries(multipliers).forEach(([type, mult]) => {
    if (mult === 4.0) {
      result.x4.push(type);
    } else if (mult === 2.0) {
      result.x2.push(type);
    } else if (mult === 0.5) {
      result.x05.push(type);
    } else if (mult === 0.25) {
      result.x025.push(type);
    } else if (mult === 0.0) {
      result.x0.push(type);
    }
  });

  return result;
}

/**
 * Helper to fetch detailed data for a specific Pokemon
 */
export async function getPokemonDetails(
  nameOrId: string | number,
): Promise<any> {
  const response = await axios.get(`${BASE_URL}pokemon/${nameOrId}`);
  return response.data;
}

/**
 * Helper to fetch Japanese name and description for a specific Pokemon species
 */
export async function getPokemonSpeciesData(
  nameOrId: string | number,
): Promise<{ nameJa: string; descriptionJa: string }> {
  try {
    const response = await axios.get(`${BASE_URL}pokemon-species/${nameOrId}`);
    const speciesData = response.data;

    // Look for Japanese translation (both ja-hrkt and ja)
    const jaNameEntry = speciesData.names.find(
      (n: any) => n.language.name === 'ja-hrkt' || n.language.name === 'ja',
    );
    const nameJa = jaNameEntry ? jaNameEntry.name : String(nameOrId);

    // Find Japanese description flavor text
    const jaFlavorEntry = speciesData.flavor_text_entries.find(
      (entry: any) =>
        entry.language.name === 'ja-hrkt' || entry.language.name === 'ja',
    );
    // Replace form-feeds and clean up formatting
    const descriptionJa = jaFlavorEntry
      ? jaFlavorEntry.flavor_text
          .replace(/\f/g, '\n')
          .replace(/\n/g, ' ')
          .replace(/\s+/g, '')
          .trim()
      : 'このポケモンに関する日本語の記述はありません。';

    return { nameJa, descriptionJa };
  } catch (error) {
    console.error(`Failed to fetch species data for: ${nameOrId}`, error);
    return {
      nameJa: String(nameOrId),
      descriptionJa: 'ポケモンの詳細情報を取得できませんでした。',
    };
  }
}

/**
 * Main entry point: fetch a page of Pokemon details complete with Japanese name and description
 */
export async function fetchPokemonList(
  limit: number = 100,
  offset: number = 0,
): Promise<PokemonData[]> {
  try {
    // 1. Get the basic list
    const response = await axios.get(
      `${BASE_URL}pokemon?limit=${limit}&offset=${offset}`,
    );
    const results = response.data.results;

    // 2. Fetch details and species in parallel for all items
    const detailPromises = results.map(async (pokemon: any) => {
      try {
        // Fetch detailed stats/images
        const details = await getPokemonDetails(pokemon.name);

        // Fetch species to get the Japanese name and description
        const { nameJa, descriptionJa } = await getPokemonSpeciesData(
          details.id,
        );

        const hp =
          details.stats.find((s: any) => s.stat.name === 'hp')?.base_stat || 0;
        const attack =
          details.stats.find((s: any) => s.stat.name === 'attack')?.base_stat ||
          0;
        const defense =
          details.stats.find((s: any) => s.stat.name === 'defense')
            ?.base_stat || 0;
        const spAtk =
          details.stats.find((s: any) => s.stat.name === 'special-attack')
            ?.base_stat || 0;
        const spDef =
          details.stats.find((s: any) => s.stat.name === 'special-defense')
            ?.base_stat || 0;
        const speed =
          details.stats.find((s: any) => s.stat.name === 'speed')?.base_stat ||
          0;

        return {
          id: details.id,
          name: details.name,
          nameJa: nameJa,
          descriptionJa: descriptionJa,
          image:
            details.sprites.other['official-artwork'].front_default ||
            details.sprites.front_default ||
            '',
          types: details.types.map((t: any) => t.type.name),
          height: details.height,
          weight: details.weight,
          stats: {
            hp,
            attack,
            defense,
            spAtk,
            spDef,
            speed,
          },
        } as PokemonData;
      } catch (err) {
        console.error(`Error fetching detailed data for ${pokemon.name}`, err);
        return null;
      }
    });

    const pokemonDataArray = await Promise.all(detailPromises);
    // Filter out any that failed
    return pokemonDataArray.filter((p): p is PokemonData => p !== null);
  } catch (error) {
    console.error('Error fetching Pokemon list:', error);
    throw error;
  }
}

/**
 * Returns a sorted list of Pokemon IDs (ascending) for a given type.
 * Filters out alternate forms (IDs > 10000).
 */
export async function getTypeIdList(typeName: string): Promise<number[]> {
  const response = await axios.get(`${BASE_URL}type/${typeName}`);
  const pokemonEntries: Array<{ pokemon: { name: string; url: string } }> =
    response.data.pokemon;

  const ids = pokemonEntries
    .map((entry) => {
      const parts = entry.pokemon.url.split('/').filter(Boolean);
      return parseInt(parts[parts.length - 1], 10);
    })
    .filter((id) => !isNaN(id) && id <= 10000)
    .sort((a, b) => a - b);

  return ids;
}

/**
 * Fetch a paginated slice of Pokemon details for a specific type.
 * typeIds: the full sorted ID list for this type (pre-fetched and cached in App).
 */
export async function fetchPokemonByType(
  typeIds: number[],
  limit: number = 100,
  offset: number = 0,
): Promise<PokemonData[]> {
  const slice = typeIds.slice(offset, offset + limit);
  if (slice.length === 0) return [];

  const detailPromises = slice.map(async (id) => {
    try {
      const details = await getPokemonDetails(id);
      const { nameJa, descriptionJa } = await getPokemonSpeciesData(details.id);

      const hp =
        details.stats.find((s: any) => s.stat.name === 'hp')?.base_stat || 0;
      const attack =
        details.stats.find((s: any) => s.stat.name === 'attack')?.base_stat ||
        0;
      const defense =
        details.stats.find((s: any) => s.stat.name === 'defense')?.base_stat ||
        0;
      const spAtk =
        details.stats.find((s: any) => s.stat.name === 'special-attack')
          ?.base_stat || 0;
      const spDef =
        details.stats.find((s: any) => s.stat.name === 'special-defense')
          ?.base_stat || 0;
      const speed =
        details.stats.find((s: any) => s.stat.name === 'speed')?.base_stat || 0;

      return {
        id: details.id,
        name: details.name,
        nameJa,
        descriptionJa,
        image:
          details.sprites.other['official-artwork'].front_default ||
          details.sprites.front_default ||
          '',
        types: details.types.map((t: any) => t.type.name),
        height: details.height,
        weight: details.weight,
        stats: { hp, attack, defense, spAtk, spDef, speed },
      } as PokemonData;
    } catch (err) {
      console.error(`Error fetching pokemon id=${id}`, err);
      return null;
    }
  });

  const results = await Promise.all(detailPromises);
  return results.filter((p): p is PokemonData => p !== null);
}
