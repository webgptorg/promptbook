import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideOpenAiAgentKitExecutionToolsForServer } from '@/src/tools/$provideOpenAiAgentKitExecutionToolsForServer';
import { createAgentProgressTools } from '@/src/tools/createAgentProgressTools';
import { createChatAttachmentTools } from '@/src/tools/createChatAttachmentTools';
import {
    AGENT_PREPARATION_CHAT_WAIT_TIMEOUT_MS,
    resolveAgentCollectionTablePrefix,
    waitForRunningAgentPreparation,
} from '@/src/utils/agentPreparation';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { AgentKitCacheManager } from '@/src/utils/cache/AgentKitCacheManager';
import {
    resolveCachedServerAgentContext,
    resolveCachedServerAgentModelRequirements,
} from '@/src/utils/cachedServerAgentRuntime';
import { extractUseCalendarConnectionsFromAgentSource } from '@/src/utils/calendars/extractUseCalendarConnectionsFromAgentSource';
import { extractUseEmailConfigurationFromAgentSource } from '@/src/utils/emails/extractUseEmailConfigurationFromAgentSource';
import { getTeacherRemoteAgent } from '@/src/utils/getTeacherRemoteAgent';
import { composePromptParametersWithMemoryContext } from '@/src/utils/memoryRuntimeContext';
import { extractProjectRepositoriesFromAgentSource } from '@/src/utils/projects/extractProjectRepositoriesFromAgentSource';
import { resolveCurrentOrInternalServerOrigin } from '@/src/utils/resolveCurrentOrInternalServerOrigin';
import { resolveUseCalendarGoogleToken } from '@/src/utils/resolveUseCalendarGoogleToken';
import { resolveUseEmailSmtpCredential } from '@/src/utils/resolveUseEmailSmtpCredential';
import { resolveUseProjectGithubToken } from '@/src/utils/resolveUseProjectGithubToken';
import { Agent, computeAgentHash } from '@promptbook-local/core';
import type { ChatMessage, ChatPrompt, LlmToolDefinition, ToolCall } from '@promptbook-local/types';
import type { ChatPromptResult } from '../../../../../src/execution/PromptResult';
import { createUserChatMessagePrompt } from './createUserChatMessagePrompt';
import type { UserChatJobRecord } from './UserChatJobRecord';

/**
 * Resolves the current-user identity snapshot injected into one durable chat prompt.
 */
type RunUserChatJobCurrentUserIdentity = {
    userId: number;
    user: {
        username: string;
        isAdmin: boolean;
        profileImageUrl: string | null;
    };
};

/**
 * Builds one prompt snapshot factory from the prepared execution prompt.
 */
type RunUserChatJobPromptSnapshotFactory = (
    options?: {
        toolCalls?: ReadonlyArray<ToolCall>;
        completedToolCalls?: ReadonlyArray<ToolCall>;
        rawPromptContent?: ChatPromptResult['rawPromptContent'];
        rawRequest?: ChatPromptResult['rawRequest'];
    },
) => NonNullable<ChatMessage['prompt']>;

/**
 * Prepares the full agent/runtime context required to execute one durable user chat job.
 *
 * @private function of `runUserChatJob`
 */
