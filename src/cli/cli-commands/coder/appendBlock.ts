/**
 * Appends one text block to existing file content while preserving readable newlines.
 *
 * @private function of `initializeCoderProjectConfiguration`
 */
export function appendBlock(currentContent: string, blockToAppend: string): string {
    if (currentContent.trim() === '') {
        return `${blockToAppend}\n`;
    }

    const normalizedCurrentContent = currentContent.endsWith('\n') ? currentContent : `${currentContent}\n`;
    return `${normalizedCurrentContent}\n${blockToAppend}\n`;
}

// Note: [🟡] Code for coder init text appending [appendBlock](src/cli/cli-commands/coder/appendBlock.ts) should never be published outside of `@promptbook/cli`
