import { keepUnused } from './keepUnused';

/**
 * Just says that the type is used but `organize-imports-cli` does not recognize it.
 * [🤛] This is a workaround for the issue.
 *
 * @param value any values
 * @returns void
 * @private within the repository
 */
export function keepTypeImported<TTypeToKeep>(): void {
    // Note: Do nothing
    keepUnused(null as TTypeToKeep);
}
