/**
 * Organizational helper to better mark the place where to really use empty object `{}`
 *
 * Note: There are 2 similar types>
 * - `empty_object` Type used for empty data objects allowing for potential future extensions
 * - `just_empty_object` Type used when an object must remain permanently empty
 *
 * @private within the repository
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type empty_object = {};
