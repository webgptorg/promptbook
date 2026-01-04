import type { FileImporter } from '../FileImporter';

/**
 * JSON file importer
 * 
 * This importer handles JSON files, formats them, and wraps them into a code block.
 */
export const JsonImporter: FileImporter = {
    name: 'JsonImporter',

    canImport(url: string, mimeType?: string): boolean {
        return url.endsWith('.json') || mimeType === 'application/json';
    },

    async import(content: string): Promise<string> {
        try {
            // Parse and format the JSON content
            const json = JSON.parse(content);
            const formattedJson = JSON.stringify(json, null, 4);

            // Wrap the formatted JSON into a code block
            return `\`\`\`json\n${formattedJson}\n\`\`\``;
        } catch (error) {
            // If JSON parsing fails, fall back to plain text
            return `\`\`\`json\n${content.trim()}\n\`\`\``;
        }
    },
};
