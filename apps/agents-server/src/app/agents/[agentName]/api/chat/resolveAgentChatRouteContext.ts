import type { ChatMessage } from '@promptbook-local/components';
import { computeAgentHash } from '@promptbook-local/core';
import { resolveTeamInternalAgentAccessToken } from '../../../../../../../../src/commitments/_common/teamInternalAgentAccess';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideOpenAiAgentKitExecutionToolsForServer } from '@/src/tools/$provideOpenAiAgentKitExecutionToolsForServer';
import { createChatAttachmentTools } from '@/src/tools/createChatAttachmentTools';
import { createAgentProgressTools } from '@/src/tools/createAgentProgressTools';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import {
    AGENT_PREPARATION_CHAT_WAIT_TIMEOUT_MS,
    resolveAgentCollectionTablePrefix,
    waitForRunningAgentPreparation,
} from '@/src/utils/agentPreparation';
import { AgentKitCacheManager } from '@/src/utils/cache/AgentKitCacheManager';
import {
    resolveCachedServerAgentContext,
    resolveCachedServerAgentModelRequirements,
} from '@/src/utils/cachedServerAgentRuntime';
import { createChatHistoryRecorder } from '@/src/utils/chat/createChatHistoryRecorder';
import { resolveMessageSuffixFromAgentSource } from '@/src/utils/chat/messageSuffix';
import type { ResolvedCurrentUserMemoryIdentity } from '@/src/utils/userMemory';
import {
    resolveMetaDisclaimerMarkdownFromAgentSource,
    resolveMetaDisclaimerStatusForUser,
} from '@/src/utils/metaDisclaimer';
import { composePromptParametersWithMemoryContext } from '@/src/utils/memoryRuntimeContext';
import { extractUseCalendarConnectionsFromAgentSource } from '@/src/utils/calendars/extractUseCalendarConnectionsFromAgentSource';
import { extractUseEmailConfigurationFromAgentSource } from '@/src/utils/emails/extractUseEmailConfigurationFromAgentSource';
import { extractProjectRepositoriesFromAgentSource } from '@/src/utils/projects/extractProjectRepositoriesFromAgentSource';
import { resolveUseCalendarGoogleToken } from '@/src/utils/resolveUseCalendarGoogleToken';
import { resolveUseEmailSmtpCredential } from '@/src/utils/resolveUseEmailSmtpCredential';
import { resolveUseProjectGithubToken } from '@/src/utils/resolveUseProjectGithubToken';
import { createAgentChatApiErrorResponse } from './createAgentChatApiErrorResponse';
import { createTeamMemberFrozenChatPersistence } from './createTeamMemberFrozenChatPersistence';
import { resolveAgentChatRequestIdentities } from './resolveAgentChatRequestIdentities';

/**
 * Shared message shown when a stateless chat requires a previously accepted agent disclaimer.
 */
const META_DISCLAIMER_REQUIRED_MESSAGE = 'You must accept the disclaimer before chatting with this agent.';

/**
 * Context required to start one stateless agent chat markdown stream.
 *
 * @private type of POST
 */
export type ResolvedAgentChatRouteContext = {
    collection: Awaited<ReturnType<typeof $provideAgentCollectionForServer>>;
    modelRequirements: Awaited<ReturnType<typeof resolveCachedServerAgentModelRequirements>>['modelRequirements'];
    agentSource: Awaited<ReturnType<typeof resolveCachedServerAgentContext>>['resolvedAgentSource'];
    unresolvedAgentSource: Awaited<ReturnType<typeof resolveCachedServerAgentContext>>['unresolvedAgentSource'];
    agentId: string;
    resolvedAgentName: Awaited<ReturnType<typeof resolveCachedServerAgentContext>>['resolvedAgentName'];
    isBookScopedAgent: boolean;
    message: string;
    thread?: Array<ChatMessage>;
    attachments: ChatMessage['attachments'];
    runtimeTools: ReturnType<typeof createAgentProgressTools>;
    promptParameters: ReturnType<typeof composePromptParametersWithMemoryContext>;
    messageSuffix: ReturnType<typeof resolveMessageSuffixFromAgentSource>;
    currentUserIdentity: ResolvedCurrentUserMemoryIdentity | null;
    isPrivateModeEnabled: boolean;
    recordChatHistoryMessage: Awaited<ReturnType<typeof createChatHistoryRecorder>>;
    userMessageHash: string;
    teamMemberFrozenChatPersistence: ReturnType<typeof createTeamMemberFrozenChatPersistence>;
    agentKitCacheManager: AgentKitCacheManager;
    baseOpenAiToolsPromise: ReturnType<typeof $provideOpenAiAgentKitExecutionToolsForServer>;
};

