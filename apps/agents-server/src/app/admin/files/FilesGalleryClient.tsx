'use client';

import { ChevronLeft, ChevronRight, File, Grid, LayoutList, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { FileWithAgent, listFiles } from './actions';

type ViewMode = 'TABLE' | 'GRID';

export function FilesGalleryClient() {
    const [viewMode, setViewMode] = useState<ViewMode>('TABLE');
    const [files, setFiles] = useState<FileWithAgent[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [hasMore, setHasMore] = useState(true);

    const loadFiles = async (pageNum: number, isNewView: boolean) => {
        setIsLoading(true);
        try {
            const result = await listFiles({ page: pageNum, limit });
            if (isNewView) {
                setFiles(result.files);
            } else {
                setFiles((prev) => [...prev, ...result.files]);
            }
            setTotal(result.total);
            setHasMore(result.files.length === limit);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadFiles(1, true);
        setPage(1);
        setHasMore(true);
    }, [viewMode]);

    const handleLoadMore = () => {
        if (!isLoading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadFiles(nextPage, false);
        }
    };

    // Table view pagination
    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        loadFiles(newPage, true);
    };

    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoading && viewMode === 'GRID') {
                    handleLoadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [hasMore, isLoading, viewMode, page]);

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            <div className="flex justify-between items-center mt-20 mb-4">
                <h1 className="text-3xl text-gray-900 font-light">Files Gallery</h1>
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('TABLE')}
                        className={`p-2 rounded-md transition-colors ${
                            viewMode === 'TABLE' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'
                        }`}
                        title="Table View"
                    >
                        <LayoutList className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('GRID')}
                        className={`p-2 rounded-md transition-colors ${
                            viewMode === 'GRID' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'
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
                                    <th className="px-6 py-3">File Name</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3">Size</th>
                                    <th className="px-6 py-3">Agent</th>
                                    <th className="px-6 py-3">Purpose</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Created At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {files.map((file) => (
                                    <tr key={file.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            {file.storageUrl ? (
                                                <a href={file.storageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                    {file.fileName}
                                                </a>
                                            ) : (
                                                file.fileName
                                            )}
                                        </td>
                                        <td className="px-6 py-4">{file.fileType}</td>
                                        <td className="px-6 py-4">{(file.fileSize / 1024).toFixed(2)} KB</td>
                                        <td className="px-6 py-4">
                                            {file.agent ? (
                                                <Link href={`/${file.agent.agentName}`} className="text-blue-600 hover:underline">
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
                                             <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                file.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                                                file.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {file.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {new Date(file.createdAt).toLocaleString()}
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
                    {/* Pagination for Table */}
                    <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
                        <span className="text-sm text-gray-700">
                            Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to <span className="font-medium">{Math.min(page * limit, total)}</span> of <span className="font-medium">{total}</span> results
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
                        {files.map((file) => (
                            <div key={file.id} className="group relative border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                                <a href={file.storageUrl || '#'} target="_blank" rel="noopener noreferrer" className="block aspect-square relative bg-gray-100 flex items-center justify-center">
                                    {file.fileType.startsWith('image/') && file.storageUrl ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img 
                                            src={file.storageUrl} 
                                            alt={file.fileName} 
                                            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105" 
                                            loading="lazy"
                                        />
                                    ) : (
                                        <File className="w-16 h-16 text-gray-400" />
                                    )}
                                </a>
                                <div className="p-3">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        {file.agent ? (
                                            <Link href={`/${file.agent.agentName}`} className="text-xs font-medium text-blue-600 hover:underline truncate">
                                                {file.agent.agentName}
                                            </Link>
                                        ) : (
                                             <span className="text-xs text-gray-400">No agent</span>
                                        )}
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                            {new Date(file.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 truncate" title={file.fileName}>
                                        {file.fileName}
                                    </p>
                                    <div className="mt-1 flex justify-between items-center">
                                        <span className="text-[10px] text-gray-500">{(file.fileSize / 1024).toFixed(1)} KB</span>
                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                                            file.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                                            file.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {file.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {files.length === 0 && !isLoading && (
                        <div className="text-center text-gray-500 py-12">
                            No files found.
                        </div>
                    )}

                    {/* Infinite Scroll Loader */}
                    <div className="py-8 flex justify-center" ref={observerTarget}>
                        {isLoading && (
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        )}
                        {!isLoading && !hasMore && files.length > 0 && (
                            <p className="text-gray-400 text-sm">No more files</p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
