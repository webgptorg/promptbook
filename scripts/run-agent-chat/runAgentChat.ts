import colors from 'colors';
import prompts from 'prompts';
import { resolveInlineOrFileText } from '../run-codex-prompts/common/resolveInlineOrFileText';
import type { AgentCliHistoryMessage, AgentCliRunOptions } from './AgentCliRunOptions';
import { createAgentChatWorkspacePath, executeAgentChatTurn } from './executeAgentChatTurn';

/**
 * Runs an interactive local CLI chat with an agent book.
 */
export async function runAgentChat(options: AgentCliRunOptions): Promise<void> {
    const currentWorkingDirectory = options.currentWorkingDirectory || process.cwd();
    const context = await resolveInlineOrFileText({
        textReference: options.context,
        currentWorkingDirectory,
        contextLabel: 'Agent context',
        optionName: '--context',
    });
    const workspacePath = createAgentChatWorkspacePath({
        currentWorkingDirectory,
        agentPath: options.agentPath,
    });
    const messages: AgentCliHistoryMessage[] = [];

    console.info(colors.gray('Type "exit" or "quit" to end the chat.'));

    while (true) {
        const response = await prompts({
            type: 'text',
            name: 'userMessage',
            message: 'User message',
        });
        const userMessage = typeof response.userMessage === 'string' ? response.userMessage : undefined;
        const normalizedUserMessage = userMessage?.trim();

        if (!normalizedUserMessage || isExitMessage(normalizedUserMessage)) {
            return;
        }

        messages.push({
            sender: 'USER',
            content: normalizedUserMessage,
        });

        const result = await executeAgentChatTurn({
            ...options,
            currentWorkingDirectory,
            context,
            workspacePath,
            messages,
        });

        messages.push({
            sender: 'AGENT',
            content: result.answer,
        });

        console.info('');
        console.info(colors.bold(colors.green('Agent:')));
        console.info(colors.green(result.answer));
    }
}

/**
 * Checks whether a user-entered message should end the interactive session.
 */
function isExitMessage(message: string): boolean {
    const normalizedMessage = message.trim().toLowerCase();
    return normalizedMessage === 'exit' || normalizedMessage === 'quit';
}
