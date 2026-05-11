import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { assertsError } from '../../../errors/assertsError';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { handleActionErrors } from '../common/handleActionErrors';
import {
    addPromptRunnerExecutionOptions,
    addPromptRunnerSelectionOptions,
    PROMPT_RUNNER_DESCRIPTION,
} from '../common/promptRunnerCliOptions';
import { type AgentRunCliOptions, createAgentRunOptionsFromCliOptions } from './agentRunCliOptions';

/**
 * Initializes `agent tick` command for Promptbook CLI utilities.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI.
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeAgentTickCommand(program: Program): $side_effect {
    const command = program.command('tick');
    command.description(
        [
            'Answer one queued user message and then exit',
            '',
            PROMPT_RUNNER_DESCRIPTION,
            '',
            'Features:',
            '- Automatically stages and commits answered messages with agent identity',
            '- Optional post-commit git push with explicit --auto-push opt-in',
            '- Optional --no-ui keeps plain streaming console output for logging and debugging',
            '- Supports GPG signing of commits',
        ].join('\n'),
    );

    addPromptRunnerSelectionOptions(command);
    addPromptRunnerExecutionOptions(command);

    command.action(
        handleActionErrors(async (cliOptions) => {
            const runOptions = createAgentRunOptionsFromCliOptions(cliOptions as AgentRunCliOptions);

            const { tickAgentMessages } = await import('../../../../scripts/run-agent-messages/main/tickAgentMessages');

            try {
                await tickAgentMessages(runOptions);
            } catch (error) {
                assertsError(error);
                console.error(colors.bgRed(`${error.name}`));
                console.error(colors.red(error.stack || error.message));
                return process.exit(1);
            }
        }),
    );
}

// Note: [🟡] Code for CLI command [tick](src/cli/cli-commands/agent/tick.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
