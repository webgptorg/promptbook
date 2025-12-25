'use client';

import { useState } from 'react';
import spaceTrim from 'spacetrim';
import { Card } from '../../../components/Homepage/Card';

export function ImageGeneratorTestClient() {
    const [prompt, setPrompt] = useState<string>(
        spaceTrim(`
            Coffee cup floating in space
            
            - Detailed painting
            - Vibrant colors
            - Surreal style
            - In Vincent van Gogh style
            - High resolution
        `),
    );
    const [modelName, setModelName] = useState<string>('dall-e-3');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [rawResult, setRawResult] = useState<unknown | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedFilename, setGeneratedFilename] = useState<string | null>(null);

    const handleGenerateImage = () => {
        if (!prompt) return;

        setIsLoading(true);
        setError(null);
        setImageUrl(null);
        setRawResult(null);
        setGeneratedFilename(null);

        try {
            // detailed-painting-of-a-cute-cat.png
            const filename =
                prompt
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '') + '.png';

            setGeneratedFilename(filename);

            const queryParams = new URLSearchParams();
            if (modelName) queryParams.set('modelName', modelName);
            queryParams.set('raw', 'true');

            fetch(`/api/images/${filename}?${queryParams.toString()}`)
                .then(async (response) => {
                    const contentType = response.headers.get('content-type');

                    if (!response.ok) {
                        const text = await response.text();
                        let errorMessage;
                        try {
                            const json = JSON.parse(text);
                            errorMessage = json.error || response.statusText;
                        } catch {
                            errorMessage = text || response.statusText;
                        }
                        throw new Error(`Error: ${response.status} ${errorMessage}`);
                    }

                    if (contentType && contentType.includes('application/json')) {
                        const data = await response.json();
                        setRawResult(data);
                        if (data.cdnUrl) {
                            setImageUrl(data.cdnUrl);
                        }
                    } else {
                        // Fallback if it returns blob/image directly (shouldn't with raw=true)
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        setImageUrl(url);
                    }
                })
                .catch((err) => {
                    setError(String(err));
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } catch (err) {
            setError(String(err));
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            <div className="mt-20 mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl text-gray-900 font-light">Image Generator Test</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Test the image generation capabilities by providing a prompt.
                    </p>
                </div>
            </div>

            <Card>
                <div className="mb-4 space-y-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Image Prompt</label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., A futuristic city with flying cars"
                            className="w-full h-48 p-2 border border-gray-300 rounded"
                            disabled={isLoading}
                            // onKeyDown={(e) => {
                            //     if (e.key === 'Enter') {
                            //         handleGenerateImage();
                            //     }
                            // }}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Model Name</label>
                        <input
                            type="text"
                            value={modelName}
                            onChange={(e) => setModelName(e.target.value)}
                            placeholder="e.g., dall-e-3"
                            className="w-full p-2 border border-gray-300 rounded"
                            disabled={isLoading}
                        />
                        <p className="text-xs text-gray-500">
                            Available models depend on the configured LLM provider. Common options: dall-e-3, dall-e-2,
                            midjourney
                        </p>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleGenerateImage}
                            disabled={isLoading || !prompt}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                        >
                            {isLoading ? 'Generating...' : 'Generate Image'}
                        </button>
                    </div>

                    {generatedFilename && (
                        <p className="text-xs text-gray-500">
                            Generated filename: <code className="bg-gray-100 px-1 rounded">{generatedFilename}</code>
                        </p>
                    )}
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                {imageUrl && (
                    <div className="mb-6 border rounded shadow-lg overflow-hidden bg-gray-50 flex justify-center items-center min-h-[200px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt={prompt} className="max-w-full h-auto" />
                    </div>
                )}

                {rawResult !== null && (
                    <div className="border rounded-md overflow-hidden">
                        <div className="bg-gray-100 px-4 py-2 border-b">
                            <h3 className="text-sm font-semibold text-gray-700">Raw Result</h3>
                        </div>
                        <pre className="p-4 bg-gray-50 text-xs overflow-auto max-h-[500px]">
                            {JSON.stringify(rawResult, null, 2)}
                        </pre>
                    </div>
                )}
            </Card>
        </div>
    );
}
