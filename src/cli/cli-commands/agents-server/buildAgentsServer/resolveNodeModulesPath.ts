import { resolve } from 'path';
import { NODE_MODULES_DIRECTORY_NAME } from './NODE_MODULES_DIRECTORY_NAME';

/**
 * Resolves the dependency root that contains the installed Next CLI.
 *
 * @private internal utility of `buildAgentsServer`
 */
export function resolveNodeModulesPath(nextCliPath: string): string {
    const normalizedNextCliPath = nextCliPath.replace(/\\/gu, '/');
    const marker = `/${NODE_MODULES_DIRECTORY_NAME}/next/`;
    const markerIndex = normalizedNextCliPath.lastIndexOf(marker);

    if (markerIndex === -1) {
        return resolve(nextCliPath, '..', '..', '..');
    }

    return normalizedNextCliPath.slice(0, markerIndex + marker.length - '/next/'.length);
}