export async function createRunUserChatJobExecutionContext(options: {
    job: Pick<
        UserChatJobRecord,
        'userId' | 'agentPermanentId' | 'chatId' | 'userMessageId' | 'assistantMessageId' | 'parameters'
    >;
    currentUserIdentity: RunUserChatJobCurrentUserIdentity;
    userMessageAttachments: ChatMessage['attachments'];
    thread: NonNullable<ChatPrompt['thread']>;
    promptContent: ChatPrompt['content'];
}) {
    const [localServerUrl, collection, baseAgentReferenceResolver] = await Promise.all([
        resolveCurrentOrInternalServerOrigin(),
        $provideAgentCollectionForServer(),
        $provideAgentReferenceResolver(),
    ]);
    const resolvedAgentContext = await resolveCachedServerAgentContext({
        collection,
        agentIdentifier: options.job.agentPermanentId,
        localServerUrl,
        fallbackResolver: baseAgentReferenceResolver,
    });
    const preparedAgentModelRequirements = await resolveCachedServerAgentModelRequirements({
        resolvedAgentContext,
        localServerUrl,
        fallbackResolver: baseAgentReferenceResolver,
    });
    const agentSource = resolvedAgentContext.resolvedAgentSource;
    const unresolvedAgentSource = resolvedAgentContext.unresolvedAgentSource;
    const agentPermanentId = resolvedAgentContext.parentAgentPermanentId;
    const resolvedAgentName = resolvedAgentContext.resolvedAgentName;
    const projectRepositories = extractProjectRepositoriesFromAgentSource(agentSource);
    const calendarConnections = extractUseCalendarConnectionsFromAgentSource(agentSource);
    const useEmailConfiguration = extractUseEmailConfigurationFromAgentSource(agentSource);
    const { projectGithubToken, calendarGoogleAccessToken, emailSmtpCredential } =
        await resolveRunUserChatJobCredentials({
            userId: options.job.userId,
            agentPermanentId,
            calendarConnections,
            isEmailEnabled: useEmailConfiguration.isEnabled,
        });
    const runtimeTools = createAgentProgressTools(
        createChatAttachmentTools([], options.userMessageAttachments || []),
    );

    /**
     * Full list of tools that were available to the model for this chat turn.
     *
     * Combines agent-commitment tools (e.g. browser, calendar, team) with runtime tools
     * (attachment handlers, progress markers) to match exactly what the LLM sees.
     * Captured here from the exact objects used to construct the model request so the
     * message inspector can show accurate tool availability per turn.
     */
    const availableTools: ReadonlyArray<LlmToolDefinition> = [
        ...(preparedAgentModelRequirements.modelRequirements.tools ?? []),
        ...runtimeTools,
    ];
    const promptParameters = composePromptParametersWithMemoryContext({
        baseParameters: options.job.parameters,
        currentUserIdentity: options.currentUserIdentity,
        agentPermanentId,
        agentName: resolvedAgentName,
        chatId: options.job.chatId,
        assistantMessageId: options.job.assistantMessageId,
        isPrivateModeEnabled: false,
        projectRepositories,
        projectGithubToken,
        emailSmtpCredential,
        emailFromAddress: useEmailConfiguration.senderEmail,
        calendarGoogleAccessToken,
        calendarConnections,
        chatAttachments: options.userMessageAttachments,
    });
    const chatPrompt = createRunUserChatJobPrompt({
        resolvedAgentName,
        promptParameters,
        promptContent: options.promptContent,
        thread: options.thread,
        attachments: options.userMessageAttachments,
        runtimeTools,
    });
    const createPromptSnapshot = createRunUserChatJobPromptSnapshotFactory({
        chatPrompt,
        availableTools,
    });
    const agentKitCacheManager = new AgentKitCacheManager({ isVerbose: true });
    const baseOpenAiToolsPromise = $provideOpenAiAgentKitExecutionToolsForServer();
    const agentHash = computeAgentHash(agentSource);
    const tablePrefix = resolveAgentCollectionTablePrefix(collection);
    const preparationWaitResult = await waitForRunningAgentPreparation({
        tablePrefix,
        agentPermanentId,
        fingerprint: agentHash,
        timeoutMs: AGENT_PREPARATION_CHAT_WAIT_TIMEOUT_MS,
    });

    if (preparationWaitResult !== 'not_running') {
        console.info('[user-chat-job]', 'preparation_wait', {
            chatId: options.job.chatId,
            messageId: options.job.userMessageId,
            agentPermanentId,
            preparationWaitResult,
        });
    }

    const agentKitResult = await agentKitCacheManager.getOrCreateAgentKitAgent(
        agentSource,
        resolvedAgentName,
        await baseOpenAiToolsPromise,
        {
            includeDynamicContext: true,
            agentId: agentPermanentId,
            modelRequirements: preparedAgentModelRequirements.modelRequirements,
        },
    );
    const provider: string | null = agentKitResult.tools.title;
    const agent = new Agent({
        isVerbose: true,
        assistantPreparationMode: 'external',
        executionTools: {
            llm: agentKitResult.tools,
        },
        agentSource,
        precomputedModelRequirements: preparedAgentModelRequirements.modelRequirements,
        teacherAgent: await getTeacherRemoteAgent(),
    });

    return {
        collection,
        agent,
        agentSource,
        unresolvedAgentSource,
        agentPermanentId,
        resolvedAgentName,
        provider,
        availableTools,
        chatPrompt,
        createPromptSnapshot,
        isBookScopedAgent: resolvedAgentContext.isBookScopedAgent,
    };
}

