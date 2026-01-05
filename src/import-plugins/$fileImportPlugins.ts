import { AgentFileImportPlugin } from './AgentFileImportPlugin';
import type { FileImportPlugin } from './FileImportPlugin';
import { JsonFileImportPlugin } from './JsonFileImportPlugin';
import { TextFileImportPlugin } from './TextFileImportPlugin';

/**
 * All available file import plugins
 * 
 * @private [🥝] Maybe export the import plugins through some package
 */
export const $fileImportPlugins: ReadonlyArray<FileImportPlugin> = [
    AgentFileImportPlugin,
    JsonFileImportPlugin,
    TextFileImportPlugin,
];
