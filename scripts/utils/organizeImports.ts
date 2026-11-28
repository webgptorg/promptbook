import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { execCommand } from '../../src/utils/execCommand/execCommand';
import { getPromptbookTemporaryPath, resolvePromptbookTemporaryPath } from '../../src/utils/filesystem/promptbookTemporaryPath';

/**
 * Organizes the imports of a typescript file
 *
 * @param fileContents contents of the typescript file
 * @returns the file contents with organized imports
 */
export async function organizeImports(fileContents: string): Promise<string> {
    const tmpFilePathRelative = getPromptbookTemporaryPath('scripts', 'file-to-import-organize.ts');
    const tmpFilePath = resolvePromptbookTemporaryPath(process.cwd(), 'scripts', 'file-to-import-organize.ts');

    await mkdir(dirname(tmpFilePath), { recursive: true });
    await writeFile(tmpFilePath, fileContents, 'utf-8');

    await execCommand({
        command: `npx organize-imports-cli ${tmpFilePathRelative}`,
        crashOnError: true,
        cwd: process.cwd(),
    });

    return await readFile(tmpFilePath, 'utf-8');
}

// Note: [⚫] Code for repository script [organizeImports](scripts/utils/organizeImports.ts) should never be published in any package
