import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '@/src/database/schema';
import { cookies, headers } from 'next/headers';
import { ensureAnonymousUsernameCookie, getAnonymousUsernameFromHeaders } from './anonymousUser';
import { getCurrentUser, type UserInfo } from './getCurrentUser';

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
    const cookieStore = await cookies();
    const headerStore = await headers();
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
    const anonymousUsername = ensureAnonymousUsernameCookie(cookieStore, preferredFromHeader ?? undefined);
    const anonymousRow = await findOrCreateUserRow(anonymousUsername, false, GENERATED_USER_PASSWORD_HASH_PLACEHOLDER);

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

    /**
     * Note: Server Components can only read cookies.
     * Anonymous username cookies are created lazily in Route Handlers via `resolveCurrentUserIdentity`.
     */
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
        if (isDuplicateUsernameCreateError(error)) {
            const created = await findUserRowByUsername(username);
            if (created) {
                return created;
            }
        }
        throw error;
    }
}

/**
 * Detects a concurrent username insert collision from Supabase/Postgres errors.
 *
 * @param error - Unknown error thrown while creating the user row.
 * @returns `true` when the error represents the unique username constraint.
 */
function isDuplicateUsernameCreateError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const errorLike = error as { code?: unknown; message?: unknown };
    if (errorLike.code === '23505') {
        return true;
    }

    if (typeof errorLike.message !== 'string') {
        return false;
    }

    return errorLike.message.includes('duplicate key value') && errorLike.message.includes('_User_username_idx');
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
        const insertError = new Error(`Failed to create user "${payload.username}": ${error.message}`) as Error & {
            code?: string;
        };
        insertError.code = error.code;
        throw insertError;
    }

    if (!data) {
        throw new Error(`Failed to insert user "${payload.username}".`);
    }

    return data as UserRow;
}
