import { useCallback, useState } from 'react';
import { spaceTrim } from 'spacetrim';
import { constructImageFilename } from '../../../../../../src/utils/normalization/constructImageFilename';

/**
 * Initial prompt shown in the image generator admin test.
 */
const INITIAL_IMAGE_PROMPT = spaceTrim(`
    Coffee cup floating in space
    
    - Detailed painting
    - Vibrant colors
    - Surreal style
    - In Vincent van Gogh style
    - High resolution
`);

/**
 * Default model name used by the image generator admin test.
 */
const DEFAULT_MODEL_NAME = 'dall-e-3';

/**
 * Default model size used by the image generator admin test.
 */
const DEFAULT_MODEL_SIZE = '1024x1024';

/**
 * Default model quality used by the image generator admin test.
 */
const DEFAULT_MODEL_QUALITY = 'standard';

/**
 * Default model style used by the image generator admin test.
 */
const DEFAULT_MODEL_STYLE = 'vivid';

/**
 * Available image generator test modes.
 */
type ImageGeneratorMode = 'single' | 'multiple';

/**
 * Supported generation statuses in the admin preview.
 */
type GenerationStatus = 'pending' | 'loading' | 'success' | 'error';

/**
 * Supported model quality options in the admin preview.
 */
type ImageGeneratorModelQuality = 'standard' | 'hd';

/**
 * Supported model style options in the admin preview.
 */
type ImageGeneratorModelStyle = 'vivid' | 'natural';

/**
 * Image attachment uploaded for one prompt.
 */
type ImageGeneratorPromptAttachment = {
    id: string;
    name: string;
    type: string;
    url: string;
};

/**
 * Prompt input managed by the admin test form.
 */
type ImageGeneratorPromptInput = {
    id: string;
    value: string;
    attachments: ImageGeneratorPromptAttachment[];
};

/**
 * Generated image item rendered in the results area.
 */
type GeneratedImage = {
    id: string;
    prompt: string;
    status: GenerationStatus;
    imageUrl: string | null;
    rawResult: unknown | null;
    error: string | null;
    generatedFilename: string | null;
};

/**
 * Progress information for sequential generation.
 */
type ImageGeneratorProgress = {
    current: number;
    total: number;
};

/**
 * Request payload used when generating one image.
 */
type ImageGenerationRequest = {
    prompt: string;
    modelName: string;
    modelSize: string;
    modelQuality: ImageGeneratorModelQuality;
    modelStyle: ImageGeneratorModelStyle;
    attachments: ImageGeneratorPromptAttachment[];
};

/**
 * State contract shared by the private image generator test modules.
 *
 * @private internal type of <ImageGeneratorTestClient/>
 */
export type UseImageGeneratorTestState = {
    mode: ImageGeneratorMode;
    prompts: ImageGeneratorPromptInput[];
    primaryPrompt: ImageGeneratorPromptInput;
    modelName: string;
    modelSize: string;
    modelQuality: ImageGeneratorModelQuality;
    modelStyle: ImageGeneratorModelStyle;
    results: GeneratedImage[];
    isGenerating: boolean;
    progress: ImageGeneratorProgress;
    hasPromptToGenerate: boolean;
    handleModeChange: (nextMode: ImageGeneratorMode) => void;
    handleAddPrompt: () => void;
    handleRemovePrompt: (promptId: string) => void;
    handlePromptChange: (promptId: string, newValue: string) => void;
    handlePromptAttachmentsChange: (
        promptId: string,
        attachments: ImageGeneratorPromptAttachment[],
    ) => void;
    handleModelNameChange: (nextModelName: string) => void;
    handleModelSizeChange: (nextModelSize: string) => void;
    handleModelQualityChange: (nextModelQuality: string) => void;
    handleModelStyleChange: (nextModelStyle: string) => void;
    handleGenerate: () => Promise<void>;
};

/**
 * Creates a short random identifier for client-side state items.
 */
function createRandomIdentifier(): string {
    return Math.random().toString(36).substring(7);
}

/**
 * Creates the initial prompt input shown on first render.
 */
function createInitialPromptInput(): ImageGeneratorPromptInput {
    return {
        id: 'initial',
        value: INITIAL_IMAGE_PROMPT,
        attachments: [],
    };
}

/**
 * Creates an empty prompt input for multi-prompt mode.
 */
function createEmptyPromptInput(): ImageGeneratorPromptInput {
    return {
        id: createRandomIdentifier(),
        value: '',
        attachments: [],
    };
}

/**
 * Resolves the primary prompt used by single-image mode.
 */
function resolvePrimaryPrompt(prompts: ImageGeneratorPromptInput[]): ImageGeneratorPromptInput {
    const primaryPrompt = prompts[0];

    if (!primaryPrompt) {
        throw new Error('Expected the image generator test to contain at least one prompt.');
    }

    return primaryPrompt;
}

/**
 * Updates the text value for one prompt input.
 */
