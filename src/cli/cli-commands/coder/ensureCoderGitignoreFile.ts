import { getPromptbookTemporaryGitignoreRule } from '../../../utils/filesystem/promptbookTemporaryPath';
import type { InitializationStatus } from './boilerplateTemplates';
import { ensureProjectGitignoreFile } from '../common/projectInitialization';

/**
 * Promptbook temporary root directory that should stay out of version control.
 */
const PROMPTBOOK_TEMP_GITIGNORE_RULE = getPromptbookTemporaryGitignoreRule();

/**
 * Promptbook coder environment file that should stay out of version control.
 */
const CODER_ENV_GITIGNORE_RULE = '.env';

/**
 * Standard header used when appending Promptbook coder rules into `.gitignore`.
 */
const CODER_GITIGNORE_HEADER = '# Promptbook Coder';

/**
 * Ensures `.gitignore` contains the standalone Promptbook temp entry.
 *
 * @private function of `initializeCoderProjectConfiguration`
 */
export async function ensureCoderGitignoreFile(projectPath: string): Promise<InitializationStatus> {
    return ensureProjectGitignoreFile({
        projectPath,
        blockHeader: CODER_GITIGNORE_HEADER,
        rules: [PROMPTBOOK_TEMP_GITIGNORE_RULE, CODER_ENV_GITIGNORE_RULE],
    });
}

// Note: [🟡] Code for coder init gitignore bootstrapping [ensureCoderGitignoreFile](src/cli/cli-commands/coder/ensureCoderGitignoreFile.ts) should never be published outside of `@promptbook/cli`
