import { readFile, stat } from 'fs/promises';

/**
 * Reads one text file when it exists, otherwise returns `undefined`.
 *
 * @private function of `initializeCoderProjectConfiguration`
 */
export async function readTextFileIfExists(path: string): Promise<string | undefined> {
    try {
        const fileStats = await stat(path);
        if (!fileStats.isFile()) {
            return undefined;
        }
    } catch {
        return undefined;
    }

    return readFile(path, 'utf-8');
}

// Note: [🟡] Code for coder init text-file reading [readTextFileIfExists](src/cli/cli-commands/coder/readTextFileIfExists.ts) should never be published outside of `@promptbook/cli`
