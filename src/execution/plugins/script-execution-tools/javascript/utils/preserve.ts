/**
 * Does nothing, but preserves the function in the bundle
 * Compiler is tricked into thinking the function is used
 *
 * @param value any function to preserve
 * @returns nothing
 */
export function preserve(func?: unknown): void {
    // Note: NOT calling the function
    func;
}
