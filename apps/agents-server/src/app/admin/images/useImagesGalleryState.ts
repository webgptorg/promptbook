import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { listImages, type ImageWithAgent } from './actions';

/**
 * Page size used by the images gallery views.
 */
const IMAGES_GALLERY_PAGE_SIZE = 20;

/**
 * Supported images gallery view modes.
 */
type ImagesGalleryViewMode = 'TABLE' | 'GRID';

/**
 * Load strategy used when fetching another page of images.
 */
type ImagesGalleryLoadMode = 'replace' | 'append';

/**
 * State contract shared by the private images gallery modules.
 *
 * @private internal type of <ImagesGalleryClient/>
 */
export type UseImagesGalleryState = {
    images: ImageWithAgent[];
    total: number;
    isLoading: boolean;
    page: number;
    limit: number;
    hasMore: boolean;
    viewMode: ImagesGalleryViewMode;
    copiedId: number | null;
    observerTarget: RefObject<HTMLDivElement | null>;
    handleViewModeChange: (nextViewMode: ImagesGalleryViewMode) => void;
    handlePageChange: (newPage: number) => void;
    handlePromptCopy: (prompt: string, imageId: number) => Promise<void>;
};

/**
 * Resolves the next image list after a page has loaded.
 */
function resolveImagesGalleryItems(
    previousImages: ImageWithAgent[],
    loadedImages: ImageWithAgent[],
    loadMode: ImagesGalleryLoadMode,
): ImageWithAgent[] {
    if (loadMode === 'replace') {
        return loadedImages;
    }

    return [...previousImages, ...loadedImages];
}

/**
 * Decides whether the grid sentinel should request the next page.
 */
function shouldLoadMoreImages(
    entry: IntersectionObserverEntry | undefined,
    state: Pick<UseImagesGalleryState, 'hasMore' | 'isLoading' | 'viewMode'>,
): boolean {
    return Boolean(entry?.isIntersecting) && state.hasMore && !state.isLoading && state.viewMode === 'GRID';
}

/**
 * Handles images gallery loading and view-state orchestration.
 *
 * @private function of <ImagesGalleryClient/>
 */
export function useImagesGalleryState(): UseImagesGalleryState {
    const [viewMode, setViewMode] = useState<ImagesGalleryViewMode>('GRID');
    const [images, setImages] = useState<ImageWithAgent[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const observerTarget = useRef<HTMLDivElement>(null);

    const handlePromptCopy = useCallback(async (prompt: string, imageId: number) => {
        try {
            await navigator.clipboard.writeText(prompt);
            setCopiedId(imageId);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (error) {
            console.error('Failed to copy text: ', error);
        }
    }, []);

    const loadImagesPage = useCallback(async (pageNumber: number, loadMode: ImagesGalleryLoadMode) => {
        setIsLoading(true);

        try {
            const result = await listImages({ page: pageNumber, limit: IMAGES_GALLERY_PAGE_SIZE });

            setImages((previousImages) => resolveImagesGalleryItems(previousImages, result.images, loadMode));
            setTotal(result.total);
            setHasMore(result.images.length === IMAGES_GALLERY_PAGE_SIZE);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadImagesPage(1, 'replace');
        setPage(1);
        setHasMore(true);
    }, [loadImagesPage, viewMode]);

    const handleLoadMore = useCallback(() => {
        if (isLoading || !hasMore) {
            return;
        }

        const nextPage = page + 1;
        setPage(nextPage);
        void loadImagesPage(nextPage, 'append');
    }, [hasMore, isLoading, loadImagesPage, page]);

    const handlePageChange = useCallback(
        (newPage: number) => {
            setPage(newPage);
            void loadImagesPage(newPage, 'replace');
        },
        [loadImagesPage],
    );

    const handleViewModeChange = useCallback((nextViewMode: ImagesGalleryViewMode) => {
        setViewMode(nextViewMode);
    }, []);

    useEffect(() => {
        const target = observerTarget.current;
        const observer = new IntersectionObserver(
            (entries) => {
                if (shouldLoadMoreImages(entries[0], { hasMore, isLoading, viewMode })) {
                    handleLoadMore();
                }
            },
            { threshold: 0.1 },
        );

        if (target) {
            observer.observe(target);
        }

        return () => {
            if (target) {
                observer.unobserve(target);
            }
        };
    }, [handleLoadMore, hasMore, isLoading, viewMode]);

    return {
        images,
        total,
        isLoading,
        page,
        limit: IMAGES_GALLERY_PAGE_SIZE,
        hasMore,
        viewMode,
        copiedId,
        observerTarget,
        handleViewModeChange,
        handlePageChange,
        handlePromptCopy,
    };
}
