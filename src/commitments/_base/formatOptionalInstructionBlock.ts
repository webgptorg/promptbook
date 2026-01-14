import { spaceTrim } from 'spacetrim';

export function formatOptionalInstructionBlock(label: string, content: string): string {
    const trimmedContent = spaceTrim(content);
    if (!trimmedContent) {
        return '';
    }

    return spaceTrim(
        (block) => `
        - ${label}:
            ${block(
                trimmedContent
                    .split('\n')
                    .map((line) => `- ${line}`)
                    .join('\n'),
            )}
    `,
    );
}
