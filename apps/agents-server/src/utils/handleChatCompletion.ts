import { NextRequest, NextResponse } from 'next/server';
import { HTTP_STATUS_CODES } from '../constants';
import { respondIfClientVersionIsOutdated } from './clientVersionGuard';
import { createHandleChatCompletionJsonResponse } from './handleChatCompletion/createHandleChatCompletionJsonResponse';
import { createHandleChatCompletionPromptContext } from './handleChatCompletion/createHandleChatCompletionPromptContext';
import { createHandleChatCompletionStreamResponse } from './handleChatCompletion/createHandleChatCompletionStreamResponse';
import { parseHandleChatCompletionRequest } from './handleChatCompletion/parseHandleChatCompletionRequest';
import { resolveHandleChatCompletionRuntime } from './handleChatCompletion/resolveHandleChatCompletionRuntime';
import { validateApiKey } from './validateApiKey';

/**
 * Handles convert open Ai chat completion requests routed through the Agents Server.
 */
export async function handleChatCompletion(
    request: NextRequest,
    params: { agentName?: string },
    title: string = 'API Chat Completion',
) {
    const { agentName: agentNameFromParams } = params;

    const versionMismatchResponse = respondIfClientVersionIsOutdated(request, 'json', { mode: 'api' });
    if (versionMismatchResponse) {
        return versionMismatchResponse;
    }

    const apiKeyValidation = await validateApiKey(request);
    if (!apiKeyValidation.isValid) {
        return NextResponse.json(
            {
                error: {
                    message: apiKeyValidation.error || 'Invalid API key',
                    type: 'authentication_error',
                },
            },
            { status: HTTP_STATUS_CODES.UNAUTHORIZED },
        );
    }
    const apiKey = apiKeyValidation.token || null;

    try {
        const parsedRequest = parseHandleChatCompletionRequest({
            body: await request.json(),
            agentNameFromParams,
            request,
        });
        if (parsedRequest instanceof NextResponse) {
            return parsedRequest;
        }

        const runtime = await resolveHandleChatCompletionRuntime({
            request,
            agentName: parsedRequest.agentName,
            messages: parsedRequest.messages,
            isPrivateModeEnabled: parsedRequest.isPrivateModeEnabled,
        });
        if (runtime instanceof NextResponse) {
            return runtime;
        }

        const promptContext = await createHandleChatCompletionPromptContext({
            request,
            title,
            apiKey,
            parsedRequest,
            runtime,
        });

        return parsedRequest.stream
            ? createHandleChatCompletionStreamResponse({
                  request,
                  title,
                  parsedRequest,
                  runtime,
                  promptContext,
              })
            : createHandleChatCompletionJsonResponse({
                  title,
                  parsedRequest,
                  runtime,
                  promptContext,
              });
    } catch (error) {
        console.error(`Error in ${title} handler:`, error);
        return NextResponse.json(
            { error: { message: (error as Error).message || 'Internal Server Error', type: 'server_error' } },
            { status: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR },
        );
    }
}
