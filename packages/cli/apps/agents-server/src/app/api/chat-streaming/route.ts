import { OpenAI } from 'openai';
import { forTime } from 'waitasecond';

export async function GET(request: Request) {
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
        headers: { 'Content-Type': 'text/plain' },
    });
}
