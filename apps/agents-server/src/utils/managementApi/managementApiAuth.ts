import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../../database/schema';

/**
 * Placeholder password hash used when a legacy environment-admin row must be created.
 */
const LEGACY_ENV_ADMIN_PASSWORD_HASH_PLACEHOLDER = 'env-admin-managed';

/**
 * Token row shape used for API-key authentication.
 */
type ApiTokenRow = Pick<
    AgentsServerDatabase['public']['Tables']['ApiTokens']['Row'],
    'id' | 'token' | 'note' | 'createdAt' | 'updatedAt' | 'isRevoked'
> & {
    /**
     * Database owner of the token.
     */
    userId: number | null;
};

/**
 * User row shape returned for authenticated management requests.
 */
type UserRow = Pick<
    AgentsServerDatabase['public']['Tables']['User']['Row'],
    'id' | 'username' | 'createdAt' | 'isAdmin' | 'profileImageUrl'
>;

/**
 * Identity resolved from a management API key.
 */
export type ManagementApiIdentity = {
    /**
     * Database id of the authenticated user.
     */
    userId: number;
    /**
     * Username of the authenticated user.
     */
    username: string;
    /**
     * Creation timestamp of the authenticated user.
     */
    userCreatedAt: string;
    /**
     * Whether the owning user is an admin.
     */
    isAdmin: boolean;
    /**
     * Optional user profile image URL.
     */
    profileImageUrl: string | null;
    /**
     * Token row id used for the request.
     */
    apiKeyId: number;
    /**
     * Full token value used for the request.
     */
    apiKeyToken: string;
    /**
     * Optional token note.
     */
    apiKeyNote: string | null;
    /**
     * Token creation timestamp.
     */
    apiKeyCreatedAt: string;
};

/**
 * Result of resolving an authenticated management API identity.
 */
export type ManagementApiIdentityResult =
    | {
          success: true;
          identity: ManagementApiIdentity;
      }
    | {
          success: false;
          status: 401 | 403;
          code: 'authentication_required' | 'token_owner_missing';
          message: string;
      };

/**
 * Resolves the management API identity from the `Authorization: Bearer ptbk_...` header.
 *
 * @param request - Incoming management API request.
 * @returns Authenticated identity or a normalized auth failure.
 */
export async function resolveManagementApiIdentity(request: Request): Promise<ManagementApiIdentityResult> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
        return {
            success: false,
            status: 401,
            code: 'authentication_required',
            message: 'Missing Authorization header. Provide `Authorization: Bearer ptbk_...`.',
        };
    }

    if (!authHeader.startsWith('Bearer ')) {
        return {
            success: false,
            status: 401,
            code: 'authentication_required',
            message: 'Invalid Authorization header format. Expected `Bearer <token>`.',
        };
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token || !token.startsWith('ptbk_')) {
        return {
            success: false,
            status: 401,
            code: 'authentication_required',
            message: 'Invalid API key format. Management API keys must start with `ptbk_`.',
        };
    }

    const supabase = $provideSupabaseForServer();
    const tokenTable = await $getTableName('ApiTokens');
    const userTable = await $getTableName('User');

    const tokenResult = await supabase
        .from(tokenTable)
        .select('id, token, note, createdAt, updatedAt, isRevoked, userId')
        .eq('token', token)
        .maybeSingle();

    if (tokenResult.error || !tokenResult.data) {
        return {
            success: false,
            status: 401,
            code: 'authentication_required',
            message: 'Invalid API key.',
        };
    }

    const tokenRow = tokenResult.data as unknown as ApiTokenRow;
    if (tokenRow.isRevoked) {
        return {
            success: false,
            status: 401,
            code: 'authentication_required',
            message: 'API key has been revoked.',
        };
    }

    const resolvedUserId = tokenRow.userId ?? (await resolveLegacyTokenOwnerId(tokenRow.id));
    if (resolvedUserId === null) {
        return {
            success: false,
            status: 403,
            code: 'token_owner_missing',
            message:
                'This API key is not linked to a user. Recreate it from the API Tokens page to use the management API.',
        };
    }

    const userResult = await supabase
        .from(userTable)
        .select('id, username, createdAt, isAdmin, profileImageUrl')
        .eq('id', resolvedUserId)
        .maybeSingle();

    if (userResult.error || !userResult.data) {
        return {
            success: false,
            status: 403,
            code: 'token_owner_missing',
            message:
                'The owner linked to this API key no longer exists. Recreate the key from the API Tokens page.',
        };
    }

    const userRow = userResult.data as unknown as UserRow;
    return {
        success: true,
        identity: {
            userId: userRow.id,
            username: userRow.username,
            userCreatedAt: userRow.createdAt,
            isAdmin: userRow.isAdmin,
            profileImageUrl: userRow.profileImageUrl ?? null,
            apiKeyId: tokenRow.id,
            apiKeyToken: tokenRow.token,
            apiKeyNote: tokenRow.note ?? null,
            apiKeyCreatedAt: tokenRow.createdAt,
        },
    };
}

