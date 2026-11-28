import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { spaceTrim } from 'spacetrim';
import { forTime } from 'waitasecond';

/**
 * Whether this development-only OpenAI streaming smoke test endpoint is reachable.
 *
 * The route exists to verify that streaming chat completions work end-to-end,
 * so it must never be exposed in production where it would let any anonymous
 * client drain the server's paid OpenAI credit by repeatedly calling this
 * unauthenticated `GET` with attacker-controlled `message`.
 *
 * @private internal helper of `/api/chat-streaming`
 */
const IS_DEVELOPMENT_CHAT_STREAMING_TEST_ENDPOINT_ENABLED = process.env.NODE_ENV !== 'production';

/**
 * Handles get.
 */
export async function GET(request: Request) {
    if (!IS_DEVELOPMENT_CHAT_STREAMING_TEST_ENDPOINT_ENABLED) {
        return NextResponse.json(
            {
                error: {
                    message: spaceTrim(`
                        Endpoint \`/api/chat-streaming\` is a development-only OpenAI smoke test
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

    const openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    // Enable streaming from OpenAI
    const stream = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: message },
        ],
        stream: true,
    });

    // Create a ReadableStream to send chunks to the client as they arrive
    const readableStream = new ReadableStream({
        async start(controller) {
            for await (const chunk of stream) {
                // Each chunk contains a delta message
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                    controller.enqueue(new TextEncoder().encode(content));
                }
            }

            await forTime(100);
            controller.enqueue(new TextEncoder().encode('\n\n[DONE]'));

            controller.close();
        },
    });

    return new Response(readableStream, {
        status: 200,
        headers: { 'Content-Type': 'text/markdown' },
    });
}

// Note: [🐚] This is how streaming is implemented correctly
