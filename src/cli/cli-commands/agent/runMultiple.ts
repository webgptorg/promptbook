import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { $initializeAgentRunnerCommand } from './initializeAgentRunnerCommand';

/**
 * Initializes `agent run-multiple` command for Promptbook CLI utilities.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI.
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeAgentRunMultipleCommand(program: Program): $side_effect {
    return $initializeAgentRunnerCommand(program, {
        commandName: 'run-multiple',
        summary: 'Watch all direct child agent repositories and answer messages in one shared session',
        featureLines: [
            'Scans only direct subdirectories of the current working directory',
            'Reuses one terminal UI across all served agent repositories',
            'Clones missing `agent-*` repositories from the configured GitHub owner when available',
            'Supports the same auto-pull, auto-push, git identity, and no-UI behavior as single-agent runs',
        ],
        loadExecutor: async () => {
            const { runMultipleAgentMessages } = await import(
                '../../../../scripts/run-agent-messages/main/runMultipleAgentMessages'
            );
            return runMultipleAgentMessages;
        },
    });
}

// Note: [🟡] Code for CLI command [run-multiple](src/cli/cli-commands/agent/runMultiple.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