function updatePromptValue(
    prompts: ImageGeneratorPromptInput[],
    promptId: string,
    nextValue: string,
): ImageGeneratorPromptInput[] {
    return prompts.map((prompt) => (prompt.id === promptId ? { ...prompt, value: nextValue } : prompt));
}

/**
 * Updates the attachments for one prompt input.
 */
function updatePromptAttachments(
    prompts: ImageGeneratorPromptInput[],
    promptId: string,
    nextAttachments: ImageGeneratorPromptAttachment[],
): ImageGeneratorPromptInput[] {
    return prompts.map((prompt) => (prompt.id === promptId ? { ...prompt, attachments: nextAttachments } : prompt));
}

/**
 * Removes one prompt input while preserving the required single prompt fallback.
 */
function removePromptInput(prompts: ImageGeneratorPromptInput[], promptId: string): ImageGeneratorPromptInput[] {
    if (prompts.length <= 1) {
        return prompts;
    }

    return prompts.filter((prompt) => prompt.id !== promptId);
}

/**
 * Resolves the prompt inputs that should be generated for the current mode.
 */
function resolvePromptInputsToGenerate(
    mode: ImageGeneratorMode,
    prompts: ImageGeneratorPromptInput[],
): ImageGeneratorPromptInput[] {
    return mode === 'single' ? prompts.slice(0, 1) : prompts;
}

/**
 * Filters out blank prompts before generation starts.
 */
function resolveValidPromptInputs(prompts: ImageGeneratorPromptInput[]): ImageGeneratorPromptInput[] {
    return prompts.filter((prompt) => prompt.value.trim());
}

/**
 * Creates the placeholder result shown before a prompt starts generating.
 */
function createPendingGeneratedImage(prompt: ImageGeneratorPromptInput): GeneratedImage {
    return {
        id: prompt.id,
        prompt: prompt.value,
        status: 'pending',
        imageUrl: null,
        rawResult: null,
        error: null,
        generatedFilename: null,
    };
}

/**
 * Marks one queued result as actively generating.
 */
function markGeneratedImageLoading(results: GeneratedImage[], resultIndex: number): GeneratedImage[] {
    return results.map((result, index) => (index === resultIndex ? { ...result, status: 'loading' } : result));
}

/**
 * Replaces one placeholder result with the final generation output.
 */
function replaceGeneratedImage(
    results: GeneratedImage[],
    resultIndex: number,
    nextResult: GeneratedImage,
): GeneratedImage[] {
    return results.map((result, index) => (index === resultIndex ? { ...nextResult, id: result.id } : result));
}

/**
 * Normalizes the quality value received from the form.
 */
function resolveModelQuality(value: string): ImageGeneratorModelQuality {
    return value === 'hd' ? 'hd' : 'standard';
}

/**
 * Normalizes the style value received from the form.
 */
function resolveModelStyle(value: string): ImageGeneratorModelStyle {
    return value === 'natural' ? 'natural' : 'vivid';
}

/**
 * Builds the image generation query string for one request.
 */
function createImageGenerationQueryParams(request: ImageGenerationRequest): URLSearchParams {
    const queryParams = new URLSearchParams();

    if (request.modelName) {
        queryParams.set('modelName', request.modelName);
    }

    if (request.modelSize) {
        queryParams.set('size', request.modelSize);
    }

    if (request.modelQuality) {
        queryParams.set('quality', request.modelQuality);
    }

    if (request.modelStyle) {
        queryParams.set('style', request.modelStyle);
    }

    if (request.attachments.length > 0) {
        queryParams.set('attachments', JSON.stringify(request.attachments));
    }

    queryParams.set('raw', 'true');

    return queryParams;
}

/**
 * Extracts a readable error message from a failed image generation response.
 */
async function resolveImageGenerationErrorMessage(response: Response): Promise<string> {
    const responseText = await response.text();

    try {
        const responseJson = JSON.parse(responseText);
        return responseJson.error || response.statusText;
    } catch {
        return responseText || response.statusText;
    }
}

/**
 * Resolves the generated CDN URL from a raw JSON image generation payload.
 */
function resolveGeneratedImageUrl(rawResult: unknown): string | null {
    if (typeof rawResult !== 'object' || rawResult === null || !('cdnUrl' in rawResult)) {
        return null;
    }

    const { cdnUrl } = rawResult;

    return typeof cdnUrl === 'string' ? cdnUrl : null;
}

/**
 * Resolves the successful image generation payload from the API response.
 */
async function resolveGeneratedImageFromResponse(
    response: Response,
    pendingResult: GeneratedImage,
): Promise<GeneratedImage> {
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
        const rawResult = await response.json();

        return {
            ...pendingResult,
            rawResult,
            imageUrl: resolveGeneratedImageUrl(rawResult),
            status: 'success',
        };
    }

    const imageBlob = await response.blob();

    return {
        ...pendingResult,
        imageUrl: URL.createObjectURL(imageBlob),
        status: 'success',
    };
}

/**
 * Generates one image and converts the API response into the local result shape.
 */
