'use server';

import { $getTableName } from '@/src/database/$getTableName';
import { TODO_any } from '@promptbook-local/types';
import { spaceTrim } from 'spacetrim';
import { $provideSupabaseForServer } from '../../../database/$provideSupabaseForServer';

/**
 * Type describing file with agent.
 */
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
        permanentId?: string | null;
    } | null;
};

/**
 * File gallery sort fields supported by the admin table.
 *
 * @private function of FilesGalleryClient
 */
export type FilesGallerySortField = 'fileName' | 'fileType' | 'fileSize' | 'purpose' | 'status' | 'createdAt';

/**
 * File gallery sort direction supported by the admin table.
 *
 * @private function of FilesGalleryClient
 */
export type FilesGallerySortOrder = 'asc' | 'desc';

/**
 * Lists files.
 */
export async function listFiles(options: {
    page: number;
    limit: number;
    sortBy?: FilesGallerySortField;
    sortOrder?: FilesGallerySortOrder;
}): Promise<{ files: FileWithAgent[]; total: number }> {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const offset = (page - 1) * limit;

    const supabase = $provideSupabaseForServer();

    const {
        data: files,
        error,
        count,
    } = await supabase
        .from(await $getTableName('File'))
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
        .order(sortBy, { ascending: sortOrder === 'asc' });

    if (error) {
        console.error('Error fetching files:', error);
        throw new Error(error.message);
    }

    return {
        files: (files as TODO_any[]) || [],
        total: count || 0,
    };
}
