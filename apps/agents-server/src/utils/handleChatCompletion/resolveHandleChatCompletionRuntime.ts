import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideOpenAiAgentKitExecutionToolsForServer } from '@/src/tools/$provideOpenAiAgentKitExecutionToolsForServer';
import { Agent, computeAgentHash, createAgentModelRequirements } from '@promptbook-local/core';
import type { AgentModelRequirements, string_book, TODO_any } from '@promptbook-local/types';
import { createInlineKnowledgeSourceUploader } from '@/src/utils/knowledge/createInlineKnowledgeSourceUploader';
import { resolveCurrentUserMemoryIdentity } from '@/src/utils/userMemory';
import { extractUseCalendarConnectionsFromAgentSource } from '@/src/utils/calendars/extractUseCalendarConnectionsFromAgentSource';
import { extractUseEmailConfigurationFromAgentSource } from '@/src/utils/emails/extractUseEmailConfigurationFromAgentSource';
import { extractProjectRepositoriesFromAgentSource } from '@/src/utils/projects/extractProjectRepositoriesFromAgentSource';
import { resolveUseEmailSmtpCredential } from '@/src/utils/resolveUseEmailSmtpCredential';
import { resolveUseCalendarGoogleToken } from '@/src/utils/resolveUseCalendarGoogleToken';
import { resolveUseProjectGithubToken } from '@/src/utils/resolveUseProjectGithubToken';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import {
    createBookScopedAgentReferenceResolver,
    parseBookScopedAgentIdentifier,
} from '@/src/utils/agentReferenceResolver/bookScopedAgentReferences';
import { resolveMessageSuffixFromAgentSource } from '@/src/utils/chat/messageSuffix';
import { NextRequest, NextResponse } from 'next/server';
import { isAgentDeleted } from '../../app/agents/[agentName]/_utils';
import {
    AGENT_PREPARATION_CHAT_WAIT_TIMEOUT_MS,
    resolveAgentCollectionTablePrefix,
    waitForRunningAgentPreparation,
} from '../agentPreparation';
import { resolveCachedServerAgentContext, resolveCachedServerAgentModelRequirements } from '../cachedServerAgentRuntime';
import { AgentKitCacheManager } from '../cache/AgentKitCacheManager';
import { createHandleChatCompletionErrorResponse } from './createHandleChatCompletionErrorResponse';

/**
 * Runtime state resolved before the chat model is executed.
 *
 * @private type of `handleChatCompletion`
 */
export type HandleChatCompletionRuntime = {
    collection: Awaited<ReturnType<typeof $provideAgentCollectionForServer>>;
    resolvedAgentContext: Awaited<ReturnType<typeof resolveCachedServerAgentContext>>;
    agent: Agent;
    modelRequirements: AgentModelRequirements;
    agentSource: string_book;
    unresolvedAgentSource: Awaited<ReturnType<typeof resolveCachedServerAgentContext>>['unresolvedAgentSource'];
    messageSuffix: string | null;
    agentId: string;
    agentHash: string;
    projectRepositories: ReturnType<typeof extractProjectRepositoriesFromAgentSource>;
    calendarConnections: ReturnType<typeof extractUseCalendarConnectionsFromAgentSource>;
    useEmailConfiguration: ReturnType<typeof extractUseEmailConfigurationFromAgentSource>;
    currentUserIdentity: Awaited<ReturnType<typeof resolveCurrentUserMemoryIdentity>>;
    projectGithubToken: Awaited<ReturnType<typeof resolveUseProjectGithubToken>>;
    calendarGoogleAccessToken: Awaited<ReturnType<typeof resolveUseCalendarGoogleToken>>;
    emailSmtpCredential: Awaited<ReturnType<typeof resolveUseEmailSmtpCredential>>;
    isPrivateModeEnabled: boolean;
    localServerUrl: string;
};

/**
 * Resolves agent/runtime dependencies needed before prompt execution.
 *
 * @private function of `handleChatCompletion`
 */
