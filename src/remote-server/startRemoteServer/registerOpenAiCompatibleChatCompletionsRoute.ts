import { createPipelineExecutor } from '../../execution/createPipelineExecutor/00-createPipelineExecutor';
import type { RemoteServerRuntime } from './RemoteServerRuntime';
import { getExecutionToolsFromIdentification } from './getExecutionToolsFromIdentification';

/**
 * Registers the OpenAI-compatible chat completions endpoint.
 *
 * @private internal utility of `startRemoteServer`
 */
export function registerOpenAiCompatibleChatCompletionsRoute<TCustomOptions>(
    runtime: RemoteServerRuntime<TCustomOptions>,
): void {
    runtime.app.post('/v1/chat/completions', async (request, response) => {
        // TODO: [🧠][🦢] Make OpenAI  compatible more promptbook-native - make reverse adapter from LlmExecutionTools to OpenAI-compatible:

        try {
            const params = request.body as {
                model: string;
                messages: Array<{ role: string; content: string }>;
            };

            response.json(await createOpenAiCompatibleChatCompletionsResponse(runtime, params));
        } catch (error) {
            response.status(500).json(createOpenAiCompatibleErrorResponse(error));
        }
    });
}

/**
 * Executes a pipeline and converts its output to an OpenAI-compatible response shape.
 */
async function createOpenAiCompatibleChatCompletionsResponse<TCustomOptions>(
    runtime: RemoteServerRuntime<TCustomOptions>,
    params: { model: string; messages: Array<{ role: string; content: string }> },
) {
    const { model, messages } = params;
    const prompt = renderOpenAiCompatiblePrompt(messages);

    if (runtime.configuration.collection === null) {
        throw new Error('No collection available');
    }

    const pipeline = await runtime.configuration.collection.getPipelineByUrl(model);
    const pipelineExecutor = createPipelineExecutor({
        pipeline,
        tools: await getExecutionToolsFromIdentification(runtime.configuration, {
            isAnonymous: true,
            llmToolsConfiguration: [],
        }),
    });

    const result = await pipelineExecutor({ prompt }).asPromise({ isCrashedOnError: true });

    if (!result.isSuccessful) {
        throw new Error(`Failed to execute book: ${result.errors.join(', ')}`);
    }

    return {
        id: 'chatcmpl-' + Math.random().toString(36).substring(2),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
            {
                index: 0,
                message: {
                    role: 'assistant',
                    content: result.outputParameters.response,
                },
                finish_reason: 'stop',
            },
        ],
        usage: {
            prompt_tokens: 0, // TODO: Implement token counting
            completion_tokens: 0,
            total_tokens: 0,
        },
    };
}

/**
 * Flattens OpenAI-compatible chat messages into the prompt expected by a pipeline.
 */
function renderOpenAiCompatiblePrompt(messages: Array<{ role: string; content: string }>): string {
    return messages.map((message) => `${message.role}: ${message.content}`).join('\n');
}

/**
 * Converts unexpected server errors to the OpenAI-compatible error shape.
 */
function createOpenAiCompatibleErrorResponse(error: unknown) {
    return {
        error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            type: 'server_error',
            code: 'internal_error',
        },
    };
}
