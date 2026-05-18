import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { buildAgentProfileHref } from '../../../utils/agentRouting/agentRouteHrefs';
import { FilesGalleryStatusBadge } from './FilesGalleryStatusBadge';
import type { UseFilesGalleryState } from './useFilesGalleryState';

/**
 * Props for FilesGalleryTable.
 */
type FilesGalleryTableProps = Pick<
    UseFilesGalleryState,
    'files' | 'total' | 'isLoading' | 'page' | 'limit' | 'handlePageChange'
> & {
    /**
     * Active text formatter for agent naming.
     */
    readonly formatText: (text: string) => string;
};

/**
 * Formats one file size for the table view.
 */
function formatFilesGalleryFileSize(fileSize: number): string {
    return `${(fileSize / 1024).toFixed(2)} KB`;
}

/**
 * Formats one created-at value for the table view.
 */
function formatFilesGalleryCreatedAt(createdAt: string): string {
    return new Date(createdAt).toLocaleString();
}

/**
 * Renders the table view of the files gallery, including pagination.
 *
 * @private function of <FilesGalleryClient/>
 */
export function FilesGalleryTable({
    formatText,
    files,
    total,
    isLoading,
    page,
    limit,
    handlePageChange,
}: FilesGalleryTableProps) {
    const isOnFirstPage = page === 1;
    const isOnLastPage = page * limit >= total;

    return (
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3">File Name</th>
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3">Size</th>
                            <th className="px-6 py-3">{formatText('Agent')}</th>
                            <th className="px-6 py-3">Purpose</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Created At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {files.map((file) => (
                            <tr key={file.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    {file.storageUrl ? (
                                        <a
                                            href={file.storageUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline"
                                        >
                                            {file.fileName}
                                        </a>
                                    ) : (
                                        file.fileName
                                    )}
                                </td>
                                <td className="px-6 py-4">{file.fileType}</td>
                                <td className="px-6 py-4">{formatFilesGalleryFileSize(file.fileSize)}</td>
                                <td className="px-6 py-4">
                                    {file.agent ? (
                                        <Link
                                            href={buildAgentProfileHref(
                                                file.agent.permanentId || file.agent.agentName,
                                            )}
                                            className="text-blue-600 hover:underline"
                                        >
                                            {file.agent.agentName}
                                        </Link>
                                    ) : (
                                        <span className="text-gray-400">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-gray-100 text-gray-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">
                                        {file.purpose}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <FilesGalleryStatusBadge status={file.status} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {formatFilesGalleryCreatedAt(file.createdAt)}
                                </td>
                            </tr>
                        ))}
                        {files.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                                    No files found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
                <span className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(page * limit, total)}</span> of{' '}
                    <span className="font-medium">{total}</span> results
                </span>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={isOnFirstPage || isLoading}
                        className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={isOnLastPage || isLoading}
                        className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
