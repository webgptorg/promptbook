'use client';

import { Check, ChevronLeft, ChevronRight, Copy, Grid, Info, LayoutList, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAgentNaming } from '../../../components/AgentNaming/AgentNamingContext';
import { extractParametersFromFilename } from '../../../utils/normalization/extractParametersFromFilename';
import { ImageWithAgent, listImages } from './actions';

type ViewMode = 'TABLE' | 'GRID';

export function ImagesGalleryClient() {
    const [viewMode, setViewMode] = useState<ViewMode>('GRID');
    const [images, setImages] = useState<ImageWithAgent[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [hasMore, setHasMore] = useState(true);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const { formatText } = useAgentNaming();

    const copyToClipboard = async (text: string, id: number) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const loadImages = useCallback(
        async (pageNum: number, isNewView: boolean) => {
            setIsLoading(true);
            try {
                const result = await listImages({ page: pageNum, limit });
                if (isNewView) {
                    setImages(result.images);
                } else {
                    setImages((prev) => [...prev, ...result.images]);
                }
                setTotal(result.total);
                setHasMore(result.images.length === limit);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        },
        [limit],
    );

    useEffect(() => {
        loadImages(1, true);
        setPage(1);
        setHasMore(true);
    }, [viewMode, loadImages]);

    const handleLoadMore = useCallback(() => {
        if (!isLoading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadImages(nextPage, false);
        }
    }, [isLoading, hasMore, page, loadImages]);

    // Table view pagination
    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        loadImages(newPage, true);
    };

    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const target = observerTarget.current;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoading && viewMode === 'GRID') {
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
    }, [hasMore, isLoading, viewMode, page, handleLoadMore]);

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            <div className="flex justify-between items-center mt-20 mb-4">
                <h1 className="text-3xl text-gray-900 font-light">Images Gallery</h1>
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('TABLE')}
                        className={`p-2 rounded-md transition-colors ${
                            viewMode === 'TABLE'
                                ? 'bg-white shadow-sm text-blue-600'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                        title="Table View"
                    >
                        <LayoutList className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('GRID')}
                        className={`p-2 rounded-md transition-colors ${
                            viewMode === 'GRID'
                                ? 'bg-white shadow-sm text-blue-600'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                        title="Grid View"
                    >
                        <Grid className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {viewMode === 'TABLE' ? (
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
                                {images.map((image) => {
                                    const params = extractParametersFromFilename(image.filename);
                                    return (
                                        <tr key={image.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <a
                                                href={image.cdnUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block w-20 h-20 relative rounded overflow-hidden border bg-gray-100"
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={image.cdnUrl}
                                                    alt={image.prompt}
                                                    className="object-cover w-full h-full"
                                                />
                                            </a>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-2 group">
                                                <div className="max-w-md truncate" title={image.prompt}>
                                                    {image.prompt}
                                                </div>
                                                <button
                                                    onClick={() => copyToClipboard(image.prompt, image.id)}
                                                    className="p-1 rounded hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Copy prompt"
                                                >
                                                    {copiedId === image.id ? (
                                                        <Check className="w-3 h-3 text-green-600" />
                                                    ) : (
                                                        <Copy className="w-3 h-3 text-gray-400" />
                                                    )}
                                                </button>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">{image.filename}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {image.agent ? (
                                                <Link
                                                    href={`/${image.agent.agentName}`}
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {image.agent.agentName}
                                                </Link>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] text-gray-600 border">
                                                    {params.modelName}
                                                </span>
                                                {params.size && (
                                                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[10px] text-blue-600 border border-blue-100">
                                                        {params.size}
                                                    </span>
                                                )}
                                                {params.quality && (
                                                    <span className="px-1.5 py-0.5 rounded bg-green-50 text-[10px] text-green-600 border border-green-100">
                                                        {params.quality}
                                                    </span>
                                                )}
                                                {params.style && (
                                                    <span className="px-1.5 py-0.5 rounded bg-orange-50 text-[10px] text-orange-600 border border-orange-100">
                                                        {params.style}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {image.purpose ? (
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        image.purpose === 'AVATAR'
                                                            ? 'bg-purple-100 text-purple-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                    }`}
                                                >
                                                    {image.purpose}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {new Date(image.createdAt).toLocaleString()}
                                        </td>
                                    </tr>
                                    );
                                })}
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
                    {/* Pagination for Table */}
                    <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
                        <span className="text-sm text-gray-700">
                            Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                            <span className="font-medium">{Math.min(page * limit, total)}</span> of{' '}
                            <span className="font-medium">{total}</span> results
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page === 1 || isLoading}
                                className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page * limit >= total || isLoading}
                                className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {images.map((image) => {
                            const params = extractParametersFromFilename(image.filename);
                            return (
                                <div
                                    key={image.id}
                                    className="group relative border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                                >
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
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${
                                                    image.purpose === 'AVATAR'
                                                        ? 'bg-purple-100 text-purple-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}
                                            >
                                                {image.purpose}
                                            </span>
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
                                            {new Date(image.createdAt).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                    <div className="relative group/prompt">
                                        <p className="text-xs text-gray-600 line-clamp-2 pr-6" title={image.prompt}>
                                            {image.prompt}
                                        </p>
                                        <button
                                            onClick={() => copyToClipboard(image.prompt, image.id)}
                                            className="absolute top-0 right-0 p-1 rounded hover:bg-gray-100 transition-colors opacity-0 group-hover/prompt:opacity-100"
                                            title="Copy prompt"
                                        >
                                            {copiedId === image.id ? (
                                                <Check className="w-3 h-3 text-green-600" />
                                            ) : (
                                                <Copy className="w-3 h-3 text-gray-400" />
                                            )}
                                        </button>
                                    </div>
                                    <div className="mt-2 pt-2 border-t flex flex-wrap gap-1">
                                        <span
                                            className="px-1 py-0.5 rounded bg-gray-50 text-[9px] text-gray-500 border border-gray-100 flex items-center gap-1"
                                            title="Model"
                                        >
                                            <Info className="w-2 h-2" />
                                            {params.modelName}
                                        </span>
                                        {params.size && (
                                            <span className="px-1 py-0.5 rounded bg-blue-50 text-[9px] text-blue-500 border border-blue-100">
                                                {params.size}
                                            </span>
                                        )}
                                        {params.quality && (
                                            <span className="px-1 py-0.5 rounded bg-green-50 text-[9px] text-green-500 border border-green-100">
                                                {params.quality}
                                            </span>
                                        )}
                                        {params.style && (
                                            <span className="px-1 py-0.5 rounded bg-orange-50 text-[9px] text-orange-500 border border-orange-100">
                                                {params.style}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            );
                        })}
                    </div>

                    {images.length === 0 && !isLoading && (
                        <div className="text-center text-gray-500 py-12">No images found.</div>
                    )}

                    {/* Infinite Scroll Loader */}
                    <div className="py-8 flex justify-center" ref={observerTarget}>
                        {isLoading && <Loader2 className="w-8 h-8 animate-spin text-blue-500" />}
                        {!isLoading && !hasMore && images.length > 0 && (
                            <p className="text-gray-400 text-sm">No more images</p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
