import type { Command as Program } from 'commander';
import { spaceTrim } from 'spacetrim';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { NotAllowed } from '../../../errors/NotAllowed';
import { DEFAULT_CODER_CHECK_COMMAND } from '../../../../scripts/run-codex-prompts/checks/CheckBeforeMode';
import { assertProjectCheckIsConfigured } from '../../../../scripts/run-codex-prompts/checks/projectCheck';
import { resolveCoderProjectContext } from '../../../../scripts/run-codex-prompts/common/resolveCoderProjectContext';
import { runCoderFix, validateCoderFixOptions } from '../../../../scripts/run-codex-prompts/main/runCoderFix';
import { addCoderCheckOptions, normalizeCheckCommandOption } from '../common/coderCheckCliOptions';
import { $assertSufficientFreeDiskSpace } from '../common/disk-space/$assertSufficientFreeDiskSpace';
import { handleActionErrors } from '../common/handleActionErrors';
import { normalizeProjectCliOptions, type ProjectCliOptions } from '../common/projectCliOptions';
import {
    addPromptRunnerExecutionOptions,
    addPromptRunnerSelectionOptions,
    normalizePromptRunnerCliOptions,
    type PromptRunnerCliOptions,
} from '../common/promptRunnerCliOptions';
import {
    addQuestionsOption,
    normalizeQuestionsCliOptions,
    type QuestionsCliOptions,
} from '../common/questionsCliOptions';
import { $preflightWorkspaceRepository } from '../common/workspaceRepository';
import { addWorkspaceRepositoryOptions } from '../common/workspaceRepositoryCliOptions';
import { addCoderExecutionOptions } from './agentCliOptions';
import { DEFAULT_WAIT_AFTER_ERROR_MS, parseOptionalWaitDuration } from './waitOptions';

/**
 * Shared shell convention for an interrupted finite command.
 * @private internal CLI exit convention
 */
const INTERRUPTED_EXIT_CODE = 130;

/**
 * Registers a finite check-repair command with the shared parser, defaults and execution policy.
 * @private internal CLI command registration
 */
