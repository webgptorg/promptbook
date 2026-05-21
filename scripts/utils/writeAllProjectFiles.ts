import colors from 'colors';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { $execCommand } from '../../src/utils/execCommand/$execCommand';
import { splitArrayIntoChunks } from '../repair-imports/utils/splitArrayIntoChunks';
import {
    addOrganizeImportsTypeUsageWorkarounds,
    removeOrganizeImportsTypeUsageWorkarounds,
} from '../repair-imports/utils/repairImportUtils';
import { prettify } from './prettify';

/**
 * Writes all project files.
 */
export async function writeAllProjectFiles(
    files: ReadonlyArray<{ path: string; content: string }>,
    isOrganized: boolean,
): Promise<void> {
    const changedFilesPaths: string[] = [];

    for (const file of files) {
        const oldContent = await readFile(file.path, 'utf-8');
        if (file.content !== oldContent) {
            console.info(colors.gray(`Writing file ${file.path}`));
            // console.log({ file });

            const fileContent = isOrganized
                ? addOrganizeImportsTypeUsageWorkarounds(file.path, file.content)
                : file.content;

            await writeFile(file.path, await prettify(fileContent));
            changedFilesPaths.push(file.path);
        }
    }

    if (isOrganized && files.length > 0) {
        const changedFilesPathsChunks = splitArrayIntoChunks(changedFilesPaths, 30);
        try {
            for (const pachangedFilesPathsChunk of changedFilesPathsChunks) {
                await $execCommand({
                    isVerbose: true,
                    cwd: join(__dirname, '../../'),
                    command: `npx organize-imports-cli ${pachangedFilesPathsChunk
                        .map((path) => path.split('\\').join('/'))
                        .join(' ')}`,
                });
            }
        } finally {
            await removeOrganizeImportsWorkarounds(changedFilesPaths);
        }
    }
}

/**
 * Removes temporary type-usage aliases after import organization.
 */
async function removeOrganizeImportsWorkarounds(changedFilesPaths: ReadonlyArray<string>): Promise<void> {
    for (const changedFilePath of changedFilesPaths) {
        const fileContent = await readFile(changedFilePath, 'utf-8');
        const repairedFileContent = removeOrganizeImportsTypeUsageWorkarounds(fileContent);

        if (repairedFileContent !== fileContent) {
            await writeFile(changedFilePath, await prettify(repairedFileContent));
        }
    }
}

// Note: [⚫] Code for repository script [writeAllProjectFiles](scripts/utils/writeAllProjectFiles.ts) should never be published in any package
