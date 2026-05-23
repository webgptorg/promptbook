import type { InitializationStatus } from '../coder/boilerplateTemplates';
import { ensureCoderMarkdownFile } from '../coder/ensureCoderMarkdownFile';
import { ensureDirectory } from '../coder/ensureDirectory';
import {
    AGENT_BOOK_FILE_PATH,
    AGENT_FINISHED_MESSAGES_DIRECTORY_PATH,
    AGENT_MESSAGES_DIRECTORY_PATH,
    AGENT_QUEUED_MESSAGES_DIRECTORY_PATH,
    getDefaultAgentBookContent,
} from './agentProjectPaths';

/**
 * Result summary returned after local agent configuration initialization.
 *
 * @private internal utility of `ptbk agent init`
 */
export type AgentInitializationSummary = {
    readonly messagesDirectoryStatus: InitializationStatus;
    readonly queuedMessagesDirectoryStatus: InitializationStatus;
    readonly finishedMessagesDirectoryStatus: InitializationStatus;
    readonly agentBookFileStatus: InitializationStatus;
};

/**
 * Creates local agent queue, knowledge, and instruction files in the current project.
 *
 * @private internal utility of `ptbk agent init`
 */
export async function initializeAgentProjectConfiguration(projectPath: string): Promise<AgentInitializationSummary> {
    const messagesDirectoryStatus = await ensureDirectory(projectPath, AGENT_MESSAGES_DIRECTORY_PATH);
    const queuedMessagesDirectoryStatus = await ensureDirectory(projectPath, AGENT_QUEUED_MESSAGES_DIRECTORY_PATH);
    const finishedMessagesDirectoryStatus = await ensureDirectory(projectPath, AGENT_FINISHED_MESSAGES_DIRECTORY_PATH);
    const agentBookFileStatus = await ensureCoderMarkdownFile(
        projectPath,
        AGENT_BOOK_FILE_PATH,
        getDefaultAgentBookContent(),
    );

    return {
        messagesDirectoryStatus,
        queuedMessagesDirectoryStatus,
        finishedMessagesDirectoryStatus,
        agentBookFileStatus,
    };
}

// Note: [🟡] Code for CLI command [agent init](src/cli/cli-commands/agent/initializeAgentProjectConfiguration.ts) should never be published outside of `@promptbook/cli`
