import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';

/**
 * Commander option bag for an optional Book agent used by coder commands.
 *
 * @private internal utility of `ptbk coder`
 */
export type CoderAgentCliOptions = {
    readonly agent?: string;
};

/**
 * Description shared by coder commands which accept an agent Book.
 *
 * @private internal utility of `ptbk coder`
 */
export const CODER_AGENT_OPTION_DESCRIPTION =
    'Path to a .book file used to personalize coding prompts and select agent-specific tasks';

/**
 * Registers the shared `--agent` option for coder commands.
 *
 * @private internal utility of `ptbk coder`
 */
export function addCoderAgentOption(command: Program): void {
    command.option('--agent <agent-book-path>', CODER_AGENT_OPTION_DESCRIPTION);
}

// Note: [🟡] Code for CLI coder agent options should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names
