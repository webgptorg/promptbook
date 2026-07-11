import { join } from 'path';
import { AGENTS_SERVER_NEXT_BUILD_ID_FILENAME } from './AGENTS_SERVER_NEXT_BUILD_ID_FILENAME';
import type { AgentsServerBuildCacheOptions } from './AgentsServerBuildCacheOptions';
import { createAgentsServerBuildSourceFingerprint } from './createAgentsServerBuildSourceFingerprint';
import { isFile } from './isFile';
import { readAgentsServerBuildCache } from './readAgentsServerBuildCache';
import { resolveAgentsServerBuildOutputPath } from './resolveAgentsServerBuildOutputPath';

/**
 * Returns true when the production build marker and source fingerprint still match.
 *
 * @private internal utility of `buildAgentsServer`
 */
export async function isAgentsServerBuildCacheCurrent(options: AgentsServerBuildCacheOptions): Promise<boolean> {
    const buildCache = await readAgentsServerBuildCache(options);

    if (!buildCache) {
        return false;
    }

    const buildOutputPath = resolveAgentsServerBuildOutputPath(options);
    if (!(await isFile(join(buildOutputPath, AGENTS_SERVER_NEXT_BUILD_ID_FILENAME)))) {
        return false;
    }

    return buildCache.sourceFingerprint === (await createAgentsServerBuildSourceFingerprint(options.appPath));
}
