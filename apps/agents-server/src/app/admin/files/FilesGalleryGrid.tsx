import { File, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { buildAgentProfileHref } from '../../../utils/agentRouting/agentRouteHrefs';
import { FilesGalleryStatusBadge } from './FilesGalleryStatusBadge';
import type { UseFilesGalleryState } from './useFilesGalleryState';

/**
 * Props for FilesGalleryGrid.
 */
type FilesGalleryGridProps = Pick<UseFilesGalleryState, 'files' | 'isLoading' | 'hasMore' | 'observerTarget'> & {
    /**
     * Active text formatter for agent naming.
     */
    readonly formatText: (text: string) => string;
};

/**
 * Formats one file size for the compact grid view.
 */
function formatFilesGalleryCompactFileSize(fileSize: number): string {
    return `${(fileSize / 1024).toFixed(1)} KB`;
}

/**
 * Formats one created-at value for the compact grid view.
 */
function formatFilesGalleryCompactCreatedAt(createdAt: string): string {
    return new Date(createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
}

/**
 * Renders the grid view of the files gallery, including infinite-scroll feedback.
 *
 * @private function of <FilesGalleryClient/>
 */
export function FilesGalleryGrid({
    formatText,
    files,
    isLoading,
    hasMore,
    observerTarget,
}: FilesGalleryGridProps) {
    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {files.map((file) => (
                    <div
                        key={file.id}
                        className="group relative border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                    >
                        <a
                            href={file.storageUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block aspect-square relative bg-gray-100 flex items-center justify-center"
                        >
                            {file.fileType.startsWith('image/') && file.storageUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                    src={file.storageUrl}
                                    alt={file.fileName}
                                    className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                                    loading="lazy"
                                />
                            ) : (
                                <File className="w-16 h-16 text-gray-400" />
                            )}
                        </a>
                        <div className="p-3">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                {file.agent ? (
                                    <Link
                                        href={buildAgentProfileHref(file.agent.permanentId || file.agent.agentName)}
                                        className="text-xs font-medium text-blue-600 hover:underline truncate"
                                    >
                                        {file.agent.agentName}
                                    </Link>
                                ) : (
                                    <span className="text-xs text-gray-400">{formatText('No agent')}</span>
                                )}
                                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                    {formatFilesGalleryCompactCreatedAt(file.createdAt)}
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 truncate" title={file.fileName}>
                                {file.fileName}
                            </p>
                            <div className="mt-1 flex justify-between items-center">
                                <span className="text-[10px] text-gray-500">
                                    {formatFilesGalleryCompactFileSize(file.fileSize)}
                                </span>
                                <FilesGalleryStatusBadge
                                    status={file.status}
                                    className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {files.length === 0 && !isLoading && <div className="text-center text-gray-500 py-12">No files found.</div>}

            <div className="py-8 flex justify-center" ref={observerTarget}>
                {isLoading && <Loader2 className="w-8 h-8 animate-spin text-blue-500" />}
                {!isLoading && !hasMore && files.length > 0 && <p className="text-gray-400 text-sm">No more files</p>}
            </div>
        </>
    );
}