export async function resolveHandleChatCompletionRuntime(options: {
    request: NextRequest;
    agentName: string;
    messages: ReadonlyArray<TODO_any>;
    isPrivateModeEnabled: boolean;
}): Promise<HandleChatCompletionRuntime | NextResponse> {
    const { request, agentName, messages, isPrivateModeEnabled } = options;
    const parsedBookScopedAgentIdentifier = parseBookScopedAgentIdentifier(agentName);
    const deletedCheckAgentIdentifier = parsedBookScopedAgentIdentifier?.parentAgentIdentifier || agentName;

    if (await isAgentDeleted(deletedCheckAgentIdentifier)) {
        return createHandleChatCompletionErrorResponse(
            'This agent has been deleted. You can restore it from the Recycle Bin.',
            'agent_deleted',
            410,
        );
    }

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
    }).catch(() => null);

    if (!resolvedAgentContext?.resolvedAgentSource) {
        return createHandleChatCompletionErrorResponse(`Agent '${agentName}' not found.`, 'invalid_request_error', 404);
    }

    let agentSource: string_book = resolvedAgentContext.resolvedAgentSource;
    const unresolvedAgentSource = resolvedAgentContext.unresolvedAgentSource;
    const projectRepositories = extractProjectRepositoriesFromAgentSource(agentSource);
    const calendarConnections = extractUseCalendarConnectionsFromAgentSource(agentSource);
    const useEmailConfiguration = extractUseEmailConfigurationFromAgentSource(agentSource);
    const messageSuffix = resolveMessageSuffixFromAgentSource(agentSource);
    const { agentSourceWithContext, hasDynamicContext } = appendSystemMessagesToAgentSource(agentSource, messages);
    agentSource = agentSourceWithContext;

    const preparedAgentModelRequirements = !hasDynamicContext
        ? await resolveCachedServerAgentModelRequirements({
              resolvedAgentContext,
              localServerUrl,
              fallbackResolver: baseAgentReferenceResolver,
          })
        : null;
    const agentId = resolvedAgentContext.parentAgentPermanentId;
    const agentHash = computeAgentHash(agentSource);
    await waitForHandleChatCompletionAgentPreparation({
        collection,
        agentId,
        agentHash,
    });

    const currentUserIdentity = await resolveCurrentUserMemoryIdentity();
    const { projectGithubToken, calendarGoogleAccessToken, emailSmtpCredential } =
        await resolveHandleChatCompletionCredentials({
            currentUserIdentity,
            agentId,
            calendarConnections,
            useEmailConfiguration,
        });
    const runtimeAgentReferenceResolver = hasDynamicContext
        ? createBookScopedAgentReferenceResolver({
              parentAgentSource: resolvedAgentContext.parentAgentSource,
              parentAgentIdentifier: resolvedAgentContext.parentAgentPermanentId,
              localServerUrl,
              fallbackResolver: baseAgentReferenceResolver,
          })
        : undefined;
    const agentModelRequirements =
        preparedAgentModelRequirements?.modelRequirements ||
        (await createAgentModelRequirements(agentSource, undefined, undefined, undefined, {
            agentReferenceResolver: runtimeAgentReferenceResolver,
            inlineKnowledgeSourceUploader: createInlineKnowledgeSourceUploader(),
        }));
    const agent = await createHandleChatCompletionAgent({
        agentName,
        agentSource,
        agentId,
        resolvedAgentContext,
        agentModelRequirements,
    });

    return {
        collection,
        resolvedAgentContext,
        agent,
        modelRequirements: agentModelRequirements,
        agentSource,
        unresolvedAgentSource,
        messageSuffix,
        agentId,
        agentHash,
        projectRepositories,
        calendarConnections,
        useEmailConfiguration,
        currentUserIdentity,
        projectGithubToken,
        calendarGoogleAccessToken,
        emailSmtpCredential,
        isPrivateModeEnabled,
        localServerUrl,
    };
}

/**
 * Appends system messages to the agent source as dynamic `CONTEXT`.
 */
