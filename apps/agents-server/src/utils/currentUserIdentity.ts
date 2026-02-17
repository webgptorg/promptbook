import { cookies, headers } from 'next/headers';
import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '@/src/database/schema';
import { getCurrentUser, type UserInfo } from './getCurrentUser';
import { ensureAnonymousUsernameCookie } from './anonymousUser';
import { getAnonymousUsernameFromHeaders } from './anonymousUser';

/**
 * Placeholder password hash used when auto-creating database users.
 */
const GENERATED_USER_PASSWORD_HASH_PLACEHOLDER = 'auto-generated-user';

/**
 * Password hash placeholder for the environment-admin row.
 */
const ENV_ADMIN_PASSWORD_HASH_PLACEHOLDER = 'env-admin-managed';

/**
 * Database row shape for the `User` table.
 */
type UserRow = AgentsServerDatabase['public']['Tables']['User']['Row'];

/**
 * Database insert shape for the `User` table.
 */
type UserInsert = AgentsServerDatabase['public']['Tables']['User']['Insert'];

/**
 * Identity resolved for the current request, including database user id.
 */
export type ResolvedCurrentUserIdentity = {
    /**
     * Database id of the resolved user row.
     */
    readonly userId: number;
    /**
     * Username stored in the `User` table.
     */
    readonly username: string;
    /**
     * Indicates whether the identity is linked to a logged-in admin user.
     */
    readonly isAdmin: boolean;
    /**
     * True when the username was generated for an anonymous visitor.
     */
    readonly isAnonymous: boolean;
    /**
     * User info from the session when available.
     */
    readonly sessionUser: UserInfo | null;
};

/**
 * Resolves the current request identity by reusing the session user when available
 * or falling back to an anonymous username stored in cookies.
 */
export async function resolveCurrentUserIdentity(): Promise<ResolvedCurrentUserIdentity | null> {
    const cookieStore = cookies();
    const headerStore = headers();
    const sessionUser = await getCurrentUser();

    if (sessionUser) {
        const userRow = await findOrCreateUserRow(
            sessionUser.username,
            sessionUser.isAdmin,
            sessionUser.isAdmin ? ENV_ADMIN_PASSWORD_HASH_PLACEHOLDER : GENERATED_USER_PASSWORD_HASH_PLACEHOLDER,
        );

        return {
            userId: userRow.id,
            username: userRow.username,
            isAdmin: userRow.isAdmin,
            isAnonymous: false,
            sessionUser,
        };
    }

    const preferredFromHeader = getAnonymousUsernameFromHeaders(headerStore);
    const anonymousUsername = ensureAnonymousUsernameCookie(cookieStore, preferredFromHeader);
    const anonymousRow = await findOrCreateUserRow(
        anonymousUsername,
        false,
        GENERATED_USER_PASSWORD_HASH_PLACEHOLDER,
    );

    return {
        userId: anonymousRow.id,
        username: anonymousRow.username,
        isAdmin: false,
        isAnonymous: true,
        sessionUser: null,
    };
}

/**
 * Ensures the current request can participate in chat history by checking the session
 * user or by creating an anonymous username cookie.
 */
export async function ensureChatHistoryIdentity(): Promise<boolean> {
    const sessionUser = await getCurrentUser();
    if (sessionUser) {
        return true;
    }

    const cookieStore = cookies();
    const headerStore = headers();
    ensureAnonymousUsernameCookie(cookieStore, getAnonymousUsernameFromHeaders(headerStore));
    return true;
}

/**
 * Attempts to find an existing user row by username and creates one when missing.
 */
async function findOrCreateUserRow(username: string, isAdmin: boolean, passwordHash: string): Promise<UserRow> {
    const existing = await findUserRowByUsername(username);
    if (existing) {
        return existing;
    }

    try {
        return await insertUserRow({ username, isAdmin, passwordHash });
    } catch (error) {
        if ((error as { code?: string }).code === '23505') {
            const created = await findUserRowByUsername(username);
            if (created) {
                return created;
            }
        }
        throw error;
    }
}

/**
 * Finds one user row by its username.
 */
async function findUserRowByUsername(username: string): Promise<UserRow | null> {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('User');
    const { data, error } = await supabase.from(tableName).select('*').eq('username', username).maybeSingle();

    if (error) {
        throw new Error(`Failed to resolve user "${username}": ${error.message}`);
    }

    return (data as UserRow | null) || null;
}

/**
 * Inserts a new user row for the provided username.
 */
async function insertUserRow(payload: UserInsert): Promise<UserRow> {
    const supabase = $provideSupabaseForServer();
    const tableName = await $getTableName('User');
    const now = new Date().toISOString();
    const { data, error } = await supabase
        .from(tableName)
        .insert({
            ...payload,
            createdAt: payload.createdAt ?? now,
            updatedAt: payload.updatedAt ?? now,
        })
        .select('*')
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to create user "${payload.username}": ${error.message}`);
    }

    if (!data) {
        throw new Error(`Failed to insert user "${payload.username}".`);
    }

    return data as UserRow;
}
