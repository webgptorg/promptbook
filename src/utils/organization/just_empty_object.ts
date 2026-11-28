/**
 * Organizational helper to better distinguish different empty object use cases.
 *
 * Note: There are 2 similar types:
 * - `empty_object` Type used for empty data objects with potential extensions
 * - `just_empty_object` Type used specifically for objects that must remain empty
 *
 * Note: In most cases, you should use `empty_object`
 *
 * @private within the repository
 */
export type just_empty_object = Record<string, never>;
