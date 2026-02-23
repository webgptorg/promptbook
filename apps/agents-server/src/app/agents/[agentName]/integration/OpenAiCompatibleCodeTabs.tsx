'use client';

import spaceTrim from 'spacetrim';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../../../_common/components/Tabs/Tabs';
import { SdkCodeTabs } from './SdkCodeTabs';

/**
 * Props for OpenAiCompatibleCodeTabs.
 */
type OpenAiCompatibleCodeTabsProps = {
    agentName: string;
    agentApiBase: string;
    apiKeyValue: string;
};

/**
 * OpenAI message definition for the sample payloads.
 */
type OpenAiMessage = {
    role: 'user';
    content: string;
};

/**
 * JSON schema definition for response_format samples.
 */
type JsonSchemaDefinition = {
    type: 'object';
    properties: {
        topics: {
            type: 'array';
            items: {
                type: 'string';
            };
        };
        message: {
            type: 'string';
        };
    };
    required: Array<'topics' | 'message'>;
};

/**
 * OpenAI response format configuration for JSON schema responses.
 */
type OpenAiResponseFormat = {
    type: 'json_schema';
    json_schema: JsonSchemaDefinition;
};

/**
 * OpenAI-compatible request payload shape for code samples.
 */
type OpenAiRequestPayload = {
    model: string;
    messages: OpenAiMessage[];
    response_format?: OpenAiResponseFormat;
};

/**
 * SDK code samples for a specific response format.
 */
type SdkCodeSamples = {
    curlCode: string;
    pythonCode: string;
    jsCode: string;
};

/**
 * Response format option metadata used to render tabs and payloads.
 */
type OpenAiResponseFormatOption = {
    value: string;
    label: string;
    message: string;
    responseFormat?: OpenAiResponseFormat;
};

/**
 * Default user prompt for simple text responses.
 */
const DEFAULT_USER_MESSAGE = 'Hello!';

/**
 * User prompt for JSON schema responses.
 */
const JSON_SCHEMA_USER_MESSAGE = 'List the key topics and include a short message about them.';

/**
 * JSON schema response format definition for the structured response example.
 */
const JSON_SCHEMA_RESPONSE_FORMAT: OpenAiResponseFormat = {
    type: 'json_schema',
    json_schema: {
        type: 'object',
        properties: {
            topics: {
                type: 'array',
                items: {
                    type: 'string',
                },
            },
            message: {
                type: 'string',
            },
        },
        required: ['topics', 'message'],
    },
};

/**
 * Response format tab definitions for the OpenAI-compatible section.
 */
const RESPONSE_FORMAT_OPTIONS: OpenAiResponseFormatOption[] = [
    {
        value: 'text',
        label: 'Simple text',
        message: DEFAULT_USER_MESSAGE,
    },
    {
        value: 'json-schema',
        label: 'JSON schema',
        message: JSON_SCHEMA_USER_MESSAGE,
        responseFormat: JSON_SCHEMA_RESPONSE_FORMAT,
    },
];

/**
 * Formats JSON for code snippets with a consistent indentation.
 */
const formatJsonForCode = (value: unknown) => JSON.stringify(value, null, 2);

/**
 * Creates the OpenAI-compatible request payload for the samples.
 */
const createRequestPayload = (
    agentName: string,
    message: string,
    responseFormat?: OpenAiResponseFormat,
): OpenAiRequestPayload => {
    const payload: OpenAiRequestPayload = {
        model: `agent:${agentName}`,
        messages: [
            {
                role: 'user',
                content: message,
            },
        ],
    };

    if (responseFormat) {
        payload.response_format = responseFormat;
    }

    return payload;
};

/**
 * Builds the cURL code sample for a given payload.
 */
const buildCurlCode = (agentApiBase: string, apiKeyValue: string, payload: OpenAiRequestPayload) => {
    const requestBody = formatJsonForCode(payload);

    return spaceTrim(
        (block) => `
            curl ${agentApiBase}/api/openai/v1/chat/completions \\
              -H "Content-Type: application/json" \\
              -H "Authorization: Bearer ${apiKeyValue}" \\
              -d '${block(requestBody)}'
        `,
    );
};

/**
 * Builds the Python SDK sample for a given response format.
 */
const buildPythonCode = (
    agentName: string,
    agentApiBase: string,
    apiKeyValue: string,
    message: string,
    responseFormat?: OpenAiResponseFormat,
) => {
    return spaceTrim(
        (block) => `
            from openai import OpenAI

            client = OpenAI(
                base_url="${agentApiBase}/api/openai/v1",
                api_key="${apiKeyValue}",
            )

            response = client.chat.completions.create(
                model="agent:${agentName}",
                messages=[
                    {"role": "user", "content": "${message}"}
                ],${
                    responseFormat
                        ? `\n            response_format=${block(formatJsonForCode(responseFormat))},`
                        : ''
                }
            )

            print(response.choices[0].message.content)
        `,
    );
};

/**
 * Builds the JavaScript/TypeScript SDK sample for a given response format.
 */
const buildJavaScriptCode = (
    agentName: string,
    agentApiBase: string,
    apiKeyValue: string,
    message: string,
    responseFormat?: OpenAiResponseFormat,
) => {
    return spaceTrim(
        (block) => `
            import OpenAI from 'openai';

            const client = new OpenAI({
                baseURL: '${agentApiBase}/api/openai/v1',
                apiKey: '${apiKeyValue}',
            });

            async function main() {
                const response = await client.chat.completions.create({
                    model: 'agent:${agentName}',
                    messages: [{ role: 'user', content: '${message}' }],${
                        responseFormat
                            ? `\n                response_format: ${block(formatJsonForCode(responseFormat))},`
                            : ''
                    }
                });

                console.log(response.choices[0].message.content);
            }

            main();
        `,
    );
};

/**
 * Generates SDK code samples for a response format option.
 */
const buildSdkCodeSamples = (
    agentName: string,
    agentApiBase: string,
    apiKeyValue: string,
    message: string,
    responseFormat?: OpenAiResponseFormat,
): SdkCodeSamples => {
    const payload = createRequestPayload(agentName, message, responseFormat);

    return {
        curlCode: buildCurlCode(agentApiBase, apiKeyValue, payload),
        pythonCode: buildPythonCode(agentName, agentApiBase, apiKeyValue, message, responseFormat),
        jsCode: buildJavaScriptCode(agentName, agentApiBase, apiKeyValue, message, responseFormat),
    };
};

/**
 * Renders OpenAI-compatible SDK code samples with response format tabs.
 */
export function OpenAiCompatibleCodeTabs({
    agentName,
    agentApiBase,
    apiKeyValue,
}: OpenAiCompatibleCodeTabsProps) {
    return (
        <Tabs defaultValue={RESPONSE_FORMAT_OPTIONS[0].value} className="w-full">
            <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Response format
                </span>
                <TabsList>
                    {RESPONSE_FORMAT_OPTIONS.map((option) => (
                        <TabsTrigger key={option.value} value={option.value}>
                            {option.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>
            {RESPONSE_FORMAT_OPTIONS.map((option) => {
                const samples = buildSdkCodeSamples(
                    agentName,
                    agentApiBase,
                    apiKeyValue,
                    option.message,
                    option.responseFormat,
                );

                return (
                    <TabsContent key={option.value} value={option.value}>
                        <SdkCodeTabs
                            curlCode={samples.curlCode}
                            pythonCode={samples.pythonCode}
                            jsCode={samples.jsCode}
                        />
                    </TabsContent>
                );
            })}
        </Tabs>
    );
}
