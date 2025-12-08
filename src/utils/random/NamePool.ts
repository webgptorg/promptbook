import type { string_color, string_person_fullname } from '../../types/typeAliases';

/**
 * Result of generating a name
 */
export type GenerateNameResult = {
    fullname: string_person_fullname;
    color: string_color;
};

/**
 * Interface for a name pool
 */
export type NamePool = {
    /**
     * Generates a random name
     */
    generateName(): GenerateNameResult;
};
