/**
 * Makes first letter of a string uppercase
 *
 */
export function capitalize(word: string): string {
    return word.substring(0, 1).toUpperCase() + word.substring(1);
}
