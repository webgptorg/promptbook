import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { validateApiKey } from '@/src/utils/validateApiKey';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/openai/v1/models
 *
 * Lists all available agents as models for the OpenAI-compatible API.
 */
export async function GET(request: NextRequest) {
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
        const agentNames = await collection.listAgents();

        const models = agentNames.map((agentName) => ({
            id: agentName,
            object: 'model',
            created: Math.floor(Date.now() / 1000), // We don't have creation date readily available in listAgents
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
        }));

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
