import { prepareWorkspaceChatAgent } from './prepareWorkspaceChatAgent';
import { composePromptParametersWithMemoryContext } from '../memoryRuntimeContext';
import {
    createRunUserChatJobPrompt,
    createRunUserChatJobPromptSnapshotFactory,
    type RunUserChatJobExecutionContextOptions,
} from '../userChat/createRunUserChatJobExecutionContext';

/** Reuses the normal durable worker with the same source/harness service as other workspace chat transports. */
export async function createWorkspaceUserChatExecutionContext(options: RunUserChatJobExecutionContextOptions) {
    await options.reportProgress?.('reading_context', { agentPermanentId: options.job.agentPermanentId });
    const runtime = await prepareWorkspaceChatAgent(options.job.agentPermanentId);
    const { definition, availableTools } = runtime;
    const promptParameters = composePromptParametersWithMemoryContext({
        baseParameters: options.job.parameters,
        currentUserIdentity: options.currentUserIdentity,
        agentPermanentId: definition.id,
        agentName: definition.name,
        chatId: options.job.chatId,
        assistantMessageId: options.job.assistantMessageId,
        isPrivateModeEnabled: false,
        projectRepositories: [],
        calendarConnections: [],
        chatAttachments: options.userMessageAttachments,
        localServerUrl: process.env.PTBK_AGENTS_SERVER_URL,
    });
    const chatPrompt = createRunUserChatJobPrompt({
        resolvedAgentName: definition.name,
        promptParameters,
        promptContent: options.promptContent,
        thread: options.thread,
        attachments: options.userMessageAttachments,
        runtimeTools: [],
    });
    const createPromptSnapshot = createRunUserChatJobPromptSnapshotFactory({ chatPrompt, availableTools });
    await options.reportProgress?.('starting_response', {
        agentPermanentId: definition.id,
        agentName: definition.name,
        provider: runtime.provider,
    });
    return {
        ...runtime,
        agentPermanentId: definition.id,
        resolvedAgentName: definition.name,
        chatPrompt,
        createPromptSnapshot,
        isBookScopedAgent: false,
    };
}
