import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import { ParseError } from '../../../errors/ParseError';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { ADAM_AGENT_BOOK_RELATIVE_PATH } from '../common/ensureAdamAgentBook';
import type { CoderGitSyncCliOptions } from '../common/coderGitSyncCliOptions';
import {
    addCoderGitSyncOptions,
    CODER_GIT_SYNC_DESCRIPTION,
    normalizeCoderGitSyncCliOptions,
} from '../common/coderGitSyncCliOptions';
import { handleActionErrors } from '../common/handleActionErrors';
import { $ensureHarnessInstallations } from '../common/harness/$ensureHarnessInstallations';
import { getHarnessDefinition } from '../common/harness/HarnessDefinition';
import {
    addQuestionsOption,
    normalizeQuestionsCliOptions,
    QUESTIONS_DESCRIPTION,
    type QuestionsCliOptions,
} from '../common/questionsCliOptions';
import { $preflightWorkspaceRepository } from '../common/workspaceRepositoryContext';
import type { PromptRunnerHarnessName } from '../common/promptRunnerCliOptions';
import { AGENTS_FILE_PATH } from './agentsFile';
import { DEFAULT_BOILERPLATE_COUNT } from './boilerplateCount';
import { getDefaultCoderProjectPromptTemplateDefinitions, PROMPTS_DIRECTORY_PATH } from './boilerplateTemplates';
import { CODER_AGENTS_DIRECTORY_PATH, CODER_DEVELOPER_AGENT_FILE_PATH } from './ensureCoderDeveloperAgentFile';
import { isDirectoryEmpty } from './ensureDirectory';
import { formatDisplayPath } from './formatDisplayPath';
import { generatePromptBoilerplate } from './generate-boilerplates';
import { initializeCoderProjectConfiguration } from './initializeCoderProjectConfiguration';
import { printInitializationSummary } from './printInitializationSummary';

export { getDefaultCoderPackageJsonScripts } from './getDefaultCoderPackageJsonScripts';
export { getDefaultCoderVscodeSettings } from './getDefaultCoderVscodeSettings';
export { initializeCoderProjectConfiguration } from './initializeCoderProjectConfiguration';

/**
 * Harnesses whose global installation is checked by `ptbk coder init` so that the initialized
 * project is ready to run coding prompts right away.
 *
 * @private internal constant of `coder init` command
 */
const CODER_INIT_CHECKED_HARNESS_NAMES: ReadonlyArray<PromptRunnerHarnessName> = ['openai-codex', 'claude-code'];

