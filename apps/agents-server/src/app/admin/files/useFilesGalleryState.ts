import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { listFiles, type FileWithAgent } from './actions';

/**
 * Page size used by the files gallery views.
 */
const FILES_GALLERY_PAGE_SIZE = 20;

/**
 * Supported files gallery view modes.
 */
type FilesGalleryViewMode = 'TABLE' | 'GRID';

/**
 * Load strategy used when fetching another page of files.
 */
type FilesGalleryLoadMode = 'replace' | 'append';

/**
 * State contract shared by the private files gallery modules.
 *
 * @private internal type of <FilesGalleryClient/>
 */
export type UseFilesGalleryState = {
    files: FileWithAgent[];
    total: number;
    isLoading: boolean;
    page: number;
    limit: number;
    hasMore: boolean;
    viewMode: FilesGalleryViewMode;
    observerTarget: RefObject<HTMLDivElement | null>;
    handleViewModeChange: (nextViewMode: FilesGalleryViewMode) => void;
    handlePageChange: (newPage: number) => void;
};

/**
 * Resolves the next files list after a page has loaded.
 */
function resolveFilesGalleryItems(
    previousFiles: FileWithAgent[],
    loadedFiles: FileWithAgent[],
    loadMode: FilesGalleryLoadMode,
): FileWithAgent[] {
    if (loadMode === 'replace') {
        return loadedFiles;
    }

    return [...previousFiles, ...loadedFiles];
}

/**
 * Decides whether the grid sentinel should request the next page.
 */
function shouldLoadMoreFiles(
    entry: IntersectionObserverEntry | undefined,
    state: Pick<UseFilesGalleryState, 'hasMore' | 'isLoading' | 'viewMode'>,
): boolean {
    return Boolean(entry?.isIntersecting) && state.hasMore && !state.isLoading && state.viewMode === 'GRID';
}

/**
 * Handles files gallery loading and view-state orchestration.
 *
 * @private function of <FilesGalleryClient/>
 */
export function useFilesGalleryState(): UseFilesGalleryState {
    const [viewMode, setViewMode] = useState<FilesGalleryViewMode>('TABLE');
    const [files, setFiles] = useState<FileWithAgent[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const observerTarget = useRef<HTMLDivElement>(null);

    const loadFilesPage = useCallback(async (pageNumber: number, loadMode: FilesGalleryLoadMode) => {
        setIsLoading(true);

        try {
            const result = await listFiles({ page: pageNumber, limit: FILES_GALLERY_PAGE_SIZE });

            setFiles((previousFiles) => resolveFilesGalleryItems(previousFiles, result.files, loadMode));
            setTotal(result.total);
            setHasMore(result.files.length === FILES_GALLERY_PAGE_SIZE);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadFilesPage(1, 'replace');
        setPage(1);
        setHasMore(true);
    }, [loadFilesPage, viewMode]);

    const handleLoadMore = useCallback(() => {
        if (isLoading || !hasMore) {
            return;
        }

        const nextPage = page + 1;
        setPage(nextPage);
        void loadFilesPage(nextPage, 'append');
    }, [hasMore, isLoading, loadFilesPage, page]);

    const handlePageChange = useCallback(
        (newPage: number) => {
            setPage(newPage);
            void loadFilesPage(newPage, 'replace');
        },
        [loadFilesPage],
    );

    const handleViewModeChange = useCallback((nextViewMode: FilesGalleryViewMode) => {
        setViewMode(nextViewMode);
    }, []);

    useEffect(() => {
        const target = observerTarget.current;
        const observer = new IntersectionObserver(
            (entries) => {
                if (shouldLoadMoreFiles(entries[0], { hasMore, isLoading, viewMode })) {
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
        files,
        total,
        isLoading,
        page,
        limit: FILES_GALLERY_PAGE_SIZE,
        hasMore,
        viewMode,
        observerTarget,
        handleViewModeChange,
        handlePageChange,
    };
}
