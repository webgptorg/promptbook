'use client';

import { useAgentNaming } from '../../../components/AgentNaming/AgentNamingContext';
import { FilesGalleryGrid } from './FilesGalleryGrid';
import { FilesGalleryTable } from './FilesGalleryTable';
import { FilesGalleryViewModeToggle } from './FilesGalleryViewModeToggle';
import { useFilesGalleryState } from './useFilesGalleryState';

/**
 * Handles files gallery client.
 */
export function FilesGalleryClient() {
    const { formatText } = useAgentNaming();
    const filesGalleryState = useFilesGalleryState();

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            <div className="flex justify-between items-center mt-20 mb-4">
                <h1 className="text-3xl text-gray-900 font-light">Files Gallery</h1>
                <FilesGalleryViewModeToggle
                    viewMode={filesGalleryState.viewMode}
                    handleViewModeChange={filesGalleryState.handleViewModeChange}
                />
            </div>

            {filesGalleryState.viewMode === 'TABLE' ? (
                <FilesGalleryTable
                    formatText={formatText}
                    files={filesGalleryState.files}
                    total={filesGalleryState.total}
                    isLoading={filesGalleryState.isLoading}
                    page={filesGalleryState.page}
                    limit={filesGalleryState.limit}
                    handlePageChange={filesGalleryState.handlePageChange}
                />
            ) : (
                <FilesGalleryGrid
                    formatText={formatText}
                    files={filesGalleryState.files}
                    isLoading={filesGalleryState.isLoading}
                    hasMore={filesGalleryState.hasMore}
                    observerTarget={filesGalleryState.observerTarget}
                />
            )}
        </div>
    );
}
