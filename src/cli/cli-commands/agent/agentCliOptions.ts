import { NotAllowed } from '../../../errors/NotAllowed';
import type {
    NormalizedPromptRunnerSelectionCliOptions,
    PromptRunnerSelectionCliOptions,
} from '../common/promptRunnerCliOptions';
import { normalizePromptRunnerSelectionCliOptions } from '../common/promptRunnerCliOptions';

/**
 * Commander option bag shared by `ptbk agent` subcommands.
 *
 * @private internal utility of `ptbk agent`
 */
export type AgentCommandCliOptions = PromptRunnerSelectionCliOptions & {
    readonly agent?: string;
    readonly context?: string;
    readonly message?: string;
};

/**
 * Normalizes shared runner flags for local agent subcommands.
 *
 * @private internal utility of `ptbk agent`
 */
export function normalizeAgentCommandRunnerOptions(
    cliOptions: AgentCommandCliOptions,
): NormalizedPromptRunnerSelectionCliOptions {
    return normalizePromptRunnerSelectionCliOptions(cliOptions, {
        isAgentRequired: true,
    });
}

// Note: [🟡] Code for CLI command options [agent](src/cli/cli-commands/agent/agentCliOptions.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names

/**
 * Returns the required agent book path from Commander options.
 *
 * @private internal utility of `ptbk agent`
 */
export function resolveRequiredAgentPath(cliOptions: AgentCommandCliOptions): string {
    const agentPath = cliOptions.agent?.trim();

    if (!agentPath) {
        throw new NotAllowed('Pass an agent book path in `--agent`.');
    }

    return agentPath;
}

/**
 * Returns the required single-turn user message from Commander options.
 *
 * @private internal utility of `ptbk agent`
 */
export function resolveRequiredAgentMessage(cliOptions: AgentCommandCliOptions): string {
    const message = cliOptions.message?.trim();

    if (!message) {
        throw new NotAllowed('Pass a non-empty user message in `--message`.');
    }

    return message;
}
