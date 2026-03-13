import {
    parseToolRuntimeContext,
    serializeToolRuntimeContext,
    TOOL_RUNTIME_CONTEXT_PARAMETER,
    type ToolRuntimeContext,
} from '../../../../src/commitments/_common/toolRuntimeContext';
import { normalizeChatAttachments } from '../../../../src/utils/chat/chatAttachments';
import type { ChatAttachment } from '../../../../src/utils/chat/chatAttachments';
import {
    parseProjectGithubTokenPromptParameter,
    PROJECT_GITHUB_TOKEN_PROMPT_PARAMETER,
} from './githubTokenPromptParameter';
import type { ResolvedCurrentUserMemoryIdentity } from './userMemory';
import {
    parseUserLocationPromptParameter,
    USER_LOCATION_PROMPT_PARAMETER,
} from './userLocationPromptParameter';

/**
 * Input for composing prompt parameters with memory runtime context.
 */
export type ComposePromptParametersWithMemoryContextOptions = {
    baseParameters: Record<string, unknown>;
    currentUserIdentity: ResolvedCurrentUserMemoryIdentity | null;
    agentPermanentId?: string;
    agentName: string;
    chatId?: string;
    isPrivateModeEnabled?: boolean;
    projectRepositories?: string[];
    projectGithubToken?: string;
    emailSmtpCredential?: string;
    emailFromAddress?: string;
    chatAttachments?: ReadonlyArray<ChatAttachment>;
};

/**
 * Composes prompt parameters while embedding tool runtime context for memory tools.
 */
export function composePromptParametersWithMemoryContext(
    options: ComposePromptParametersWithMemoryContextOptions,
): Record<string, string> {
    const {
        baseParameters,
        currentUserIdentity,
        agentPermanentId,
        agentName,
        chatId,
        isPrivateModeEnabled,
        projectRepositories,
        projectGithubToken,
        emailSmtpCredential,
        emailFromAddress,
        chatAttachments,
    } = options;
    const normalizedBaseParameters = normalizePromptParameters(baseParameters);
    const runtimeLocationContext = parseUserLocationPromptParameter(
        normalizedBaseParameters[USER_LOCATION_PROMPT_PARAMETER],
    );
    const projectGithubTokenFromPrompt = parseProjectGithubTokenPromptParameter(
        normalizedBaseParameters[PROJECT_GITHUB_TOKEN_PROMPT_PARAMETER],
    );
    const resolvedProjectGithubToken = projectGithubToken?.trim() || projectGithubTokenFromPrompt;
    const filteredBaseParameters = excludeInternalRuntimeParameters(normalizedBaseParameters);
    const promptParametersForChatContext = excludeToolRuntimeContextParameter(normalizedBaseParameters);

    const existingRuntimeContext =
        parseToolRuntimeContext(normalizedBaseParameters[TOOL_RUNTIME_CONTEXT_PARAMETER]) || {};
    const resolvedProjectRepositories =
        projectRepositories === undefined
            ? normalizeProjectRepositories(existingRuntimeContext.projects?.repositories)
            : normalizeProjectRepositories(projectRepositories);
    const isTeamConversation = existingRuntimeContext.memory?.isTeamConversation === true;
    const isPrivateMode = isPrivateModeEnabled === true;
    const isMemoryEnabled = Boolean(currentUserIdentity && !isTeamConversation && !isPrivateMode);
    const normalizedChatAttachments = normalizeChatAttachments(chatAttachments);
    const projectsRuntimeContext = {
        ...(existingRuntimeContext.projects || {}),
        ...(resolvedProjectGithubToken ? { githubToken: resolvedProjectGithubToken } : {}),
        ...(resolvedProjectRepositories.length > 0 ? { repositories: resolvedProjectRepositories } : {}),
    };
    const mergedEmailRuntimeContext = {
        ...(existingRuntimeContext.email || {}),
        ...(normalizeOptionalText(emailSmtpCredential) ? { smtpCredential: normalizeOptionalText(emailSmtpCredential) } : {}),
        ...(normalizeOptionalText(emailFromAddress) ? { fromAddress: normalizeOptionalText(emailFromAddress) } : {}),
    };

    const mergedRuntimeContext: ToolRuntimeContext = {
        ...existingRuntimeContext,
        memory: {
            ...(existingRuntimeContext.memory || {}),
            enabled: isMemoryEnabled,
            userId: currentUserIdentity?.userId,
            username: currentUserIdentity?.user.username,
            agentId: agentPermanentId,
            agentName,
            isTeamConversation,
            isPrivateMode,
        },
        userLocation: runtimeLocationContext ?? existingRuntimeContext.userLocation,
        projects:
            projectsRuntimeContext.githubToken || projectsRuntimeContext.repositories
                ? projectsRuntimeContext
                : undefined,
        email:
            mergedEmailRuntimeContext.smtpCredential || mergedEmailRuntimeContext.fromAddress
                ? mergedEmailRuntimeContext
                : undefined,
        spawn: {
            ...(existingRuntimeContext.spawn || {}),
            depth:
                typeof existingRuntimeContext.spawn?.depth === 'number' &&
                Number.isFinite(existingRuntimeContext.spawn.depth)
                    ? Math.max(0, Math.floor(existingRuntimeContext.spawn.depth))
                    : 0,
            parentAgentId: agentPermanentId || existingRuntimeContext.spawn?.parentAgentId,
        },
        chat:
            chatId || existingRuntimeContext.chat?.chatId || normalizedChatAttachments.length > 0
                ? {
                      ...(existingRuntimeContext.chat || {}),
                      chatId: chatId || existingRuntimeContext.chat?.chatId,
                      userId: currentUserIdentity?.userId || existingRuntimeContext.chat?.userId,
                      agentId: agentPermanentId || existingRuntimeContext.chat?.agentId,
                      agentName: agentName || existingRuntimeContext.chat?.agentName,
                      parameters: promptParametersForChatContext,
                      attachments:
                          normalizedChatAttachments.length > 0
                              ? normalizedChatAttachments
                              : existingRuntimeContext.chat?.attachments,
                  }
                : existingRuntimeContext.chat,
    };

    return {
        ...filteredBaseParameters,
        [TOOL_RUNTIME_CONTEXT_PARAMETER]: serializeToolRuntimeContext(mergedRuntimeContext),
    };
}

