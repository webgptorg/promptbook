import colors from 'colors';
import type { InitializationStatus } from '../coder/boilerplateTemplates';
import {
    AGENT_BOOK_FILE_PATH,
    AGENT_BOOK_LANGUAGE_MANUAL_FILE_PATH,
    AGENT_DOCS_DIRECTORY_PATH,
    AGENT_FINISHED_MESSAGES_DIRECTORY_PATH,
    AGENT_KNOWLEDGE_DIRECTORY_PATH,
    AGENT_MESSAGES_DIRECTORY_PATH,
    AGENT_QUEUED_MESSAGES_DIRECTORY_PATH,
} from './agentProjectPaths';
import type { AgentInitializationSummary } from './initializeAgentProjectConfiguration';

/**
 * Prints a readable summary of initialized local agent files.
 *
 * @private internal utility of `ptbk agent init`
 */
export function printAgentInitializationSummary(summary: AgentInitializationSummary): void {
    console.info(colors.green('Promptbook agent configuration initialized.'));
    printInitializationStatusLine(`${AGENT_MESSAGES_DIRECTORY_PATH}/`, summary.messagesDirectoryStatus);
    printInitializationStatusLine(`${AGENT_QUEUED_MESSAGES_DIRECTORY_PATH}/`, summary.queuedMessagesDirectoryStatus);
    printInitializationStatusLine(
        `${AGENT_FINISHED_MESSAGES_DIRECTORY_PATH}/`,
        summary.finishedMessagesDirectoryStatus,
    );
    printInitializationStatusLine(`${AGENT_KNOWLEDGE_DIRECTORY_PATH}/`, summary.knowledgeDirectoryStatus);
    printInitializationStatusLine(`${AGENT_DOCS_DIRECTORY_PATH}/`, summary.docsDirectoryStatus);

    printInitializationStatusLine(AGENT_BOOK_FILE_PATH, summary.agentBookFileStatus);
    printInitializationStatusLine(AGENT_BOOK_LANGUAGE_MANUAL_FILE_PATH, summary.bookLanguageManualFileStatus);
}

/**
 * Formats one initialization status into a human-readable label.
 */
function formatInitializationStatus(status: InitializationStatus): string {
    if (status === 'created') {
        return 'created';
    }

    if (status === 'updated') {
        return 'updated';
    }

    return 'unchanged';
}

/**
 * Prints one checked initialization-status line.
 */
function printInitializationStatusLine(relativePath: string, status: InitializationStatus): void {
    console.info(colors.gray(`✔ ${relativePath.replace(/\\/gu, '/')}: ${formatInitializationStatus(status)}`));
}

// Note: [🟡] Code for CLI command [agent init](src/cli/cli-commands/agent/printAgentInitializationSummary.ts) should never be published outside of `@promptbook/cli`
