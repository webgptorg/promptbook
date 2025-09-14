/**
 * Makes first letter of a string lowercase
 *
 * Note: [🔂] This function is idempotent.
 *
 * @public exported from `@promptbook/utils`
 */
export function decapitalize(word: string): string {
    return word.substring(0, 1).toLowerCase() + word.substring(1);
}
