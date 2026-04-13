import type { FileWithAgent } from './actions';

/**
 * Props for FilesGalleryStatusBadge.
 */
type FilesGalleryStatusBadgeProps = {
    /**
     * Status shown in the badge.
     */
    readonly status: FileWithAgent['status'];
    /**
     * Optional size-specific class names.
     */
    readonly className?: string;
};

/**
 * Resolves the tone used for a file processing status.
 */
function getFilesGalleryStatusBadgeTone(status: FileWithAgent['status']): string {
    if (status === 'COMPLETED') {
        return 'bg-green-100 text-green-800';
    }

    if (status === 'FAILED') {
        return 'bg-red-100 text-red-800';
    }

    return 'bg-blue-100 text-blue-800';
}

/**
 * Renders the status badge used across files gallery views.
 *
 * @private function of <FilesGalleryClient/>
 */
export function FilesGalleryStatusBadge({
    status,
    className = 'px-2 py-1 rounded-full text-xs font-medium',
}: FilesGalleryStatusBadgeProps) {
    return <span className={`${className} ${getFilesGalleryStatusBadgeTone(status)}`}>{status}</span>;
}
