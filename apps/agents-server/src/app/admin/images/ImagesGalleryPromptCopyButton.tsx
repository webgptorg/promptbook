import { Check, Copy } from 'lucide-react';
import type { UseImagesGalleryState } from './useImagesGalleryState';

/**
 * Props for ImagesGalleryPromptCopyButton.
 */
type ImagesGalleryPromptCopyButtonProps = Pick<UseImagesGalleryState, 'copiedId' | 'handlePromptCopy'> & {
    /**
     * Prompt text to copy into the clipboard.
     */
    readonly prompt: string;

    /**
     * Identifier used to show the copied state.
     */
    readonly imageId: number;

    /**
     * Additional classes for the button wrapper.
     */
    readonly className: string;
};

/**
 * Renders the shared prompt-copy button used by the images gallery views.
 *
 * @private function of <ImagesGalleryClient/>
 */
export function ImagesGalleryPromptCopyButton({
    prompt,
    imageId,
    copiedId,
    handlePromptCopy,
    className,
}: ImagesGalleryPromptCopyButtonProps) {
    return (
        <button
            type="button"
            onClick={() => void handlePromptCopy(prompt, imageId)}
            className={className}
            title="Copy prompt"
        >
            {copiedId === imageId ? (
                <Check className="w-3 h-3 text-green-600" />
            ) : (
                <Copy className="w-3 h-3 text-gray-400" />
            )}
        </button>
    );
}
