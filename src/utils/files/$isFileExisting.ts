import { access, constants, stat } from 'fs/promises';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import type { string_filename } from '../../types/typeAliases';
import { $isRunningInNode } from '../environment/$isRunningInNode';

/**
 * Checks if the file exists
 *
 * Note: `$` is used to indicate that this function is not a pure function - it looks at the filesystem
 *
 * @private within the repository
 */
export async function $isFileExisting(filename: string_filename): Promise<boolean> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `$isFileExisting` works only in Node environment.js');
    }

    const isReadAccessAllowed = await access(filename, constants.R_OK)
        .then(() => true)
        .catch(() => false);

    if (!isReadAccessAllowed) {
        return false;
    }

    const isFile = await stat(filename)
        .then((fileStat) => fileStat.isFile())
        .catch(() => false);

    return isFile;
}

/**
 * Note: [🟢 !!!!!! After fix makeKnowledgeSourceHandler] Code in this file should never be published outside of `@promptbook/node` and `@promptbook/cli`
 * TODO: [🐠] This can be a validator - with variants that return true/false and variants that throw errors with meaningless messages
 * TODO: [🖇] What about symlinks?
 */
