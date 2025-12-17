'use client';

import React, { useState, useEffect } from 'react';

export default function TestBrowserPage() {
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
            }
        };
    }, [imageUrl]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTakeScreenshot = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/test-browser/screenshot');
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
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setImageUrl(url);
        } catch (err) {
            setError(String(err));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Browser Test</h1>

            <div className="mb-4">
                <p className="mb-2">Click the button below to launch a browser instance (if not running), navigate to ptbk.io, and take a screenshot.</p>
                <button
                    onClick={handleTakeScreenshot}
                    disabled={isLoading}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                >
                    {isLoading ? 'Taking Screenshot...' : 'Take Screenshot'}
                </button>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            {imageUrl && (
                <div className="border rounded shadow-lg overflow-hidden">
                    <h2 className="text-xl font-semibold p-2 bg-gray-100">Screenshot</h2>
                    <img src={imageUrl} alt="Screenshot of ptbk.io" className="w-full h-auto" />
                </div>
            )}
        </div>
    );
}
