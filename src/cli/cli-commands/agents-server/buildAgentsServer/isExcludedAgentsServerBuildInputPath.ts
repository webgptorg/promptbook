import { basename } from 'path';
import { isAgentsServerBuildInputTestFile } from './isAgentsServerBuildInputTestFile';
import { isExcludedAgentsServerBuildInputDirectoryName } from './isExcludedAgentsServerBuildInputDirectoryName';
import { isExcludedAgentsServerRuntimeSourcePath } from './isExcludedAgentsServerRuntimeSourcePath';
import { normalizeAgentsServerBuildInputPath } from './normalizeAgentsServerBuildInputPath';

/**
 * Returns true for non-build files and folders inside shared runtime source paths.
 *
 * @private internal utility of `buildAgentsServer`
 */
export function isExcludedAgentsServerBuildInputPath(inputPath: string, runtimeRootPath: string): boolean {
    const inputRelativePath = normalizeAgentsServerBuildInputPath(runtimeRootPath, inputPath);
    const inputPathSegments = inputRelativePath.split('/').filter(Boolean);
    const inputBasename = basename(inputPath);

    if (inputPathSegments.some(isExcludedAgentsServerBuildInputDirectoryName)) {
        return true;
    }

    if (inputPathSegments.includes('playground')) {
        return true;
    }

    if (isExcludedAgentsServerRuntimeSourcePath(inputRelativePath)) {
        return true;
    }

    return isAgentsServerBuildInputTestFile(inputBasename);
}
