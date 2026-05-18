import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { buildAgentProfileHref } from '../../../utils/agentRouting/agentRouteHrefs';
import type { ImageWithAgent } from './actions';
import { ImagesGalleryParametersBadges } from './ImagesGalleryParametersBadges';
import { ImagesGalleryPromptCopyButton } from './ImagesGalleryPromptCopyButton';
import { ImagesGalleryPurposeBadge } from './ImagesGalleryPurposeBadge';
import type { UseImagesGalleryState } from './useImagesGalleryState';

/**
 * Props for ImagesGalleryTable.
 */
type ImagesGalleryTableProps = Pick<
    UseImagesGalleryState,
    'images' | 'total' | 'isLoading' | 'page' | 'limit' | 'copiedId' | 'handlePageChange' | 'handlePromptCopy'
> & {
    /**
     * Active text formatter for agent naming.
     */
    readonly formatText: (text: string) => string;
};

/**
 * Props for one ImagesGalleryTable row.
 */
type ImagesGalleryTableRowProps = Pick<UseImagesGalleryState, 'copiedId' | 'handlePromptCopy'> & {
    /**
     * Image rendered in this table row.
     */
    readonly image: ImageWithAgent;
};

/**
 * Formats one created-at value for the table view.
 */
function formatImagesGalleryCreatedAt(createdAt: string): string {
    return new Date(createdAt).toLocaleString();
}

/**
 * Renders one image row inside the gallery table.
 */
function ImagesGalleryTableRow({ image, copiedId, handlePromptCopy }: ImagesGalleryTableRowProps) {
    return (
        <tr className="bg-white border-b hover:bg-gray-50">
            <td className="px-6 py-4">
                <a
                    href={image.cdnUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-20 h-20 relative rounded overflow-hidden border bg-gray-100"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.cdnUrl} alt={image.prompt} className="object-cover w-full h-full" />
                </a>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-start gap-2 group">
                    <div className="max-w-md truncate" title={image.prompt}>
                        {image.prompt}
                    </div>
                    <ImagesGalleryPromptCopyButton
                        prompt={image.prompt}
                        imageId={image.id}
                        copiedId={copiedId}
                        handlePromptCopy={handlePromptCopy}
                        className="p-1 rounded hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
                    />
                </div>
                <div className="text-xs text-gray-400 mt-1">{image.filename}</div>
            </td>
            <td className="px-6 py-4">
                {image.agent ? (
                    <Link
                        href={buildAgentProfileHref(image.agent.permanentId || image.agent.agentName)}
                        className="text-blue-600 hover:underline"
                    >
                        {image.agent.agentName}
                    </Link>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </td>
            <td className="px-6 py-4">
                <ImagesGalleryParametersBadges filename={image.filename} variant="TABLE" />
            </td>
            <td className="px-6 py-4">
                {image.purpose ? (
                    <ImagesGalleryPurposeBadge
                        purpose={image.purpose}
                        className="px-2 py-1 rounded-full text-xs font-medium"
                    />
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">{formatImagesGalleryCreatedAt(image.createdAt)}</td>
        </tr>
    );
}

/**
 * Renders the table view of the images gallery, including pagination.
 *
 * @private function of <ImagesGalleryClient/>
 */
export function ImagesGalleryTable({
    formatText,
    images,
    total,
    isLoading,
    page,
    limit,
    copiedId,
    handlePageChange,
    handlePromptCopy,
}: ImagesGalleryTableProps) {
    const isOnFirstPage = page === 1;
    const isOnLastPage = page * limit >= total;

    return (
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3 w-32">Image</th>
                            <th className="px-6 py-3">Prompt</th>
                            <th className="px-6 py-3">{formatText('Agent')}</th>
                            <th className="px-6 py-3">Parameters</th>
                            <th className="px-6 py-3">Purpose</th>
                            <th className="px-6 py-3">Created At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {images.map((image) => (
                            <ImagesGalleryTableRow
                                key={image.id}
                                image={image}
                                copiedId={copiedId}
                                handlePromptCopy={handlePromptCopy}
                            />
                        ))}
                        {images.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                    No images found.
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
