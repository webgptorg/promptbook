import { lstat, readFile } from 'fs/promises';
import { join } from 'path';
import { AGENTS_FILE_PATH } from '../../../src/cli/cli-commands/coder/agentsFile';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { resolveInlineOrFileText } from './resolveInlineOrFileText';

/**
 * Resolves project AGENTS.md on omission; explicit text, files and intentional empty values replace it.
 */
export async function resolveCoderContext(
    contextReference: string | undefined,
    currentWorkingDirectory: string,
): Promise<string | undefined> {
    if (contextReference === undefined) {
        const contextPath = join(currentWorkingDirectory, AGENTS_FILE_PATH);
        try {
            return await readFile(contextPath, 'utf-8');
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                // A broken symlink is an existing, unreadable default, not an absent optional file.
                const isMissing = await lstat(contextPath).then(() => false, (failure: NodeJS.ErrnoException) => failure.code === 'ENOENT');
                if (isMissing) {
                    console.warn(`No additional context: \`${contextPath}\` is missing.`);
                    return undefined;
                }
            }
            throw new NotAllowed(spaceTrim(`
                Cannot read default context file \`${contextPath}\`: ${error instanceof Error ? error.message : String(error)}
                Check its permissions, or replace it with \`--context\` (an empty value disables additional context).
            `));
        }
    }
    return resolveInlineOrFileText({
        textReference: contextReference,
        currentWorkingDirectory,
        contextLabel: 'Coding context',
        optionName: '--context',
        isMissingFileAnError: true,
    });
}
