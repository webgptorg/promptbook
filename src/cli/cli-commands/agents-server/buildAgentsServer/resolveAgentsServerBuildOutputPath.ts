import { resolve } from 'path';
import type { AgentsServerBuildCacheOptions } from './AgentsServerBuildCacheOptions';

/**
 * Next output directory used by the local Agents Server runtime unless Next overrides it.
 */
const DEFAULT_AGENTS_SERVER_NEXT_DIST_DIRECTORY_NAME = '.next';

/**
 * Resolves the Next output directory used by a particular build environment.
 *
 * @private internal utility of `buildAgentsServer`
 */
export function resolveAgentsServerBuildOutputPath(options: AgentsServerBuildCacheOptions): string {
    return resolve(
        options.appPath,
        options.environment?.NEXT_DIST_DIR || DEFAULT_AGENTS_SERVER_NEXT_DIST_DIRECTORY_NAME,
    );
}
