import { writeFile } from 'fs/promises';
import { join } from 'path';
import { escapeRegExp } from '../../../utils/chat/escapeRegExp';
import type { InitializationStatus } from './boilerplateTemplates';
import { appendBlock } from './appendBlock';
import { readTextFileIfExists } from './readTextFileIfExists';

/**
 * Relative path to `.gitignore` in the initialized project.
 */
const GITIGNORE_FILE_PATH = '.gitignore';

/**
 * Promptbook coder temp directory that should stay out of version control.
 */
const CODER_TEMP_GITIGNORE_RULE = '/.tmp';

/**
 * Promptbook coder cache directory that should stay out of version control.
 */
const CODER_CACHE_GITIGNORE_RULE = '/.promptbook/ptbk-coder';

/**
 * Standard header used when appending Promptbook coder rules into `.gitignore`.
 */
const CODER_GITIGNORE_HEADER = '# Promptbook Coder';

/**
 * Ensures `.gitignore` contains the standalone Promptbook coder temp and cache entries.
 *
 * @private function of `initializeCoderProjectConfiguration`
 */
export async function ensureCoderGitignoreFile(projectPath: string): Promise<InitializationStatus> {
    const gitignorePath = join(projectPath, GITIGNORE_FILE_PATH);
    const currentGitignoreContent = await readTextFileIfExists(gitignorePath);
    const missingRules = getMissingCoderGitignoreRules(currentGitignoreContent || '');

    if (currentGitignoreContent !== undefined && missingRules.length === 0) {
        return 'unchanged';
    }

    const nextGitignoreContent = appendBlock(currentGitignoreContent || '', buildCoderGitignoreBlock(missingRules));
    await writeFile(gitignorePath, nextGitignoreContent, 'utf-8');
    return currentGitignoreContent === undefined ? 'created' : 'updated';
}

/**
 * Returns the Promptbook coder gitignore rules that still need to be added.
 */
function getMissingCoderGitignoreRules(gitignoreContent: string): Array<string> {
    const requiredRules = [CODER_TEMP_GITIGNORE_RULE, CODER_CACHE_GITIGNORE_RULE];
    return requiredRules.filter((rule) => !hasGitignoreRule(gitignoreContent, rule));
}

/**
 * Builds the Promptbook coder `.gitignore` block for the missing rules only.
 */
function buildCoderGitignoreBlock(missingRules: ReadonlyArray<string>): string {
    return [CODER_GITIGNORE_HEADER, ...missingRules].join('\n');
}

/**
 * Detects whether `.gitignore` already covers one exact rule.
 */
function hasGitignoreRule(gitignoreContent: string, rule: string): boolean {
    const normalizedRulePattern = rule.startsWith('/')
        ? `/?${escapeRegExp(rule.slice(1))}`
        : escapeRegExp(rule);
    return new RegExp(`(^|[\\r\\n])${normalizedRulePattern}(?:[\\r\\n]|$)`, 'u').test(gitignoreContent);
}

// Note: [🟡] Code for coder init gitignore bootstrapping [ensureCoderGitignoreFile](src/cli/cli-commands/coder/ensureCoderGitignoreFile.ts) should never be published outside of `@promptbook/cli`
