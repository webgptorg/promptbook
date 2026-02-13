'use server';

import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { getCurrentUser } from '@/src/utils/getCurrentUser';

export type Actor = {
    name: string;
    avatarUrl?: string;
};

export type Story = {
    id: string;
    title: string;
    content: string;
    mode: 'beletrie' | 'dramatic';
    actors: Array<Actor>;
};

async function getUserId(username: string): Promise<number | null> {
    const supabase = $provideSupabaseForServer();
    const { data } = await supabase
        .from(await $getTableName('User'))
        .select('id')
        .eq('username', username)
        .single();

    return data?.id || null;
}

export async function getStories(): Promise<Array<Story>> {
    const user = await getCurrentUser();
    if (!user) {
        return [];
    }

    const userId = await getUserId(user.username);
    if (!userId) {
        return [];
    }

    const supabase = await $provideSupabaseForServer();
    const { data, error } = await supabase
        .from('UserData')
        .select('value')
        .eq('userId', userId)
        .eq('key', 'stories')
        .single();

    if (error || !data) {
        console.error('Error fetching stories', error);
        return [];
    }

    return data.value as Array<Story>;
}

export async function saveStories(stories: Array<Story>) {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('You must be logged in to save stories.');
    }

    const userId = await getUserId(user.username);
    if (!userId) {
        throw new Error('User not found in database.');
    }

    const supabase = await $provideSupabaseForServer();
    const { data, error } = await supabase
        .from('UserData')
        .upsert({
            userId,
            key: 'stories',
            value: stories,
        })
        .select();

    if (error) {
        console.error('Error saving stories', error);
        throw new Error('Failed to save stories.');
    }

    return data;
}
