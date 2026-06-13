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
import { normalizeAgentCommandRunnerOptions, resolveRequiredAgentPath } from './agentCliOptions';

/**
 * Initializes `agent chat` command for Promptbook CLI utilities.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI.
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeAgentChatCommand(program: Program): $side_effect {
    const command = program.command('chat');
    command.description(
        spaceTrim(`
            Run an interactive CLI chat with one Promptbook agent book

            ${PROMPT_RUNNER_DESCRIPTION}
        `),
    );

    command.requiredOption('--agent <agent-book-path>', 'Path to the agent .book file');
    addPromptRunnerSelectionOptions(command);
    addPromptRunnerRuntimeOptions(command);
    command.option('--context <context-or-file>', 'Append extra context either inline or from a file path');

    command.action(
        handleActionErrors(async (cliOptions, commandProgram) => {
            const options = cliOptions as AgentCommandCliOptions;
            const runnerOptions = normalizeAgentCommandRunnerOptions(options, commandProgram as Program);
            const { runAgentChat } = await import('../../../../scripts/run-agent-chat/runAgentChat');

            await runAgentChat({
                agentPath: resolveRequiredAgentPath(options),
                context: options.context,
                currentWorkingDirectory: process.cwd(),
                ...runnerOptions,
            });
        }),
    );
}

// Note: [🟡] Code for CLI command [agent chat](src/cli/cli-commands/agent/chat.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
