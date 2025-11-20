import { createOpenAiExecutionTools } from '@promptbook-local/openai';

export async function GET(request: Request) {
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

    /*
    return new Response(JSON.stringify(response, null, 4), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
    */

    return new Response(response.content, {
        status: 200,
        headers: { 'Content-Type': 'text/markdown' },
    });
}
