import { readFile } from 'fs/promises';
import { join } from 'path';
import { AGENTS_SERVER_BUILD_CACHE_FILENAME } from './AGENTS_SERVER_BUILD_CACHE_FILENAME';
import { AGENTS_SERVER_BUILD_CACHE_VERSION } from './AGENTS_SERVER_BUILD_CACHE_VERSION';
import type { AgentsServerBuildCache } from './AgentsServerBuildCache';
import type { AgentsServerBuildCacheOptions } from './AgentsServerBuildCacheOptions';
import { resolveAgentsServerBuildOutputPath } from './resolveAgentsServerBuildOutputPath';

/**
 * Reads and validates cached build metadata.
 *
 * @private internal utility of `buildAgentsServer`
 */
export async function readAgentsServerBuildCache(
    options: AgentsServerBuildCacheOptions,
): Promise<AgentsServerBuildCache | undefined> {
    try {
        const serializedBuildCache = await readFile(
            join(resolveAgentsServerBuildOutputPath(options), AGENTS_SERVER_BUILD_CACHE_FILENAME),
            'utf-8',
        );
        const buildCache = JSON.parse(serializedBuildCache) as Partial<AgentsServerBuildCache>;

        if (
            buildCache.version !== AGENTS_SERVER_BUILD_CACHE_VERSION ||
            typeof buildCache.sourceFingerprint !== 'string'
        ) {
            return undefined;
        }

        return buildCache as AgentsServerBuildCache;
    } catch {
        return undefined;
    }
}
