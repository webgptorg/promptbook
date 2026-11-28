/**
 * Makes first letter of a string uppercase
 *
 * Note: [🔂] This function is idempotent.
 *
 * @public exported from `@promptbook/utils`
 */
export function capitalize(word: string): string {
    return word.substring(0, 1).toUpperCase() + word.substring(1);
}
