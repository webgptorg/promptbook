/**
 * Types of words used in linguistic hash output.
 *
 * @private utility of `linguisticHash`
 */
export type LinguisticHashWordKind = 'adjective' | 'noun' | 'verb';

/**
 * Word lists used to build linguistic hashes.
 *
 * @private utility of `linguisticHash`
 */
export type LinguisticHashWordLists = {
    adjective: readonly string[];
    noun: readonly string[];
    verb: readonly string[];
};

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
