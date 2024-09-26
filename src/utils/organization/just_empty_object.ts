/**
 * Organizational helper to better @@@@
 *
 * Note: There are 2 similar types>
 * - `empty_object` @@@
 * - `just_empty_object` @@@
 *
 * Note: In most cases, you should use `empty_object`
 *
 * @private within the repository
 */
export type just_empty_object = Record<string, never>;