/**
 * Inputs needed to resolve one stateless agent chat request into execution-ready runtime state.
 */
type ResolveAgentChatRouteContextOptions = {
    request: Request;
    agentName: string;
    message: string;
    thread?: Array<ChatMessage>;
    attachments: ChatMessage['attachments'];
    rawParameters: unknown;
    isPrivateModeEnabled: boolean;
};

/**
 * Success-or-response result used while resolving chat execution state before streaming starts.
 */
type ResolveAgentChatRouteContextResult =
    | {
          ok: true;
          context: ResolvedAgentChatRouteContext;
      }
    | {
          ok: false;
          response: Response;
      };

/**
 * Resolved external credentials injected into prompt parameters for one stateless chat request.
 */
type AgentChatCredentials = {
    projectGithubToken: Awaited<ReturnType<typeof resolveUseProjectGithubToken>>;
    calendarGoogleAccessToken: Awaited<ReturnType<typeof resolveUseCalendarGoogleToken>>;
    emailSmtpCredential: Awaited<ReturnType<typeof resolveUseEmailSmtpCredential>>;
};

/**
 * History persistence handles created before the model stream starts.
 */
type AgentChatHistoryContext = {
    recordChatHistoryMessage: Awaited<ReturnType<typeof createChatHistoryRecorder>>;
    userMessageHash: string;
};

/**
 * Resolves the pre-stream runtime state for the stateless agent chat route.
 *
 * @private function of POST
 */
