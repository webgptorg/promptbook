import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { AGENTS_SERVER_BUILD_CACHE_FILENAME } from './AGENTS_SERVER_BUILD_CACHE_FILENAME';
import { AGENTS_SERVER_BUILD_CACHE_VERSION } from './AGENTS_SERVER_BUILD_CACHE_VERSION';
import type { AgentsServerBuildCache } from './AgentsServerBuildCache';
import type { AgentsServerBuildCacheOptions } from './AgentsServerBuildCacheOptions';
import { createAgentsServerBuildSourceFingerprint } from './createAgentsServerBuildSourceFingerprint';
import { resolveAgentsServerBuildOutputPath } from './resolveAgentsServerBuildOutputPath';

/**
 * Persists the source fingerprint for the just-created production build.
 *
 * @private internal utility of `buildAgentsServer`
 */
export async function writeAgentsServerBuildCache(options: AgentsServerBuildCacheOptions): Promise<void> {
    const buildOutputPath = resolveAgentsServerBuildOutputPath(options);
    const buildCache: AgentsServerBuildCache = {
        version: AGENTS_SERVER_BUILD_CACHE_VERSION,
        sourceFingerprint: await createAgentsServerBuildSourceFingerprint(options.appPath),
    };

    await mkdir(buildOutputPath, { recursive: true });
    await writeFile(
        join(buildOutputPath, AGENTS_SERVER_BUILD_CACHE_FILENAME),
        `${JSON.stringify(buildCache, null, 4)}\n`,
        'utf-8',
    );
}
