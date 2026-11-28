import type { AgentsServerDatabase } from '../../../database/schema';
import type { FileWithAgent, FilesGalleryUploadStatus } from './filesGalleryTypes';

/**
 * Database columns loaded from the `File` table for the files gallery.
 *
 * @private type of `/admin/files`
 */
export type FilesGalleryDatabaseFileRow = Pick<
    AgentsServerDatabase['public']['Tables']['File']['Row'],
    'id' | 'createdAt' | 'fileName' | 'fileSize' | 'fileType' | 'storageUrl' | 'shortUrl' | 'purpose' | 'status' | 'agentId'
>;

/**
 * Database columns loaded from the `Agent` table for file ownership labels.
 *
 * @private type of `/admin/files`
 */
export type FilesGalleryDatabaseAgentRow = Pick<
    AgentsServerDatabase['public']['Tables']['Agent']['Row'],
    'id' | 'agentName' | 'permanentId'
>;

/**
 * Upload status used when older or malformed rows do not contain a known value.
 *
 * @private constant of `/admin/files`
 */
const FILES_GALLERY_DEFAULT_UPLOAD_STATUS: FilesGalleryUploadStatus = 'COMPLETED';

/**
 * Upload statuses rendered by the files gallery.
 *
 * @private constant of `/admin/files`
 */
const FILES_GALLERY_UPLOAD_STATUSES = new Set<FilesGalleryUploadStatus>(['UPLOADING', 'COMPLETED', 'FAILED']);

/**
 * Collects unique agent ids referenced by file rows.
 *
 * @param files - File rows loaded from the database.
 * @returns Unique non-null agent ids.
 * @private helper of `/admin/files`
 */
export function collectFilesGalleryAgentIds(files: ReadonlyArray<FilesGalleryDatabaseFileRow>): number[] {
    return Array.from(
        new Set(
            files
                .map((file) => file.agentId)
                .filter((agentId): agentId is number => typeof agentId === 'number' && Number.isFinite(agentId)),
        ),
    );
}

/**
 * Normalizes file rows and attaches agent labels resolved by a separate lookup.
 *
 * @param files - File rows loaded from the database.
 * @param agents - Agent rows loaded for referenced `agentId` values.
 * @returns Browser-safe files gallery rows.
 * @private helper of `/admin/files`
 */
export function normalizeFilesGalleryRows(
    files: ReadonlyArray<FilesGalleryDatabaseFileRow>,
    agents: ReadonlyArray<FilesGalleryDatabaseAgentRow>,
): FileWithAgent[] {
    const agentsById = new Map(agents.map((agent) => [agent.id, agent]));

    return files.map((file) => {
        const agent = typeof file.agentId === 'number' ? agentsById.get(file.agentId) : undefined;

        return {
            id: file.id,
            createdAt: file.createdAt,
            fileName: file.fileName || 'Unnamed file',
            fileSize: normalizeFilesGalleryFileSize(file.fileSize),
            fileType: file.fileType || 'application/octet-stream',
            storageUrl: file.storageUrl || null,
            shortUrl: file.shortUrl || null,
            purpose: file.purpose || 'UNKNOWN',
            status: normalizeFilesGalleryUploadStatus(file.status),
            agentId: typeof file.agentId === 'number' ? file.agentId : null,
            agent: agent
                ? {
                      id: agent.id,
                      agentName: agent.agentName,
                      permanentId: agent.permanentId,
                  }
                : null,
        };
    });
}

/**
 * Normalizes a database byte count into a finite number.
 *
 * @param fileSize - Raw database file size.
 * @returns Finite byte count.
 * @private helper of `/admin/files`
 */
function normalizeFilesGalleryFileSize(fileSize: unknown): number {
    const normalizedFileSize = Number(fileSize);
    return Number.isFinite(normalizedFileSize) && normalizedFileSize > 0 ? normalizedFileSize : 0;
}

/**
 * Normalizes a database upload status into a rendered status value.
 *
 * @param status - Raw database upload status.
 * @returns Known upload status.
 * @private helper of `/admin/files`
 */
function normalizeFilesGalleryUploadStatus(status: unknown): FilesGalleryUploadStatus {
    if (typeof status === 'string' && FILES_GALLERY_UPLOAD_STATUSES.has(status as FilesGalleryUploadStatus)) {
        return status as FilesGalleryUploadStatus;
    }

    return FILES_GALLERY_DEFAULT_UPLOAD_STATUS;
}
