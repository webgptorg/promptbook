import type { really_any } from '../../../utils/organization/really_any';
/**
 * Does nothing, but preserves the function in the bundle
 * Compiler is tricked into thinking the function is used
 *
 * @param value any function to preserve
 * @returns nothing
 */
export declare function preserve(func: (...params: Array<really_any>) => unknown): void;
/**
 * TODO: !! [1] This maybe does memory leak
 */
