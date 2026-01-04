import type { AgentModelRequirements } from '../book-2.0/agent-source/AgentModelRequirements';

/**
 * Type for file importer plugins
 * 
 * Each plugin handles a specific type of file or URL.
 */
export type FileImporter = {
    /**
     * Unique name of the importer
     */
    readonly name: string;

    /**
     * Determines if this importer can handle the given file/URL
     * 
     * @param url - The URL or local path to the file
     * @param mimeType - The MIME type of the file (if known)
     */
    canImport(url: string, mimeType?: string): boolean;

    /**
     * Imports the content of the file
     * 
     * @param content - The raw content of the file
     * @param url - The URL or local path to the file
     * @param mimeType - The MIME type of the file
     * @param requirements - Current agent model requirements (to modify if needed)
     * @returns The modified requirements or a string of content to be added to system message
     */
    import(
        content: string,
        url: string,
        mimeType: string,
        requirements: AgentModelRequirements,
    ): Promise<AgentModelRequirements | string>;
};
