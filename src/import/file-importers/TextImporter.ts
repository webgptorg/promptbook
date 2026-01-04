import { mimeTypeToExtension } from '../../utils/files/mimeTypeToExtension';
import type { FileImporter } from '../FileImporter';

/**
 * Generic text file importer
 * 
 * This importer handles any text file and wraps it into a code block.
 */
export const TextImporter: FileImporter = {
    name: 'TextImporter',

    canImport(url: string, mimeType?: string): boolean {
        // Handle explicit text MIME types
        if (mimeType && (mimeType.startsWith('text/') || mimeType === 'application/javascript' || mimeType === 'application/typescript' || mimeType === 'application/x-httpd-php')) {
            return true;
        }

        // Handle common text extensions if MIME type is unknown
        const textExtensions = ['.txt', '.md', '.ts', '.js', '.py', '.rb', '.php', '.html', '.css', '.scss', '.sql', '.csv'];
        if (textExtensions.some((ext) => url.toLowerCase().endsWith(ext))) {
            return true;
        }

        return false;
    },

    async import(content: string, url: string, mimeType: string): Promise<string> {
        // Determine the code block type from the MIME type
        let blockType = mimeTypeToExtension(mimeType) || 'txt';
        
        // Strip the dot from extension if present
        if (blockType.startsWith('.')) {
            blockType = blockType.substring(1);
        }

        // Wrap the content into a code block
        return `\`\`\`${blockType}\n${content.trim()}\n\`\`\``;
    },
};
