import type { string_name } from '../../../types/typeAliases';

/**
 * Converts a name to a properly formatted subfolder path for cache storage.
 * Handles normalization and path formatting to create consistent cache directory structures.
 *
 * @private for `FileCacheStorage`
 */
export function nameToSubfolderPath(name: string_name): ReadonlyArray<string> {
    return [name.substr(0, 1).toLowerCase(), name.substr(1, 1).toLowerCase()];
}
