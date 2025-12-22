'use client';

import { useState } from 'react';
import { Card } from '../../../components/Homepage/Card';

export function ImageGeneratorTestClient() {
    const [prompt, setPrompt] = useState<string>('');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedFilename, setGeneratedFilename] = useState<string | null>(null);

    const handleGenerateImage = () => {
        if (!prompt) return;

        setIsLoading(true);
        setError(null);
        setImageUrl(null);
        setGeneratedFilename(null);

        try {
            // detailed-painting-of-a-cute-cat.png
            const filename = prompt
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') + '.png';
            
            setGeneratedFilename(filename);

            // The image generation endpoint redirects to the image URL, so we can just set it as the src
            // However, to handle errors better, we might want to fetch it first or use an img tag with error handling.
            // But since it's a GET request that redirects, we can just use the URL.
            // If the generation fails, the endpoint returns a JSON error or throws.
            // Standard img tag won't show the JSON error.
            
            // Let's try fetching it first to check for success/error
            fetch(`/api/images/${filename}`)
                .then(async (response) => {
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
                    // If successful, it returns the image (or redirect followed).
                    // We can use the URL directly now that we know it works, or use the blob.
                    // Using blob allows us to show it even if it's not a public URL (though here it redirects to CDN).
                    // But wait, the API redirects to CDN. If we fetch, we follow redirect and get the image data.
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    setImageUrl(url);
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
                <div className="mb-4 space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Image Prompt</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., A futuristic city with flying cars"
                            className="flex-1 p-2 border border-gray-300 rounded"
                            disabled={isLoading}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleGenerateImage();
                                }
                            }}
                        />
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
                    <div className="border rounded shadow-lg overflow-hidden bg-gray-50 flex justify-center items-center min-h-[200px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt={prompt} className="max-w-full h-auto" />
                    </div>
                )}
            </Card>
        </div>
    );
}
