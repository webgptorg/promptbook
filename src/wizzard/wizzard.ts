import spaceTrim from 'spacetrim';
import { Promisable } from 'type-fest';
import { $provideExecutablesForNode } from '../executables/$provideExecutablesForNode';
import { $provideFilesystemForNode } from '../scrapers/_common/register/$provideFilesystemForNode';
import { $provideScrapersForNode } from '../scrapers/_common/register/$provideScrapersForNode';
import type { PipelineJson } from '../pipeline/PipelineJson/PipelineJson';
import { $isRunningInNode } from '../utils/environment/$isRunningInNode';
import { isValidFilePath } from '../utils/validators/filePath/isValidFilePath';
import { isValidUrl } from '../utils/validators/url/isValidUrl';
import { createCollectionFromDirectory } from '../collection/constructors/createCollectionFromDirectory';
import { EnvironmentMismatchError } from '../errors/EnvironmentMismatchError';
import { NotFoundError } from '../errors/NotFoundError';
import { NotYetImplementedError } from '../errors/NotYetImplementedError';
import { assertsExecutionSuccessful } from '../execution/assertsExecutionSuccessful';
import { createPipelineExecutor } from '../execution/createPipelineExecutor/00-createPipelineExecutor';
import type { ExecutionTools } from '../execution/ExecutionTools';
import type { PipelineExecutorResult } from '../execution/PipelineExecutorResult';
import { $provideLlmToolsForWizzardOrCli } from '../llm-providers/_common/register/$provideLlmToolsForWizzardOrCli';
import type { PipelineString } from '../pipeline/PipelineString';
import type { TaskProgress } from '../types/TaskProgress';
import type { InputParameters } from '../types/typeAliases';
import type { string_filename } from '../types/typeAliases';
import type { string_pipeline_url } from '../types/typeAliases';
import { just } from '../utils/organization/just';

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
        const pipeline = await this.getPipeline(book);

        // ▶ Create executor - the function that will execute the Pipeline
        const pipelineExecutor = createPipelineExecutor({ pipeline, tools });

        // 🚀▶ Execute the Pipeline
        const result = await pipelineExecutor(inputParameters, onProgress);

        // ▶ Fail if the execution was not successful
        assertsExecutionSuccessful(result);

        // ▶ Return the result
        return result;
    }

    private executionTools: ExecutionTools | null = null;

    /**
     * @@@!!!
     *
     * @param pipelineSource
     */
    public async getExecutionTools(): Promise<ExecutionTools> {
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
    public async getPipeline(
        pipelineSource: string_filename | string_pipeline_url | PipelineString,
    ): Promise<PipelineJson> {
        // ▶ Get the tools
        const tools = await this.getExecutionTools();

        // Strategy 1️⃣: If the pipelineSource is a filename - try to load it from the file
        if (isValidFilePath(pipelineSource)) {
            // TODO: !!!!!! Implement + use same mechanism in `ptbk run`
        } /* not else */

        // Strategy 2️⃣: If the pipelineSource is a URL - try to find the pipeline on disk in `DEFAULT_BOOKS_DIRNAME` (= `./books`) directory recursively up to the root
        if (isValidUrl(pipelineSource)) {
            // ▶ Create whole pipeline collection
            const collection = await createCollectionFromDirectory('./books', tools);
            // <- TODO: !!!!!! Search recursively in the directory

            // ▶ Get single Pipeline
            const pipeline = await (async () => {
                try {
                    return await collection.getPipelineByUrl(pipelineSource);
                } catch (error) {
                    if (!(error instanceof NotFoundError)) {
                        throw error;
                    }

                    // Note: If the pipeline was not found in the collection, try next strategy
                    return null;
                }
            })();

            if (pipeline !== null) {
                return pipeline;
            }
        } /* not else */

        // Strategy 3️⃣: If the pipelineSource is a URL - try to fetch it from the internet
        if (isValidUrl(pipelineSource)) {
            throw new NotYetImplementedError(
                'Strategy 3️⃣: If the pipelineSource is a URL - try to fetch it from the internet',
            );
        } /* not else */

        // Strategy 4️⃣: If the pipelineSource is a PipelineString - try to parse it
        if (just(true) /* <- TODO: Implement, use and export `isValidPipelineString` */) {
            throw new NotYetImplementedError(
                'Strategy 4️⃣: If the pipelineSource is a PipelineString - try to parse it',
            );
        } /* not else */

        throw new NotFoundError(
            spaceTrim(
                (block) => `
                    No pipeline found for:
                    ${block(pipelineSource)}

                    Pipelines can be loaded from:
                    1) @@@!!!
                `,
            ),
        );
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
