import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { execCommand } from './execCommand/execCommand';

/**
 * Organizes the imports of a typescript file
 *
 * @param fileContents contents of the typescript file
 * @returns the file contents with organized imports
 */
export async function organizeImports(fileContents: string): Promise<string> {
    const tmpFilePathRelative = '.tmp/file-to-import-organize.ts';
    const tmpFilePath = join(process.cwd(), tmpFilePathRelative);

    await mkdir(dirname(tmpFilePath), { recursive: true });
    await writeFile(tmpFilePath, fileContents, 'utf8');

    await execCommand({
        command: `npx organize-imports-cli ${tmpFilePathRelative}`,
        crashOnError: true,
        cwd: process.cwd(),
    });

    return await readFile(tmpFilePath, 'utf8');
}


/**
 * Note: [⚫] Code in this file should never be published in any package
 */