import { Promisable } from 'type-fest';
import { assertsExecutionSuccessful, createPipelineExecutor } from '../_packages/core.index';
import { $provideExecutionToolsForNode, createCollectionFromDirectory } from '../_packages/node.index';
import { PipelineExecutorResult } from '../execution/PipelineExecutorResult';
import { TaskProgress } from '../types/TaskProgress';
import { Parameters, string_pipeline_url } from '../types/typeAliases';

/**
 * @@@
 *
 * @public exported from `@promptbook/node`
 */
export const wizzard = {
    /**
     * @@@!!!!!!
     */
    async run(
        book: string_pipeline_url,
        inputParameters: Parameters,
        onProgress?: (taskProgress: TaskProgress) => Promisable<void>,
    ): Promise<PipelineExecutorResult> {
        // ▶ Prepare tools
        const tools = await $provideExecutionToolsForNode();

        // ▶ Create whole pipeline collection
        const collection = await createCollectionFromDirectory('./books', tools);
        // <- TODO: !!!!!! Search recursively in the directory + allow to pass relative path or book string template or just string

        // ▶ Get single Pipeline
        const pipeline = await collection.getPipelineByUrl(book);

        // ▶ Create executor - the function that will execute the Pipeline
        const pipelineExecutor = createPipelineExecutor({ pipeline, tools });

        // 🚀▶ Execute the Pipeline
        const result = await pipelineExecutor(inputParameters, onProgress);

        // ▶ Fail if the execution was not successful
        assertsExecutionSuccessful(result);

        // ▶ Return the result
        return result;
    },
};

/**
 * TODO: !!!!!! Add to readmes - one markdown here imported in all packages
 */