/**
 * Initializes `coder init` command for Promptbook CLI utilities.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI.
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeCoderInitCommand(program: Program, isInitializeAliasEnabled = true): $side_effect {
    const command = program.command('init');
    if (isInitializeAliasEnabled) {
        command.alias('initialize');
    }
    command.description(
        spaceTrim(
            (block) => `
                Initialize Promptbook coder configuration for current project

                Reuses an enclosing Git working tree or initializes Git in this project without asking.
                Git is ready before optional --auto-pull, --commit or --auto-push synchronization.

                Creates or updates:
                - prompts/
                - prompts/README.md (offline PRD and workflow guide; existing README is preserved)
                - prompts/done/
                ${block(listDefaultCoderProjectPromptTemplateDisplayPaths())}
                - ${CODER_DEVELOPER_AGENT_FILE_PATH}
                - agents/planner.book
                - agents/lawyer.book
                - agents/copywriter.book
                - ${CODER_AGENTS_DIRECTORY_PATH}/${ADAM_AGENT_BOOK_RELATIVE_PATH}
                - ${AGENTS_FILE_PATH}
                - .gitignore with local artifacts from every supported harness
                - package.json
                - .vscode/settings.json

                Never overwrites what the project already owns:
                - Existing package.json scripts and .vscode/settings.json settings are kept, only missing ones are added
                - Missing Developer, Planner, Lawyer, Copywriter and Adam Books are initialized even when scripts already exist
                - Adds missing local Lawyer and Copywriter TEAM references to Developer and Planner, preserving existing content
                - Helpers advise on relevant tasks; declaring TEAM does not run them for every task
                - Reports created, augmented, unchanged and unresolved Books; invalid or conflicting files are left untouched
                - Other referenced files, like coder:run context, are created with their newly added scripts

                Ensures required coding-agent environment variables in .env:
                - CODING_AGENT_GIT_NAME
                - CODING_AGENT_GIT_EMAIL
                - CODING_AGENT_GIT_SIGNING_KEY

                Checks that the coding harnesses are installed and up to date unless \`--no-questions\` is used:
                ${block(listCheckedHarnessLabels())}

                ${block(CODER_GIT_SYNC_DESCRIPTION)}

                ${block(QUESTIONS_DESCRIPTION)}
            `,
        ),
    );

    addCoderGitSyncOptions(command);
    addQuestionsOption(command);

    command.action(
        handleActionErrors(async (cliOptions) => {
            const gitSync = normalizeCoderGitSyncCliOptions(cliOptions as CoderGitSyncCliOptions);
            const questionsOptions = normalizeQuestionsCliOptions(cliOptions as QuestionsCliOptions);
            const repositoryContext = await $preflightWorkspaceRepository({ policy: 'initialize' });
            const { projectPath, gitRootPath, repositoryStatus } = repositoryContext;
            if (repositoryStatus === 'existing') {
                console.info(`Git repository reused in ${gitRootPath}`);
            }

            let completedStep = 'Git repository setup';

            try {
                // Import Git synchronization dynamically to keep help and version startup lightweight.
                const { $commitCoderChanges, $startCoderGitSync } = await import(
                    '../../../../scripts/run-codex-prompts/git/coderGitSync'
                );

                const commitScope = await $startCoderGitSync({ gitSync, projectPath, repositoryRootPath: gitRootPath });
                completedStep = 'optional Git pull and change-scope capture';
                // Check before initialization adds the README, templates and archive directory.
                const isPromptsDirectoryEmpty = await isDirectoryEmpty(projectPath, PROMPTS_DIRECTORY_PATH);

                const summary = await initializeCoderProjectConfiguration(projectPath);
                completedStep = 'project configuration files';
                printInitializationSummary(summary);

                if (
                    summary.adamAgentFileStatus === 'unresolved' ||
                    summary.referencedArtifactStatuses.some(({ status }) => status === 'unresolved')
                ) {
                    throw new ParseError(
                        spaceTrim(
                            'Some default Books or TEAM references remain **unresolved**. Review the diagnostics above, fix the affected files, and run `ptbk coder init` again.',
                        ),
                    );
                }

                if (isPromptsDirectoryEmpty) {
                    await generatePromptBoilerplate({ projectPath, boilerplateCount: DEFAULT_BOILERPLATE_COUNT });
                }
                completedStep = 'prompt boilerplates';

                await $commitCoderChanges({
                    gitSync,
                    commitScope,
                    commitMessage: 'Initialize Promptbook Coder',
                });
                completedStep = 'optional Git commit and push';

                await $ensureHarnessInstallations(CODER_INIT_CHECKED_HARNESS_NAMES, questionsOptions);
                console.info('Promptbook coder initialization completed.');
            } catch (error) {
                const details = error instanceof Error ? error.message : String(error);
                throw new ParseError(
                    spaceTrim(`
                        Initialization stopped after ${completedStep}.

                        Git repository: ${repositoryStatus === 'initialized' ? 'created' : 'reused'} at \`${gitRootPath}\`.
                        Project files may be partially updated; existing files were preserved where possible.

                        ${details}
                    `),
                );
            }
        }),
    );
}

/**
 * Lists the harnesses whose global installation is checked by `ptbk coder init`.
 */
function listCheckedHarnessLabels(): string {
    return CODER_INIT_CHECKED_HARNESS_NAMES.map((harnessName) => `- ${getHarnessDefinition(harnessName).label}`).join(
        '\n',
    );
}

/**
 * Lists the project-owned template file paths created by `ptbk coder init`.
 */
function listDefaultCoderProjectPromptTemplateDisplayPaths(): string {
    return getDefaultCoderProjectPromptTemplateDefinitions()
        .map(({ relativeFilePath }) => `- ${formatDisplayPath(relativeFilePath)}`)
        .join('\n');
}

// Note: [🟡] Code for CLI command [init](src/cli/cli-commands/coder/init.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
