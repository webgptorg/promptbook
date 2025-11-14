import { createOpenAiExecutionTools } from '@promptbook-local/openai';

export async function GET() {
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
        content: 'Hello, who are you?',
    });

    return new Response(JSON.stringify(response, null, 4), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