function appendSystemMessagesToAgentSource(
    agentSource: string_book,
    messages: ReadonlyArray<TODO_any>,
): {
    agentSourceWithContext: string_book;
    hasDynamicContext: boolean;
} {
    const systemMessages = messages.filter((message: TODO_any) => message.role === 'system');
    if (systemMessages.length === 0) {
        return {
            agentSourceWithContext: agentSource,
            hasDynamicContext: false,
        };
    }

    const contextString = systemMessages.map((message: TODO_any) => `CONTEXT ${message.content}`).join('\n');
    return {
        agentSourceWithContext: `${agentSource}\n\n${contextString}` as string_book,
        hasDynamicContext: true,
    };
}

/**
 * Waits for any running preparation job of the current agent before executing the chat call.
 */
async function waitForHandleChatCompletionAgentPreparation(options: {
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
        console.info('[pre-index]', 'openai_chat_wait_result', {
            tablePrefix,
            agentPermanentId: options.agentId,
            agentHash: options.agentHash,
            preparationWaitResult,
        });
    }
}

/**
 * Resolves request-scoped project, calendar, and email credentials for the current agent.
 */
async function resolveHandleChatCompletionCredentials(options: {
    currentUserIdentity: Awaited<ReturnType<typeof resolveCurrentUserMemoryIdentity>>;
    agentId: string;
    calendarConnections: ReturnType<typeof extractUseCalendarConnectionsFromAgentSource>;
    useEmailConfiguration: ReturnType<typeof extractUseEmailConfigurationFromAgentSource>;
}): Promise<{
    projectGithubToken: Awaited<ReturnType<typeof resolveUseProjectGithubToken>>;
    calendarGoogleAccessToken: Awaited<ReturnType<typeof resolveUseCalendarGoogleToken>>;
    emailSmtpCredential: Awaited<ReturnType<typeof resolveUseEmailSmtpCredential>>;
}> {
    const userId = options.currentUserIdentity?.userId;
    const [projectGithubToken, calendarGoogleAccessToken, emailSmtpCredential] = await Promise.all([
        resolveUseProjectGithubToken({
            userId,
            agentPermanentId: options.agentId,
        }),
        options.calendarConnections.length > 0
            ? resolveUseCalendarGoogleToken({
                  userId,
                  agentPermanentId: options.agentId,
              })
            : Promise.resolve(undefined),
        options.useEmailConfiguration.isEnabled
            ? resolveUseEmailSmtpCredential({
                  userId,
                  agentPermanentId: options.agentId,
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
 * Creates the request-scoped Promptbook agent that backs one compatibility chat call.
 */
async function createHandleChatCompletionAgent(options: {
    agentName: string;
    agentSource: string_book;
    agentId: string;
    resolvedAgentContext: Awaited<ReturnType<typeof resolveCachedServerAgentContext>>;
    agentModelRequirements: AgentModelRequirements;
}): Promise<Agent> {
    const agentKitCacheManager = new AgentKitCacheManager({ isVerbose: true });
    const baseOpenAiToolsPromise = $provideOpenAiAgentKitExecutionToolsForServer();

    const agentKitResult = await agentKitCacheManager.getOrCreateAgentKitAgent(
        options.agentSource,
        options.resolvedAgentContext.resolvedAgentName,
        await baseOpenAiToolsPromise,
        {
            includeDynamicContext: true,
            agentId: options.agentId,
            modelRequirements: options.agentModelRequirements,
        },
    );

    console.info('[🤰]', `AgentKit cache ${agentKitResult.fromCache ? 'hit' : 'miss'} (OpenAI)`, {
        agentName: options.agentName,
        assistantCacheKey: agentKitResult.assistantCacheKey,
    });

    return new Agent({
        agentSource: options.agentSource,
        executionTools: {
            llm: agentKitResult.tools,
        },
        precomputedModelRequirements: options.agentModelRequirements,
        assistantPreparationMode: 'external',
        isVerbose: true,
        teacherAgent: null,
    });
}
