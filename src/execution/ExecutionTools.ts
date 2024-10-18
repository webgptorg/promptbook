import type { Scraper } from '../scrapers/_common/Scraper';
import type { Arrayable } from '../types/Arrayable';
import type { FilesystemTools } from './FilesystemTools';
import type { LlmExecutionTools } from './LlmExecutionTools';
import type { ScriptExecutionTools } from './ScriptExecutionTools';
import type { UserInterfaceTools } from './UserInterfaceTools';

/**
 * All the tools needed to execute pipelines.
 *
 * @see https://github.com/webgptorg/promptbook#execution-tools
 */
export type ExecutionTools = {
    /**
     * Tools for executing prompts in large language models
     *
     * Tip: Use `$provideLlmToolsFromEnv` to use all available LLM providers you configured
     *
     * @default [] - If not provided, no LLM execution will be possible - it does not make sense in most cases
     */
    readonly llm?: Arrayable<LlmExecutionTools>;

    /**
     * Tools for filesystem operations
     *
     * Tip: Use `$provideFilesystemForNode` to use filesystem in Node.js
     *
     * @default undefined - If not provided, no filesystem operations will be possible
     */
    readonly fs?: FilesystemTools;

    /**
     * Scrapers for extracting knowledge from external sources
     *
     * Tip: Use `$provideScrapersForNode` OR `$provideScrapersForBrowser` to use all available scrapers
     *
     * @default [] - If not provided, no external knowledge extraction will be possible
     */
    readonly scrapers?: Arrayable<Scraper>;

    /**
     * Tools for executing scripts
     *
     * Note: You can pass multiple ScriptExecutionTools, they will be tried one by one until one of them supports the script
     *       If none of them supports the script, an error is thrown
     * Tip: Use here `new JavascriptExecutionTools`
     *
     * @default [] - If not provided, no script execution will be possible
     */
    readonly script?: Arrayable<ScriptExecutionTools>;

    /**
     * Tools for interacting with the user
     *
     * Note: When undefined, the user interface is disabled and promptbook which requires user interaction will fail
     */
    readonly userInterface?: UserInterfaceTools;
};

/**
 * TODO: !!!!!! Move here also the executables and make $provideXxxxForNode
 */
