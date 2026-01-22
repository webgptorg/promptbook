import { getAllCommitmentsToolFunctionsForNode } from '../commitments/_common/getAllCommitmentsToolFunctionsForNode';
import { VALUE_STRINGS } from '../config';
import { EnvironmentMismatchError } from '../errors/EnvironmentMismatchError';
import { $provideExecutablesForNode } from '../executables/$provideExecutablesForNode';
import { createPipelineExecutor } from '../execution/createPipelineExecutor/00-createPipelineExecutor';
import type { Executables } from '../execution/Executables';
import type { ExecutionTools } from '../execution/ExecutionTools';
import type { FilesystemTools } from '../execution/FilesystemTools';
import type { LlmExecutionTools } from '../execution/LlmExecutionTools';
import type { PipelineExecutorResult } from '../execution/PipelineExecutorResult';
import { $provideLlmToolsForWizardOrCli } from '../llm-providers/_common/register/$provideLlmToolsForWizardOrCli';
import type { PipelineJson } from '../pipeline/PipelineJson/PipelineJson';
import type { PipelineString } from '../pipeline/PipelineString';
import { $provideFilesystemForNode } from '../scrapers/_common/register/$provideFilesystemForNode';
import { $provideScrapersForNode } from '../scrapers/_common/register/$provideScrapersForNode';
import { promptbookFetch } from '../scrapers/_common/utils/promptbookFetch';
import { JavascriptExecutionTools } from '../scripting/javascript/JavascriptExecutionTools';
import type {
    InputParameters,
    string_filename,
    string_parameter_value,
    string_pipeline_url,
} from '../types/typeAliases';
import { $isRunningInNode } from '../utils/environment/$isRunningInNode';
import { $getCompiledBook } from './$getCompiledBook';

/**
 * Options for wizard methods
 */
type WizardOptions = {
    /**
     * Whether to enable verbose logging
     */
    isVerbose?: boolean;
};

/**
 * Wizard for simple usage of the Promptbook
 * Look at `wizard` for more details
 *
 * Note: This works only in Node.js environment and looks for the configuration, environment, tools and cache in the Node.js environment
 *
 * @private just for single instance
 */
class Wizard {
    /**
     * Run the book
     *
     * It can be loaded from:
     * 1) As a file ./books/write-cv.book
     * 2) As a URL https://promptbook.studio/hejny/write-cv.book found in ./books folder recursively
     * 2) As a URL https://promptbook.studio/hejny/write-cv.book fetched from the internet
     * 3) As a string
     *
     * Note: This works similar to the `ptbk run` command
     */
    public async execute(
        book: string_pipeline_url | string_filename | PipelineString,
        inputParameters: InputParameters,
        options: WizardOptions = {},
    ): Promise<
        {
            /**
             * Simple result of the execution
             */
            result: string_parameter_value;
        } & PipelineExecutorResult
    > {
        if (!$isRunningInNode()) {
            throw new EnvironmentMismatchError('Wizard works only in Node.js environment');
        }

        // ▶ Get the tools
        const tools: Required<Pick<ExecutionTools, 'fs' | 'fetch'>> = await this.getExecutionTools(options);

        // ▶ Get the Pipeline
        const pipeline: PipelineJson = await this.getCompiledBook(book, options);

        // ▶ Create executor - the function that will execute the Pipeline
        const pipelineExecutor = createPipelineExecutor({ pipeline, tools });

        // 🚀▶ Execute the Pipeline
        const result: PipelineExecutorResult = await pipelineExecutor(inputParameters).asPromise({
            isCrashedOnError: true,
        });

        const { outputParameters } = result;
        const outputParametersLength = Object.keys(outputParameters).length;
        let resultString: string_parameter_value;

        if (outputParametersLength === 0) {
            resultString = VALUE_STRINGS.empty;
        } else if (outputParametersLength === 1) {
            resultString = outputParameters[Object.keys(outputParameters)[0]!] || VALUE_STRINGS.undefined;
        } else {
            resultString = JSON.stringify(outputParameters);
        }

        // ▶ Return the result
        return { result: resultString, ...result };
    }

    private executionTools: Required<Pick<ExecutionTools, 'fs' | 'fetch'>> | null = null;

    /**
     * Provides the tools automatically for the Node.js environment
     *
     * @param options
     */
    public async getExecutionTools(
        options: WizardOptions = {},
    ): Promise<Required<Pick<ExecutionTools, 'fs' | 'fetch'>>> {
        if (this.executionTools !== null) {
            return this.executionTools;
        }

        // TODO: DRY [◽]
        const prepareAndScrapeOptions = {
            isVerbose: options.isVerbose ?? false,
            isCacheReloaded: false, // <- TODO: Allow to pass
        }; /* <- TODO: ` satisfies PrepareAndScrapeOptions` */
        const fs: FilesystemTools = $provideFilesystemForNode(prepareAndScrapeOptions);
        const llm: LlmExecutionTools = await $provideLlmToolsForWizardOrCli({
            // TODO: [🌃] Allow to use Promptbook.studio token in wizard> strategy: 'REMOTE_SERVER'
            strategy: 'BRING_YOUR_OWN_KEYS',
            ...prepareAndScrapeOptions,
        });
        const executables: Executables = await $provideExecutablesForNode(prepareAndScrapeOptions);
        const tools = {
            llm,
            fs,
            fetch: promptbookFetch,
            scrapers: await $provideScrapersForNode({ fs, llm, executables }, prepareAndScrapeOptions),
            script: [
                new JavascriptExecutionTools({
                    ...prepareAndScrapeOptions,
                    functions: { ...getAllCommitmentsToolFunctionsForNode() },
                }),
            ],
        } satisfies ExecutionTools;

        this.executionTools = tools;

        return tools;
    }

    /**
     * Load book from the source
     *
     * Pipelines can be loaded from:
     * 1) As a file ./books/write-cv.book
     * 2) As a URL https://promptbook.studio/hejny/write-cv.book found in ./books folder recursively
     * 2) As a URL https://promptbook.studio/hejny/write-cv.book fetched from the internet
     * 3) As a string
     *
     * @param pipelineSource
     * @param options
     */
    public async getCompiledBook(
        pipelineSource: string_filename | string_pipeline_url | PipelineString,
        options: WizardOptions = {},
    ): Promise<PipelineJson> {
        const tools = await this.getExecutionTools(options);
        return /* not await */ $getCompiledBook(tools, pipelineSource);
    }
}

/**
 * Wizard for simple usage of the Promptbook
 *
 * Note: This works only in Node.js environment and looks for the configuration, environment, tools and cache in the Node.js environment
 *
 * @singleton
 * @public exported from `@promptbook/wizard`
 */
export const wizard = new Wizard();

/**
 * TODO: [🧠] Maybe some way how to handle the progress and streaming?
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
