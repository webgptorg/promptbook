import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { handleActionErrors } from '../common/handleActionErrors';
import {
    addPromptRunnerRuntimeOptions,
    addPromptRunnerSelectionOptions,
    PROMPT_RUNNER_DESCRIPTION,
} from '../common/promptRunnerCliOptions';
import type { AgentCommandCliOptions } from './agentCliOptions';
import {
    normalizeAgentCommandRunnerOptions,
    resolveRequiredAgentMessage,
    resolveRequiredAgentPath,
} from './agentCliOptions';

/**
 * Initializes `agent exec` command for Promptbook CLI utilities.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI.
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeAgentExecCommand(program: Program): $side_effect {
    const command = program.command('exec');
    command.description(
        spaceTrim(`
            Run one non-interactive message with a Promptbook agent book and print the answer

            ${PROMPT_RUNNER_DESCRIPTION}
        `),
    );

    command.requiredOption('--agent <agent-book-path>', 'Path to the agent .book file');
    command.requiredOption('--message <message>', 'User message to send to the agent');
    addPromptRunnerSelectionOptions(command);
    addPromptRunnerRuntimeOptions(command);
    command.option('--context <context-or-file>', 'Append extra context either inline or from a file path');

    command.action(
        handleActionErrors(async (cliOptions) => {
            const options = cliOptions as AgentCommandCliOptions;
            const runnerOptions = normalizeAgentCommandRunnerOptions(options);
            const { runAgentExec } = await import('../../../../scripts/run-agent-chat/runAgentExec');

            await runAgentExec({
                agentPath: resolveRequiredAgentPath(options),
                context: options.context,
                message: resolveRequiredAgentMessage(options),
                currentWorkingDirectory: process.cwd(),
                ...runnerOptions,
            });
        }),
    );
}

// Note: [🟡] Code for CLI command [agent exec](src/cli/cli-commands/agent/exec.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
