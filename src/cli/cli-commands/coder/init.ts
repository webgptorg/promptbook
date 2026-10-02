import { withWorkspaceMutation } from '../../../../scripts/run-codex-prompts/git/workspaceMutation';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import { ParseError } from '../../../errors/ParseError';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { ADAM_AGENT_BOOK_RELATIVE_PATH } from '../common/ensureAdamAgentBook';
import type { CoderGitSyncCliOptions } from '../common/coderGitSyncCliOptions';
import {
    addCoderGitSyncOptions,
    CODER_GIT_SYNC_DESCRIPTION,
    normalizeCoderGitSyncCliOptions,
} from '../common/coderGitSyncCliOptions';
import { $preflightWorkspaceRepository } from '../common/workspaceRepository';
import { addWorkspaceRepositoryOptions } from '../common/workspaceRepositoryCliOptions';
import { handleActionErrors } from '../common/handleActionErrors';
import { $ensureHarnessInstallations } from '../common/harness/$ensureHarnessInstallations';
import { getHarnessDefinition } from '../common/harness/HarnessDefinition';
import {
    addQuestionsOption,
    normalizeQuestionsCliOptions,
    QUESTIONS_DESCRIPTION,
    type QuestionsCliOptions,
} from '../common/questionsCliOptions';
import type { PromptRunnerHarnessName } from '../common/promptRunnerCliOptions';
import { AGENTS_FILE_PATH } from './agentsFile';
import { DEFAULT_BOILERPLATE_COUNT } from './boilerplateCount';
import { getDefaultCoderProjectPromptTemplateDefinitions, PROMPTS_DIRECTORY_PATH } from './boilerplateTemplates';
import { CODER_AGENTS_DIRECTORY_PATH, CODER_DEVELOPER_AGENT_FILE_PATH } from './ensureCoderDeveloperAgentFile';
import { isDirectoryEmpty } from './ensureDirectory';
import { formatDisplayPath } from './formatDisplayPath';
import { generatePromptBoilerplate } from './generate-boilerplates';
import { getCoderInitializationCommitPaths } from './getCoderInitializationCommitPaths';
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
export function $initializeCoderInitCommand(program: Program): $side_effect {
    const command = program.command('init');
    command.alias('initialize');
    command.description(
        spaceTrim(
            (block) => `
                Initialize Git and Promptbook coder configuration for current project

                Equivalent entrypoints: \`ptbk init\`, \`ptbk coder init\`, and \`ptbk coder initialize\`.
                Creates a local Git working tree automatically when missing, including with \`--no-questions\`.
                Reuses an enclosing repository without changing its history, configuration or index.
                Does not stage existing files or create a first commit unless \`--commit\` is explicitly requested.

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

    addWorkspaceRepositoryOptions(command);

    command.action(
        handleActionErrors(async (cliOptions) => {
            const gitSync = normalizeCoderGitSyncCliOptions(cliOptions as CoderGitSyncCliOptions);
            const questionsOptions = normalizeQuestionsCliOptions(cliOptions as QuestionsCliOptions);
            const workspace = await $preflightWorkspaceRepository({ policy: 'initialize', ...questionsOptions });
            return withWorkspaceMutation(workspace, async () => {
                const { projectPath } = workspace;

                const completedSteps = [`Git repository ${workspace.repositoryStatus}: ${workspace.repositoryRoot}`];
                try {
                    // Note: Import the git synchronization dynamically to keep the CLI fast for runs without `--commit`
                    const { $commitCoderChanges, $startCoderGitSync } = await import(
                        '../../../../scripts/run-codex-prompts/git/coderGitSync'
                    );

                    const commitScope = await $startCoderGitSync({ gitSync, workspace });
                    completedSteps.push('Requested Git synchronization and initial change scope');
                    // Check before initialization adds the README, templates and archive directory.
                    const isPromptsDirectoryEmpty = await isDirectoryEmpty(projectPath, PROMPTS_DIRECTORY_PATH);

                    const summary = await initializeCoderProjectConfiguration(projectPath, (step) =>
                        completedSteps.push(step),
                    );
                    printInitializationSummary(summary, workspace);

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

                    let boilerplatePaths: ReadonlyArray<string> = [];
                    if (isPromptsDirectoryEmpty) {
                        boilerplatePaths = await generatePromptBoilerplate({
                            projectPath,
                            boilerplateCount: DEFAULT_BOILERPLATE_COUNT,
                        });
                        completedSteps.push('Prompt boilerplates');
                    }

                    await $commitCoderChanges({
                        gitSync,
                        commitScope,
                        commitMessage: 'Initialize Promptbook Coder',
                        relevantPaths: getCoderInitializationCommitPaths(workspace, summary, boilerplatePaths),
                    });

                    if (gitSync.isCommitEnabled) completedSteps.push('Scoped initialization commit');
                    await $ensureHarnessInstallations(CODER_INIT_CHECKED_HARNESS_NAMES, {
                        isAskingQuestionsEnabled:
                            questionsOptions.isAskingQuestionsEnabled && Boolean(process.stdin.isTTY),
                    });
                    console.info('Promptbook project initialized.');
                } catch (error) {
                    throw new EnvironmentMismatchError(
                        spaceTrim(
                            (block) => `
                    Promptbook project initialization is incomplete in \`${projectPath}\`.

                    Completed setup steps:
                    ${block(completedSteps.map((step) => `- ${step}`).join('\n'))}

                    The failing step may have left partial files. Review them and rerun \`ptbk init\`.
                    ${block(error instanceof Error ? error.message : String(error))}
                `,
                        ),
                    );
                }
            });
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
