import { forTime } from 'waitasecond';
import { assertsError } from '../../errors/assertsError';
import { serializeError } from '../../errors/utils/serializeError';
import { createPipelineExecutor } from '../../execution/createPipelineExecutor/00-createPipelineExecutor';
import type { AbstractTask, ExecutionTask } from '../../execution/ExecutionTask';
import type { chococake } from '../../utils/organization/really_any';
import { getExecutionToolsFromIdentification } from './getExecutionToolsFromIdentification';
import type { RemoteServerRuntime } from './RemoteServerRuntime';

/**
 * Registers execution task listing, detail, and creation routes.
 *
 * @private internal utility of `startRemoteServer`
 */
export function registerExecutionRoutes<TCustomOptions>(runtime: RemoteServerRuntime<TCustomOptions>): void {
    runtime.app.get(`/executions`, async (request, response) => {
        response.send(
            runtime.runningExecutionTasks.map((runningExecutionTask) =>
                exportExecutionTask(runningExecutionTask, false),
            ),
            /* <- TODO: satisfies paths['/executions']['get']['responses']['200']['content']['application/json'] */
            // <- TODO: [🧠][👩🏼‍🤝‍🧑🏼] Secure this through some token
            // <- TODO: [🧠] Better and more information
        );
    });

    runtime.app.get(`/executions/last`, async (request, response) => {
        // TODO: [🤬] Filter only for user

        if (runtime.runningExecutionTasks.length === 0) {
            response.status(404).send('No execution tasks found');
            return;
        }

        const lastExecutionTask = runtime.runningExecutionTasks[runtime.runningExecutionTasks.length - 1];
        response.send(exportExecutionTask(lastExecutionTask!, true));
    });

    runtime.app.get(`/executions/:taskId`, async (request, response) => {
        const { taskId } = request.params;

        // TODO: [🤬] Filter only for user
        const executionTask = runtime.runningExecutionTasks.find(
            (runningExecutionTask) => runningExecutionTask.taskId === taskId,
        );

        if (executionTask === undefined) {
            response
                .status(
                    404,
                    // <- TODO: [👨🏼‍🤝‍👨🏻] Implement and use `errorToHttpStatus`
                )
                .send(`Execution "${taskId}" not found`);
            return;
        }

        response.send(exportExecutionTask(executionTask, true));
    });

    runtime.app.post(`/executions/new`, async (request, response) => {
        try {
            const { inputParameters, identification /* <- [🤬] */ } = request.body;
            const pipelineUrl =
                request.body
                    .pipelineUrl /* <- TODO: as paths['/executions/new']['post']['requestBody']['content']['application/json'] */ ||
                request.body.book;

            // TODO: [🧠] Check `pipelineUrl` and `inputParameters` here or it should be responsibility of `collection.getPipelineByUrl` and `pipelineExecutor`

            const pipeline = await runtime.configuration.collection?.getPipelineByUrl(pipelineUrl);

            if (pipeline === undefined) {
                response.status(404).send(`Pipeline "${pipelineUrl}" not found`);
                return;
            }

            const tools = await getExecutionToolsFromIdentification(runtime.configuration, identification);
            const pipelineExecutor = createPipelineExecutor({ pipeline, tools, ...runtime.configuration.startOptions });
            const executionTask = pipelineExecutor(inputParameters);

            runtime.runningExecutionTasks.push(executionTask);

            await forTime(10);
            // <- Note: Wait for a while to wait for quick responses or sudden but asynchronous errors
            // <- TODO: Put this into configuration

            response.send(
                executionTask /* <- TODO: satisfies paths['/executions/new']['post']['responses']['200']['content']['application/json'] */,
            );

            /*/
            executionTask.asObservable().subscribe({
                next(partialResult) {
                    console.info(executionTask.taskId, 'next', partialResult);
                },
                error(error) {
                    console.info(executionTask.taskId, 'error', error);
                },
                complete() {
                    console.info(executionTask.taskId, 'complete');
                },
            });
            /**/

            /*
            await fetch(request.body.callbackUrl);
            // <- TODO: [🧠] Should be here transferred data as POST / PUT
            */
        } catch (error) {
            assertsError(error);
            response.status(400).send({ error: serializeError(error) });
        }
    });
}

/**
 * Converts an execution task to either summary or detailed API payload.
 */
function exportExecutionTask(executionTask: ExecutionTask, isDetailed: boolean) {
    // <- TODO: [🧠] This should be maybe method of `ExecutionTask` itself
    const {
        taskType,
        promptbookVersion,
        taskId,
        title,
        status,
        errors,
        tldr,
        warnings,
        createdAt,
        updatedAt,
        currentValue,
        llmCalls,
    } = executionTask;

    if (isDetailed) {
        return {
            taskId,
            title,
            taskType,
            promptbookVersion,
            status,
            tldr,
            errors: errors.map(serializeError),
            warnings: warnings.map(serializeError),
            llmCalls,
            createdAt,
            updatedAt,
            currentValue,
            ptbkNonce: 0,
        } satisfies Omit<AbstractTask<chococake>, 'asPromise' | 'asObservable'>;
    }

    return {
        taskId,
        title,
        taskType,
        promptbookVersion,
        status,
        tldr,
        createdAt,
        updatedAt,
        llmCalls,
        ptbkNonce: 0,
    } satisfies Omit<AbstractTask<chococake>, 'asPromise' | 'asObservable' | 'currentValue' | 'errors' | 'warnings'>;
}
