import { getPromptbookTemporaryGitignoreRule } from '../../../utils/filesystem/promptbookTemporaryPath';
import { PROMPT_RUNNER_HARNESS_NAMES, type PromptRunnerHarnessName } from '../common/promptRunnerCliOptions';
import { getHarnessProjectGitignoreRules } from '../common/harness/HarnessDefinition';
import type { InitializationStatus } from './boilerplateTemplates';
import { ensureProjectGitignoreFile, getMissingProjectGitignoreRules } from '../common/projectInitialization';

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
 * Coder-owned local artifacts which every initialized project should ignore.
 */
const CODER_GITIGNORE_RULES = [PROMPTBOOK_TEMP_GITIGNORE_RULE, CODER_ENV_GITIGNORE_RULE] as const;

/**
 * Ensures `.gitignore` contains Promptbook Coder's local artifacts and every supported harness's local artifacts.
 *
 * @private function of `initializeCoderProjectConfiguration`
 */
export async function ensureCoderGitignoreFile(projectPath: string): Promise<InitializationStatus> {
    return ensureCoderGitignoreRules(projectPath, [
        ...CODER_GITIGNORE_RULES,
        ...getHarnessProjectGitignoreRules(PROMPT_RUNNER_HARNESS_NAMES),
    ]);
}

/**
 * Lists missing project-local ignore rules for the selected harnesses.
 *
 * @private internal utility of `ptbk coder`
 */
export async function getMissingCoderHarnessGitignoreRules(
    projectPath: string,
    harnessNames: ReadonlyArray<PromptRunnerHarnessName>,
): Promise<ReadonlyArray<string>> {
    return getMissingProjectGitignoreRules(projectPath, getHarnessProjectGitignoreRules(harnessNames));
}

/**
 * Adds the given Promptbook Coder rules to a project's `.gitignore` file.
 *
 * @private internal utility of `ptbk coder`
 */
export async function ensureCoderGitignoreRules(
    projectPath: string,
    rules: ReadonlyArray<string>,
): Promise<InitializationStatus> {
    return ensureProjectGitignoreFile({
        projectPath,
        blockHeader: CODER_GITIGNORE_HEADER,
        rules,
    });
}

// Note: [🟡] Code for coder init gitignore bootstrapping [ensureCoderGitignoreFile](src/cli/cli-commands/coder/ensureCoderGitignoreFile.ts) should never be published outside of `@promptbook/cli`
