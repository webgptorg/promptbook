import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { $initializeAgentRunnerCommand } from './initializeAgentRunnerCommand';

/**
 * Initializes `agent tick` command for Promptbook CLI utilities.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI.
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeAgentTickCommand(program: Program): $side_effect {
    return $initializeAgentRunnerCommand(program, {
        commandName: 'run-once',
        aliases: ['tick'],
        summary: 'Answer one queued user message in the current agent repository and then exit',
        executionMode: 'once',
        featureLines: [
            'Automatically stages and commits the answered message with agent identity',
            'Optional post-commit git push with explicit --auto-push opt-in',
            'Optional pre-message git pull with explicit --auto-pull opt-in',
            'Optional --no-ui keeps plain streaming console output for logging and debugging',
            'Supports GPG signing of commits',
        ],
        loadExecutor: async () => {
            const { tickAgentMessages } = await import('../../../../scripts/run-agent-messages/main/tickAgentMessages');
            return tickAgentMessages;
        },
    });
}

// Note: [🟡] Code for CLI command [tick](src/cli/cli-commands/agent/tick.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
