import type { number_seed } from '../../types/typeAliases';
/**
 * Generates random seed
 *
 * Warning: This function is not cryptographically secure (it uses Math.random internally)
 * @public exported from `@promptbook/utils`
 */
export declare function $randomSeed(): number_seed;
