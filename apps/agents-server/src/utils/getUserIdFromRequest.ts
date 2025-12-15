import { NextRequest } from 'next/server';
import { $getTableName } from '../database/$getTableName';
import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';
import { getSession } from './session';

export async function getUserIdFromRequest(request: NextRequest): Promise<number | null> {
    try {
        // 1. Try to get user from session (cookie)
        const session = await getSession();
        if (session && session.username) {
            const supabase = $provideSupabaseForServer();
            const { data } = await supabase
                .from(await $getTableName('User'))
                .select('id')
                .eq('username', session.username)
                .single();

            if (data) {
                return data.id;
            }
        }

        // 2. Try to get user from API key (Authorization header)
        // TODO: [🧠] Implement linking API keys to users if needed
        // const authHeader = request.headers.get('authorization');
        // ...

    } catch (error) {
        console.error('Error getting user ID from request:', error);
    }

    return null;
}
