'use server';

import { $getTableName } from '@/src/database/$getTableName';
import { TODO_any } from '@promptbook-local/types';
import { spaceTrim } from 'spacetrim';
import { $provideSupabaseForServer } from '../../../database/$provideSupabaseForServer';

/**
 * Type describing image with agent.
 */
export type ImageWithAgent = {
    id: number;
    createdAt: string;
    updatedAt: string;
    filename: string;
    prompt: string;
    cdnUrl: string;
    cdnKey: string;
    agentId: number | null;
    purpose: 'AVATAR' | 'TESTING' | null;
    agent: {
        id: number;
        agentName: string;
        permanentId?: string | null;
    } | null;
};

/**
 * Lists images.
 */
export async function listImages(options: {
    page: number;
    limit: number;
}): Promise<{ images: ImageWithAgent[]; total: number }> {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    const supabase = $provideSupabaseForServer();

    const {
        data: images,
        error,
        count,
    } = await supabase
        .from(await $getTableName('Image'))
        .select(
            spaceTrim(`
                *,
                agent:agentId (
                    id,
                    agentName,
                    permanentId
                )
            `),
            { count: 'exact' },
        )
        .range(offset, offset + limit - 1)
        .order('createdAt', { ascending: false });

    if (error) {
        console.error('Error fetching images:', error);
        throw new Error(error.message);
    }

    return {
        images: (images as TODO_any[]) || [],
        total: count || 0,
    };
}
