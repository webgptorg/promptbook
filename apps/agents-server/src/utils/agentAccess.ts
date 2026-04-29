import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { buildAgentNameOrIdFilter } from '@/src/utils/agentIdentifier';
import { parseBookScopedAgentIdentifier } from '@/src/utils/agentReferenceResolver/bookScopedAgentReferences';
import { isTeamInternalAgentAccessToken, TEAM_INTERNAL_AGENT_ACCESS_HEADER } from '../../../../src/commitments/_common/teamInternalAgentAccess';
import { getCurrentUser, type UserInfo } from './getCurrentUser';
import { isAgentVisibility, type AgentVisibility } from './agentVisibility';

/**
 * Message returned when a private agent is requested without a permitted identity.
 */
export const PRIVATE_AGENT_FORBIDDEN_MESSAGE = 'This agent is private. Sign in to access it.';

/**
 * Options for resolving access to one agent.
 */
type ResolveAgentAccessOptions = {
    /**
     * Request carrying the optional same-server TEAM access header.
     */
    readonly request?: Request;
    /**
     * Whether a valid same-server TEAM token may bypass private visibility.
     */
    readonly allowTeamInternalAccess?: boolean;
};

/**
 * Resolved visibility and user state for one agent request.
 */
export type AgentAccessResolution = {
    readonly visibility: AgentVisibility | null;
    readonly currentUser: UserInfo | null;
    readonly isAllowed: boolean;
};

/**
 * Resolves the stored visibility for one agent identifier.
 *
 * @param agentIdentifier - Agent name, permanent id, or book-scoped child identifier.
 * @returns Stored visibility, or `null` when the agent cannot be found.
 */
export async function resolveAgentVisibility(agentIdentifier: string): Promise<AgentVisibility | null> {
    const parsedBookScopedAgentIdentifier = parseBookScopedAgentIdentifier(agentIdentifier);
    const targetAgentIdentifier = parsedBookScopedAgentIdentifier?.parentAgentIdentifier || agentIdentifier;
    const supabase = $provideSupabaseForServer();
    const agentTable = await $getTableName('Agent');
    const agentResult = await supabase
        .from(agentTable)
        .select('visibility')
        .or(buildAgentNameOrIdFilter(targetAgentIdentifier))
        .limit(1);

    if (agentResult.error || !agentResult.data || agentResult.data.length === 0) {
        return null;
    }

    const visibility = (agentResult.data[0] as { visibility?: unknown }).visibility;
    return isAgentVisibility(visibility) ? visibility : null;
}

/**
 * Checks whether the current identity may access an agent with the given visibility.
 *
 * @param options - Visibility, current user, request, and TEAM bypass policy.
 * @returns `true` when the agent can be directly used in this request.
 */
export function canAccessAgentVisibility(options: {
    readonly visibility: AgentVisibility | null;
    readonly currentUser: UserInfo | null;
    readonly request?: Request;
    readonly allowTeamInternalAccess?: boolean;
}): boolean {
    if (options.visibility === 'PUBLIC' || options.visibility === 'UNLISTED') {
        return true;
    }

    if (options.visibility !== 'PRIVATE') {
        return false;
    }

    if (options.currentUser) {
        return true;
    }

    return Boolean(
        options.allowTeamInternalAccess &&
            options.request &&
            isTeamInternalAgentAccessToken(options.request.headers.get(TEAM_INTERNAL_AGENT_ACCESS_HEADER)),
    );
}

/**
 * Resolves whether the current request can access one agent.
 *
 * @param agentIdentifier - Agent name, permanent id, or book-scoped child identifier.
 * @param options - Request and internal TEAM access policy.
 * @returns Visibility, current user, and access decision.
 */
export async function resolveAgentAccess(
    agentIdentifier: string,
    options: ResolveAgentAccessOptions = {},
): Promise<AgentAccessResolution> {
    const [visibility, currentUser] = await Promise.all([resolveAgentVisibility(agentIdentifier), getCurrentUser()]);

    return {
        visibility,
        currentUser,
        isAllowed: canAccessAgentVisibility({
            visibility,
            currentUser,
            request: options.request,
            allowTeamInternalAccess: options.allowTeamInternalAccess,
        }),
    };
}

/**
 * Creates a standard JSON response for private-agent denials.
 *
 * @param message - Optional denial message.
 * @returns Forbidden JSON response.
 */
export function createAgentForbiddenResponse(message: string = PRIVATE_AGENT_FORBIDDEN_MESSAGE): Response {
    return new Response(
        JSON.stringify({
            error: {
                message,
                type: 'forbidden',
            },
        }),
        {
            status: 403,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        },
    );
}
