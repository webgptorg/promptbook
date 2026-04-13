'use client';

import { useAgentNaming } from '../../../components/AgentNaming/AgentNamingContext';
import { ImagesGalleryGrid } from './ImagesGalleryGrid';
import { ImagesGalleryTable } from './ImagesGalleryTable';
import { ImagesGalleryViewModeToggle } from './ImagesGalleryViewModeToggle';
import { useImagesGalleryState } from './useImagesGalleryState';

/**
 * Handles images gallery client.
 */
export function ImagesGalleryClient() {
    const { formatText } = useAgentNaming();
    const imagesGalleryState = useImagesGalleryState();

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            <div className="flex justify-between items-center mt-20 mb-4">
                <h1 className="text-3xl text-gray-900 font-light">Images Gallery</h1>
                <ImagesGalleryViewModeToggle
                    viewMode={imagesGalleryState.viewMode}
                    handleViewModeChange={imagesGalleryState.handleViewModeChange}
                />
            </div>

            {imagesGalleryState.viewMode === 'TABLE' ? (
                <ImagesGalleryTable
                    formatText={formatText}
                    images={imagesGalleryState.images}
                    total={imagesGalleryState.total}
                    isLoading={imagesGalleryState.isLoading}
                    page={imagesGalleryState.page}
                    limit={imagesGalleryState.limit}
                    copiedId={imagesGalleryState.copiedId}
                    handlePageChange={imagesGalleryState.handlePageChange}
                    handlePromptCopy={imagesGalleryState.handlePromptCopy}
                />
            ) : (
                <ImagesGalleryGrid
                    formatText={formatText}
                    images={imagesGalleryState.images}
                    isLoading={imagesGalleryState.isLoading}
                    hasMore={imagesGalleryState.hasMore}
                    copiedId={imagesGalleryState.copiedId}
                    observerTarget={imagesGalleryState.observerTarget}
                    handlePromptCopy={imagesGalleryState.handlePromptCopy}
                />
            )}
        </div>
    );
}
