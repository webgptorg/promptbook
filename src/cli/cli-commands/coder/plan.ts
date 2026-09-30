import type { Command as Program } from 'commander';
import { readFile } from 'fs/promises';
import { relative, resolve } from 'path';
import { NotAllowed } from '../../../errors/NotAllowed';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { spaceTrim } from '../../../utils/organization/spaceTrim';
import { addCoderGitSyncOptions, normalizeCoderGitSyncCliOptions } from '../common/coderGitSyncCliOptions';
import { handleActionErrors } from '../common/handleActionErrors';
import { addQuestionsOption, assertRequiredQuestionsAreAllowed, normalizeQuestionsCliOptions } from '../common/questionsCliOptions';
import { $preflightWorkspaceRepository } from '../common/workspaceRepositoryContext';
import {
    addPromptRunnerRuntimeOptions,
    addPromptRunnerSelectionOptions,
    normalizePromptRunnerSelectionCliOptions,
} from '../common/promptRunnerCliOptions';
import { addCoderAgentOption } from './agentCliOptions';

/**
 * Registers the repository-aware, planning-only conversation under the existing coder command group.
 * @private internal utility of `promptbookCli`
 */
export function $initializeCoderPlanCommand(program: Program): $side_effect {
    const command = program.command('plan').description(
        spaceTrim(`
        Discuss features with the project's Planner and review PRDs before saving them.

        Run ptbk coder init first. Default Book: agents/planner.book; --agent overrides the Book,
        independently of --harness and --model. Currently supports openai-codex with restricted tools.
        Requires an interactive terminal and a Codex version supporting --ignore-user-config and --ignore-rules.
        Codex configuration, plugins, hooks and native tools are isolated; --model default uses Codex's built-in default.
        /save applies reviewed proposals, /draft saves [-] drafts, /discard drops proposals, /exit ends.
        Only PRD Markdown files under prompts/ can change. No implementation or queue launch occurs.
        Git sync is opt-in: --auto-pull before planning, --commit for session PRDs, --auto-push only with --commit.
    `),
    );
    addPromptRunnerSelectionOptions(command);
    addPromptRunnerRuntimeOptions(command);
    addCoderAgentOption(command, 'planner');
    addCoderGitSyncOptions(command);
    addQuestionsOption(command);
    command.option(
        '--template <path>',
        'PRD template (defaults to the project-owned prompts/templates/common.md when present)',
    );
    command.action(
        handleActionErrors(async (cliOptions) => {
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
            const questionsOptions = normalizeQuestionsCliOptions(cliOptions);
            const { projectPath, gitRootPath } = await $preflightWorkspaceRepository({
                policy: 'mutate',
                questionsOptions,
            });
            assertRequiredQuestionsAreAllowed({ action: 'ptbk coder plan', ...questionsOptions });
            const terminal = createPlanningTerminal();
            try {
                if (gitSync.isCommitEnabled) assertPlanningCommitSafe(projectPath);
                const commitScope = await $startCoderGitSync({ projectPath, repositoryRootPath: gitRootPath, gitSync });
                const saved = await runPlanningSession(
                    {
                        ...options,
                        projectPath,
                        agent: cliOptions.agent,
                        template: cliOptions.template,
                        preexistingChangedPaths: gitSync.isCommitEnabled
                            ? new Set(commitScope.snapshotBeforeOperation.changedFileHashes.keys())
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
                        relative(gitRootPath!, resolve(projectPath, path)).replace(/\\/gu, '/'),
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
