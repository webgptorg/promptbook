import type { number_seed } from '../../types/typeAliases';

/**
 * Generates random seed
 *
 * Note: `$` is used to indicate that this function is not a pure function - it is not deterministic
 * Warning: This function is not cryptographically secure (it uses Math.random internally)
 * @public exported from `@promptbook/utils`
 */
export function $randomSeed(): number_seed {
    return Math.random();
}
