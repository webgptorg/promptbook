import { readFile } from 'fs/promises';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import { FilesystemTools } from '../../execution/FilesystemTools';
import { $isRunningInNode } from '../../utils/environment/$isRunningInNode';

/**
 * Returns Filesystem tools for CLI
 *
 * @private within the repository - for CLI utils
 */
export function getFilesystemToolsForNode(): FilesystemTools {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `getFilesystemToolsForCli` works only in Node.js environment');
    }

    return {
        getFile(filePath: string): Promise<string> {
            // TODO: !!!!!! Probbably here should be scope security check if the file is in the project scope
            return /* not await */ readFile(filePath, 'utf-8');
        },
    } satisfies FilesystemTools;
}

/**
 * Note: [🟢] Code in this file should never be published outside of `@promptbook/node` and `@promptbook/cli`
 */
