'use server';

import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '../../../database/$provideSupabaseForServer';

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
    } | null;
};

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
            `
            *,
            agent:agentId (
                id,
                agentName
            )
        `,
            { count: 'exact' },
        )
        .range(offset, offset + limit - 1)
        .order('createdAt', { ascending: false });

    if (error) {
        console.error('Error fetching images:', error);
        throw new Error(error.message);
    }

    return {
        images: (images as any[]) || [],
        total: count || 0,
    };
}
