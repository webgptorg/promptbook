import type { AgentMessageFile } from './AgentMessageFile';

/**
 * Builds the git commit message for one answered user message.
 */
export function buildAgentMessageCommitMessage(messageFile: AgentMessageFile): string {
    return `Answering message ${messageFile.fileName}`;
}
