import type { string_color, string_person_firstname, string_person_lastname } from '../../types/typeAliases';
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
 * Name pool for English names
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
