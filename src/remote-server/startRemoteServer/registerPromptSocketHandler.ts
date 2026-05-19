import colors from 'colors';
import type { Socket } from 'socket.io';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { PromptResult } from '../../execution/PromptResult';
import type { Prompt } from '../../types/Prompt';
import type { PromptbookServer_Prompt_Request } from '../socket-types/prompt/PromptbookServer_Prompt_Request';
import type { PromptbookServer_Prompt_Response } from '../socket-types/prompt/PromptbookServer_Prompt_Response';
import type { RemoteServerRuntime } from './RemoteServerRuntime';
import type { SocketResponse } from './SocketResponse';
import { getExecutionToolsFromIdentification } from './getExecutionToolsFromIdentification';
import { respondToSocketRequest } from './respondToSocketRequest';

/**
 * Registers the socket prompt execution request handler.
 *
 * @private internal utility of `startRemoteServer`
 */
export function registerPromptSocketHandler<TCustomOptions>(
    runtime: RemoteServerRuntime<TCustomOptions>,
    socket: Socket,
): void {
    socket.on('prompt-request', async (request: PromptbookServer_Prompt_Request<TCustomOptions>) => {
        if (runtime.configuration.isVerbose) {
            console.info(colors.bgWhite(`Prompt:`), colors.gray(JSON.stringify(request, null, 4)));
        }

        await respondToSocketRequest(socket, async () => createPromptSocketResponse(runtime, request));
    });
}

/**
 * Creates the socket response for prompt execution.
 */
async function createPromptSocketResponse<TCustomOptions>(
    runtime: RemoteServerRuntime<TCustomOptions>,
    request: PromptbookServer_Prompt_Request<TCustomOptions>,
): Promise<SocketResponse<PromptbookServer_Prompt_Response>> {
    const promptResult = await executePromptRequest(runtime, request);

    if (runtime.configuration.isVerbose) {
        console.info(colors.bgGreen(`PromptResult:`), colors.green(JSON.stringify(promptResult, null, 4)));
    }

    return {
        eventName: 'prompt-response',
        payload: { promptResult } satisfies PromptbookServer_Prompt_Response /* <- Note: [🤛] */,
    };
}

/**
 * Executes a prompt request after collection authorization checks.
 */
async function executePromptRequest<TCustomOptions>(
    runtime: RemoteServerRuntime<TCustomOptions>,
    request: PromptbookServer_Prompt_Request<TCustomOptions>,
): Promise<PromptResult> {
    const { identification, prompt } = request;
    const tools = await getExecutionToolsFromIdentification(runtime.configuration, identification);

    if (
        identification.isAnonymous === false &&
        runtime.configuration.collection !== null &&
        !(await runtime.configuration.collection.isResponsibleForPrompt(prompt))
    ) {
        throw new PipelineExecutionError(`Pipeline is not in the collection of this server`);
    }

    return await executePromptWithLlm(tools.llm, prompt);
}

/**
 * Dispatches a prompt to the matching LLM method for its model variant.
 */
function executePromptWithLlm(llm: LlmExecutionTools, prompt: Prompt): Promise<PromptResult> {
    switch (prompt.modelRequirements.modelVariant) {
        case 'CHAT':
            if (llm.callChatModel === undefined) {
                // Note: [0] This check should not be a thing
                throw new PipelineExecutionError(`Chat model is not available`);
            }
            return llm.callChatModel(prompt);

        case 'COMPLETION':
            if (llm.callCompletionModel === undefined) {
                // Note: [0] This check should not be a thing
                throw new PipelineExecutionError(`Completion model is not available`);
            }
            return llm.callCompletionModel(prompt);

        case 'EMBEDDING':
            if (llm.callEmbeddingModel === undefined) {
                // Note: [0] This check should not be a thing
                throw new PipelineExecutionError(`Embedding model is not available`);
            }
            return llm.callEmbeddingModel(prompt);

        // <- case [🤖]:

        default:
            throw new PipelineExecutionError(
                `Unknown model variant "${prompt.modelRequirements.modelVariant}"`,
            );
    }
}

