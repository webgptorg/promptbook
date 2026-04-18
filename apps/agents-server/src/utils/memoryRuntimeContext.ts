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
 * Calendar connection carried through the hidden tool runtime context.
 *
 * @private type of `composePromptParametersWithMemoryContext`
 */
type CalendarConnection = NonNullable<NonNullable<ToolRuntimeContext['calendars']>['connections']>[number];

/**
 * Normalized prompt-parameter views used while composing the hidden runtime context.
 *
 * @private type of `composePromptParametersWithMemoryContext`
 */
type PreparedPromptParameters = {
    normalizedBaseParameters: Record<string, string>;
    filteredBaseParameters: Record<string, string>;
    promptParametersForChatContext: Record<string, string>;
};

/**
 * Input for composing prompt parameters with memory runtime context.
 */
export type ComposePromptParametersWithMemoryContextOptions = {
    baseParameters: Record<string, unknown>;
    currentUserIdentity: ResolvedCurrentUserMemoryIdentity | null;
    agentPermanentId?: string;
    agentName: string;
    chatId?: string;
    assistantMessageId?: string;
    isPrivateModeEnabled?: boolean;
    projectRepositories?: string[];
    projectGithubToken?: string;
    emailSmtpCredential?: string;
    emailFromAddress?: string;
    calendarGoogleAccessToken?: string;
    calendarConnections?: ReadonlyArray<CalendarConnection>;
    chatAttachments?: ReadonlyArray<ChatAttachment>;
};

/**
 * Composes prompt parameters while embedding tool runtime context for memory tools.
 */
export function composePromptParametersWithMemoryContext(
    options: ComposePromptParametersWithMemoryContextOptions,
): Record<string, string> {
    const preparedPromptParameters = preparePromptParameters(options.baseParameters);
    const existingRuntimeContext = resolveExistingRuntimeContext(preparedPromptParameters.normalizedBaseParameters);
    const mergedRuntimeContext = createMergedRuntimeContext(
        options,
        preparedPromptParameters,
        existingRuntimeContext,
    );

    return {
        ...preparedPromptParameters.filteredBaseParameters,
        [TOOL_RUNTIME_CONTEXT_PARAMETER]: serializeToolRuntimeContext(mergedRuntimeContext),
    };
}

/**
 * Builds normalized prompt-parameter views used by the runtime-context composition steps.
 */
function preparePromptParameters(baseParameters: Record<string, unknown>): PreparedPromptParameters {
    const normalizedBaseParameters = normalizePromptParameters(baseParameters);

    return {
        normalizedBaseParameters,
        filteredBaseParameters: excludeInternalRuntimeParameters(normalizedBaseParameters),
        promptParametersForChatContext: excludeToolRuntimeContextParameter(normalizedBaseParameters),
    };
}

/**
 * Parses any serialized hidden runtime context already present in the incoming prompt parameters.
 */
function resolveExistingRuntimeContext(parameters: Record<string, string>): ToolRuntimeContext {
    return parseToolRuntimeContext(parameters[TOOL_RUNTIME_CONTEXT_PARAMETER]) || {};
}

/**
 * Merges explicit request options with any previously serialized runtime context.
 */
function createMergedRuntimeContext(
    options: ComposePromptParametersWithMemoryContextOptions,
    preparedPromptParameters: PreparedPromptParameters,
    existingRuntimeContext: ToolRuntimeContext,
): ToolRuntimeContext {
    return {
        ...existingRuntimeContext,
        memory: createMemoryRuntimeContext(options, existingRuntimeContext),
        userLocation: resolveUserLocationRuntimeContext(
            preparedPromptParameters.normalizedBaseParameters,
            existingRuntimeContext,
        ),
        projects: createProjectsRuntimeContext(
            options,
            preparedPromptParameters.normalizedBaseParameters,
            existingRuntimeContext,
        ),
        email: createEmailRuntimeContext(options, existingRuntimeContext),
        calendars: createCalendarsRuntimeContext(options, existingRuntimeContext),
        spawn: createSpawnRuntimeContext(options.agentPermanentId, existingRuntimeContext),
        chat: createChatRuntimeContext(
            options,
            preparedPromptParameters.promptParametersForChatContext,
            existingRuntimeContext,
        ),
    };
}

/**
 * Resolves the memory-related runtime context shared with memory-aware tools.
 */