export function $initializeCoderFixCommand(program: Program): $side_effect {
    const command = program.command('fix').description(
        spaceTrim(`
        Run project checks, repair their failures with one PRD, verify, commit eligible changes, and exit

        Omitted --check selects npm run check in the selected project. A passing project starts no coding harness.
        Repairs use the project's Developer Book and the selected harness/model; only the selected repair runs.
        Ordinary PRDs and their statuses are left alone. There is no queue, watcher, or planning session.
        Pull and push are explicit opt-ins. --no-commit follows the shared --git-changes ignore constraint.
        Implementation/repair and check changes use separate commits; failed checks retain their genuine outcome.
        Interrupted work is preserved; --git-changes continue cannot resume arbitrary backlog tasks here.
    `),
    );
    command.option('--dry-run', 'Describe the resolved check and possible repair without executing or mutating', false);
    addPromptRunnerSelectionOptions(command);
    addQuestionsOption(command);
    addCoderExecutionOptions(command);
    addCoderCheckOptions(
        command,
        false,
        'Run checks first and verify each repair attempt (default npm run check); persist check changes separately unless --no-commit; quote commands containing flags or shell composition',
    );
    addPromptRunnerExecutionOptions(command);
    command.option('--preserve-logs', 'Keep successful check and repair artifacts', false);
    command.option('--wait-after-error <duration>', 'Delay before bounded execution-error retries (default 10m)');
    addWorkspaceRepositoryOptions(command);
    command.action(
        handleActionErrors(async (cliOptions) => {
            const inputs = cliOptions as PromptRunnerCliOptions &
                QuestionsCliOptions &
                ProjectCliOptions & {
                    readonly dryRun: boolean;
                    readonly agent?: string;
                    readonly context?: string;
                    readonly check?: string | string[];
                    readonly preserveLogs: boolean;
                    readonly waitAfterError?: string;
                };
            const runnerOptions = normalizePromptRunnerCliOptions(inputs, { isAgentRequired: !inputs.dryRun });
            const options = {
                ...runnerOptions,
                ...normalizeQuestionsCliOptions(inputs),
                dryRun: inputs.dryRun,
                agent: inputs.agent,
                context: inputs.context,
                checkCommand: normalizeCheckCommandOption(inputs.check) ?? DEFAULT_CODER_CHECK_COMMAND,
                preserveLogs: inputs.preserveLogs,
                waitAfterError: parseOptionalWaitDuration(inputs.waitAfterError, DEFAULT_WAIT_AFTER_ERROR_MS),
            };
            if (options.gitChanges === 'continue')
                throw new NotAllowed(
                    spaceTrim(`
            \`coder fix\` cannot resume an arbitrary interrupted PRD with \`--git-changes continue\`.
            Inspect the specific repair's saved PRD, trace and changes; commit or recover that work before retrying.
            Use \`--git-changes ignore\` explicitly to preserve existing work while starting a new check job.
        `),
                );
            validateCoderFixOptions(options);
            const projectOptions = normalizeProjectCliOptions(inputs);
            // Read-only discovery lets check configuration fail before an interactive Git initializer can write.
            const inspectedWorkspace = await $preflightWorkspaceRepository({
                ...projectOptions,
                policy: 'read-only',
                ...options,
            });
            await assertProjectCheckIsConfigured(options.checkCommand, inspectedWorkspace.projectPath);
            const projectContext = await resolveCoderProjectContext({
                projectPath: inspectedWorkspace.projectPath,
                agent: options.agent,
                context: options.context,
                isDefaultAgentDeferred: true,
            });
            const workspace = inputs.dryRun
                ? inspectedWorkspace
                : await $preflightWorkspaceRepository({
                      projectDirectory: inspectedWorkspace.projectPath,
                      policy: 'mutate',
                      ...options,
                  });
            if (!inputs.dryRun) await $assertSufficientFreeDiskSpace(workspace.projectPath);
            const controller = new AbortController();
            /** Cancels owned activity and waits for artifact/lock cleanup before exiting. */
            const cancel = () =>
                controller.abort(
                    new NotAllowed('Check repair interrupted; recoverable work and diagnostics were preserved.'),
                );
            if (!inputs.dryRun) {
                process.on('SIGINT', cancel);
                process.on('SIGTERM', cancel);
            }
            try {
                const result = await runCoderFix({ ...options, workspace, projectContext, signal: controller.signal });
                if (inputs.dryRun) return;
                const persistence = options.noCommit
                    ? 'Eligible changes left uncommitted.'
                    : options.autoPush
                    ? 'Eligible changes committed and pushed, when present.'
                    : 'Eligible changes committed, when present.';
                if (result.kind === 'passed-without-repair')
                    console.info(`Checks passed without repair. ${persistence}`);
                else if (result.kind === 'repaired-and-verified')
                    console.info(`Repaired and verified with \`${options.checkCommand}\`. ${persistence}`);
                else {
                    const label =
                        result.kind === 'checks-failed'
                            ? 'Unresolved check failures'
                            : result.kind === 'interrupted'
                            ? 'Check repair interrupted'
                            : result.kind === 'persistence-error'
                            ? `Git/persistence error; checks ${result.isCheckPassed ? 'passed' : 'did not pass'}`
                            : result.kind === 'execution-error'
                            ? 'Check execution error'
                            : 'Check repair setup/harness error';
                    console.error(`${label}. Ordinary PRDs were not processed.`);
                    if (result.repairPrompt) console.error(`Repair artifact: \`${result.repairPrompt.file.path}\`.`);
                    console.error(result.error instanceof Error ? result.error.message : String(result.error));
                    return process.exit(result.kind === 'interrupted' ? INTERRUPTED_EXIT_CODE : 1);
                }
            } finally {
                process.removeListener('SIGINT', cancel);
                process.removeListener('SIGTERM', cancel);
            }
        }),
    );
}

// Note: [🟡] Code for CLI command [fix](src/cli/cli-commands/coder/fix.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
