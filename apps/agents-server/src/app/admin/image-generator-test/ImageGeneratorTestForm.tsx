import { ImageAttachmentsEditor } from './ImageAttachmentsEditor';
import type { UseImageGeneratorTestState } from './useImageGeneratorTestState';

/**
 * Shared prop shape for the private image generator form modules.
 */
type ImageGeneratorTestStateProps = {
    imageGeneratorTestState: UseImageGeneratorTestState;
};

/**
 * Props for the private select options rendered by the form.
 */
type ImageGeneratorSelectOption = {
    value: string;
    label: string;
};

/**
 * Model suggestions shown in the datalist.
 */
const IMAGE_GENERATOR_MODEL_NAME_OPTIONS = [
    'dall-e-3',
    'dall-e-2',
    'gemini-2.5-flash-image',
    'gemini-3-pro-image-preview',
];

/**
 * Size options shown in the model configuration.
 */
const IMAGE_GENERATOR_SIZE_OPTIONS: ImageGeneratorSelectOption[] = [
    { value: '1024x1024', label: 'Square (1024x1024)' },
    { value: '1792x1024', label: 'Wide (1792x1024)' },
    { value: '1024x1792', label: 'Tall (1024x1792)' },
];

/**
 * Quality options shown in the model configuration.
 */
const IMAGE_GENERATOR_QUALITY_OPTIONS: ImageGeneratorSelectOption[] = [
    { value: 'standard', label: 'Standard' },
    { value: 'hd', label: 'HD' },
];

/**
 * Style options shown in the model configuration.
 */
const IMAGE_GENERATOR_STYLE_OPTIONS: ImageGeneratorSelectOption[] = [
    { value: 'vivid', label: 'Vivid' },
    { value: 'natural', label: 'Natural' },
];

/**
 * Resolves the label shown above the prompt editor.
 */
function resolvePromptLabel(mode: UseImageGeneratorTestState['mode']): string {
    return mode === 'single' ? 'Image Prompt' : 'Image Prompts';
}

/**
 * Resolves the main form submit label for the current state.
 */
function resolveGenerateButtonLabel(
    mode: UseImageGeneratorTestState['mode'],
    isGenerating: boolean,
): string {
    if (isGenerating) {
        return 'Generating...';
    }

    return `Generate ${mode === 'multiple' ? 'Images' : 'Image'}`;
}

/**
 * Handles the model configuration controls.
 */
