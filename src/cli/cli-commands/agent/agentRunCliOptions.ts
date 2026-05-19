import type { NormalizedPromptRunnerCliOptions, PromptRunnerCliOptions } from '../common/promptRunnerCliOptions';
import { normalizePromptRunnerCliOptions } from '../common/promptRunnerCliOptions';

/**
 * Options passed from `ptbk agent` CLI commands to the message runner.
 *
 * @private internal utility of `ptbk agent`
 */
export type AgentRunCliOptions = PromptRunnerCliOptions & {
    readonly autoClone?: boolean;
    readonly ignore?: string | readonly string[];
};

/**
 * Normalized options passed from `ptbk agent` CLI commands to the message runner.
 *
 * @private internal utility of `ptbk agent`
 */
export type NormalizedAgentRunCliOptions = NormalizedPromptRunnerCliOptions & {
    readonly autoClone: boolean;
    readonly ignorePatterns: readonly string[];
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

    return {
        ...runnerOptions,
        autoClone: Boolean(cliOptions.autoClone),
        ignorePatterns: normalizeAgentIgnorePatterns(cliOptions.ignore),
    };
}

/**
 * Normalizes one or more `--ignore` option values into a stable pattern list.
 *
 * @private internal utility of `ptbk agent`
 */
function normalizeAgentIgnorePatterns(ignore: string | readonly string[] | undefined): readonly string[] {
    const patterns = Array.isArray(ignore) ? ignore : ignore ? [ignore] : [];

    return patterns.map((pattern) => pattern.trim()).filter((pattern) => pattern.length > 0);
}

// Note: [🟡] Code for CLI command [agent](src/cli/cli-commands/agent/agentRunCliOptions.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names
