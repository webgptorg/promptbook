import { $getTableName } from '../database/$getTableName';
import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';
import { AgentsServerDatabase } from '../database/schema';
import { verifyPassword } from './auth';

export type AuthenticatedUser = {
    username: string;
    isAdmin: boolean;
};

export async function authenticateUser(username: string, password: string): Promise<AuthenticatedUser | null> {
    // 1. Check if it's the environment admin
    if (username === 'admin' && process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
        return { username: 'admin', isAdmin: true };
    }

    // 2. Check DB users
    try {
        const supabase = $provideSupabaseForServer();
        const { data: user, error } = await supabase
            .from(await $getTableName('User'))
            .select('*')
            .eq('username', username)
            .single();

        if (error || !user) {
            return null;
        }

        const userRow = user as AgentsServerDatabase['public']['Tables']['User']['Row'];
        const isValid = await verifyPassword(password, userRow.passwordHash);

        if (!isValid) {
            return null;
        }

        return { username: userRow.username, isAdmin: userRow.isAdmin };
    } catch (error) {
        console.error('Authentication error:', error);
        return null;
    }
}
