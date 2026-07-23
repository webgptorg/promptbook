/**
 * Upload status values rendered by the files gallery.
 *
 * @private type of `/admin/files`
 */
export type FilesGalleryUploadStatus = 'UPLOADING' | 'COMPLETED' | 'FAILED';

/**
 * Type describing file with agent.
 *
 * @private type of `/admin/files`
 */
export type FileWithAgent = {
    readonly id: number;
    readonly createdAt: string;
    readonly fileName: string;
    readonly fileSize: number;
    readonly fileType: string;
    readonly storageUrl: string | null;
    readonly shortUrl: string | null;
    readonly purpose: string;
    readonly status: FilesGalleryUploadStatus;
    readonly agentId: number | null;
    readonly agent: {
        readonly id: number;
        readonly agentName: string;
        readonly permanentId?: string | null;
    } | null;
};

/**
 * File gallery sort fields supported by the admin table.
 *
 * @private type of `/admin/files`
 */
export type FilesGallerySortField = 'fileName' | 'fileType' | 'fileSize' | 'purpose' | 'status' | 'createdAt';

/**
 * File gallery sort direction supported by the admin table.
 *
 * @private type of `/admin/files`
 */
export type FilesGallerySortOrder = 'asc' | 'desc';
