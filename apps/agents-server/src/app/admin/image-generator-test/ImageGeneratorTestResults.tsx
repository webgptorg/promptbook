import type { UseImageGeneratorTestState } from './useImageGeneratorTestState';

/**
 * Props for the image generator results list.
 */
type ImageGeneratorTestResultsProps = Pick<UseImageGeneratorTestState, 'mode' | 'results'>;

/**
 * Props for one image generator result card.
 */
type ImageGeneratorTestResultCardProps = {
    result: UseImageGeneratorTestState['results'][number];
    resultIndex: number;
};

/**
 * Resolves the layout classes used for the active result list mode.
 */
function resolveResultsLayoutClassName(mode: UseImageGeneratorTestState['mode']): string {
    return mode === 'multiple' ? 'mt-8 grid grid-cols-1 md:grid-cols-2 gap-4' : 'mt-8';
}

/**
 * Resolves the badge classes for one generation status.
 */
function resolveResultStatusClassName(status: UseImageGeneratorTestState['results'][number]['status']): string {
    if (status === 'success') {
        return 'bg-green-100 text-green-800';
    }

    if (status === 'error') {
        return 'bg-red-100 text-red-800';
    }

    return 'bg-yellow-100 text-yellow-800';
}

/**
 * Handles the result status badge.
 */
function ImageGeneratorTestStatusBadge({
    status,
}: Pick<UseImageGeneratorTestState['results'][number], 'status'>) {
    return <span className={`text-xs px-2 py-1 rounded-full ${resolveResultStatusClassName(status)}`}>{status}</span>;
}

/**
 * Handles the result preview area for one generated image.
 */
function ImageGeneratorTestResultPreview({ result }: Pick<ImageGeneratorTestResultCardProps, 'result'>) {
    if (result.status === 'loading') {
        return (
            <div className="animate-pulse flex flex-col items-center">
                <div className="h-8 w-8 bg-blue-400 rounded-full mb-2"></div>
                <span className="text-xs text-gray-500">Generating...</span>
            </div>
        );
    }

    if (result.status === 'success' && result.imageUrl) {
        return (
            <a href={result.imageUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.imageUrl} alt={result.prompt} className="w-full h-auto object-cover" />
            </a>
        );
    }

    if (result.status === 'error') {
        return <div className="p-4 text-center text-red-500 text-sm">{result.error || 'Failed to generate'}</div>;
    }

    return <span className="text-gray-400 text-sm">Waiting...</span>;
}

/**
 * Handles the optional raw response details block for one result.
 */
function ImageGeneratorTestRawDetails({ rawResult }: Pick<UseImageGeneratorTestState['results'][number], 'rawResult'>) {
    if (!rawResult) {
        return null;
    }

    return (
        <details className="mt-2">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">Raw Details</summary>
            <pre className="mt-1 p-2 bg-gray-50 text-[10px] overflow-auto max-h-[100px] rounded border">
                {JSON.stringify(rawResult, null, 2)}
            </pre>
        </details>
    );
}

/**
 * Handles one generated image result card.
 */
function ImageGeneratorTestResultCard({ result }: ImageGeneratorTestResultCardProps) {
    return (
        <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                <span
                    className="text-xs font-mono text-gray-500 truncate max-w-[200px]"
                    title={result.generatedFilename || ''}
                >
                    {result.generatedFilename || 'Pending...'}
                </span>
                <ImageGeneratorTestStatusBadge status={result.status} />
            </div>

            <div className="min-h-[200px] flex items-center justify-center bg-gray-100 relative group">
                <ImageGeneratorTestResultPreview result={result} />
            </div>

            <div className="p-3">
                <p className="text-sm text-gray-700 line-clamp-2" title={result.prompt}>
                    {result.prompt}
                </p>
                <ImageGeneratorTestRawDetails rawResult={result.rawResult} />
            </div>
        </div>
    );
}

/**
 * Handles the image generator results section.
 *
 * @private function of <ImageGeneratorTestClient/>
 */
export function ImageGeneratorTestResults({ mode, results }: ImageGeneratorTestResultsProps) {
    if (results.length === 0) {
        return null;
    }

    return (
        <div className={resolveResultsLayoutClassName(mode)}>
            {results.map((result, resultIndex) => (
                <ImageGeneratorTestResultCard key={result.id || resultIndex} result={result} resultIndex={resultIndex} />
            ))}
        </div>
    );
}
