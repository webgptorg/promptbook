import type { string_mime_type } from '../types/typeAliases';

/**
 * Type for file import plugins
 *
 * Each plugin handles a specific set of MIME types or file extensions.
 */
export type FileImportPlugin = {
    /**
     * Unique name of the plugin
     */
    readonly name: string;

    /**
     * Checks if the plugin can handle the given MIME type or file extension
     */
    canImport(mimeType: string_mime_type): boolean;

    /**
     * Processes the file content and returns the string to be placed in the agent book
     *
     * @param content - The raw content of the file
     * @param mimeType - The MIME type of the file
     * @returns The processed content (e.g. wrapped in code block)
     */
    import(content: string, mimeType: string_mime_type): string | Promise<string>;
}
