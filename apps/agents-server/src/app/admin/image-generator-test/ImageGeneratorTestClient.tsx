'use client';

import { upload } from '@vercel/blob/client';
import { useCallback, useRef, useState } from 'react';
import spaceTrim from 'spacetrim';
import { constructImageFilename } from '../../../utils/normalization/constructImageFilename';
import { getSafeCdnPath } from '../../../utils/cdn/utils/getSafeCdnPath';
import { Card } from '../../../components/Homepage/Card';

// Using local SVG components because they might not be exported from @promptbook-local/components
function CameraIcon({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M12 17C14.2091 17 16 15.2091 16 13C16 10.7909 14.2091 9 12 9C9.79086 9 8 10.7909 8 13C8 15.2091 9.79086 17 12 17Z"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function CloseIcon({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M18 6L6 18M6 6L18 18"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

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
    attachments: Array<{
        id: string;
        name: string;
        type: string;
        url: string;
    }>;
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
            attachments: [],
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
        setPrompts([...prompts, { id: Math.random().toString(36).substring(7), value: '', attachments: [] }]);
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
        attachments: PromptInput['attachments'] = [],
    ): Promise<GeneratedImage> => {
        const id = Math.random().toString(36).substring(7);

        // Match the filename generation logic
        const filename = constructImageFilename({ prompt, model, size, quality, style, attachments });

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
        if (attachments.length > 0) {
            queryParams.set('attachments', JSON.stringify(attachments));
        }
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

            const result = await generateSingleImage(
                p.value,
                modelName,
                modelSize,
                modelQuality,
                modelStyle,
                p.attachments,
            );

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
                                list="model-names"
                                type="text"
                                value={modelName}
                                onChange={(e) => setModelName(e.target.value)}
                                placeholder="e.g., dall-e-3"
                                className="w-full p-2 border border-gray-300 rounded"
                                disabled={isGenerating}
                            />
                            <datalist id="model-names">
                                <option value="dall-e-3" />
                                <option value="dall-e-2" />
                                <option value="gemini-2.5-flash-image" />
                                <option value="gemini-3-pro-image-preview" />
                                {/* <- TODO: [🎞] This should be dynamically populated based on available models */}
                            </datalist>
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
                            <div className="space-y-2">
                                <textarea
                                    value={prompts[0].value}
                                    onChange={(e) => handlePromptChange(prompts[0].id, e.target.value)}
                                    placeholder="e.g., A futuristic city with flying cars"
                                    className="w-full h-48 p-2 border border-gray-300 rounded"
                                    disabled={isGenerating}
                                />
                                <ImageAttachmentsEditor
                                    attachments={prompts[0].attachments}
                                    onChange={(attachments) =>
                                        setPrompts((prev) => prev.map((p, i) => (i === 0 ? { ...p, attachments } : p)))
                                    }
                                    disabled={isGenerating}
                                />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {prompts.map((prompt, index) => (
                                    <div key={prompt.id} className="flex gap-2 items-start border-b pb-4 last:border-0">
                                        <div className="flex-grow space-y-2">
                                            <textarea
                                                value={prompt.value}
                                                onChange={(e) => handlePromptChange(prompt.id, e.target.value)}
                                                placeholder={`Prompt ${index + 1}`}
                                                className="w-full h-24 p-2 border border-gray-300 rounded text-sm"
                                                disabled={isGenerating}
                                            />
                                            <ImageAttachmentsEditor
                                                attachments={prompt.attachments}
                                                onChange={(attachments) =>
                                                    setPrompts((prev) =>
                                                        prev.map((p) =>
                                                            p.id === prompt.id ? { ...p, attachments } : p,
                                                        ),
                                                    )
                                                }
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
                            <div
                                key={result.id || index}
                                className="border rounded-lg overflow-hidden bg-white shadow-sm"
                            >
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

type ImageAttachmentsEditorProps = {
    attachments: PromptInput['attachments'];
    onChange: (attachments: PromptInput['attachments']) => void;
    disabled?: boolean;
};

function ImageAttachmentsEditor({ attachments, onChange, disabled }: ImageAttachmentsEditorProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files;
            if (!files || files.length === 0) return;

            setIsUploading(true);
            try {
                const newAttachments = [...attachments];
                for (const file of Array.from(files)) {
                    const uploadPath = getSafeCdnPath({ pathname: file.name });
                    const blob = await upload(uploadPath, file, {
                        access: 'public',
                        handleUploadUrl: '/api/upload',
                    });
                    newAttachments.push({
                        id: Math.random().toString(36).substring(7),
                        name: file.name,
                        type: file.type,
                        url: blob.url,
                    });
                }
                onChange(newAttachments);
            } catch (error) {
                console.error('Upload failed:', error);
                alert('Failed to upload image');
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        },
        [attachments, onChange],
    );

    const removeAttachment = (id: string) => {
        onChange(attachments.filter((a) => a.id !== id));
    };

    return (
        <div className="space-y-2">
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {attachments.map((attachment) => (
                        <div key={attachment.id} className="relative group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={attachment.url}
                                alt={attachment.name}
                                className="h-16 w-16 object-cover rounded border border-gray-200"
                            />
                            {!disabled && (
                                <button
                                    onClick={() => removeAttachment(attachment.id)}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    title="Remove image"
                                    type="button"
                                >
                                    <CloseIcon size={12} color="white" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <div className="flex items-center gap-2">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={disabled || isUploading}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isUploading}
                    className="text-xs flex items-center gap-1 px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                    type="button"
                >
                    <CameraIcon size={14} />
                    {isUploading ? 'Uploading...' : 'Add Image'}
                </button>
            </div>
        </div>
    );
}
