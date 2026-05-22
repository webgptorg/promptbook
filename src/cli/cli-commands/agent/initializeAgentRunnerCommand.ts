import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import { assertsError } from '../../../errors/assertsError';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { handleActionErrors } from '../common/handleActionErrors';
import {
    addPromptRunnerExecutionOptions,
    addPromptRunnerSelectionOptions,
    PROMPT_RUNNER_DESCRIPTION,
} from '../common/promptRunnerCliOptions';
import type { AgentRunCliOptions } from './agentRunCliOptions';
import { createAgentRunOptionsFromCliOptions } from './agentRunCliOptions';

/**
 * Shared command-registration options for `ptbk agent` runner subcommands.
 *
 * @private internal utility of `ptbk agent`
 */
type InitializeAgentRunnerCommandOptions = {
    readonly commandName: string;
    readonly aliases?: ReadonlyArray<string>;
    readonly summary: string;
    readonly featureLines: ReadonlyArray<string>;
    readonly executionMode: 'once' | 'watch';
    readonly configureCommand?: (command: Program) => void;
    readonly loadExecutor: () => Promise<
        (runOptions: ReturnType<typeof createAgentRunOptionsFromCliOptions>) => Promise<unknown>
    >;
};

/**
 * Registers one runner-backed `ptbk agent` subcommand with the shared option and error handling flow.
 *
 * @private internal utility of `ptbk agent`
 */
export function $initializeAgentRunnerCommand(
    program: Program,
    options: InitializeAgentRunnerCommandOptions,
): $side_effect {
    const command = program.command(options.commandName);

    for (const alias of options.aliases || []) {
        command.alias(alias);
    }

    command.description(
        spaceTrim(
            (block) => `
                ${options.summary}

                ${block(PROMPT_RUNNER_DESCRIPTION)}

                Features:
                ${options.featureLines.map((featureLine) => `- ${featureLine}`).join('\n')}
            `,
        ),
    );

    addPromptRunnerSelectionOptions(command);
    addPromptRunnerExecutionOptions(command);
    options.configureCommand?.(command);

    command.action(
        handleActionErrors(
            async (cliOptions) => {
                const runOptions = createAgentRunOptionsFromCliOptions(cliOptions as AgentRunCliOptions);
                const execute = await options.loadExecutor();

                if (options.executionMode === 'watch') {
                    const { runPersistentAgentWatch } = await import(
                        '../../../../scripts/run-agent-messages/main/runPersistentAgentWatch'
                    );

                    await runPersistentAgentWatch({
                        commandDisplayName: `ptbk agent ${options.commandName}`,
                        logDirectoryPath: process.cwd(),
                        runWatch: async () => {
                            await execute(runOptions);
                        },
                    });
                    return;
                }

                try {
                    await execute(runOptions);
                } catch (error) {
                    assertsError(error);
                    console.error(colors.bgRed(`${error.name}`));
                    console.error(colors.red(error.stack || error.message));
                    return process.exit(1);
                }
            },
            {
                isExitingOnSuccess: options.executionMode === 'once',
            },
        ),
    );
}

// Note: [🟡] Code for CLI command [agent](src/cli/cli-commands/agent/initializeAgentRunnerCommand.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
