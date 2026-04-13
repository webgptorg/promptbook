import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { ImageWithAgent } from './actions';
import { ImagesGalleryParametersBadges } from './ImagesGalleryParametersBadges';
import { ImagesGalleryPromptCopyButton } from './ImagesGalleryPromptCopyButton';
import { ImagesGalleryPurposeBadge } from './ImagesGalleryPurposeBadge';
import type { UseImagesGalleryState } from './useImagesGalleryState';

/**
 * Props for ImagesGalleryGrid.
 */
type ImagesGalleryGridProps = Pick<
    UseImagesGalleryState,
    'images' | 'isLoading' | 'hasMore' | 'copiedId' | 'observerTarget' | 'handlePromptCopy'
> & {
    /**
     * Active text formatter for agent naming.
     */
    readonly formatText: (text: string) => string;
};

/**
 * Props for one ImagesGalleryGrid card.
 */
type ImagesGalleryGridCardProps = Pick<UseImagesGalleryState, 'copiedId' | 'handlePromptCopy'> & {
    /**
     * Image rendered in this card.
     */
    readonly image: ImageWithAgent;

    /**
     * Active text formatter for agent naming.
     */
    readonly formatText: (text: string) => string;
};

/**
 * Formats one created-at value for the compact grid view.
 */
function formatImagesGalleryCompactCreatedAt(createdAt: string): string {
    return new Date(createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
}

/**
 * Renders one image card inside the gallery grid.
 */
function ImagesGalleryGridCard({
    image,
    formatText,
    copiedId,
    handlePromptCopy,
}: ImagesGalleryGridCardProps) {
    return (
        <div className="group relative border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
            <a
                href={image.cdnUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square relative bg-gray-100 overflow-hidden"
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={image.cdnUrl}
                    alt={image.prompt}
                    className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                />
                {image.purpose && (
                    <div className="absolute top-2 right-2">
                        <ImagesGalleryPurposeBadge
                            purpose={image.purpose}
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm"
                        />
                    </div>
                )}
            </a>
            <div className="p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                    {image.agent ? (
                        <Link
                            href={`/${image.agent.agentName}`}
                            className="text-xs font-medium text-blue-600 hover:underline truncate"
                        >
                            {image.agent.agentName}
                        </Link>
                    ) : (
                        <span className="text-xs text-gray-400">{formatText('No agent')}</span>
                    )}
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {formatImagesGalleryCompactCreatedAt(image.createdAt)}
                    </span>
                </div>
                <div className="relative group/prompt">
                    <p className="text-xs text-gray-600 line-clamp-2 pr-6" title={image.prompt}>
                        {image.prompt}
                    </p>
                    <ImagesGalleryPromptCopyButton
                        prompt={image.prompt}
                        imageId={image.id}
                        copiedId={copiedId}
                        handlePromptCopy={handlePromptCopy}
                        className="absolute top-0 right-0 p-1 rounded hover:bg-gray-100 transition-colors opacity-0 group-hover/prompt:opacity-100"
                    />
                </div>
                <ImagesGalleryParametersBadges filename={image.filename} variant="GRID" />
            </div>
        </div>
    );
}

/**
 * Renders the grid view of the images gallery, including infinite-scroll feedback.
 *
 * @private function of <ImagesGalleryClient/>
 */
export function ImagesGalleryGrid({
    formatText,
    images,
    isLoading,
    hasMore,
    copiedId,
    observerTarget,
    handlePromptCopy,
}: ImagesGalleryGridProps) {
    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {images.map((image) => (
                    <ImagesGalleryGridCard
                        key={image.id}
                        image={image}
                        formatText={formatText}
                        copiedId={copiedId}
                        handlePromptCopy={handlePromptCopy}
                    />
                ))}
            </div>

            {images.length === 0 && !isLoading && <div className="text-center text-gray-500 py-12">No images found.</div>}

            <div className="py-8 flex justify-center" ref={observerTarget}>
                {isLoading && <Loader2 className="w-8 h-8 animate-spin text-blue-500" />}
                {!isLoading && !hasMore && images.length > 0 && <p className="text-gray-400 text-sm">No more images</p>}
            </div>
        </>
    );
}
