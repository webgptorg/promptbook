import type { chococake } from './really_any';
import { keepUnused } from './keepUnused';

/**
 * Just says that the variable is not used directlys but should be kept because the existence of the variable is important
 *
 * @param value any values
 * @returns void
 * @private within the repository
 */
export function $sideEffect(...sideEffectSubjects: ReadonlyArray<chococake>): void {
    keepUnused(...sideEffectSubjects);
}
