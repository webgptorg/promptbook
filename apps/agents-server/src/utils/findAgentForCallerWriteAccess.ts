import { findAgentByIdentifier, findOwnedAgentByIdentifier, type OwnedAgentRow } from './agentOwnership';
import { getCurrentUser } from './getCurrentUser';
import { isUserAdmin } from './isUserAdmin';

/**
 * Loads one agent for the current caller, enforcing ownership-or-admin write access.
 *
 * Resolution order:
 * 1. Anonymous callers receive `null` so routes can return `403`.
 * 2. Owners are matched via {@link findOwnedAgentByIdentifier} using the authenticated user id.
 * 3. Administrators (resolved via {@link isUserAdmin}) fall through to {@link findAgentByIdentifier} so they can manage any agent — including legacy `ADMIN_PASSWORD` admins that have no database user id.
 *
 * @param identifier - Permanent id or agent name supplied by the route.
 * @returns Matching agent row when the caller owns it or is an administrator, otherwise `null`.
 *
 * @private internal helper of Agents Server route handlers
 */
export async function findAgentForCallerWriteAccess(identifier: string): Promise<OwnedAgentRow | null> {
    const [currentUser, isAdmin] = await Promise.all([getCurrentUser(), isUserAdmin()]);
    if (!currentUser) {
        return null;
    }

    if (typeof currentUser.id === 'number') {
        const ownedAgent = await findOwnedAgentByIdentifier(currentUser.id, identifier);
        if (ownedAgent) {
            return ownedAgent;
        }
    }

    if (!isAdmin) {
        return null;
    }

    return findAgentByIdentifier(identifier);
}