/**
 * Normalizes optional text input.
 */
function normalizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed || undefined;
}

/**
 * Converts unknown prompt parameter values to string values required by Promptbook templates.
 */
function normalizePromptParameters(parameters: Record<string, unknown>): Record<string, string> {
    const normalizedEntries: Array<[string, string]> = [];

    for (const [key, value] of Object.entries(parameters)) {
        if (value === undefined || value === null) {
            continue;
        }

        if (typeof value === 'string') {
            normalizedEntries.push([key, value]);
            continue;
        }

        normalizedEntries.push([key, JSON.stringify(value)]);
    }

    return Object.fromEntries(normalizedEntries);
}

/**
 * Removes internal prompt parameters that are meant only for runtime-context transport.
 */
function excludeInternalRuntimeParameters(parameters: Record<string, string>): Record<string, string> {
    const filteredEntries = Object.entries(parameters).filter(
        ([key]) =>
            key !== USER_LOCATION_PROMPT_PARAMETER &&
            key !== PROJECT_GITHUB_TOKEN_PROMPT_PARAMETER &&
            key !== TOOL_RUNTIME_CONTEXT_PARAMETER,
    );
    return Object.fromEntries(filteredEntries);
}

/**
 * Removes the serialized runtime-context transport parameter while keeping user-facing prompt parameters intact.
 */
function excludeToolRuntimeContextParameter(parameters: Record<string, string>): Record<string, string> {
    const filteredEntries = Object.entries(parameters).filter(([key]) => key !== TOOL_RUNTIME_CONTEXT_PARAMETER);
    return Object.fromEntries(filteredEntries);
}

/**
 * Normalizes configured project repository references while preserving declaration order.
 */
function normalizeProjectRepositories(rawRepositories: unknown): string[] {
    if (!Array.isArray(rawRepositories)) {
        return [];
    }

    const repositories: string[] = [];
    const seenRepositories = new Set<string>();

    for (const rawRepository of rawRepositories) {
        if (typeof rawRepository !== 'string') {
            continue;
        }

        const repository = rawRepository.trim();
        if (!repository || seenRepositories.has(repository)) {
            continue;
        }

        repositories.push(repository);
        seenRepositories.add(repository);
    }

    return repositories;
}
