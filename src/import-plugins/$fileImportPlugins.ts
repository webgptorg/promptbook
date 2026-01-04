import { AgentFileImportPlugin } from './AgentFileImportPlugin';
import type { FileImportPlugin } from './FileImportPlugin';
import { JsonFileImportPlugin } from './JsonFileImportPlugin';
import { TextFileImportPlugin } from './TextFileImportPlugin';

/**
 * All available file import plugins
 */
export const $fileImportPlugins: ReadonlyArray<FileImportPlugin> = [
    AgentFileImportPlugin,
    JsonFileImportPlugin,
    TextFileImportPlugin,
];
