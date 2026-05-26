import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { $initializeAgentRunnerCommand } from './initializeAgentRunnerCommand';

/**
 * Initializes `agent-folder run` command for Promptbook CLI utilities.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI.
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeAgentRunCommand(program: Program): $side_effect {
    return $initializeAgentRunnerCommand(program, {
        commandName: 'run-agent',
        aliases: ['run'],
        summary: 'Watch one agent repository continuously and answer queued user questions',
        executionMode: 'watch',
        featureLines: [
            'Automatically stages and commits answered messages with agent identity',
            'Optional post-commit git push with explicit --auto-push opt-in',
            'Optional pre-message and idle git pull with explicit --auto-pull opt-in',
            'Optional --no-ui keeps plain streaming console output for logging and debugging',
            'Supports GPG signing of commits',
            'Progress tracking and interactive controls',
        ],
        loadExecutor: async () => {
            const { runAgentMessages } = await import('../../../../scripts/run-agent-messages/main/runAgentMessages');
            return runAgentMessages;
        },
    });
}

// Note: [🟡] Code for CLI command [run](src/cli/cli-commands/agent-folder/run.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
