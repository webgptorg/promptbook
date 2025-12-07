import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { validateApiKey } from '@/src/utils/validateApiKey';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /agents/[agentName]/api/openai/models
 *
 * Lists available models for the OpenAI-compatible API.
 * This endpoint is required for OpenAI-compatible clients (like Jan, LM Studio, etc.)
 * to discover available models.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ agentName: string }> }) {
    const { agentName } = await params;

    // Validate API key explicitly (in addition to middleware)
    const apiKeyValidation = await validateApiKey(request);
    if (!apiKeyValidation.isValid) {
        return NextResponse.json(
            {
                error: {
                    message: apiKeyValidation.error || 'Invalid API key',
                    type: 'authentication_error',
                },
            },
            { status: 401 },
        );
    }

    try {
        const collection = await $provideAgentCollectionForServer();

        let agentSource;
        try {
            agentSource = await collection.getAgentSource(agentName);
        } catch (error) {
            return NextResponse.json(
                { error: { message: `Agent '${agentName}' not found.`, type: 'invalid_request_error' } },
                { status: 404 },
            );
        }

        if (!agentSource) {
            return NextResponse.json(
                { error: { message: `Agent '${agentName}' not found.`, type: 'invalid_request_error' } },
                { status: 404 },
            );
        }

        // Return the agent as a single model in OpenAI format
        // The model ID is the agent name, which clients will use when making chat completion requests
        const models = [
            {
                id: agentName,
                object: 'model',
                created: Math.floor(Date.now() / 1000),
                owned_by: 'promptbook',
                permission: [
                    {
                        id: `modelperm-${agentName}`,
                        object: 'model_permission',
                        created: Math.floor(Date.now() / 1000),
                        allow_create_engine: false,
                        allow_sampling: true,
                        allow_logprobs: false,
                        allow_search_indices: false,
                        allow_view: true,
                        allow_fine_tuning: false,
                        organization: '*',
                        group: null,
                        is_blocking: false,
                    },
                ],
                root: agentName,
                parent: null,
            },
        ];

        return NextResponse.json({
            object: 'list',
            data: models,
        });
    } catch (error) {
        console.error('Error in models listing handler:', error);
        return NextResponse.json(
            { error: { message: (error as Error).message || 'Internal Server Error', type: 'server_error' } },
            { status: 500 },
        );
    }
}

/**
 * TODO: [🧠] Consider listing all available agents as models when agentName is a wildcard or special value
 */
