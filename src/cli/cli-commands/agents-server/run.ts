import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { Option } from 'commander';
import { spaceTrim } from 'spacetrim';
import { NETWORK_LIMITS } from '../../../constants';
import { NotAllowed } from '../../../errors/NotAllowed';
import type { number_port } from '../../../types/number_positive';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { handleActionErrors } from '../common/handleActionErrors';
import type { PromptRunnerSelectionCliOptions } from '../common/promptRunnerCliOptions';
import {
    addPromptRunnerRuntimeOptions,
    addPromptRunnerSelectionOptions,
    normalizePromptRunnerSelectionCliOptions,
    PROMPT_RUNNER_DESCRIPTION,
} from '../common/promptRunnerCliOptions';
import { ensureAgentsServerBuild } from './buildAgentsServer';
import {
    loadAgentsServerProjectEnvironment,
    startAgentsServer,
    type AgentsServerNextRuntimeMode,
} from './startAgentsServer';

/**
 * Default port used by `ptbk agents-server start` and `ptbk agents-server dev`.
 *
 * @private internal constant of `ptbk agents-server`
 */
const DEFAULT_AGENTS_SERVER_PORT = '4440';

/**
 * CLI options accepted by `ptbk agents-server start` and `ptbk agents-server dev`.
 *
 * @private internal type of `ptbk agents-server`
 */
type AgentsServerRuntimeCliOptions = PromptRunnerSelectionCliOptions & {
    readonly port: string;
    readonly forceBuild?: boolean;
};

/**
 * Shared command definition for one Agents Server runtime subcommand.
 *
 * @private internal type of `ptbk agents-server`
 */
type AgentsServerRuntimeCommandDefinition = {
    readonly commandName: 'start' | 'dev';
    readonly description: string;
    readonly nextRuntimeMode: AgentsServerNextRuntimeMode;
    readonly isForceBuildSupported: boolean;
};

/**
 * Initializes `agents-server start` command for Promptbook CLI utilities.
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeAgentsServerStartCommand(program: Program): $side_effect {
    initializeAgentsServerRuntimeCommand(program, {
        commandName: 'start',
        description: createAgentsServerRuntimeCommandDescription(
            'Start the Agents Server web app and the local coding-agent message runners',
        ),
        nextRuntimeMode: 'start',
        isForceBuildSupported: true,
    });
}

/**
 * Initializes `agents-server dev` command for Promptbook CLI utilities.
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeAgentsServerDevCommand(program: Program): $side_effect {
    initializeAgentsServerRuntimeCommand(program, {
        commandName: 'dev',
        description: createAgentsServerRuntimeCommandDescription(
            'Start the Agents Server web app in development mode with hot reloading and the local coding-agent message runners',
        ),
        nextRuntimeMode: 'dev',
        isForceBuildSupported: false,
    });
}

/**
 * Initializes `agents-server build` command for Promptbook CLI utilities.
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeAgentsServerBuildCommand(program: Program): $side_effect {
    const command = program.command('build');
    command.description('Build the Agents Server Next app for later local startup');
    command.action(
        handleActionErrors(async () => {
            console.info(colors.gray('Building Promptbook Agents Server.'));
            loadAgentsServerProjectEnvironment(process.cwd());
            await ensureAgentsServerBuild({ isBuildForced: true });
        }),
    );
}

/**
 * Registers one shared Agents Server runtime command backed by either `next start` or `next dev`.
 */
function initializeAgentsServerRuntimeCommand(
    program: Program,
    definition: AgentsServerRuntimeCommandDefinition,
): $side_effect {
    const command = program.command(definition.commandName);

    command.description(definition.description);
    addPromptRunnerSelectionOptions(command);
    addPromptRunnerRuntimeOptions(command);
    command.addOption(
        new Option('--port <port>', 'Port to start the Agents Server on')
            .env('PORT')
            .default(DEFAULT_AGENTS_SERVER_PORT),
    );

    if (definition.isForceBuildSupported) {
        command.option('--force-build', 'Rebuild the Agents Server Next app before startup', false);
    }

    command.action(
        handleActionErrors(
            async (cliOptions) => {
                const options = cliOptions as AgentsServerRuntimeCliOptions;
                const port = parseAgentsServerPort(options.port);
                const runnerOptions = normalizePromptRunnerSelectionCliOptions(options, {
                    isAgentRequired: true,
                });

                console.info(colors.gray(createAgentsServerRuntimeStartupMessage(port, definition.nextRuntimeMode)));
                await startAgentsServer({
                    port,
                    agentName: runnerOptions.agentName!,
                    model: runnerOptions.model,
                    noUi: runnerOptions.noUi,
                    thinkingLevel: runnerOptions.thinkingLevel,
                    allowCredits: runnerOptions.allowCredits,
                    nextRuntimeMode: definition.nextRuntimeMode,
                    isBuildForced: definition.isForceBuildSupported && options.forceBuild === true,
                });
            },
            {
                isExitingOnSuccess: false,
            },
        ),
    );
}

/**
 * Creates the shared help description for Agents Server runtime commands.
 */
function createAgentsServerRuntimeCommandDescription(summary: string): string {
    return spaceTrim(`
        ${summary}

        ${PROMPT_RUNNER_DESCRIPTION}

        The current working directory stores:
        - Agent runner folders in \`.promptbook/agents-server/agents\`
        - Foreground service logs in \`.logs\`
    `);
}

/**
 * Creates the startup log line for one Agents Server runtime mode.
 */
function createAgentsServerRuntimeStartupMessage(
    port: number_port,
    nextRuntimeMode: AgentsServerNextRuntimeMode,
): string {
    if (nextRuntimeMode === 'dev') {
        return `Starting Promptbook Agents Server on port ${port} in development mode.`;
    }

    return `Starting Promptbook Agents Server on port ${port}.`;
}

/**
 * Parses and validates the user-configured Agents Server port.
 */
function parseAgentsServerPort(rawPort: string): number_port {
    const port = Number.parseInt(rawPort, 10);

    if (!Number.isInteger(port) || port <= 0 || port > NETWORK_LIMITS.MAX_PORT) {
        throw new NotAllowed(
            spaceTrim(`
                Invalid Agents Server port: \`${rawPort}\`.

                Use \`--port\` or \`PORT\` with an integer between \`1\` and \`${NETWORK_LIMITS.MAX_PORT}\`.
            `),
        );
    }

    return port as number_port;
}

// Note: [🟡] Code for CLI command [agents-server start](src/cli/cli-commands/agents-server/run.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
