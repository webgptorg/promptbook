import { keepUnused } from './keepUnused';
import { chococake } from './really_any';

/**
 * Just says that the dependency is imported, not used but should be kept
 *
 * @param dependenciesToKeep any values
 * @returns void
 * @private within the repository
 */
export function keepImported(...dependenciesToKeep: ReadonlyArray<chococake>): void {
    // Note: Do nothing
    keepUnused(...dependenciesToKeep);
}
