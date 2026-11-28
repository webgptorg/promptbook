import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { createNonNegativeIntegerOptionParser } from './createNonNegativeIntegerOptionParser';

/**
 * Registers the shared prompt-priority filter options on a queue-based `ptbk coder` command.
 *
 * @private internal utility of `promptbookCli`
 */
export function addPromptPriorityOptions(command: Program): void {
    command.option(
        '--priority <minimum-priority>',
        'Alias for --min-priority; filter prompts by minimum priority level',
        createNonNegativeIntegerOptionParser('--priority'),
    );
    command.option(
        '--min-priority <minimum-priority>',
        'Filter prompts by minimum priority level',
        createNonNegativeIntegerOptionParser('--min-priority'),
    );
    command.option(
        '--max-priority <maximum-priority>',
        'Filter prompts by maximum priority level',
        createNonNegativeIntegerOptionParser('--max-priority'),
    );
}

// Note: [🟡] Code for CLI prompt priority options [promptPriorityCliOptions](src/cli/cli-commands/common/promptPriorityCliOptions.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names
