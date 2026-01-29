'use server';

import { $getTableName } from '@/src/database/$getTableName';
import { TODO_any } from '@promptbook-local/types';
import { $provideSupabaseForServer } from '../../../database/$provideSupabaseForServer';

export type FileWithAgent = {
    id: number;
    createdAt: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    storageUrl: string | null;
    shortUrl: string | null;
    purpose: string;
    status: 'UPLOADING' | 'COMPLETED' | 'FAILED';
    agentId: number | null;
    agent: {
        id: number;
        agentName: string;
    } | null;
};

export async function listFiles(options: {
    page: number;
    limit: number;
}): Promise<{ files: FileWithAgent[]; total: number }> {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    const supabase = $provideSupabaseForServer();

    const {
        data: files,
        error,
        count,
    } = await supabase
        .from(await $getTableName('File'))
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
        console.error('Error fetching files:', error);
        throw new Error(error.message);
    }

    return {
        files: (files as TODO_any[]) || [],
        total: count || 0,
    };
}
