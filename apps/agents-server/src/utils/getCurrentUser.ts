import { cookies } from 'next/headers';
import { $getTableName } from '../database/$getTableName';
import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../database/schema';
import { getSession } from './session';

type UserProfileRow = Pick<AgentsServerDatabase['public']['Tables']['User']['Row'], 'id' | 'profileImageUrl'>;

/**
 * Profile information derived from the session and database.
 *
 * @private Internal helper shared by server UI/layout layers.
 */
export type UserInfo = {
    /**
     * Database id for the signed-in user (if available).
     */
    id?: number;
    /**
     * Logical username used for authentication.
     */
    username: string;
    /**
     * Whether the user has admin privileges.
     */
    isAdmin: boolean;
    /**
     * Optional custom profile image URL for the user.
     */
    profileImageUrl: string | null;
};

/**
 * Loads the currently authenticated user and their avatar configuration.
 *
 * @private Internal helper shared by server UI/layout layers.
 */
export async function getCurrentUser(): Promise<UserInfo | null> {
    const session = await getSession();
    if (session) {
        const supabase = $provideSupabaseForServer();
        try {
            const { data, error } = await supabase
                .from(await $getTableName('User'))
                .select('id, profileImageUrl')
                .eq('username', session.username)
                .maybeSingle<UserProfileRow>();

            if (error) {
                console.error('Failed to load user profile image:', error);
            }

            return {
                id: data?.id,
                username: session.username,
                isAdmin: session.isAdmin,
                profileImageUrl: data?.profileImageUrl ?? null,
            };
        } catch (error) {
            console.error('Error loading current user:', error);
            return {
                username: session.username,
                isAdmin: session.isAdmin,
                profileImageUrl: null,
            };
        }
    }

    if (process.env.ADMIN_PASSWORD) {
        const cookieStore = await cookies();
        const adminToken = cookieStore.get('adminToken');
        if (adminToken?.value === process.env.ADMIN_PASSWORD) {
            return {
                username: 'admin',
                isAdmin: true,
                profileImageUrl: null,
            };
        }
    }

    return null;
}
