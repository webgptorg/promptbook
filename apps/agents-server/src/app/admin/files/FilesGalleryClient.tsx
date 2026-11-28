'use client';

import { useAgentNaming } from '../../../components/AgentNaming/AgentNamingContext';
import { useServerLanguage } from '../../../components/ServerLanguage/ServerLanguageProvider';
import { FilesGalleryGrid } from './FilesGalleryGrid';
import { FilesGalleryTable } from './FilesGalleryTable';
import { FilesGalleryViewModeToggle } from './FilesGalleryViewModeToggle';
import { useFilesGalleryState } from './useFilesGalleryState';

/**
 * Props accepted by `FilesGalleryClient`.
 *
 * @private client props of `/admin/files`
 */
type FilesGalleryClientProps = {
    /**
     * Whether the page header should keep the standalone top offset.
     */
    readonly isHeaderOffsetEnabled?: boolean;
};

/**
 * Handles files gallery client.
 */
export function FilesGalleryClient({ isHeaderOffsetEnabled = true }: FilesGalleryClientProps) {
    const { formatText } = useAgentNaming();
    const { language } = useServerLanguage();
    const filesGalleryState = useFilesGalleryState();

    return (
        <>
            <div
                className={`flex justify-between items-center mb-4 ${
                    isHeaderOffsetEnabled ? 'mt-20' : ''
                }`.trim()}
            >
                <h1 className="text-3xl text-gray-900 font-light">Files Gallery</h1>
                <FilesGalleryViewModeToggle
                    viewMode={filesGalleryState.viewMode}
                    handleViewModeChange={filesGalleryState.handleViewModeChange}
                />
            </div>

            {filesGalleryState.viewMode === 'TABLE' ? (
                <FilesGalleryTable
                    formatText={formatText}
                    language={language}
                    files={filesGalleryState.files}
                    total={filesGalleryState.total}
                    isLoading={filesGalleryState.isLoading}
                    page={filesGalleryState.page}
                    limit={filesGalleryState.limit}
                    sortBy={filesGalleryState.sortBy}
                    sortOrder={filesGalleryState.sortOrder}
                    handlePageChange={filesGalleryState.handlePageChange}
                    handleSortChange={filesGalleryState.handleSortChange}
                />
            ) : (
                <FilesGalleryGrid
                    formatText={formatText}
                    language={language}
                    files={filesGalleryState.files}
                    isLoading={filesGalleryState.isLoading}
                    hasMore={filesGalleryState.hasMore}
                    observerTarget={filesGalleryState.observerTarget}
                />
            )}
        </>
    );
}
