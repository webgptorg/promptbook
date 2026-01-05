import type { FileImportPlugin } from './FileImportPlugin';

/**
 * Plugin for importing JSON files
 * 
 * @private [🥝] Maybe export the import plugins through some package
 */
export const JsonFileImportPlugin: FileImportPlugin = {
    name: 'json-file-import-plugin',
    canImport(mimeType) {
        return mimeType === 'application/json' || mimeType.endsWith('+json');
    },
    import(content) {
        try {
            const json = JSON.parse(content);
            const formattedJson = JSON.stringify(json, null, 4);
            return `\`\`\`json\n${formattedJson}\n\`\`\``;
        } catch (error) {
            // If JSON is invalid, still import it but maybe not as pretty JSON
            return `\`\`\`json\n${content}\n\`\`\``;
        }
    },
};
