import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../errors/NotAllowed';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { $ensureHarnessInstallations } from '../common/harness/$ensureHarnessInstallations';
import { handleActionErrors } from '../common/handleActionErrors';
import type { PromptRunnerSelectionCliOptions } from '../common/promptRunnerCliOptions';
import {
    addPromptRunnerRuntimeOptions,
    addPromptRunnerSelectionOptions,
    normalizePromptRunnerSelectionCliOptions,
    PROMPT_RUNNER_DESCRIPTION,
} from '../common/promptRunnerCliOptions';

/**
 * Initializes `coder ping` command for Promptbook CLI utilities.
 *
 * The command makes one small, isolated harness/model call, prints its result
 * and reports how long the harness/model turn took.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI.
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeCoderPingCommand(program: Program): $side_effect {
    const command = program.command('ping');
    command.description(
        spaceTrim(`
            Test one harness and model connection with a small disposable task

            ${PROMPT_RUNNER_DESCRIPTION}

            Features:
            - Runs the dummy task in a temporary directory outside the current project
            - Prints the result returned by the selected harness and model
            - Reports the elapsed harness/model response time in milliseconds
            - Can be used to start consuming an applicable harness/model quota before a longer run
        `),
    );

    addPromptRunnerSelectionOptions(command);
    addPromptRunnerRuntimeOptions(command);

    command.action(
        handleActionErrors(async (cliOptions) => {
            const normalizedOptions = normalizePromptRunnerSelectionCliOptions(
                cliOptions as PromptRunnerSelectionCliOptions,
                { isAgentRequired: true },
            );

            const agentName = normalizedOptions.agentName;
            if (!agentName) {
                throw new NotAllowed(
                    spaceTrim(`
                        A harness is required for \`ptbk coder ping\`.

                        Pass one with \`--harness <harness-name>\`.
                    `),
                );
            }

            await $ensureHarnessInstallations([agentName]);

            // Note: Import the runner-backed implementation dynamically to avoid loading heavy dependencies until needed.
            const { runCoderPing } = await import('../../../../scripts/run-agent-chat/runCoderPing');
            const pingResult = await runCoderPing({
                agentName,
                model: normalizedOptions.model,
                thinkingLevel: normalizedOptions.thinkingLevel,
                isUiDisabled: normalizedOptions.noUi,
                isCreditsAllowed: normalizedOptions.allowCredits,
            });

            printCoderPingResult(pingResult);
        }),
    );
}

/**
 * Prints the result and duration of one completed coder ping.
 */
function printCoderPingResult(pingResult: { readonly result: string; readonly elapsedTimeMs: number }): void {
    console.info(
        spaceTrim(`
            Result: ${pingResult.result}
            Time: ${pingResult.elapsedTimeMs.toFixed(0)} ms
        `),
    );
}

// Note: [🟡] Code for CLI command [ping](src/cli/cli-commands/coder/ping.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
