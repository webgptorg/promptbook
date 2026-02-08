'use server';

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

export async function getStories(): Promise<Array<Story>> {
    const user = await getCurrentUser();
    if (!user) {
        return [];
    }

    const supabase = await $provideSupabaseForServer();
    const { data, error } = await supabase
        .from('UserData')
        .select('value')
        .eq('userId', user.id)
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

    const supabase = await $provideSupabaseForServer();
    const { data, error } = await supabase
        .from('UserData')
        .upsert({
            userId: user.id,
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
