'use client';

import { useState } from 'react';
import spaceTrim from 'spacetrim';
import { Card } from '../../../components/Homepage/Card';

type GenerationStatus = 'pending' | 'loading' | 'success' | 'error';

type GeneratedImage = {
    id: string;
    prompt: string;
    status: GenerationStatus;
    imageUrl: string | null;
    rawResult: unknown | null;
    error: string | null;
    generatedFilename: string | null;
};

type PromptInput = {
    id: string;
    value: string;
};

export function ImageGeneratorTestClient() {
    const [mode, setMode] = useState<'single' | 'multiple'>('single');
    const [prompts, setPrompts] = useState<PromptInput[]>([
        {
            id: 'initial',
            value: spaceTrim(`
                Coffee cup floating in space
                
                - Detailed painting
                - Vibrant colors
                - Surreal style
                - In Vincent van Gogh style
                - High resolution
            `),
        },
    ]);
    const [modelName, setModelName] = useState<string>('dall-e-3');
    const [modelSize, setModelSize] = useState<string>('1024x1024');
    const [modelQuality, setModelQuality] = useState<'standard' | 'hd'>('standard');
    const [modelStyle, setModelStyle] = useState<'vivid' | 'natural'>('vivid');
    const [results, setResults] = useState<GeneratedImage[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    const handleAddPrompt = () => {
        setPrompts([...prompts, { id: Math.random().toString(36).substring(7), value: '' }]);
    };

    const handleRemovePrompt = (id: string) => {
        if (prompts.length <= 1) return;
        setPrompts(prompts.filter((p) => p.id !== id));
    };

    const handlePromptChange = (id: string, newValue: string) => {
        setPrompts(prompts.map((p) => (p.id === id ? { ...p, value: newValue } : p)));
    };

    const generateSingleImage = async (
        prompt: string,
        model: string,
        size: string,
        quality: string,
        style: string,
    ): Promise<GeneratedImage> => {
        const id = Math.random().toString(36).substring(7);
        const promptTrimmed = prompt.trim();

        // Match the filename generation logic
        const filename =
            promptTrimmed
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') +
            (size === '1024x1024' ? '' : `-${size}`) +
            (quality === 'standard' ? '' : `-${quality}`) +
            (style === 'vivid' ? '' : `-${style}`) +
            '.png';

        const result: GeneratedImage = {
            id,
            prompt,
            status: 'loading',
            imageUrl: null,
            rawResult: null,
            error: null,
            generatedFilename: filename,
        };

        const queryParams = new URLSearchParams();
        if (model) queryParams.set('modelName', model);
        if (size) queryParams.set('size', size);
        if (quality) queryParams.set('quality', quality);
        if (style) queryParams.set('style', style);
        queryParams.set('raw', 'true');

        try {
            const response = await fetch(`/api/images/${filename}?${queryParams.toString()}`);
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
                result.rawResult = data;
                if (data.cdnUrl) {
                    result.imageUrl = data.cdnUrl;
                }
                result.status = 'success';
            } else {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                result.imageUrl = url;
                result.status = 'success';
            }
        } catch (err) {
            result.error = String(err);
            result.status = 'error';
        }

        return result;
    };

    const handleGenerate = async () => {
        const promptsToProcess = mode === 'single' ? [prompts[0]] : prompts;

        // Validate prompts
        const validPrompts = promptsToProcess.filter((p) => p.value.trim());
        if (validPrompts.length === 0) return;

        setIsGenerating(true);
        setResults([]);
        setProgress({ current: 0, total: validPrompts.length });

        // Initialize results with pending state
        const initialResults: GeneratedImage[] = validPrompts.map((p) => ({
            id: p.id,
            prompt: p.value,
            status: 'pending',
            imageUrl: null,
            rawResult: null,
            error: null,
            generatedFilename: null,
        }));
        setResults(initialResults);

        // Process sequentially
        for (let i = 0; i < validPrompts.length; i++) {
            const p = validPrompts[i];

            // Update status to loading for this item
            setResults((prev) => prev.map((item, idx) => (idx === i ? { ...item, status: 'loading' } : item)));

            const result = await generateSingleImage(p.value, modelName, modelSize, modelQuality, modelStyle);

            // Update result for this item
            setResults((prev) => prev.map((item, idx) => (idx === i ? { ...result, id: item.id } : item)));

            setProgress({ current: i + 1, total: validPrompts.length });
        }

        setIsGenerating(false);
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

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setMode('single')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            mode === 'single' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
                        }`}
                        disabled={isGenerating}
                    >
                        Single Image
                    </button>
                    <button
                        onClick={() => setMode('multiple')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            mode === 'multiple' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
                        }`}
                        disabled={isGenerating}
                    >
                        Multiple Images
                    </button>
                </div>
            </div>

            <Card>
                <div className="mb-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2 col-span-1 md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Model Name</label>
                            <input
                                type="text"
                                value={modelName}
                                onChange={(e) => setModelName(e.target.value)}
                                placeholder="e.g., dall-e-3"
                                className="w-full p-2 border border-gray-300 rounded"
                                disabled={isGenerating}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Size</label>
                            <select
                                value={modelSize}
                                onChange={(e) => setModelSize(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded bg-white"
                                disabled={isGenerating}
                            >
                                <option value="1024x1024">Square (1024x1024)</option>
                                <option value="1792x1024">Wide (1792x1024)</option>
                                <option value="1024x1792">Tall (1024x1792)</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Quality</label>
                            <select
                                value={modelQuality}
                                onChange={(e) => setModelQuality(e.target.value as 'standard' | 'hd')}
                                className="w-full p-2 border border-gray-300 rounded bg-white"
                                disabled={isGenerating}
                            >
                                <option value="standard">Standard</option>
                                <option value="hd">HD</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Style</label>
                            <select
                                value={modelStyle}
                                onChange={(e) => setModelStyle(e.target.value as 'vivid' | 'natural')}
                                className="w-full p-2 border border-gray-300 rounded bg-white"
                                disabled={isGenerating}
                            >
                                <option value="vivid">Vivid</option>
                                <option value="natural">Natural</option>
                            </select>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">
                        Available models depend on the configured LLM provider. Common options: dall-e-3, dall-e-2,
                        midjourney. Requirements like size, quality and style might not be supported by all models.
                    </p>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            {mode === 'single' ? 'Image Prompt' : 'Image Prompts'}
                        </label>

                        {mode === 'single' ? (
                            <textarea
                                value={prompts[0].value}
                                onChange={(e) => handlePromptChange(prompts[0].id, e.target.value)}
                                placeholder="e.g., A futuristic city with flying cars"
                                className="w-full h-48 p-2 border border-gray-300 rounded"
                                disabled={isGenerating}
                            />
                        ) : (
                            <div className="space-y-3">
                                {prompts.map((prompt, index) => (
                                    <div key={prompt.id} className="flex gap-2 items-start">
                                        <div className="flex-grow">
                                            <textarea
                                                value={prompt.value}
                                                onChange={(e) => handlePromptChange(prompt.id, e.target.value)}
                                                placeholder={`Prompt ${index + 1}`}
                                                className="w-full h-24 p-2 border border-gray-300 rounded text-sm"
                                                disabled={isGenerating}
                                            />
                                        </div>
                                        {prompts.length > 1 && (
                                            <button
                                                onClick={() => handleRemovePrompt(prompt.id)}
                                                className="mt-1 p-2 text-red-500 hover:bg-red-50 rounded"
                                                disabled={isGenerating}
                                                title="Remove prompt"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    onClick={handleAddPrompt}
                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                    disabled={isGenerating}
                                >
                                    + Add another prompt
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center">
                        <div>
                            {isGenerating && mode === 'multiple' && (
                                <span className="text-sm text-gray-600">
                                    Generating {progress.current} of {progress.total}...
                                </span>
                            )}
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !prompts.some((p) => p.value.trim())}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                        >
                            {isGenerating ? 'Generating...' : `Generate ${mode === 'multiple' ? 'Images' : 'Image'}`}
                        </button>
                    </div>
                </div>

                {/* Results Display */}
                {results.length > 0 && (
                    <div className={`mt-8 ${mode === 'multiple' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}`}>
                        {results.map((result, index) => (
                            <div key={result.id || index} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                                <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                                    <span
                                        className="text-xs font-mono text-gray-500 truncate max-w-[200px]"
                                        title={result.generatedFilename || ''}
                                    >
                                        {result.generatedFilename || 'Pending...'}
                                    </span>
                                    <span
                                        className={`text-xs px-2 py-1 rounded-full ${
                                            result.status === 'success'
                                                ? 'bg-green-100 text-green-800'
                                                : result.status === 'error'
                                                  ? 'bg-red-100 text-red-800'
                                                  : 'bg-yellow-100 text-yellow-800'
                                        }`}
                                    >
                                        {result.status}
                                    </span>
                                </div>

                                <div className="min-h-[200px] flex items-center justify-center bg-gray-100 relative group">
                                    {result.status === 'loading' ? (
                                        <div className="animate-pulse flex flex-col items-center">
                                            <div className="h-8 w-8 bg-blue-400 rounded-full mb-2"></div>
                                            <span className="text-xs text-gray-500">Generating...</span>
                                        </div>
                                    ) : result.status === 'success' && result.imageUrl ? (
                                        <a
                                            href={result.imageUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-full h-full"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={result.imageUrl}
                                                alt={result.prompt}
                                                className="w-full h-auto object-cover"
                                            />
                                        </a>
                                    ) : result.status === 'error' ? (
                                        <div className="p-4 text-center text-red-500 text-sm">
                                            {result.error || 'Failed to generate'}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 text-sm">Waiting...</span>
                                    )}
                                </div>

                                <div className="p-3">
                                    <p className="text-sm text-gray-700 line-clamp-2" title={result.prompt}>
                                        {result.prompt}
                                    </p>

                                    {!!result.rawResult && (
                                        <details className="mt-2">
                                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                                Raw Details
                                            </summary>
                                            <pre className="mt-1 p-2 bg-gray-50 text-[10px] overflow-auto max-h-[100px] rounded border">
                                                {JSON.stringify(result.rawResult, null, 2)}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
