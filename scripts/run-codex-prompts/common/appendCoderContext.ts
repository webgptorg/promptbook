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

    return `${normalizedPrompt}\n\n${normalizedContext}`;
}
