import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { handleActionErrors } from '../common/handleActionErrors';
import { addPromptPriorityOptions } from '../common/promptPriorityCliOptions';
import type { PromptRunnerSelectionCliOptions } from '../common/promptRunnerCliOptions';
import {
    addPromptRunnerSelectionOptions,
    normalizePromptRunnerSelectionCliOptions,
    PROMPT_RUNNER_DESCRIPTION,
} from '../common/promptRunnerCliOptions';

/**
 * Initializes `coder list` command for Promptbook CLI utilities.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI.
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeCoderListCommand(program: Program): $side_effect {
    const command = program.command('list');
    command.description(
        spaceTrim(`
            List ready coding prompts by priority without executing them

            ${PROMPT_RUNNER_DESCRIPTION}

            Features:
            - Lists only ready, fully authored prompts
            - Groups prompts from highest to lowest priority
            - Optional --harness and --model filters show only prompts compatible with that runner
            - Does not start a coding harness or modify prompt files
        `),
    );

    addPromptRunnerSelectionOptions(command);
    addPromptPriorityOptions(command);

    command.action(
        handleActionErrors(async (cliOptions) => {
            const {
                priority,
                minPriority: minimumPriority,
                maxPriority: maximumPriority,
            } = cliOptions as {
                readonly priority?: number;
                readonly minPriority?: number;
                readonly maxPriority?: number;
            } & PromptRunnerSelectionCliOptions;
            const runnerOptions = normalizePromptRunnerSelectionCliOptions(
                cliOptions as PromptRunnerSelectionCliOptions,
                { isAgentRequired: false },
            );
            const promptRunnerIdentity =
                runnerOptions.agentName === undefined && runnerOptions.model === undefined
                    ? undefined
                    : {
                          harnessName: runnerOptions.agentName,
                          modelName: runnerOptions.model,
                      };

            // Note: Import dynamically to avoid loading prompt parsing dependencies until this command is used.
            const { listCoderPrompts } = await import('../../../../scripts/run-codex-prompts/main/listCoderPrompts');
            await listCoderPrompts({
                priority,
                minimumPriority,
                maximumPriority,
                promptRunnerIdentity,
            });
        }),
    );
}

// Note: [🟡] Code for CLI command [list](src/cli/cli-commands/coder/list.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