async function generateImage(request: ImageGenerationRequest): Promise<GeneratedImage> {
    const generatedFilename = constructImageFilename({
        prompt: request.prompt,
        model: request.modelName,
        size: request.modelSize,
        quality: request.modelQuality,
        style: request.modelStyle,
        attachments: request.attachments,
    });

    const pendingResult: GeneratedImage = {
        id: createRandomIdentifier(),
        prompt: request.prompt,
        status: 'loading',
        imageUrl: null,
        rawResult: null,
        error: null,
        generatedFilename,
    };

    try {
        const response = await fetch(
            `/api/images/${generatedFilename}?${createImageGenerationQueryParams(request).toString()}`,
        );

        if (!response.ok) {
            throw new Error(`Error: ${response.status} ${await resolveImageGenerationErrorMessage(response)}`);
        }

        return await resolveGeneratedImageFromResponse(response, pendingResult);
    } catch (error) {
        return {
            ...pendingResult,
            status: 'error',
            error: String(error),
        };
    }
}

/**
 * Handles image generator test state and sequential generation orchestration.
 *
 * @private function of <ImageGeneratorTestClient/>
 */
export function useImageGeneratorTestState(): UseImageGeneratorTestState {
    const [mode, setMode] = useState<ImageGeneratorMode>('single');
    const [prompts, setPrompts] = useState<ImageGeneratorPromptInput[]>([createInitialPromptInput()]);
    const [modelName, setModelName] = useState(DEFAULT_MODEL_NAME);
    const [modelSize, setModelSize] = useState(DEFAULT_MODEL_SIZE);
    const [modelQuality, setModelQuality] = useState<ImageGeneratorModelQuality>(DEFAULT_MODEL_QUALITY);
    const [modelStyle, setModelStyle] = useState<ImageGeneratorModelStyle>(DEFAULT_MODEL_STYLE);
    const [results, setResults] = useState<GeneratedImage[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState<ImageGeneratorProgress>({ current: 0, total: 0 });

    const handleModeChange = useCallback((nextMode: ImageGeneratorMode) => {
        setMode(nextMode);
    }, []);

    const handleAddPrompt = useCallback(() => {
        setPrompts((currentPrompts) => [...currentPrompts, createEmptyPromptInput()]);
    }, []);

    const handleRemovePrompt = useCallback((promptId: string) => {
        setPrompts((currentPrompts) => removePromptInput(currentPrompts, promptId));
    }, []);

    const handlePromptChange = useCallback((promptId: string, nextValue: string) => {
        setPrompts((currentPrompts) => updatePromptValue(currentPrompts, promptId, nextValue));
    }, []);

    const handlePromptAttachmentsChange = useCallback(
        (promptId: string, nextAttachments: ImageGeneratorPromptAttachment[]) => {
            setPrompts((currentPrompts) => updatePromptAttachments(currentPrompts, promptId, nextAttachments));
        },
        [],
    );

    const handleModelNameChange = useCallback((nextModelName: string) => {
        setModelName(nextModelName);
    }, []);

    const handleModelSizeChange = useCallback((nextModelSize: string) => {
        setModelSize(nextModelSize);
    }, []);

    const handleModelQualityChange = useCallback((nextModelQuality: string) => {
        setModelQuality(resolveModelQuality(nextModelQuality));
    }, []);

    const handleModelStyleChange = useCallback((nextModelStyle: string) => {
        setModelStyle(resolveModelStyle(nextModelStyle));
    }, []);

    const handleGenerate = useCallback(async () => {
        const promptsToGenerate = resolveValidPromptInputs(resolvePromptInputsToGenerate(mode, prompts));

        if (promptsToGenerate.length === 0) {
            return;
        }

        setIsGenerating(true);
        setResults([]);
        setProgress({ current: 0, total: promptsToGenerate.length });
        setResults(promptsToGenerate.map(createPendingGeneratedImage));

        for (const [resultIndex, prompt] of promptsToGenerate.entries()) {
            setResults((previousResults) => markGeneratedImageLoading(previousResults, resultIndex));

            const result = await generateImage({
                prompt: prompt.value,
                modelName,
                modelSize,
                modelQuality,
                modelStyle,
                attachments: prompt.attachments,
            });

            setResults((previousResults) => replaceGeneratedImage(previousResults, resultIndex, result));
            setProgress({ current: resultIndex + 1, total: promptsToGenerate.length });
        }

        setIsGenerating(false);
    }, [mode, prompts, modelName, modelSize, modelQuality, modelStyle]);

    return {
        mode,
        prompts,
        primaryPrompt: resolvePrimaryPrompt(prompts),
        modelName,
        modelSize,
        modelQuality,
        modelStyle,
        results,
        isGenerating,
        progress,
        hasPromptToGenerate: prompts.some((prompt) => prompt.value.trim()),
        handleModeChange,
        handleAddPrompt,
        handleRemovePrompt,
        handlePromptChange,
        handlePromptAttachmentsChange,
        handleModelNameChange,
        handleModelSizeChange,
        handleModelQualityChange,
        handleModelStyleChange,
        handleGenerate,
    };
}
