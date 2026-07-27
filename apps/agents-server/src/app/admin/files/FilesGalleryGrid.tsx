import { File, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { ServerLanguageCode } from '../../../languages/ServerLanguageRegistry';
import { buildAgentProfileHref } from '../../../utils/agentRouting/agentRouteHrefs';
import { formatServerLanguageHumanReadableDate } from '../../../utils/localization/formatServerLanguageHumanReadableDate';
import { formatResourceBytes } from '../../../utils/resourceMonitor/formatResourceMonitorValue';
import { resolveFilesGalleryFileHref } from './filesGalleryLinks';
import { FilesGalleryStatusBadge } from './FilesGalleryStatusBadge';
import type { FileWithAgent } from './filesGalleryTypes';
import type { UseFilesGalleryState } from './useFilesGalleryState';

/**
 * Props for FilesGalleryGrid.
 */
type FilesGalleryGridProps = Pick<UseFilesGalleryState, 'files' | 'isLoading' | 'hasMore' | 'observerTarget'> & {
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
 * Renders the grid view of the files gallery, including infinite-scroll feedback.
 *
 * @private function of <FilesGalleryClient/>
 */
export function FilesGalleryGrid({
    formatText,
    language,
    files,
    isLoading,
    hasMore,
    observerTarget,
}: FilesGalleryGridProps) {
    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {files.map((file) => {
                    const fileHref = resolveFilesGalleryFileHref(file);

                    return (
                        <div
                            key={file.id}
                            className="group relative border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                        >
                            <FilesGalleryGridPreview file={file} fileHref={fileHref} />
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
                                        {formatServerLanguageHumanReadableDate(file.createdAt, language)}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 truncate" title={file.fileName}>
                                    {file.fileName}
                                </p>
                                <div className="mt-1 flex justify-between items-center">
                                    <span className="text-[10px] text-gray-500">
                                        {formatResourceBytes(file.fileSize)}
                                    </span>
                                    <FilesGalleryStatusBadge
                                        status={file.status}
                                        className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {files.length === 0 && !isLoading && <div className="text-center text-gray-500 py-12">No files found.</div>}

            <div className="py-8 flex justify-center" ref={observerTarget}>
                {isLoading && <Loader2 className="w-8 h-8 animate-spin text-blue-500" />}
                {!isLoading && !hasMore && files.length > 0 && <p className="text-gray-400 text-sm">No more files</p>}
            </div>
        </>
    );
}

/**
 * Props accepted by `FilesGalleryGridPreview`.
 *
 * @private type of <FilesGalleryGrid/>
 */
type FilesGalleryGridPreviewProps = {
    /**
     * File rendered in the gallery card.
     */
    readonly file: FileWithAgent;

    /**
     * Resolved public file URL, or `null` when the row has no usable URL.
     */
    readonly fileHref: string | null;
};

/**
 * Renders the square preview/open target for one grid card.
 *
 * @param props - Preview props.
 * @returns Linked or static preview tile.
 * @private function of <FilesGalleryGrid/>
 */
function FilesGalleryGridPreview({ file, fileHref }: FilesGalleryGridPreviewProps) {
    const preview = <FilesGalleryGridPreviewContent file={file} fileHref={fileHref} />;

    if (!fileHref) {
        return (
            <div className="block aspect-square relative bg-gray-100 flex items-center justify-center">{preview}</div>
        );
    }

    return (
        <a
            href={fileHref}
            target="_blank"
            rel="noopener noreferrer"
            className="block aspect-square relative bg-gray-100 flex items-center justify-center"
        >
            {preview}
        </a>
    );
}

/**
 * Props accepted by `FilesGalleryGridPreviewContent`.
 *
 * @private type of <FilesGalleryGrid/>
 */
type FilesGalleryGridPreviewContentProps = {
    /**
     * File rendered in the gallery card.
     */
    readonly file: FileWithAgent;

    /**
     * Resolved public file URL, or `null` when the row has no usable URL.
     */
    readonly fileHref: string | null;
};

/**
 * Renders either the image thumbnail or a generic file icon.
 *
 * @param props - Preview content props.
 * @returns Preview content.
 * @private function of <FilesGalleryGrid/>
 */
function FilesGalleryGridPreviewContent({ file, fileHref }: FilesGalleryGridPreviewContentProps) {
    if (file.fileType.startsWith('image/') && fileHref) {
        return (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
                src={fileHref}
                alt={file.fileName}
                className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
            />
        );
    }

    return <File className="w-16 h-16 text-gray-400" />;
}
