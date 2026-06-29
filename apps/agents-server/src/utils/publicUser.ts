import type { AgentsServerDatabase } from '../database/schema';

/**
 * Database row shape for the `User` table.
 */
type UserRow = AgentsServerDatabase['public']['Tables']['User']['Row'];

/**
 * Public user shape safe to send to browser UI.
 *
 * @private internal Agents Server API shape
 */
export type PublicUser = Pick<
    UserRow,
    'id' | 'username' | 'isAdmin' | 'createdAt' | 'updatedAt' | 'profileImageUrl'
> & {
    /**
     * Email address from external authentication providers.
     */
    readonly email?: string | null;
    /**
     * Human-readable display name from external authentication providers.
     */
    readonly displayName?: string | null;
    /**
     * Authentication provider marker such as `LOCAL` or `SHIBBOLETH`.
     */
    readonly authenticationProvider?: string | null;
};

/**
 * Supabase projection for user fields safe to return from UI-facing endpoints.
 *
 * @private internal Agents Server API projection
 */
export const PUBLIC_USER_SELECT_COLUMNS: string =
    'id, username, isAdmin, createdAt, updatedAt, profileImageUrl, email, displayName, authenticationProvider';

/**
 * Maps a database user projection into the public user response shape.
 *
 * @param row - User projection loaded from the database.
 * @returns User data safe to serialize to the browser.
 *
 * @private internal Agents Server API mapper
 */
export function toPublicUser(row: PublicUser): PublicUser {
    return {
        id: row.id,
        username: row.username,
        isAdmin: row.isAdmin,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        profileImageUrl: row.profileImageUrl ?? null,
        email: row.email ?? null,
        displayName: row.displayName ?? null,
        authenticationProvider: row.authenticationProvider ?? null,
    };
}
