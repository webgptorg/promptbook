'use server';

import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { getUserDataValue, upsertUserDataValue } from '@/src/utils/userData';
import { normalizeStories, type Story } from './storyUtils';

const STORIES_USER_DATA_KEY = 'stories';

/**
 * Resolves a username to its numeric database id.
 */
async function getUserId(username: string): Promise<number | null> {
    const supabase = $provideSupabaseForServer();
    const { data } = await supabase
        .from(await $getTableName('User'))
        .select('id')
        .eq('username', username)
        .single();

    return data?.id || null;
}

/**
 * Loads all persisted stories for the currently authenticated user.
 */
export async function getStories(): Promise<Array<Story>> {
    const user = await getCurrentUser();
    if (!user) {
        return [];
    }

    const userId = await getUserId(user.username);
    if (!userId) {
        return [];
    }

    try {
        const storedValue = await getUserDataValue({
            userId,
            key: STORIES_USER_DATA_KEY,
        });

        return normalizeStories(storedValue);
    } catch (error) {
        console.error('Error fetching stories', error);
        return [];
    }
}

/**
 * Persists stories for the currently authenticated user.
 */
export async function saveStories(stories: Array<Story>) {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('You must be logged in to save stories.');
    }

    const userId = await getUserId(user.username);
    if (!userId) {
        throw new Error('User not found in database.');
    }

    const normalizedStories = normalizeStories(stories);
    const row = await upsertUserDataValue({
        userId,
        key: STORIES_USER_DATA_KEY,
        value: normalizedStories,
    }).catch((error) => {
        console.error('Error saving stories', error);
        throw new Error('Failed to save stories.');
    });

    return row;
}
