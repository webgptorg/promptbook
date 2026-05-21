import type {
  Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */
} from 'commander';
import { spaceTrim } from 'spacetrim';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { handleActionErrors } from '../common/handleActionErrors';
import { AGENT_BOOK_FILE_PATH, AGENT_BOOK_LANGUAGE_MANUAL_FILE_PATH, AGENT_FINISHED_MESSAGES_DIRECTORY_PATH, AGENT_KNOWLEDGE_DIRECTORY_PATH, AGENT_QUEUED_MESSAGES_DIRECTORY_PATH } from './agentProjectPaths';
import { initializeAgentProjectConfiguration } from './initializeAgentProjectConfiguration';
import { printAgentInitializationSummary } from './printAgentInitializationSummary';

/**
 * Initializes `agent init` command for Promptbook CLI utilities.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI.
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeAgentInitCommand(program: Program): $side_effect {
    const command = program.command('init');
    command.alias('initialize');
    command.description(
        spaceTrim(`
            Initialize Promptbook agent message queue in current project

            Creates:
            - ${AGENT_QUEUED_MESSAGES_DIRECTORY_PATH.replace(/\\/gu, '/')}/
            - ${AGENT_FINISHED_MESSAGES_DIRECTORY_PATH.replace(/\\/gu, '/')}/
            - ${AGENT_KNOWLEDGE_DIRECTORY_PATH}/
            - ${AGENT_BOOK_FILE_PATH}
            - ${AGENT_BOOK_LANGUAGE_MANUAL_FILE_PATH.replace(/\\/gu, '/')}
        `),
    );

    command.action(
        handleActionErrors(async () => {
            const summary = await initializeAgentProjectConfiguration(process.cwd());
            printAgentInitializationSummary(summary);
        }),
    );
}

// Note: [🟡] Code for CLI command [init](src/cli/cli-commands/agent/init.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
