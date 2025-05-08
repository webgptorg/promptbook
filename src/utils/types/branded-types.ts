/**
 * Utility types for creating branded/nominal types
 *
 * @private within the repository
 */

/**
 * Creates a branded type - a type that is nominally different from its base type.
 * This helps ensure type safety by preventing accidental assignment between types
 * that are structurally the same but semantically different.
 *
 * @example
 * type UserId = Brand<string, 'UserId'>;
 * const userId: UserId = 'abc123' as UserId; // Must be explicitly cast
 * const regularString: string = 'abc123';
 *
 * // This would fail: const badUsage: UserId = regularString;
 *
 * @private within the repository
 */
export type Brand<T, K extends string> = T & { readonly __brand: K };
