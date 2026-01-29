import { spaceTrim } from 'spacetrim';

/**
 * @@@
 *
 * @private utility for commitments
 */
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
                    .split(/\r?\n/)
                    .map((line) => `- ${line}`)
                    .join('\n'),
            )}
    `,
    );
}
