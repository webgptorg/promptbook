import colors from 'colors';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { $execCommand } from '../../src/utils/execCommand/$execCommand';
import { splitArrayIntoChunks } from '../repair-imports/utils/splitArrayIntoChunks';
import { prettify } from './prettify';

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

            await writeFile(file.path, await prettify(file.content));
            changedFilesPaths.push(file.path);
        }
    }

    if (isOrganized && files.length > 0) {
        const changedFilesPathsChunks = splitArrayIntoChunks(changedFilesPaths, 30);
        for (const pachangedFilesPathsChunk of changedFilesPathsChunks) {
            await $execCommand({
                isVerbose: true,
                cwd: join(__dirname, '../../'),
                command: `npx organize-imports-cli ${pachangedFilesPathsChunk
                    .map((path) => path.split('\\').join('/'))
                    .join(' ')}`,
            });
        }
    }
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
