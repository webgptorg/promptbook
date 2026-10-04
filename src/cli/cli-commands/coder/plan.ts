import { join, relative } from 'path';
import type { Command as Program } from 'commander';
import { readFile } from 'fs/promises';
import { NotAllowed } from '../../../errors/NotAllowed';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { spaceTrim } from '../../../utils/organization/spaceTrim';
import { addCoderGitSyncOptions, normalizeCoderGitSyncCliOptions } from '../common/coderGitSyncCliOptions';
import { $preflightWorkspaceRepository } from '../common/workspaceRepository';
import { addWorkspaceRepositoryOptions } from '../common/workspaceRepositoryCliOptions';
import { normalizeProjectCliOptions } from '../common/projectCliOptions';
import { handleActionErrors } from '../common/handleActionErrors';
import {
    addPromptRunnerRuntimeOptions,
    addPromptRunnerSelectionOptions,
    normalizePromptRunnerSelectionCliOptions,
} from '../common/promptRunnerCliOptions';
import { addCoderExecutionOptions } from './agentCliOptions';

/**
 * Registers the repository-aware, planning-only conversation under the existing coder command group.
 * @private internal utility of `promptbookCli`
 */
export function $initializeCoderPlanCommand(program: Program): $side_effect {
    const command = program.command('plan').description(
        spaceTrim(`
        Discuss features with the project's Developer Book and review PRDs before saving them.

        Run ptbk coder init first. Default Book: agents/developer.book; --agent overrides the Book,
        independently of --harness and --model. Use --agent ./agents/planner.book for Planner. Currently supports openai-codex with restricted tools.
        Requires an interactive terminal and a Codex version supporting --ignore-user-config and --ignore-rules.
        Codex configuration, plugins, hooks and native tools are isolated; --model default uses Codex's built-in default.
        /save applies reviewed proposals, /draft saves [-] drafts, /discard drops proposals, /exit ends.
        Only PRD Markdown files under prompts/ can change. No implementation or queue launch occurs.
        Git sync is opt-in: --auto-pull before planning, --commit for session PRDs, --auto-push only with --commit.
    `),
    );
    addPromptRunnerSelectionOptions(command);
    addPromptRunnerRuntimeOptions(command);
    addCoderExecutionOptions(command);
    addCoderGitSyncOptions(command);
    command.option(
        '--template <path>',
        'PRD template (defaults to the project-owned prompts/templates/common.md when present)',
    );
    addWorkspaceRepositoryOptions(command);

    command.action(
        handleActionErrors(async (cliOptions) => {
            const projectOptions = normalizeProjectCliOptions(cliOptions);
            const { createPlanningTerminal } = await import('./planning/createPlanningTerminal');
            const { runPlanningSession } = await import('./planning/runPlanningSession');
            const { resolvePlanningPath } = await import('./planning/resolvePlanningPath');
            const { assertPlanningHarnessSupported } = await import('./planning/runPlanningHarness');
            const { assertPlanningCommitSafe } = await import('./planning/assertPlanningCommitSafe');
            const { $startCoderGitSync, $commitCoderChanges } = await import(
                '../../../../scripts/run-codex-prompts/git/coderGitSync'
            );
            const options = normalizePromptRunnerSelectionCliOptions(cliOptions, { isAgentRequired: true });
            assertPlanningHarnessSupported(options.agentName);
            const gitSync = normalizeCoderGitSyncCliOptions(cliOptions);
            const workspace = await $preflightWorkspaceRepository({
                ...projectOptions,
                policy: 'mutate',
                isAskingQuestionsEnabled: cliOptions.questions,
            });
            if (cliOptions.questions === false) {
                throw new NotAllowed(
                    spaceTrim(
                        '`ptbk coder plan` requires an interactive conversation and review. Run it without `--no-questions` in a terminal.',
                    ),
                );
            }
            const { resolveCoderProjectContext } = await import(
                '../../../../scripts/run-codex-prompts/common/resolveCoderProjectContext'
            );
            const projectContext = await resolveCoderProjectContext({
                ...cliOptions,
                projectPath: workspace.projectPath,
            });
            const terminal = createPlanningTerminal();
            try {
                const { projectPath } = workspace;
                if (gitSync.isCommitEnabled) {
                    assertPlanningCommitSafe(projectPath);
                    assertPlanningCommitSafe(workspace.repositoryRoot!);
                }
                const commitScope = await $startCoderGitSync({ workspace, gitSync });
                const saved = await runPlanningSession(
                    {
                        ...options,
                        projectPath,
                        agent: cliOptions.agent,
                        context: cliOptions.context,
                        projectContext,
                        template: cliOptions.template,
                        preexistingChangedPaths: gitSync.isCommitEnabled
                            ? new Set(
                                  Array.from(commitScope.snapshotBeforeOperation.changedFileHashes.keys(), (path) =>
                                      relative(projectPath, join(workspace.repositoryRoot!, path)).replace(/\\/gu, '/'),
                                  ),
                              )
                            : undefined,
                    },
                    terminal,
                );
                if (terminal.signal.aborted) return;
                // A file edited by the user after saving must not be swept into a session commit either.
                if (gitSync.isCommitEnabled) {
                    assertPlanningCommitSafe(projectPath);
                    for (const [path, content] of saved) {
                        if ((await readFile(resolvePlanningPath(projectPath, path, true), 'utf-8')) !== content) {
                            throw new NotAllowed(
                                spaceTrim(
                                    `\`${path}\` changed after planning saved it. The planning commit was skipped; review the working tree.`,
                                ),
                            );
                        }
                    }
                }
                await $commitCoderChanges({
                    gitSync,
                    commitScope,
                    commitMessage: 'Plan project tasks',
                    relevantPaths: [...saved.keys()].map((path) =>
                        relative(workspace.repositoryRoot!, join(projectPath, path)).replace(/\\/gu, '/'),
                    ),
                });
            } catch (error) {
                if (!terminal.signal.aborted) throw error;
                console.info('Planning cancelled. Saved PRDs remain intact.');
            } finally {
                terminal.close();
            }
        }),
    );
}

// Note: [🟡] CLI planning must never be published outside of `@promptbook/cli`.
// Note: [💞] Ignore a discrepancy between file name and entity name.
