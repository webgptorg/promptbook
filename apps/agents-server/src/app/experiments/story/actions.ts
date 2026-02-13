'use server';

import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { normalizeStory, Story } from './storyTypes';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';

async function getUserId(username: string): Promise<number | null> {
    const supabase = ();
    const { data } = await supabase
        .from(await ('User'))
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

 
    const { data, error } = await  $provideSupabaseForServer()
        .from('UserData')
        .select('value')
        .eq('userId', userId)
        .eq('key', 'stories')
        .single();

    if (error || !data) {
        console.error('Error fetching stories', error);
        return [];
    }

    const rawStories = (data.value as Array<Partial<Story> & { id: string }>) || [];
    return rawStories.map((story) => normalizeStory(story));
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
    const normalizedStories = stories.map((story) => normalizeStory(story));
    const { data, error } = await supabase
        .from('UserData')
        .upsert({
            userId,
            key: 'stories',
            value: normalizedStories,
        })
        .select();

    if (error) {
        console.error('Error saving stories', error);
        throw new Error('Failed to save stories.');
    }

    return data;
}
