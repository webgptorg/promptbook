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
import type { TaskProgress } from '../types/TaskProgress';
import type { InputParameters, string_filename, string_pipeline_url } from '../types/typeAliases';
import { $isRunningInNode } from '../utils/environment/$isRunningInNode';
import { $getCompiledBook } from './getCompiledBook';

/**
 * Look at `wizzard` for more details
 *
 * @private just for single instance
 */
class Wizzard {
    /**
     * @@@!!!!!!
     */
    public async execute(
        book: string_pipeline_url,
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

    private executionTools: Required<Pick<ExecutionTools, 'fs'>> | null = null;

    /**
     * @@@!!!
     *
     * @param pipelineSource
     */
    public async getExecutionTools(): Promise<Required<Pick<ExecutionTools, 'fs'>>> {
        if (this.executionTools !== null) {
            return this.executionTools;
        }

        // TODO: DRY [◽]
        const prepareAndScrapeOptions = {
            isVerbose: false,
            isCacheReloaded: false, // <- TODO: Allow to pass
        }; /* <- TODO: ` satisfies PrepareAndScrapeOptions` */
        const fs = $provideFilesystemForNode(prepareAndScrapeOptions);
        const llm = $provideLlmToolsForWizzardOrCli(prepareAndScrapeOptions);
        const executables = await $provideExecutablesForNode(prepareAndScrapeOptions);
        const tools = {
            llm,
            fs,

            scrapers: await $provideScrapersForNode({ fs, llm, executables }, prepareAndScrapeOptions),
            script: [
                /*new JavascriptExecutionTools(options)*/
            ],
        } satisfies ExecutionTools;

        this.executionTools = tools;

        return tools;
    }

    /**
     * TODO: Make standalone function from this exported from node and used here and in `ptbk run`
     * @@@!!!
     *
     * Strategies:
     * 1) @@@!!!
     * 2) @@@!!!
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
 * 🧙‍♂️ @@@
 *
 * @singleton
 * @public exported from `@promptbook/wizzard`
 */
export const wizzard = new Wizzard();

/**
 * TODO: !!!!!! Mark in jsdoc as non-pure
 * TODO: !!!!!! Add to readmes - one markdown here imported in all packages
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
