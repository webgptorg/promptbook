import { number_seed } from '../../types/typeAliases';

/**
 * Generates random seed
 *
 * Warning: This function is not cryptographically secure (it uses Math.random internally)
 */
export function $randomSeed(): number_seed {
    return Math.floor(Math.random() * 1000000 /* <- TODO: [🧠] What is the best sampling? */);
}
