import { AGENT_INTERNAL_ACCESS_HEADER, isAgentInternalAccessTokenValid } from '../../../../src/commitments/_common/agentInternalAccess';
import { $getTableName } from '../database/$getTableName';
import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../database/schema';
import { buildAgentNameOrIdFilter } from './agentIdentifier';
import { parseBookScopedAgentIdentifier } from './agentReferenceResolver/bookScopedAgentReferences';
import type { AgentVisibility } from './agentVisibility';
import { getCurrentUser, type UserInfo } from './getCurrentUser';

/**
 * Agent row projection needed for access checks.
 */
type AgentAccessRow = Pick<AgentsServerDatabase['public']['Tables']['Agent']['Row'], 'visibility' | 'deletedAt'>;

/**
 * Result of a visibility access check for one agent route.
 */
export type AgentVisibilityAccessResult = {
    /**
     * Whether the current request may access the visible agent surface.
     */
    readonly isAllowed: boolean;
    /**
     * Current signed-in user, if any.
     */
    readonly currentUser: UserInfo | null;
    /**
     * Stored agent visibility, or `null` when the agent row was not found.
     */
    readonly visibility: AgentVisibility | null;
    /**
     * Whether an internal same-server TEAM token authorized this request.
     */
    readonly isInternalAgentAccess: boolean;
};

/**
 * Options accepted by the visibility access helper.
 */
export type ResolveAgentVisibilityAccessOptions = {
    /**
     * Agent name, permanent id, or book-scoped identifier from the route.
     */
    readonly agentIdentifier: string;
    /**
     * Current HTTP request when internal TEAM access should be checked.
     */
    readonly request?: Request;
    /**
     * Whether the internal same-server TEAM token may satisfy private-agent access.
     */
    readonly isInternalAgentAccessAllowed?: boolean;
};

/**
 * Resolves the parent agent identifier for book-scoped route values.
 *
 * @param agentIdentifier - Route agent identifier.
 * @returns Parent identifier for embedded agents, otherwise the original value.
 */
function resolveAccessCheckAgentIdentifier(agentIdentifier: string): string {
    const parsedBookScopedAgentIdentifier = parseBookScopedAgentIdentifier(agentIdentifier);
    return parsedBookScopedAgentIdentifier?.parentAgentIdentifier || agentIdentifier;
}

/**
 * Loads the stored visibility for an active agent.
 *
 * @param agentIdentifier - Agent name, permanent id, or book-scoped identifier.
 * @returns Stored visibility, or `null` when the active agent row cannot be found.
 */
export async function getAgentVisibilityForAccess(agentIdentifier: string): Promise<AgentVisibility | null> {
    const targetAgentIdentifier = resolveAccessCheckAgentIdentifier(agentIdentifier);
    const supabase = $provideSupabaseForServer();
    const result = await supabase
        .from(await $getTableName('Agent'))
        .select('visibility, deletedAt')
        .or(buildAgentNameOrIdFilter(targetAgentIdentifier))
        .is('deletedAt', null)
        .limit(1);

    if (result.error || !result.data || result.data.length === 0) {
        return null;
    }

    return (result.data[0] as AgentAccessRow).visibility as AgentVisibility;
}

/**
 * Checks whether a request carries a trusted local agent-to-agent access token.
 *
 * @param request - Incoming request to inspect.
 * @returns Whether the request is authorized as a local TEAM call.
 */
export function isRequestAuthorizedByInternalAgentAccess(request?: Request): boolean {
    if (!request) {
        return false;
    }

    return isAgentInternalAccessTokenValid(request.headers.get(AGENT_INTERNAL_ACCESS_HEADER));
}

/**
 * Returns whether a stored visibility can be accessed without a signed-in user.
 *
 * @param visibility - Stored agent visibility.
 * @returns Whether anonymous requests may access the agent surface.
 */
export function isAgentVisibilityAccessibleAnonymously(visibility: AgentVisibility | null): boolean {
    return visibility === 'PUBLIC' || visibility === 'UNLISTED';
}

/**
 * Resolves whether the current request may access a profile/chat-equivalent agent surface.
 *
 * @param options - Agent identifier and request context.
 * @returns Visibility access result.
 */
export async function resolveAgentVisibilityAccess(
    options: ResolveAgentVisibilityAccessOptions,
): Promise<AgentVisibilityAccessResult> {
    const [visibility, currentUser] = await Promise.all([
        getAgentVisibilityForAccess(options.agentIdentifier),
        getCurrentUser(),
    ]);
    const isInternalAgentAccess =
        options.isInternalAgentAccessAllowed === true && isRequestAuthorizedByInternalAgentAccess(options.request);
    const isAllowed =
        visibility === null ||
        isAgentVisibilityAccessibleAnonymously(visibility) ||
        Boolean(currentUser) ||
        isInternalAgentAccess;

    return {
        isAllowed,
        currentUser,
        visibility,
        isInternalAgentAccess,
    };
}

/**
 * Checks whether the current request has a signed-in user.
 *
 * @returns Current signed-in user, or `null` for anonymous requests.
 */
export async function getSignedInUserForAgentAccess(): Promise<UserInfo | null> {
    return getCurrentUser();
}