function createMemoryRuntimeContext(
    options: ComposePromptParametersWithMemoryContextOptions,
    existingRuntimeContext: ToolRuntimeContext,
): NonNullable<ToolRuntimeContext['memory']> {
    const isTeamConversation = existingRuntimeContext.memory?.isTeamConversation === true;
    const isPrivateMode = options.isPrivateModeEnabled === true;
    const isMemoryEnabled = Boolean(options.currentUserIdentity && !isTeamConversation && !isPrivateMode);

    return {
        ...(existingRuntimeContext.memory || {}),
        enabled: isMemoryEnabled,
        userId: options.currentUserIdentity?.userId,
        username: options.currentUserIdentity?.user.username,
        agentId: options.agentPermanentId,
        agentName: options.agentName,
        isTeamConversation,
        isPrivateMode,
    };
}

/**
 * Resolves the user-location section from prompt parameters while preserving prior context when absent.
 */
function resolveUserLocationRuntimeContext(
    normalizedBaseParameters: Record<string, string>,
    existingRuntimeContext: ToolRuntimeContext,
): ToolRuntimeContext['userLocation'] {
    return (
        parseUserLocationPromptParameter(normalizedBaseParameters[USER_LOCATION_PROMPT_PARAMETER]) ||
        existingRuntimeContext.userLocation
    );
}

/**
 * Resolves the project-access runtime context used by repository-aware tools.
 */
function createProjectsRuntimeContext(
    options: ComposePromptParametersWithMemoryContextOptions,
    normalizedBaseParameters: Record<string, string>,
    existingRuntimeContext: ToolRuntimeContext,
): ToolRuntimeContext['projects'] {
    const githubToken = resolveProjectGithubToken(options.projectGithubToken, normalizedBaseParameters);
    const repositories = resolveProjectRepositories(options.projectRepositories, existingRuntimeContext);
    const projectRuntimeContext = {
        ...(existingRuntimeContext.projects || {}),
        ...(githubToken ? { githubToken } : {}),
        ...(repositories.length > 0 ? { repositories } : {}),
    };

    return projectRuntimeContext.githubToken || projectRuntimeContext.repositories
        ? projectRuntimeContext
        : undefined;
}

/**
 * Resolves the email runtime context used by mail-sending tools.
 */
function createEmailRuntimeContext(
    options: ComposePromptParametersWithMemoryContextOptions,
    existingRuntimeContext: ToolRuntimeContext,
): ToolRuntimeContext['email'] {
    const smtpCredential = normalizeOptionalText(options.emailSmtpCredential);
    const fromAddress = normalizeOptionalText(options.emailFromAddress);
    const emailRuntimeContext = {
        ...(existingRuntimeContext.email || {}),
        ...(smtpCredential ? { smtpCredential } : {}),
        ...(fromAddress ? { fromAddress } : {}),
    };

    return emailRuntimeContext.smtpCredential || emailRuntimeContext.fromAddress ? emailRuntimeContext : undefined;
}

/**
 * Resolves the calendar runtime context used by calendar-aware tools.
 */
function createCalendarsRuntimeContext(
    options: ComposePromptParametersWithMemoryContextOptions,
    existingRuntimeContext: ToolRuntimeContext,
): ToolRuntimeContext['calendars'] {
    const googleAccessToken = normalizeOptionalText(options.calendarGoogleAccessToken);
    const connections = resolveCalendarConnections(options.calendarConnections, existingRuntimeContext);
    const calendarsRuntimeContext = {
        ...(existingRuntimeContext.calendars || {}),
        ...(googleAccessToken ? { googleAccessToken } : {}),
        ...(connections.length > 0 ? { connections } : {}),
    };

    return calendarsRuntimeContext.googleAccessToken || calendarsRuntimeContext.connections
        ? calendarsRuntimeContext
        : undefined;
}

/**
 * Resolves the spawn metadata carried into nested agent/tool executions.
 */
function createSpawnRuntimeContext(
    agentPermanentId: string | undefined,
    existingRuntimeContext: ToolRuntimeContext,
): NonNullable<ToolRuntimeContext['spawn']> {
    return {
        ...(existingRuntimeContext.spawn || {}),
        depth: normalizeSpawnDepth(existingRuntimeContext.spawn?.depth),
        parentAgentId: agentPermanentId || existingRuntimeContext.spawn?.parentAgentId,
    };
}

/**
 * Resolves the chat-scoped runtime context used by thread-bound tools.
 */
