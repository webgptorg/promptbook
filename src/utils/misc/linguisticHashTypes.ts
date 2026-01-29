/**
 * Types of words used in linguistic hash output.
 */
export type LinguisticHashWordKind = 'adjective' | 'noun' | 'verb';

/**
 * Word lists used to build linguistic hashes.
 */
export type LinguisticHashWordLists = {
    adjective: readonly string[];
    noun: readonly string[];
    verb: readonly string[];
};
