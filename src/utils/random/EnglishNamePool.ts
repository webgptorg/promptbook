import type { string_color, string_person_firstname, string_person_lastname } from '../../types/typeAliases';
import { computeHash } from '../misc/computeHash';
import { $randomItem } from './$randomItem';
import type { GenerateNameResult, NamePool } from './NamePool';

const FIRSTNAMES: ReadonlyArray<string_person_firstname> = [
    'Paul',
    'George',
    'Adam',
    'Lucy',
    'Sophia',
    'Emma',
    'Olivia',
    'Noah',
    'Liam',
    'Ethan',
    'Ava',
    'Mia',
    'Isabella',
    'James',
    'Benjamin',
    'Elijah',
    'Sophia',
    'Charlotte',
    'Amelia',
    'Harper',
    'Alexander',
    'William',
    'Michael',
    'Daniel',
    'Matthew',
    'Joseph',
    'David',
    'Samuel',
    'Henry',
    'Jack',
    'Sebastian',
    'Gabriel',
    'Anthony',
    'Christopher',
];

const LASTNAMES_WITH_COLORS: ReadonlyArray<{ lastname: string_person_lastname; color: string_color }> = [
    { lastname: 'Green', color: '#008000' },
    { lastname: 'Brown', color: '#A52A2A' },
    { lastname: 'Black', color: '#000000' },
    { lastname: 'White', color: '#FFFFFF' },
    { lastname: 'Gray', color: '#808080' },
    { lastname: 'Blue', color: '#0000FF' },
];

/**
 * Deterministically picks one item from a non-empty list using a hash segment.
 *
 * @param hash - Hash string used as deterministic source.
 * @param startIndex - Segment start index.
 * @param list - Candidate values.
 * @returns Deterministically selected list item.
 */
function pickDeterministicItem<T>(hash: string, startIndex: number, list: ReadonlyArray<T>): T {
    const expandedHash = `${hash}${hash}`;
    const segment = expandedHash.substring(startIndex, startIndex + 8);
    const seed = parseInt(segment, 16);
    return list[seed % list.length]!;
}

/**
 * Generates a deterministic English full name from an arbitrary seed text.
 *
 * @param seed - Input seed used to derive a stable pseudonym.
 * @returns Deterministic English full name with color metadata.
 * @private internal helper for deterministic pseudonym generation
 */
export function generateDeterministicEnglishName(seed: string): GenerateNameResult {
    const normalizedSeed = seed.trim() || 'user';
    const hash = computeHash(normalizedSeed);
    const firstname = pickDeterministicItem(hash, 0, FIRSTNAMES);
    const lastnameWithColor = pickDeterministicItem(hash, 8, LASTNAMES_WITH_COLORS);

    return {
        fullname: `${firstname} ${lastnameWithColor.lastname}`,
        color: lastnameWithColor.color,
    };
}

/**
 * Name pool for English names
 *
 * @private [🍇] Maybe expose via some package
 */
export const EnglishNamePool: NamePool = {
    generateName(): GenerateNameResult {
        const firstname = $randomItem(...FIRSTNAMES);
        const { lastname, color } = $randomItem(...LASTNAMES_WITH_COLORS);

        return {
            fullname: `${firstname} ${lastname}`,
            color,
        };
    },
};
