import type { string_file_relative_path } from '../types/typeAliases';

/**
 * @@@
 */
export type FilesystemTools = {
    /**
     * Path to the folder with the pipeline
     */
    getFile(filePath: string_file_relative_path): Promise<string>;
};
