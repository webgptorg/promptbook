import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { handleActionErrors } from '../common/handleActionErrors';
import { $ensureHarnessInstallations } from '../common/harness/$ensureHarnessInstallations';
import {
    addHarnessUpdateOption,
    normalizeHarnessUpdateCliOptions,
    type HarnessUpdateCliOptions,
} from '../common/harnessUpdateCliOptions';
import type { PromptRunnerSelectionCliOptions } from '../common/promptRunnerCliOptions';
import {
    addPromptRunnerRuntimeOptions,
    addPromptRunnerSelectionOptions,
    normalizePromptRunnerSelectionCliOptions,
    PROMPT_RUNNER_DESCRIPTION,
} from '../common/promptRunnerCliOptions';
import { parseOptionalPeriodDuration } from './waitOptions';

/**
 * Initializes `coder ping` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeCoderPingCommand(program: Program): $side_effect {
    const command = program.command('ping');
    command.description(
        spaceTrim(`
            Send one tiny dummy prompt to a harness and model to measure and warm them up

            ${PROMPT_RUNNER_DESCRIPTION}

            Features:
            - Verifies that the selected harness, model, thinking level and authentication really work
            - Reports the answer of the harness, the response time and the reported usage
            - Starts the hourly/weekly quota window before you need it, so it is already refreshing when you do
            - Optional --period keeps the quota window refreshing by pinging once per period until stopped
            - Leaves the project exactly as it was — nothing is read, written, changed or committed
            - Checks that the selected harness is installed and up to date unless --no-harness-update is used
            - Use --no-ui to stream the raw harness output instead of only the compact result
        `),
    );

    addPromptRunnerSelectionOptions(command);
    addHarnessUpdateOption(command);
    addPromptRunnerRuntimeOptions(command);
    command.option(
        '--period <duration>',
        spaceTrim(`
            Keep pinging once per period instead of pinging only once.
            Accepts durations like 5h, 30m, 1h30m and repeats until it is stopped with CTRL+C.
        `),
    );

    command.action(
        handleActionErrors(async (cliOptions) => {
            const { period: periodValue } = cliOptions as {
                readonly period?: string;
            } & PromptRunnerSelectionCliOptions;

            const runnerOptions = normalizePromptRunnerSelectionCliOptions(
                cliOptions as PromptRunnerSelectionCliOptions,
                { isAgentRequired: true },
            );
            const { isHarnessUpdateCheckEnabled } = normalizeHarnessUpdateCliOptions(
                cliOptions as HarnessUpdateCliOptions,
            );

            // Note: The period is validated before the harness installation check, so a mistyped duration fails fast
            const periodMs = parseOptionalPeriodDuration('--period', periodValue);

            await $ensureHarnessInstallations([runnerOptions.agentName], isHarnessUpdateCheckEnabled);

            const pingOptions = {
                agentName: runnerOptions.agentName,
                model: runnerOptions.model,
                thinkingLevel: runnerOptions.thinkingLevel,
                allowCredits: runnerOptions.allowCredits,
                shouldPrintLiveOutput: runnerOptions.noUi,
            };

            // Note: Import the ping dynamically to avoid loading heavy dependencies until needed
            if (periodMs !== undefined) {
                const { pingCoderHarnessPeriodically } = await import(
                    '../../../../scripts/run-codex-prompts/ping/pingCoderHarnessPeriodically'
                );

                // Note: This never returns - it keeps pinging until the user stops the process
                await pingCoderHarnessPeriodically({ ...pingOptions, periodMs });
                return;
            }

            const { pingCoderHarness } = await import('../../../../scripts/run-codex-prompts/ping/pingCoderHarness');
            const { printCoderPingResult } = await import(
                '../../../../scripts/run-codex-prompts/ping/printCoderPingResult'
            );

            printCoderPingResult(await pingCoderHarness(pingOptions));
        }),
    );
}

// Note: [🟡] Code for CLI command [ping](src/cli/cli-commands/coder/ping.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
