import { OpenAI } from 'openai';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const message = searchParams.get('message') || 'Hello, who are you?';

    const openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: message },
        ],
        stream: false,
    });

    return new Response(response.choices[0].message.content, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
    });
}
