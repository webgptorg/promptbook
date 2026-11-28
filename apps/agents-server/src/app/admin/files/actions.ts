'use server';

import { $getTableName } from '@/src/database/$getTableName';
import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../../../src/errors/DatabaseError';
import { NotAllowed } from '../../../../../../src/errors/NotAllowed';
import { $provideSupabaseForServer } from '../../../database/$provideSupabaseForServer';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import {
    collectFilesGalleryAgentIds,
    normalizeFilesGalleryRows,
    type FilesGalleryDatabaseAgentRow,
    type FilesGalleryDatabaseFileRow,
} from './filesGalleryRows';
import type { FileWithAgent, FilesGallerySortField, FilesGallerySortOrder } from './filesGalleryTypes';

/**
 * Columns loaded from `File` for the files gallery.
 *
 * @private constant of `/admin/files`
 */
const FILES_GALLERY_FILE_SELECT_COLUMNS = spaceTrim(`
    id,
    createdAt,
    fileName,
    fileSize,
    fileType,
    storageUrl,
    shortUrl,
    purpose,
    status,
    agentId
`);

/**
 * Columns loaded from `Agent` for the files gallery ownership labels.
 *
 * @private constant of `/admin/files`
 */
const FILES_GALLERY_AGENT_SELECT_COLUMNS = 'id, agentName, permanentId';

/**
 * Lists files.
 */
export async function listFiles(options: {
    page: number;
    limit: number;
    sortBy?: FilesGallerySortField;
    sortOrder?: FilesGallerySortOrder;
}): Promise<{ files: FileWithAgent[]; total: number }> {
    if (!(await isUserAdmin())) {
        throw new NotAllowed('Only admins can list uploaded files.');
    }

    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const offset = (page - 1) * limit;

    const supabase = $provideSupabaseForServer();

    const {
        data: files,
        error,
        count,
    } = await supabase
        .from(await $getTableName('File'))
        .select(FILES_GALLERY_FILE_SELECT_COLUMNS, { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order(sortBy, { ascending: sortOrder === 'asc' });

    if (error) {
        console.error('Error fetching files:', error);
        throw new DatabaseError(
            spaceTrim(`
                Failed to fetch uploaded files for the current server.

                ${error.message}
            `),
        );
    }

    const fileRows = ((files || []) as unknown) as FilesGalleryDatabaseFileRow[];
    const agentRows = await listFileGalleryAgents(collectFilesGalleryAgentIds(fileRows));

    return {
        files: normalizeFilesGalleryRows(fileRows, agentRows),
        total: count || 0,
    };
}

/**
 * Loads agent labels for files that have an owner agent.
 *
 * @param agentIds - Unique agent ids referenced by file rows.
 * @returns Agent rows matching the given ids.
 * @private helper of `/admin/files`
 */
async function listFileGalleryAgents(agentIds: ReadonlyArray<number>): Promise<FilesGalleryDatabaseAgentRow[]> {
    if (agentIds.length === 0) {
        return [];
    }

    const supabase = $provideSupabaseForServer();
    const { data, error } = await supabase
        .from(await $getTableName('Agent'))
        .select(FILES_GALLERY_AGENT_SELECT_COLUMNS)
        .in('id', [...agentIds]);

    if (error) {
        console.error('Error fetching file agents:', error);
        throw new DatabaseError(
            spaceTrim(`
                Failed to fetch agent labels for uploaded files.

                ${error.message}
            `),
        );
    }

    return ((data || []) as unknown) as FilesGalleryDatabaseAgentRow[];
}
