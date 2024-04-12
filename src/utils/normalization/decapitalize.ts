/**
 * Makes first letter of a string uppercase
 *
 */
export function decapitalize(word: string): string {
    return word.substring(0, 1).toLowerCase() + word.substring(1);
}
