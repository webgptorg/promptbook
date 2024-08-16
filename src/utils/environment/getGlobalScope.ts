import { really_any } from '../organization/really_any';

/**
 * @@@
 *
 * Note: `$` is used to indicate that this function is not a pure function - it access global
 *
 * @public exported from `@promptbook/utils`
 */
export function $getGlobalScope(): really_any {
    return Function('return this')();
}
