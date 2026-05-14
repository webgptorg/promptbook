import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import { assertsError } from '../../../errors/assertsError';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { handleActionErrors } from '../common/handleActionErrors';
import {
    addPromptRunnerExecutionOptions,
    addPromptRunnerSelectionOptions,
    PROMPT_RUNNER_DESCRIPTION,
} from '../common/promptRunnerCliOptions';
import type { AgentRunCliOptions } from './agentRunCliOptions';
import { createAgentRunOptionsFromCliOptions } from './agentRunCliOptions';

/**
 * Initializes `agent run` command for Promptbook CLI utilities.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI.
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeAgentRunCommand(program: Program): $side_effect {
    const command = program.command('run');
    command.description(
        spaceTrim(
            (block) => `
                Run an agent to answer user questions

                ${block(PROMPT_RUNNER_DESCRIPTION)}

                Features:
                - Automatically stages and commits answered messages with agent identity
                - Optional post-commit git push with explicit --auto-push opt-in
                - Optional --no-ui keeps plain streaming console output for logging and debugging
                - Supports GPG signing of commits
                - Progress tracking and interactive controls
            `,
        ),
    );

    addPromptRunnerSelectionOptions(command);
    addPromptRunnerExecutionOptions(command);

    command.action(
        handleActionErrors(async (cliOptions) => {
            const runOptions = createAgentRunOptionsFromCliOptions(cliOptions as AgentRunCliOptions);

            const { runAgentMessages } = await import('../../../../scripts/run-agent-messages/main/runAgentMessages');

            try {
                await runAgentMessages(runOptions);
            } catch (error) {
                assertsError(error);
                console.error(colors.bgRed(`${error.name}`));
                console.error(colors.red(error.stack || error.message));
                return process.exit(1);
            }
        }),
    );
}

// Note: [🟡] Code for CLI command [run](src/cli/cli-commands/agent/run.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
