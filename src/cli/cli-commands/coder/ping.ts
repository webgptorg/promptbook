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
            - Leaves the project exactly as it was — nothing is read, written, changed or committed
            - Checks that the selected harness is installed globally and up to date unless --no-harness-update is used
            - Use --no-ui to stream the raw harness output instead of only the compact result
        `),
    );

    addPromptRunnerSelectionOptions(command);
    addHarnessUpdateOption(command);
    addPromptRunnerRuntimeOptions(command);

    command.action(
        handleActionErrors(async (cliOptions) => {
            const runnerOptions = normalizePromptRunnerSelectionCliOptions(
                cliOptions as PromptRunnerSelectionCliOptions,
                { isAgentRequired: true },
            );
            const { isHarnessUpdateCheckEnabled } = normalizeHarnessUpdateCliOptions(
                cliOptions as HarnessUpdateCliOptions,
            );

            await $ensureHarnessInstallations([runnerOptions.agentName], isHarnessUpdateCheckEnabled);

            // Note: Import the ping dynamically to avoid loading heavy dependencies until needed
            const { pingCoderHarness } = await import('../../../../scripts/run-codex-prompts/ping/pingCoderHarness');
            const { printCoderPingResult } = await import(
                '../../../../scripts/run-codex-prompts/ping/printCoderPingResult'
            );

            const result = await pingCoderHarness({
                agentName: runnerOptions.agentName,
                model: runnerOptions.model,
                thinkingLevel: runnerOptions.thinkingLevel,
                allowCredits: runnerOptions.allowCredits,
                shouldPrintLiveOutput: runnerOptions.noUi,
            });

            printCoderPingResult(result);
        }),
    );
}

// Note: [🟡] Code for CLI command [ping](src/cli/cli-commands/coder/ping.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