/**
 * Resolves external credentials and tokens required by enabled chat commitments.
 *
 * @private function of `createRunUserChatJobExecutionContext`
 */
async function resolveRunUserChatJobCredentials(options: {
    userId: number;
    agentPermanentId: string;
    calendarConnections: ReturnType<typeof extractUseCalendarConnectionsFromAgentSource>;
    isEmailEnabled: boolean;
}) {
    const [projectGithubToken, calendarGoogleAccessToken, emailSmtpCredential] = await Promise.all([
        resolveUseProjectGithubToken({
            userId: options.userId,
            agentPermanentId: options.agentPermanentId,
        }),
        options.calendarConnections.length > 0
            ? resolveUseCalendarGoogleToken({
                  userId: options.userId,
                  agentPermanentId: options.agentPermanentId,
              })
            : Promise.resolve(undefined),
        options.isEmailEnabled
            ? resolveUseEmailSmtpCredential({
                  userId: options.userId,
                  agentPermanentId: options.agentPermanentId,
              })
            : Promise.resolve(undefined),
    ]);

    return {
        projectGithubToken,
        calendarGoogleAccessToken,
        emailSmtpCredential,
    };
}

/**
 * Creates the chat prompt object reused for both execution and raw-inspection snapshots.
 *
 * @private function of `createRunUserChatJobExecutionContext`
 */
function createRunUserChatJobPrompt(options: {
    resolvedAgentName: string;
    promptParameters: ReturnType<typeof composePromptParametersWithMemoryContext>;
    promptContent: ChatPrompt['content'];
    thread: NonNullable<ChatPrompt['thread']>;
    attachments: ChatMessage['attachments'];
    runtimeTools: NonNullable<ChatPrompt['tools']>;
}): Pick<
    ChatPrompt,
    'title' | 'parameters' | 'modelRequirements' | 'content' | 'thread' | 'attachments' | 'tools'
> {
    return {
        title: `Chat with agent ${options.resolvedAgentName}`,
        parameters: options.promptParameters,
        modelRequirements: {
            modelVariant: 'CHAT',
        },
        content: options.promptContent,
        thread: options.thread,
        attachments: options.attachments,
        ...(options.runtimeTools.length > 0 ? { tools: options.runtimeTools } : {}),
    };
}

/**
 * Binds prompt-snapshot creation to one prepared execution prompt and tool list.
 *
 * @private function of `createRunUserChatJobExecutionContext`
 */
function createRunUserChatJobPromptSnapshotFactory(options: {
    chatPrompt: Pick<
        ChatPrompt,
        'title' | 'parameters' | 'modelRequirements' | 'content' | 'thread' | 'attachments' | 'tools'
    >;
    availableTools: ReadonlyArray<LlmToolDefinition>;
}): RunUserChatJobPromptSnapshotFactory {
    return (snapshotOptions = {}) =>
        createUserChatMessagePrompt({
            prompt: options.chatPrompt,
            availableTools: options.availableTools,
            ...snapshotOptions,
        });
}
