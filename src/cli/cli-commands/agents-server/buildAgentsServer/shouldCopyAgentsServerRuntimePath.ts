import { basename, relative } from 'path';
import { isAgentsServerBuildInputTestFile } from './isAgentsServerBuildInputTestFile';
import { isExcludedAgentsServerBuildInputDirectoryName } from './isExcludedAgentsServerBuildInputDirectoryName';
import { isExcludedAgentsServerRuntimeSourcePath } from './isExcludedAgentsServerRuntimeSourcePath';

/**
 * Excludes build artifacts, dependency folders, private env files, and test sources.
 *
 * @private internal utility of `buildAgentsServer`
 */
export function shouldCopyAgentsServerRuntimePath(sourcePath: string, sourceRootPath: string): boolean {
    const sourceRelativePath = relative(sourceRootPath, sourcePath).replace(/\\/gu, '/');
    const sourceRuntimeRelativePath = normalizeRuntimeSourceRelativePath(sourcePath, sourceRootPath);
    const sourcePathSegments = sourceRelativePath.split('/').filter(Boolean);
    const sourceBasename = basename(sourcePath);

    if (sourcePathSegments.some(isExcludedAgentsServerBuildInputDirectoryName)) {
        return false;
    }

    if (sourcePathSegments.includes('playground')) {
        return false;
    }

    if (isExcludedAgentsServerRuntimeSourcePath(sourceRuntimeRelativePath)) {
        return false;
    }

    if (sourceBasename.startsWith('.env')) {
        return false;
    }

    return !isAgentsServerBuildInputTestFile(sourceBasename);
}

/**
 * Normalizes a copied runtime path to the shape used inside the packaged runtime root.
 */
function normalizeRuntimeSourceRelativePath(sourcePath: string, sourceRootPath: string): string {
    const sourceRelativePath = relative(sourceRootPath, sourcePath).replace(/\\/gu, '/');
    const sourceRootBasename = basename(sourceRootPath);

    if (!sourceRelativePath) {
        return sourceRootBasename;
    }

    return `${sourceRootBasename}/${sourceRelativePath}`;
}
