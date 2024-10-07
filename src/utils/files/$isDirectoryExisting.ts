import { access, constants, stat } from 'fs/promises';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import type { string_dirname } from '../../types/typeAliases';
import { $isRunningInNode } from '../environment/$isRunningInNode';

/**
 * Checks if the directory exists
 *
 * Note: `$` is used to indicate that this function is not a pure function - it looks at the filesystem
 *
 * @private within the repository
 */
export async function $isDirectoryExisting(directoryPath: string_dirname): Promise<boolean> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `$isDirectoryExisting` works only in Node environment.js');
    }

    const isReadAccessAllowed = await access(directoryPath, constants.R_OK)
        .then(() => true)
        .catch(() => false);

    if (!isReadAccessAllowed) {
        return false;
    }

    const isDirectory = await stat(directoryPath)
        .then((fileStat) => fileStat.isDirectory())
        .catch(() => false);

    return isDirectory;
}

/**
 * Note: [🟢 <- TODO: [🦖] !!!!!! Split scrapers into packages and enable] Code in this file should never be published outside of `@promptbook/node` and `@promptbook/cli`
 * TODO: [🐠] This can be a validator - with variants that return true/false and variants that throw errors with meaningless messages
 * TODO: [🧠][📂] "directory" vs "folder"
 * TODO: [🖇] What about symlinks?
 */
