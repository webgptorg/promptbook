import type { NormalizedPromptRunnerCliOptions, PromptRunnerCliOptions } from '../common/promptRunnerCliOptions';
import { normalizePromptRunnerCliOptions } from '../common/promptRunnerCliOptions';

/**
 * Options passed from `ptbk agent` CLI commands to the message runner.
 *
 * @private internal utility of `ptbk agent`
 */
export type AgentRunCliOptions = PromptRunnerCliOptions;

/**
 * Converts Commander options into the `scripts/run-agent-messages` option shape.
 *
 * @private internal utility of `ptbk agent`
 */
export function createAgentRunOptionsFromCliOptions(cliOptions: AgentRunCliOptions): NormalizedPromptRunnerCliOptions {
    return normalizePromptRunnerCliOptions(cliOptions, {
        isAgentRequired: true,
    });
}

// Note: [🟡] Code for CLI command [agent](src/cli/cli-commands/agent/agentRunCliOptions.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names
