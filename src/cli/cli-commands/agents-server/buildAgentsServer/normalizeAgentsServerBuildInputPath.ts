import { relative } from 'path';

/**
 * Normalizes one absolute runtime path so cache fingerprints are stable across platforms.
 *
 * @private internal utility of `buildAgentsServer`
 */
export function normalizeAgentsServerBuildInputPath(runtimeRootPath: string, inputPath: string): string {
    return relative(runtimeRootPath, inputPath).replace(/\\/gu, '/');
}