export async function resolveAgentChatRouteContext(
    options: ResolveAgentChatRouteContextOptions,
): Promise<ResolveAgentChatRouteContextResult> {
    const { request, agentName, message, thread, attachments, rawParameters, isPrivateModeEnabled } = options;
    const [collection, baseAgentReferenceResolver] = await Promise.all([
        $provideAgentCollectionForServer(),
        $provideAgentReferenceResolver(),
    ]);
    const localServerUrl = new URL(request.url).origin;
    const resolvedAgentContext = await resolveCachedServerAgentContext({
        collection,
        agentIdentifier: agentName,
        localServerUrl,
        fallbackResolver: baseAgentReferenceResolver,
    });
    const preparedAgentModelRequirementsPromise = resolveCachedServerAgentModelRequirements({
        resolvedAgentContext,
        localServerUrl,
        fallbackResolver: baseAgentReferenceResolver,
    });
    const agentSource = resolvedAgentContext.resolvedAgentSource;
    const unresolvedAgentSource = resolvedAgentContext.unresolvedAgentSource;
    const agentId = resolvedAgentContext.parentAgentPermanentId;
    const resolvedAgentName = resolvedAgentContext.resolvedAgentName;
    const projectRepositories = extractProjectRepositoriesFromAgentSource(agentSource);
    const calendarConnections = extractUseCalendarConnectionsFromAgentSource(agentSource);
    const useEmailConfiguration = extractUseEmailConfigurationFromAgentSource(agentSource);
    const messageSuffix = resolveMessageSuffixFromAgentSource(agentSource);
    const incomingParameters = normalizeAgentChatIncomingParameters(rawParameters);
    const [preparedAgentModelRequirements, requestIdentities] = await Promise.all([
        preparedAgentModelRequirementsPromise,
        resolveAgentChatRequestIdentities(incomingParameters),
    ]);
    const { currentUserIdentity, currentRequestIdentity, isTeamConversation } = requestIdentities;
    const disclaimerResponse = await resolveAgentChatDisclaimerResponse({
        agentSource,
        currentUserIdentity,
        agentId,
    });

    if (disclaimerResponse) {
        return {
            ok: false,
            response: disclaimerResponse,
        };
    }

    const { projectGithubToken, calendarGoogleAccessToken, emailSmtpCredential } = await resolveAgentChatCredentials({
        currentUserId: currentUserIdentity?.userId,
        agentId,
        calendarConnections,
        useEmailConfiguration,
    });
    const runtimeTools = createAgentProgressTools(createChatAttachmentTools([], attachments));
    const promptParameters = composePromptParametersWithMemoryContext({
        baseParameters: incomingParameters,
        currentUserIdentity,
        agentPermanentId: agentId,
        agentName: resolvedAgentName,
        isPrivateModeEnabled,
        projectRepositories,
        projectGithubToken,
        emailSmtpCredential,
        emailFromAddress: useEmailConfiguration.senderEmail,
        calendarGoogleAccessToken,
        calendarConnections,
        chatAttachments: attachments,
        localServerUrl,
        teamInternalAccessToken: resolveTeamInternalAgentAccessToken(),
    });

    // Use AgentKitCacheManager for vector store caching
    const agentKitCacheManager = new AgentKitCacheManager({ isVerbose: true });
    const baseOpenAiToolsPromise = $provideOpenAiAgentKitExecutionToolsForServer();
    const agentHash = computeAgentHash(agentSource);
    await waitForAgentChatPreparation({
        collection,
        agentId,
        agentHash,
    });

    const { recordChatHistoryMessage, userMessageHash } = await createAgentChatHistoryContext({
        request,
        agentId,
        agentHash,
        currentUserIdentity,
        isPrivateModeEnabled,
        message,
        attachments,
        isTeamConversation,
    });
    const teamMemberFrozenChatPersistence = createTeamMemberFrozenChatPersistence({
        isPrivateModeEnabled,
        currentRequestIdentity,
        agentId,
        thread,
        message,
        attachments,
    });
    await teamMemberFrozenChatPersistence.persistPendingPlaceholder();

    return {
        ok: true,
        context: {
            collection,
            modelRequirements: preparedAgentModelRequirements.modelRequirements,
            agentSource,
            unresolvedAgentSource,
            agentId,
            resolvedAgentName,
            isBookScopedAgent: resolvedAgentContext.isBookScopedAgent,
            message,
            thread,
            attachments,
            runtimeTools,
            promptParameters,
            messageSuffix,
            currentUserIdentity,
            isPrivateModeEnabled,
            recordChatHistoryMessage,
            userMessageHash,
            teamMemberFrozenChatPersistence,
            agentKitCacheManager,
            baseOpenAiToolsPromise,
        },
    };
}

/**
 * Resolves the disclaimer guard response, if any, required before a stateless chat request may continue.
 */
async function resolveAgentChatDisclaimerResponse(options: {
    agentSource: Awaited<ReturnType<typeof resolveCachedServerAgentContext>>['resolvedAgentSource'];
    currentUserIdentity: ResolvedCurrentUserMemoryIdentity | null;
    agentId: string;
}): Promise<Response | undefined> {
    const disclaimerMarkdown = resolveMetaDisclaimerMarkdownFromAgentSource(options.agentSource);
    if (!disclaimerMarkdown) {
        return undefined;
    }

    if (!options.currentUserIdentity) {
        return createAgentChatApiErrorResponse(
            META_DISCLAIMER_REQUIRED_MESSAGE,
            403,
            'meta_disclaimer_required',
        );
    }

    const disclaimerStatus = await resolveMetaDisclaimerStatusForUser({
        userId: options.currentUserIdentity.userId,
        agentPermanentId: options.agentId,
        agentSource: options.agentSource,
    });

    if (!disclaimerStatus.accepted) {
        return createAgentChatApiErrorResponse(
            META_DISCLAIMER_REQUIRED_MESSAGE,
            403,
            'meta_disclaimer_required',
        );
    }

    return undefined;
}

