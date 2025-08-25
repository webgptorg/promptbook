import { keepUnused } from './keepUnused';
import type { really_any } from './really_any';

/**
 * Just says that the variable is not used directlys but should be kept because the existence of the variable is important
 *
 * @param value any values
 * @returns void
 * @private within the repository
 */
export function $sideEffect(
    ...sideEffectSubjects: ReadonlyArray<really_any>
): void {
    keepUnused(...sideEffectSubjects);
}
