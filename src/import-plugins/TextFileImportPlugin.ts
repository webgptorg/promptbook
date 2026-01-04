import { mimeTypeToExtension } from '../utils/files/mimeTypeToExtension';
import type { FileImportPlugin } from './FileImportPlugin';

/**
 * Plugin for importing generic text files
 */
export const TextFileImportPlugin: FileImportPlugin = {
    name: 'text-file-import-plugin',
    canImport(mimeType) {
        return (
            mimeType === 'text/plain' ||
            mimeType === 'text/markdown' ||
            mimeType === 'text/x-typescript' ||
            mimeType === 'text/javascript' ||
            mimeType === 'text/css' ||
            mimeType === 'text/html' ||
            mimeType.startsWith('text/')
        );
    },
    import(content, mimeType) {
        const extension = mimeTypeToExtension(mimeType);
        const codeBlockType = extension || 'txt';

        return `\`\`\`${codeBlockType}\n${content}\n\`\`\``;
    },
};
