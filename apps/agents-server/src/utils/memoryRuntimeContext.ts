import {
    parseToolRuntimeContext,
    serializeToolRuntimeContext,
    TOOL_RUNTIME_CONTEXT_PARAMETER,
    type ToolRuntimeContext,
} from '../../../../src/commitments/_common/toolRuntimeContext';
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
    isPrivateModeEnabled?: boolean;
    projectRepositories?: string[];
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
        isPrivateModeEnabled,
        projectRepositories,
    } = options;
    const normalizedBaseParameters = normalizePromptParameters(baseParameters);
    const runtimeLocationContext = parseUserLocationPromptParameter(
        normalizedBaseParameters[USER_LOCATION_PROMPT_PARAMETER],
    );
    const projectGithubToken = parseProjectGithubTokenPromptParameter(
        normalizedBaseParameters[PROJECT_GITHUB_TOKEN_PROMPT_PARAMETER],
    );
    const filteredBaseParameters = excludeInternalRuntimeParameters(normalizedBaseParameters);

    const existingRuntimeContext =
        parseToolRuntimeContext(filteredBaseParameters[TOOL_RUNTIME_CONTEXT_PARAMETER]) || {};
    const resolvedProjectRepositories =
        projectRepositories === undefined
            ? normalizeProjectRepositories(existingRuntimeContext.projects?.repositories)
            : normalizeProjectRepositories(projectRepositories);
    const isTeamConversation = existingRuntimeContext.memory?.isTeamConversation === true;
    const isPrivateMode = isPrivateModeEnabled === true;
    const isMemoryEnabled = Boolean(currentUserIdentity && !isTeamConversation && !isPrivateMode);
    const projectsRuntimeContext = {
        ...(existingRuntimeContext.projects || {}),
        ...(projectGithubToken ? { githubToken: projectGithubToken } : {}),
        ...(resolvedProjectRepositories.length > 0 ? { repositories: resolvedProjectRepositories } : {}),
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
    };

    return {
        ...filteredBaseParameters,
        [TOOL_RUNTIME_CONTEXT_PARAMETER]: serializeToolRuntimeContext(mergedRuntimeContext),
    };
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
        ([key]) => key !== USER_LOCATION_PROMPT_PARAMETER && key !== PROJECT_GITHUB_TOKEN_PROMPT_PARAMETER,
    );
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