function ImageGeneratorModelSettings({ imageGeneratorTestState }: ImageGeneratorTestStateProps) {
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2 col-span-1 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Model Name</label>
                    <input
                        list="model-names"
                        type="text"
                        value={imageGeneratorTestState.modelName}
                        onChange={(event) => imageGeneratorTestState.handleModelNameChange(event.target.value)}
                        placeholder="e.g., dall-e-3"
                        className="w-full p-2 border border-gray-300 rounded"
                        disabled={imageGeneratorTestState.isGenerating}
                    />
                    <datalist id="model-names">
                        {IMAGE_GENERATOR_MODEL_NAME_OPTIONS.map((modelName) => (
                            <option key={modelName} value={modelName} />
                        ))}
                        {/* <- TODO: [🎞] This should be dynamically populated based on available models */}
                    </datalist>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Size</label>
                    <select
                        value={imageGeneratorTestState.modelSize}
                        onChange={(event) => imageGeneratorTestState.handleModelSizeChange(event.target.value)}
                        className="w-full p-2 border border-gray-300 rounded bg-white"
                        disabled={imageGeneratorTestState.isGenerating}
                    >
                        {IMAGE_GENERATOR_SIZE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Quality</label>
                    <select
                        value={imageGeneratorTestState.modelQuality}
                        onChange={(event) => imageGeneratorTestState.handleModelQualityChange(event.target.value)}
                        className="w-full p-2 border border-gray-300 rounded bg-white"
                        disabled={imageGeneratorTestState.isGenerating}
                    >
                        {IMAGE_GENERATOR_QUALITY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Style</label>
                    <select
                        value={imageGeneratorTestState.modelStyle}
                        onChange={(event) => imageGeneratorTestState.handleModelStyleChange(event.target.value)}
                        className="w-full p-2 border border-gray-300 rounded bg-white"
                        disabled={imageGeneratorTestState.isGenerating}
                    >
                        {IMAGE_GENERATOR_STYLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <p className="text-xs text-gray-500">
                Available models depend on the configured LLM provider. Common options: dall-e-3, dall-e-2,
                midjourney. Requirements like size, quality and style might not be supported by all models.
            </p>
        </>
    );
}

/**
 * Handles the single-prompt editing flow.
 */
function SingleImagePromptEditor({ imageGeneratorTestState }: ImageGeneratorTestStateProps) {
    return (
        <div className="space-y-2">
            <textarea
                value={imageGeneratorTestState.primaryPrompt.value}
                onChange={(event) =>
                    imageGeneratorTestState.handlePromptChange(
                        imageGeneratorTestState.primaryPrompt.id,
                        event.target.value,
                    )
                }
                placeholder="e.g., A futuristic city with flying cars"
                className="w-full h-48 p-2 border border-gray-300 rounded"
                disabled={imageGeneratorTestState.isGenerating}
            />
            <ImageAttachmentsEditor
                attachments={imageGeneratorTestState.primaryPrompt.attachments}
                onChange={(attachments) =>
                    imageGeneratorTestState.handlePromptAttachmentsChange(
                        imageGeneratorTestState.primaryPrompt.id,
                        attachments,
                    )
                }
                disabled={imageGeneratorTestState.isGenerating}
            />
        </div>
    );
}

/**
 * Handles the multiple-prompt editing flow.
 */
function MultipleImagePromptEditor({ imageGeneratorTestState }: ImageGeneratorTestStateProps) {
    return (
        <div className="space-y-3">
            {imageGeneratorTestState.prompts.map((prompt, index) => (
                <div key={prompt.id} className="flex gap-2 items-start border-b pb-4 last:border-0">
                    <div className="flex-grow space-y-2">
                        <textarea
                            value={prompt.value}
                            onChange={(event) =>
                                imageGeneratorTestState.handlePromptChange(prompt.id, event.target.value)
                            }
                            placeholder={`Prompt ${index + 1}`}
                            className="w-full h-24 p-2 border border-gray-300 rounded text-sm"
                            disabled={imageGeneratorTestState.isGenerating}
                        />
                        <ImageAttachmentsEditor
                            attachments={prompt.attachments}
                            onChange={(attachments) =>
                                imageGeneratorTestState.handlePromptAttachmentsChange(prompt.id, attachments)
                            }
                            disabled={imageGeneratorTestState.isGenerating}
                        />
                    </div>
                    {imageGeneratorTestState.prompts.length > 1 && (
                        <button
                            onClick={() => imageGeneratorTestState.handleRemovePrompt(prompt.id)}
                            className="mt-1 p-2 text-red-500 hover:bg-red-50 rounded"
                            disabled={imageGeneratorTestState.isGenerating}
                            title="Remove prompt"
                            type="button"
                        >
                            ✕
                        </button>
                    )}
                </div>
            ))}
            <button
                onClick={imageGeneratorTestState.handleAddPrompt}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                disabled={imageGeneratorTestState.isGenerating}
                type="button"
            >
                + Add another prompt
            </button>
        </div>
    );
}

/**
 * Handles the mode-specific prompt editor branch.
 */
function ImageGeneratorPromptInputs({ imageGeneratorTestState }: ImageGeneratorTestStateProps) {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
                {resolvePromptLabel(imageGeneratorTestState.mode)}
            </label>

            {imageGeneratorTestState.mode === 'single' ? (
                <SingleImagePromptEditor imageGeneratorTestState={imageGeneratorTestState} />
            ) : (
                <MultipleImagePromptEditor imageGeneratorTestState={imageGeneratorTestState} />
            )}
        </div>
    );
}

/**
 * Handles the generation progress and submit button row.
 */
function ImageGeneratorFormActions({ imageGeneratorTestState }: ImageGeneratorTestStateProps) {
    return (
        <div className="flex justify-between items-center">
            <div>
                {imageGeneratorTestState.isGenerating && imageGeneratorTestState.mode === 'multiple' && (
                    <span className="text-sm text-gray-600">
                        Generating {imageGeneratorTestState.progress.current} of {imageGeneratorTestState.progress.total}
                        ...
                    </span>
                )}
            </div>
            <button
                onClick={() => void imageGeneratorTestState.handleGenerate()}
                disabled={imageGeneratorTestState.isGenerating || !imageGeneratorTestState.hasPromptToGenerate}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                type="button"
            >
                {resolveGenerateButtonLabel(imageGeneratorTestState.mode, imageGeneratorTestState.isGenerating)}
            </button>
        </div>
    );
}

/**
 * Handles the image generator test form.
 *
 * @private function of <ImageGeneratorTestClient/>
 */
export function ImageGeneratorTestForm({ imageGeneratorTestState }: ImageGeneratorTestStateProps) {
    return (
        <div className="mb-4 space-y-4">
            <ImageGeneratorModelSettings imageGeneratorTestState={imageGeneratorTestState} />
            <ImageGeneratorPromptInputs imageGeneratorTestState={imageGeneratorTestState} />
            <ImageGeneratorFormActions imageGeneratorTestState={imageGeneratorTestState} />
        </div>
    );
}
