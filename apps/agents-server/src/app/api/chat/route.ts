import { createOpenAiExecutionTools } from '@promptbook-local/openai';
import { NextResponse } from 'next/server';
import { spaceTrim } from 'spacetrim';

/**
 * Whether this development-only OpenAI smoke test endpoint is reachable.
 *
 * The route exists to verify that the configured `OPENAI_API_KEY` actually
 * talks to OpenAI, so it must never be exposed in production where it would
 * let any anonymous client drain the server's paid OpenAI credit by repeatedly
 * calling this unauthenticated `GET` with attacker-controlled `message`.
 *
 * @private internal helper of `/api/chat`
 */
const IS_DEVELOPMENT_CHAT_TEST_ENDPOINT_ENABLED = process.env.NODE_ENV !== 'production';

/**
 * Handles get.
 */
export async function GET(request: Request) {
    if (!IS_DEVELOPMENT_CHAT_TEST_ENDPOINT_ENABLED) {
        return NextResponse.json(
            {
                error: {
                    message: spaceTrim(`
                        Endpoint \`/api/chat\` is a development-only OpenAI smoke test
                        and is disabled in production.
                    `),
                    type: 'not_available_in_production',
                },
            },
            { status: 404 },
        );
    }

    const { searchParams } = new URL(request.url);
    const message = searchParams.get('message') || 'Hello, who are you?';

    const llmTools = createOpenAiExecutionTools({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await llmTools.callChatModel({
        title: 'Test Chat Call',
        parameters: {},
        modelRequirements: {
            modelVariant: 'CHAT',
            modelName: 'gpt-3.5-turbo',
        },
        content: message,
    });

    return new Response(response.content, {
        status: 200,
        headers: { 'Content-Type': 'text/markdown' },
    });
}
