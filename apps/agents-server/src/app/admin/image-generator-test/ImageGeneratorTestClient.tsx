'use client';

import { Card } from '../../../components/Homepage/Card';
import { ImageGeneratorTestForm } from './ImageGeneratorTestForm';
import { ImageGeneratorTestResults } from './ImageGeneratorTestResults';
import { useImageGeneratorTestState, type UseImageGeneratorTestState } from './useImageGeneratorTestState';

/**
 * Props for the private mode toggle in the image generator test header.
 */
type ImageGeneratorTestModeToggleProps = Pick<
    UseImageGeneratorTestState,
    'mode' | 'isGenerating' | 'handleModeChange'
>;

/**
 * Resolves the classes for one mode toggle button.
 */
function resolveModeToggleButtonClassName(isActive: boolean): string {
    return `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'
    }`;
}

/**
 * Handles the image generation mode toggle.
 */
function ImageGeneratorTestModeToggle({
    mode,
    isGenerating,
    handleModeChange,
}: ImageGeneratorTestModeToggleProps) {
    return (
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
                onClick={() => handleModeChange('single')}
                className={resolveModeToggleButtonClassName(mode === 'single')}
                disabled={isGenerating}
                type="button"
            >
                Single Image
            </button>
            <button
                onClick={() => handleModeChange('multiple')}
                className={resolveModeToggleButtonClassName(mode === 'multiple')}
                disabled={isGenerating}
                type="button"
            >
                Multiple Images
            </button>
        </div>
    );
}

/**
 * Handles image generator test client.
 */
export function ImageGeneratorTestClient() {
    const imageGeneratorTestState = useImageGeneratorTestState();

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            <div className="mt-20 mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl text-gray-900 font-light">Image Generator Test</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Test the image generation capabilities by providing a prompt.
                    </p>
                </div>

                <ImageGeneratorTestModeToggle
                    mode={imageGeneratorTestState.mode}
                    isGenerating={imageGeneratorTestState.isGenerating}
                    handleModeChange={imageGeneratorTestState.handleModeChange}
                />
            </div>

            <Card>
                <ImageGeneratorTestForm imageGeneratorTestState={imageGeneratorTestState} />
                <ImageGeneratorTestResults
                    mode={imageGeneratorTestState.mode}
                    results={imageGeneratorTestState.results}
                />
            </Card>
        </div>
    );
}
