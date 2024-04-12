/**
 * Semantic helper
 *
 * Keyword is string without diacritics in lowercase [a-z1-9]
 * Words are splitted between multiple keywords @see IKeywords
 *
 * For example `"keyword"`
 */
export type string_keyword = string;

/**
 * Semantic helper
 * Set of keywords @see string_keyword
 *
 */
export type IKeywords = Set<string_keyword>;

/**
 * TODO: [🌮] Keywords with weight
 */
