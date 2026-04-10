import { writeFile } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import type { InitializationStatus } from './boilerplateTemplates';
import { appendBlock } from './appendBlock';
import { readTextFileIfExists } from './readTextFileIfExists';

/**
 * Relative path to `.gitignore` in the initialized project.
 */
const GITIGNORE_FILE_PATH = '.gitignore';

/**
 * `.gitignore` block required by standalone Promptbook coder projects.
 */
const CODER_GITIGNORE_BLOCK = spaceTrim(`
    # Promptbook Coder
    /.tmp
`);

/**
 * Ensures `.gitignore` contains the standalone Promptbook coder cache entry.
 *
 * @private function of `initializeCoderProjectConfiguration`
 */
export async function ensureCoderGitignoreFile(projectPath: string): Promise<InitializationStatus> {
    const gitignorePath = join(projectPath, GITIGNORE_FILE_PATH);
    const currentGitignoreContent = await readTextFileIfExists(gitignorePath);
    if (currentGitignoreContent !== undefined && hasTmpGitignoreRule(currentGitignoreContent)) {
        return 'unchanged';
    }

    const nextGitignoreContent = appendBlock(currentGitignoreContent || '', CODER_GITIGNORE_BLOCK);
    await writeFile(gitignorePath, nextGitignoreContent, 'utf-8');
    return currentGitignoreContent === undefined ? 'created' : 'updated';
}

/**
 * Detects whether `.gitignore` already covers the standalone coder temp directory.
 */
function hasTmpGitignoreRule(gitignoreContent: string): boolean {
    return /(^|[\r\n])\/?\.tmp(?:[\r\n]|$)/u.test(gitignoreContent);
}

// Note: [🟡] Code for coder init gitignore bootstrapping [ensureCoderGitignoreFile](src/cli/cli-commands/coder/ensureCoderGitignoreFile.ts) should never be published outside of `@promptbook/cli`
