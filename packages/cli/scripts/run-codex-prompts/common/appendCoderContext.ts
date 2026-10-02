import { spaceTrim } from 'spacetrim';
import { increaseHeadings } from '../../../book/scripts/import-markdown/increaseHeadings';

/**
 * Appends optional coding context to a runner prompt.
 */
export function appendCoderContext(prompt: string, context: string | undefined): string {
    const normalizedContext = context?.trim();
    if (!normalizedContext) {
        return prompt;
    }

    const normalizedPrompt = prompt.trimEnd();
    if (normalizedPrompt === '') {
        return normalizedContext;
    }

    return spaceTrim(
        (block) => `
            ${block(normalizedPrompt)}

            ## Context
        
            ${block(increaseHeadings(normalizedContext))}
        `,
    );
}