/**
 * Resolves external credentials that may be referenced by prompt parameters for one chat request.
 */
async function resolveAgentChatCredentials(options: {
    currentUserId: number | undefined;
    agentId: string;
    calendarConnections: ReturnType<typeof extractUseCalendarConnectionsFromAgentSource>;
    useEmailConfiguration: ReturnType<typeof extractUseEmailConfigurationFromAgentSource>;
}): Promise<AgentChatCredentials> {
    const { currentUserId, agentId, calendarConnections, useEmailConfiguration } = options;
    const [projectGithubToken, calendarGoogleAccessToken, emailSmtpCredential] = await Promise.all([
        resolveUseProjectGithubToken({
            userId: currentUserId,
            agentPermanentId: agentId,
        }),
        calendarConnections.length > 0
            ? resolveUseCalendarGoogleToken({
                  userId: currentUserId,
                  agentPermanentId: agentId,
              })
            : Promise.resolve(undefined),
        useEmailConfiguration.isEnabled
            ? resolveUseEmailSmtpCredential({
                  userId: currentUserId,
                  agentPermanentId: agentId,
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
 * Normalizes optional prompt-parameter payloads coming from the stateless chat route.
 */
function normalizeAgentChatIncomingParameters(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }

    return value as Record<string, unknown>;
}

/**
 * Creates the chat history recorder and persists the initial user message before streaming starts.
 */
async function createAgentChatHistoryContext(options: {
    request: Request;
    agentId: string;
    agentHash: string;
    currentUserIdentity: ResolvedCurrentUserMemoryIdentity | null;
    isPrivateModeEnabled: boolean;
    isTeamConversation: boolean;
    message: string;
    attachments: ChatMessage['attachments'];
}): Promise<AgentChatHistoryContext> {
    const recordChatHistoryMessage = await createChatHistoryRecorder({
        request: options.request,
        agentIdentifier: options.agentId,
        agentHash: options.agentHash,
        source: 'AGENT_PAGE_CHAT',
        apiKey: null,
        actorType: options.isTeamConversation ? 'TEAM_MEMBER' : undefined,
        userId: options.currentUserIdentity?.userId ?? null,
        isEnabled: !options.isPrivateModeEnabled,
    });
    const userMessageHash = await recordChatHistoryMessage({
        message: {
            role: 'USER',
            sender: 'USER',
            content: options.message,
            attachments: options.attachments,
        },
        previousMessageHash: null, // <- TODO: [🧠] How to handle previous message hash?
    });

    return {
        recordChatHistoryMessage,
        userMessageHash,
    };
}

/**
 * Waits for any already-running AgentKit preparation for the same agent fingerprint to finish.
 */
async function waitForAgentChatPreparation(options: {
    collection: Awaited<ReturnType<typeof $provideAgentCollectionForServer>>;
    agentId: string;
    agentHash: string;
}): Promise<void> {
    const tablePrefix = resolveAgentCollectionTablePrefix(options.collection);
    const preparationWaitResult = await waitForRunningAgentPreparation({
        tablePrefix,
        agentPermanentId: options.agentId,
        fingerprint: options.agentHash,
        timeoutMs: AGENT_PREPARATION_CHAT_WAIT_TIMEOUT_MS,
    });

    if (preparationWaitResult !== 'not_running') {
        console.info('[pre-index]', 'chat_wait_result', {
            tablePrefix,
            agentPermanentId: options.agentId,
            agentHash: options.agentHash,
            preparationWaitResult,
        });
    }
}
