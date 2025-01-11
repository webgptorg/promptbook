import { Promisable } from 'type-fest';
import { EnvironmentMismatchError } from '../errors/EnvironmentMismatchError';
import { $provideExecutablesForNode } from '../executables/$provideExecutablesForNode';
import { assertsExecutionSuccessful } from '../execution/assertsExecutionSuccessful';
import { createPipelineExecutor } from '../execution/createPipelineExecutor/00-createPipelineExecutor';
import type { ExecutionTools } from '../execution/ExecutionTools';
import type { PipelineExecutorResult } from '../execution/PipelineExecutorResult';
import { $provideLlmToolsForWizzardOrCli } from '../llm-providers/_common/register/$provideLlmToolsForWizzardOrCli';
import type { PipelineJson } from '../pipeline/PipelineJson/PipelineJson';
import type { PipelineString } from '../pipeline/PipelineString';
import { $provideFilesystemForNode } from '../scrapers/_common/register/$provideFilesystemForNode';
import { $provideScrapersForNode } from '../scrapers/_common/register/$provideScrapersForNode';
import { scraperFetch } from '../scrapers/_common/utils/scraperFetch';
import type { TaskProgress } from '../types/TaskProgress';
import type { InputParameters, string_filename, string_pipeline_url } from '../types/typeAliases';
import { $isRunningInNode } from '../utils/environment/$isRunningInNode';
import { $getCompiledBook } from './$getCompiledBook';

/**
 * Wizzard for simple usage of the Promptbook
 * Look at `wizzard` for more details
 *
 * Note: This works only in Node.js environment and looks for the configuration, environment, tools and cache in the Node.js environment
 *
 * @private just for single instance
 */
class Wizzard {
    /**
     * Run the book
     *
     * It can be loaded from:
     * 1) As a file ./books/write-cv.book.md
     * 2) As a URL https://promptbook.studio/hejny/write-cv.book.md found in ./books folder recursively
     * 2) As a URL https://promptbook.studio/hejny/write-cv.book.md fetched from the internet
     * 3) As a string
     *
     * Note: This works simmilar to the `ptbk run` command
     */
    public async execute(
        book: string_pipeline_url | string_filename | PipelineString,
        inputParameters: InputParameters,
        onProgress?: (taskProgress: TaskProgress) => Promisable<void>,
    ): Promise<PipelineExecutorResult> {
        if (!$isRunningInNode()) {
            throw new EnvironmentMismatchError('Wizzard works only in Node.js environment');
        }

        // ▶ Get the tools
        const tools = await this.getExecutionTools();

        // ▶ Get the Pipeline
        const pipeline = await this.getCompiledBook(book);

        // ▶ Create executor - the function that will execute the Pipeline
        const pipelineExecutor = createPipelineExecutor({ pipeline, tools });

        // 🚀▶ Execute the Pipeline
        const result = await pipelineExecutor(inputParameters, onProgress);

        // ▶ Fail if the execution was not successful
        assertsExecutionSuccessful(result);

        // ▶ Return the result
        return result;
    }

    private executionTools: Required<Pick<ExecutionTools, 'fs' | 'fetch'>> | null = null;

    /**
     * Provides the tools automatically for the Node.js environment
     *
     * @param pipelineSource
     */
    public async getExecutionTools(): Promise<Required<Pick<ExecutionTools, 'fs' | 'fetch'>>> {
        if (this.executionTools !== null) {
            return this.executionTools;
        }

        // TODO: DRY [◽]
        const prepareAndScrapeOptions = {
            isVerbose: false,
            isCacheReloaded: false, // <- TODO: Allow to pass
        }; /* <- TODO: ` satisfies PrepareAndScrapeOptions` */
        const fs = $provideFilesystemForNode(prepareAndScrapeOptions);
        const llm = await $provideLlmToolsForWizzardOrCli(prepareAndScrapeOptions);
        const executables = await $provideExecutablesForNode(prepareAndScrapeOptions);
        const tools = {
            llm,
            fs,
            fetch: scraperFetch,
            scrapers: await $provideScrapersForNode({ fs, llm, executables }, prepareAndScrapeOptions),
            script: [
                /*new JavascriptExecutionTools(options)*/
            ],
        } satisfies ExecutionTools;

        this.executionTools = tools;

        return tools;
    }

    /**
     * Load book from the source
     *
     * Pipelines can be loaded from:
     * 1) As a file ./books/write-cv.book.md
     * 2) As a URL https://promptbook.studio/hejny/write-cv.book.md found in ./books folder recursively
     * 2) As a URL https://promptbook.studio/hejny/write-cv.book.md fetched from the internet
     * 3) As a string
     *
     * @param pipelineSource
     */
    public async getCompiledBook(
        pipelineSource: string_filename | string_pipeline_url | PipelineString,
    ): Promise<PipelineJson> {
        const tools = await this.getExecutionTools();
        return /* not await */ $getCompiledBook(tools, pipelineSource);
    }
}

/**
 * Wizzard for simple usage of the Promptbook
 *
 * Note: This works only in Node.js environment and looks for the configuration, environment, tools and cache in the Node.js environment
 *
 * @singleton
 * @public exported from `@promptbook/wizzard`
 */
export const wizzard = new Wizzard();

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