/**
 * Attempts to assign one legacy token without `userId` to a best-effort owner.
 *
 * The fallback is intentionally conservative:
 * - exactly one existing user,
 * - exactly one existing admin user,
 * - or a newly created `admin` row when no users exist but `ADMIN_PASSWORD` is configured.
 *
 * @param tokenId - Token row identifier.
 * @returns Resolved user id or `null` when no safe owner inference exists.
 */
async function resolveLegacyTokenOwnerId(tokenId: number): Promise<number | null> {
    const supabase = $provideSupabaseForServer();
    const userTable = await $getTableName('User');
    const tokenTable = await $getTableName('ApiTokens');

    const usersResult = await supabase
        .from(userTable)
        .select('id, username, createdAt, isAdmin, profileImageUrl')
        .order('createdAt', { ascending: true });

    if (usersResult.error) {
        throw new Error(`Failed to load candidate users for legacy API key ownership: ${usersResult.error.message}`);
    }

    const users = (usersResult.data || []) as unknown as UserRow[];
    let ownerRow: UserRow | null = null;

    if (users.length === 1) {
        ownerRow = users[0] || null;
    } else {
        const adminUsers = users.filter((user) => user.isAdmin);
        if (adminUsers.length === 1) {
            ownerRow = adminUsers[0] || null;
        } else if (users.length === 0 && process.env.ADMIN_PASSWORD) {
            ownerRow = await findOrCreateEnvironmentAdminRow();
        }
    }

    if (!ownerRow) {
        return null;
    }

    const updateResult = await supabase.from(tokenTable).update({ userId: ownerRow.id } as never).eq('id', tokenId);
    if (updateResult.error) {
        throw new Error(`Failed to backfill API key owner: ${updateResult.error.message}`);
    }

    return ownerRow.id;
}

/**
 * Finds or creates the synthetic database row for the environment-admin account.
 *
 * @returns Persistent database row representing the environment admin.
 */
async function findOrCreateEnvironmentAdminRow(): Promise<UserRow> {
    const supabase = $provideSupabaseForServer();
    const userTable = await $getTableName('User');
    const existingAdminResult = await supabase
        .from(userTable)
        .select('id, username, createdAt, isAdmin, profileImageUrl')
        .eq('username', 'admin')
        .maybeSingle();

    if (existingAdminResult.error) {
        throw new Error(`Failed to resolve environment admin user: ${existingAdminResult.error.message}`);
    }

    if (existingAdminResult.data) {
        return existingAdminResult.data as unknown as UserRow;
    }

    const now = new Date().toISOString();
    const insertResult = await supabase
        .from(userTable)
        .insert({
            username: 'admin',
            passwordHash: LEGACY_ENV_ADMIN_PASSWORD_HASH_PLACEHOLDER,
            isAdmin: true,
            createdAt: now,
            updatedAt: now,
        })
        .select('id, username, createdAt, isAdmin, profileImageUrl')
        .maybeSingle();

    if (insertResult.error || !insertResult.data) {
        throw new Error(`Failed to create environment admin user: ${insertResult.error?.message || 'Unknown error.'}`);
    }

    return insertResult.data as unknown as UserRow;
}
