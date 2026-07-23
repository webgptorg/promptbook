import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ServerLanguageCode } from '../../../languages/ServerLanguageRegistry';
import { buildAgentProfileHref } from '../../../utils/agentRouting/agentRouteHrefs';
import { formatServerLanguageHumanReadableDate } from '../../../utils/localization/formatServerLanguageHumanReadableDate';
import { formatResourceBytes } from '../../../utils/resourceMonitor/formatResourceMonitorValue';
import { AdminSortableTableHeaderCell } from '../_components/AdminSortableTableHeaderCell';
import { FilesGalleryStatusBadge } from './FilesGalleryStatusBadge';
import type { UseFilesGalleryState } from './useFilesGalleryState';

/**
 * Props for FilesGalleryTable.
 */
type FilesGalleryTableProps = Pick<
    UseFilesGalleryState,
    'files' | 'total' | 'isLoading' | 'page' | 'limit' | 'sortBy' | 'sortOrder' | 'handlePageChange' | 'handleSortChange'
> & {
    /**
     * Active text formatter for agent naming.
     */
    readonly formatText: (text: string) => string;

    /**
     * Active UI language used for date formatting.
     */
    readonly language: ServerLanguageCode;
};

/**
 * Renders the table view of the files gallery, including pagination.
 *
 * @private function of <FilesGalleryClient/>
 */
export function FilesGalleryTable({
    formatText,
    language,
    files,
    total,
    isLoading,
    page,
    limit,
    sortBy,
    sortOrder,
    handlePageChange,
    handleSortChange,
}: FilesGalleryTableProps) {
    const isOnFirstPage = page === 1;
    const isOnLastPage = page * limit >= total;

    return (
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                        <tr>
                            <AdminSortableTableHeaderCell
                                className="px-6 py-3"
                                label="file name"
                                sortBy="fileName"
                                activeSortBy={sortBy}
                                sortOrder={sortOrder}
                                onSortChange={handleSortChange}
                            >
                                File Name
                            </AdminSortableTableHeaderCell>
                            <AdminSortableTableHeaderCell
                                className="px-6 py-3"
                                label="type"
                                sortBy="fileType"
                                activeSortBy={sortBy}
                                sortOrder={sortOrder}
                                onSortChange={handleSortChange}
                            >
                                Type
                            </AdminSortableTableHeaderCell>
                            <AdminSortableTableHeaderCell
                                className="px-6 py-3"
                                label="size"
                                sortBy="fileSize"
                                activeSortBy={sortBy}
                                sortOrder={sortOrder}
                                onSortChange={handleSortChange}
                            >
                                Size
                            </AdminSortableTableHeaderCell>
                            <th className="px-6 py-3">{formatText('Agent')}</th>
                            <AdminSortableTableHeaderCell
                                className="px-6 py-3"
                                label="purpose"
                                sortBy="purpose"
                                activeSortBy={sortBy}
                                sortOrder={sortOrder}
                                onSortChange={handleSortChange}
                            >
                                Purpose
                            </AdminSortableTableHeaderCell>
                            <AdminSortableTableHeaderCell
                                className="px-6 py-3"
                                label="status"
                                sortBy="status"
                                activeSortBy={sortBy}
                                sortOrder={sortOrder}
                                onSortChange={handleSortChange}
                            >
                                Status
                            </AdminSortableTableHeaderCell>
                            <AdminSortableTableHeaderCell
                                className="px-6 py-3"
                                label="created at"
                                sortBy="createdAt"
                                activeSortBy={sortBy}
                                sortOrder={sortOrder}
                                onSortChange={handleSortChange}
                            >
                                Created At
                            </AdminSortableTableHeaderCell>
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
                                <td className="px-6 py-4">{formatResourceBytes(file.fileSize)}</td>
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
                                    {formatServerLanguageHumanReadableDate(file.createdAt, language)}
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
                    Showing <span className="font-medium">{total === 0 ? 0 : (page - 1) * limit + 1}</span> to{' '}
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
