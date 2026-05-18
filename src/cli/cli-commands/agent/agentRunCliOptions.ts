import type { NormalizedPromptRunnerCliOptions, PromptRunnerCliOptions } from '../common/promptRunnerCliOptions';
import { normalizePromptRunnerCliOptions } from '../common/promptRunnerCliOptions';

/**
 * Options passed from `ptbk agent` CLI commands to the message runner.
 *
 * @private internal utility of `ptbk agent`
 */
export type AgentRunCliOptions = PromptRunnerCliOptions & {
    readonly autoClone?: boolean;
    readonly ignore?: string;
};

/**
 * Normalized options passed from `ptbk agent` CLI commands to the message runner.
 *
 * @private internal utility of `ptbk agent`
 */
export type NormalizedAgentRunCliOptions = NormalizedPromptRunnerCliOptions & {
    readonly autoClone: boolean;
    readonly ignore?: string;
};

/**
 * Converts Commander options into the `scripts/run-agent-messages` option shape.
 *
 * @private internal utility of `ptbk agent`
 */
export function createAgentRunOptionsFromCliOptions(cliOptions: AgentRunCliOptions): NormalizedAgentRunCliOptions {
    const runnerOptions = normalizePromptRunnerCliOptions(cliOptions, {
        isAgentRequired: true,
    });
    const ignore = cliOptions.ignore?.trim() || undefined;

    return {
        ...runnerOptions,
        autoClone: Boolean(cliOptions.autoClone),
        ignore,
    };
}

// Note: [🟡] Code for CLI command [agent](src/cli/cli-commands/agent/agentRunCliOptions.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names
