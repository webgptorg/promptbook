import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';
import type { LlmToolDefinition, TODO_any } from '@promptbook-local/types';
import { NextRequest, NextResponse } from 'next/server';
import type OpenAI from 'openai';
import { HTTP_STATUS_CODES } from '../../constants';
import { createHandleChatCompletionErrorResponse } from './createHandleChatCompletionErrorResponse';

/**
 * Definition of open AI chat tool.
 */
type OpenAIChatToolDefinition = OpenAI.Chat.Completions.ChatCompletionTool & OpenAI.Beta.AssistantTool;

/**
 * Parsed OpenAI-compatible request payload used by `handleChatCompletion`.
 *
 * @private type of `handleChatCompletion`
 */
export type HandleChatCompletionParsedRequest = {
    agentName: string;
    messages: ReadonlyArray<TODO_any>;
    threadMessages: ReadonlyArray<TODO_any>;
    stream: TODO_any;
    model: TODO_any;
    responseFormat: TODO_any;
    runtimeTools?: Array<LlmToolDefinition>;
    runtimeToolChoice?: OpenAI.Chat.Completions.ChatCompletionToolChoiceOption;
    incomingParameters: Record<string, unknown>;
    isPrivateModeEnabled: boolean;
};

/**
 * Parses and validates the OpenAI-compatible request payload.
 *
 * @private function of `handleChatCompletion`
 */
export function parseHandleChatCompletionRequest(options: {
    body: TODO_any;
    agentNameFromParams?: string;
    request: NextRequest;
}): HandleChatCompletionParsedRequest | NextResponse {
    const { body, agentNameFromParams, request } = options;
    const {
        messages,
        stream,
        model,
        response_format: responseFormat,
        tools: rawTools,
        tool_choice: toolChoice,
        parameters: rawParameters = {},
    } = body;
    const agentName = (agentNameFromParams || model) as string | undefined;
    if (!agentName) {
        return createHandleChatCompletionErrorResponse(
            'Agent name is required. Please provide it in the URL or as the "model" parameter.',
            'invalid_request_error',
            HTTP_STATUS_CODES.BAD_REQUEST,
        );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return createHandleChatCompletionErrorResponse(
            'Messages array is required and cannot be empty.',
            'invalid_request_error',
            HTTP_STATUS_CODES.BAD_REQUEST,
        );
    }

    const threadMessages = messages.filter((message: TODO_any) => message.role !== 'system');
    if (threadMessages.length === 0) {
        return createHandleChatCompletionErrorResponse(
            'Messages array must contain at least one non-system message.',
            'invalid_request_error',
            HTTP_STATUS_CODES.BAD_REQUEST,
        );
    }

    return {
        agentName,
        messages,
        threadMessages,
        stream,
        model,
        responseFormat,
        runtimeTools: convertOpenAiTools(rawTools),
        runtimeToolChoice: parseOpenAiToolChoice(toolChoice),
        incomingParameters:
            rawParameters && typeof rawParameters === 'object' && !Array.isArray(rawParameters)
                ? (rawParameters as Record<string, unknown>)
                : {},
        isPrivateModeEnabled: isPrivateModeEnabledFromRequest(request),
    };
}

/**
 * Handles convert open Ai tools.
 */
function convertOpenAiTools(rawTools: unknown): Array<LlmToolDefinition> | undefined {
    if (!Array.isArray(rawTools)) {
        return undefined;
    }

    const converted = rawTools
        .map((tool) => convertOpenAiTool(tool))
        .filter((tool): tool is LlmToolDefinition => tool !== null);

    return converted.length > 0 ? converted : undefined;
}

/**
 * Handles convert open Ai tool.
 */
function convertOpenAiTool(rawTool: unknown): LlmToolDefinition | null {
    const tool = rawTool as OpenAIChatToolDefinition;
    if (!tool || tool.type !== 'function') {
        return null;
    }

    const functionDefinition = tool.function;
    if (!functionDefinition) {
        return null;
    }

    const { name, description, parameters } = functionDefinition;
    if (typeof name !== 'string' || name.trim().length === 0) {
        return null;
    }

    const parameterSchema = parameters ?? {};
    if (parameterSchema.type !== 'object') {
        return null;
    }

    const properties = parameterSchema.properties ?? {};
    const normalizedProperties: Record<string, { type: string; description?: string }> = {};

    for (const [key, value] of Object.entries(properties)) {
        if (!value || typeof value !== 'object') {
            continue;
        }

        normalizedProperties[key] = {
            type: typeof value.type === 'string' ? value.type : 'string',
            description: typeof value.description === 'string' ? value.description : undefined,
        };
    }

    const required =
        Array.isArray(parameterSchema.required) && parameterSchema.required.length > 0
            ? parameterSchema.required.filter((item): item is string => typeof item === 'string')
            : undefined;

    return {
        name,
        description: typeof description === 'string' ? description : '',
        parameters: {
            type: 'object',
            properties: normalizedProperties,
            required,
            additionalProperties:
                typeof parameterSchema.additionalProperties === 'boolean'
                    ? parameterSchema.additionalProperties
                    : undefined,
        },
    };
}

/**
 * Parses open Ai tool choice.
 */
function parseOpenAiToolChoice(value: unknown): OpenAI.Chat.Completions.ChatCompletionToolChoiceOption | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    return value as OpenAI.Chat.Completions.ChatCompletionToolChoiceOption;
}
