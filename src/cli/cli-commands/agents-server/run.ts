import {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
    Option,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import { NETWORK_LIMITS } from '../../../constants';
import { NotAllowed } from '../../../errors/NotAllowed';
import type { number_port } from '../../../types/number_positive';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { handleActionErrors } from '../common/handleActionErrors';
import type { PromptRunnerCliOptions } from '../common/promptRunnerCliOptions';
import {
    addPromptRunnerSelectionOptions,
    addPromptRunnerUiAndThinkingOptions,
    normalizePromptRunnerCliOptions,
    PROMPT_RUNNER_DESCRIPTION,
} from '../common/promptRunnerCliOptions';

/**
 * Raw Commander options accepted by `ptbk agents-server start`.
 *
 * @private internal utility of `ptbk agents-server`
 */
type AgentsServerStartCliOptions = Pick<PromptRunnerCliOptions, 'agent' | 'model' | 'thinkingLevel' | 'ui'> & {
    readonly port: string;
};

/**
 * Normalized self-hosted server options passed from the CLI into the runtime.
 *
 * @private internal utility of `ptbk agents-server`
 */
export type AgentsServerStartRunOptions = {
    readonly port: number_port;
    readonly agentName: NonNullable<ReturnType<typeof normalizePromptRunnerCliOptions>['agentName']>;
    readonly model?: string;
    readonly thinkingLevel?: ReturnType<typeof normalizePromptRunnerCliOptions>['thinkingLevel'];
    readonly noUi: boolean;
};

/**
 * Initializes `agents-server start` command for Promptbook CLI utilities.
 *
 * @private internal function of `ptbk agents-server`
 */
export function $initializeAgentsServerStartCommand(program: Program): $side_effect {
    const command = program.command('start');

    command.description(
        spaceTrim(
            (block) => `
                Start the Agents Server web app and its local coding-agent message runners

                ${block(PROMPT_RUNNER_DESCRIPTION)}

                Configuration precedence:
                - Environment variables are read first, for example PTBK_AGENT, PTBK_MODEL, PTBK_THINKING_LEVEL, and PORT.
                - Explicit CLI flags override environment values.
            `,
        ),
    );

    command.addOption(new Option('--port <port>', 'Port for the Agents Server web app').default('4440').env('PORT'));
    addPromptRunnerSelectionOptions(command);
    addPromptRunnerUiAndThinkingOptions(command);

    command.action(
        handleActionErrors(
            async (cliOptions) => {
                const runOptions = createAgentsServerStartRunOptionsFromCliOptions(
                    cliOptions as AgentsServerStartCliOptions,
                );
                const { runAgentsServer } = await import('../../../../scripts/run-agents-server/main/runAgentsServer');

                await runAgentsServer(runOptions);
            },
            { isExitingOnSuccess: false },
        ),
    );
}

/**
 * Converts Commander values into the self-hosted Agents Server runtime option shape.
 *
 * @private internal utility of `ptbk agents-server`
 */
export function createAgentsServerStartRunOptionsFromCliOptions(
    cliOptions: AgentsServerStartCliOptions,
): AgentsServerStartRunOptions {
    const runnerOptions = normalizePromptRunnerCliOptions(
        {
            ...cliOptions,
            commit: false,
            ignoreGitChanges: true,
            allowCredits: false,
            normalizeLineEndings: true,
            autoPush: false,
            autoPull: false,
        },
        { isAgentRequired: true },
    );

    return {
        port: parseAgentsServerPort(cliOptions.port),
        agentName: runnerOptions.agentName!,
        model: runnerOptions.model,
        thinkingLevel: runnerOptions.thinkingLevel,
        noUi: runnerOptions.noUi,
    };
}

/**
 * Parses and validates the web app port accepted by `ptbk agents-server start`.
 *
 * @private internal utility of `ptbk agents-server`
 */
function parseAgentsServerPort(portRaw: string): number_port {
    const port = Number.parseInt(portRaw, 10);

    if (!Number.isInteger(port) || port <= 0 || port > NETWORK_LIMITS.MAX_PORT) {
        throw new NotAllowed(
            spaceTrim(`
                Invalid Agents Server port \`${portRaw}\`.

                Use an integer between \`1\` and \`${NETWORK_LIMITS.MAX_PORT}\`.
            `),
        );
    }

    return port as number_port;
}

// Note: [🟡] Code for CLI command [agents-server start](src/cli/cli-commands/agents-server/run.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