function createChatRuntimeContext(
    options: ComposePromptParametersWithMemoryContextOptions,
    promptParametersForChatContext: Record<string, string>,
    existingRuntimeContext: ToolRuntimeContext,
): ToolRuntimeContext['chat'] {
    const existingChatRuntimeContext = existingRuntimeContext.chat;
    const normalizedChatAttachments = normalizeChatAttachments(options.chatAttachments);

    if (
        !shouldIncludeChatRuntimeContext(
            options.chatId,
            options.assistantMessageId,
            existingChatRuntimeContext,
            normalizedChatAttachments,
        )
    ) {
        return existingChatRuntimeContext;
    }

    return {
        ...(existingChatRuntimeContext || {}),
        chatId: options.chatId || existingChatRuntimeContext?.chatId,
        userId: options.currentUserIdentity?.userId || existingChatRuntimeContext?.userId,
        agentId: options.agentPermanentId || existingChatRuntimeContext?.agentId,
        agentName: options.agentName || existingChatRuntimeContext?.agentName,
        assistantMessageId: options.assistantMessageId || existingChatRuntimeContext?.assistantMessageId,
        parameters: promptParametersForChatContext,
        attachments:
            normalizedChatAttachments.length > 0 ? normalizedChatAttachments : existingChatRuntimeContext?.attachments,
    };
}

/**
 * Detects whether the chat runtime context should be materialized for this request.
 */
function shouldIncludeChatRuntimeContext(
    chatId: string | undefined,
    assistantMessageId: string | undefined,
    existingChatRuntimeContext: ToolRuntimeContext['chat'],
    normalizedChatAttachments: ReturnType<typeof normalizeChatAttachments>,
): boolean {
    return Boolean(
        chatId ||
            assistantMessageId ||
            existingChatRuntimeContext?.chatId ||
            existingChatRuntimeContext?.assistantMessageId ||
            normalizedChatAttachments.length > 0,
    );
}

/**
 * Resolves the GitHub token from explicit options first and prompt parameters second.
 */
function resolveProjectGithubToken(
    projectGithubToken: string | undefined,
    normalizedBaseParameters: Record<string, string>,
): string | undefined {
    const projectGithubTokenFromPrompt = parseProjectGithubTokenPromptParameter(
        normalizedBaseParameters[PROJECT_GITHUB_TOKEN_PROMPT_PARAMETER],
    );

    return normalizeOptionalText(projectGithubToken) || projectGithubTokenFromPrompt;
}

/**
 * Resolves project repositories from explicit options or the existing runtime context.
 */
function resolveProjectRepositories(
    projectRepositories: ComposePromptParametersWithMemoryContextOptions['projectRepositories'],
    existingRuntimeContext: ToolRuntimeContext,
): string[] {
    return projectRepositories === undefined
        ? normalizeProjectRepositories(existingRuntimeContext.projects?.repositories)
        : normalizeProjectRepositories(projectRepositories);
}

/**
 * Resolves calendar connections from explicit options or the existing runtime context.
 */
function resolveCalendarConnections(
    calendarConnections: ComposePromptParametersWithMemoryContextOptions['calendarConnections'],
    existingRuntimeContext: ToolRuntimeContext,
): CalendarConnection[] {
    return calendarConnections === undefined
        ? normalizeCalendarConnections(existingRuntimeContext.calendars?.connections)
        : normalizeCalendarConnections(calendarConnections);
}

/**
 * Normalizes an existing spawn depth into a non-negative integer.
 */
function normalizeSpawnDepth(depth: unknown): number {
    if (typeof depth !== 'number' || !Number.isFinite(depth)) {
        return 0;
    }

    return Math.max(0, Math.floor(depth));
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

/**
 * Normalizes configured calendar references while preserving declaration order.
 */
function normalizeCalendarConnections(
    rawConnections: unknown,
): CalendarConnection[] {
    if (!Array.isArray(rawConnections)) {
        return [];
    }

    const connections: CalendarConnection[] = [];
    const knownConnections = new Set<string>();

    for (const rawConnection of rawConnections) {
        if (!rawConnection || typeof rawConnection !== 'object') {
            continue;
        }

        const connection = rawConnection as Record<string, unknown>;
        const provider = normalizeOptionalText(connection.provider);
        const url = normalizeOptionalText(connection.url);
        const calendarId = normalizeOptionalText(connection.calendarId);

        if (!provider || !url || !calendarId) {
            continue;
        }

        const connectionKey = `${provider}|${url}`;
        if (knownConnections.has(connectionKey)) {
            continue;
        }

        knownConnections.add(connectionKey);

        const scopes = Array.isArray(connection.scopes)
            ? connection.scopes
                  .filter((scope): scope is string => typeof scope === 'string')
                  .map((scope) => scope.trim())
                  .filter(Boolean)
            : [];

        connections.push({
            provider,
            url,
            calendarId,
            ...(scopes.length > 0 ? { scopes } : {}),
        });
    }

    return connections;
}
