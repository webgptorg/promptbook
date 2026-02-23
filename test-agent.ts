import { Agent } from '@openai/agents';
import { run } from '@openai/agents';
import { setDefaultOpenAIClient } from '@openai/agents';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

setDefaultOpenAIClient(new OpenAI());

async function main() {
    const agent = new Agent({
        name: 'test',
        model: 'gpt-4o-mini',
        instructions: 'You are a test agent',
    }).clone({
        outputType: {
            type: 'json_schema',
            name: 'StructuredOutput',
            strict: true,
            schema: {
                type: 'object',
                properties: {
                    topics: {
                        type: 'array',
                        items: {
                            type: 'string'
                        }
                    },
                    message: {
                        type: 'string'
                    }
                },
                required: [
                    'topics',
                    'message'
                ],
                additionalProperties: true
            }
        } as any
    });

    try {
        const stream = await run(agent, [{ role: 'user', content: 'List the key topics and include a short message about them.' }], { stream: true });
        for await (const event of stream) {
            console.log(event.type);
        }
        await stream.completed;
        console.log('finalOutput:', stream.finalOutput);
    } catch (e) {
        console.error('ERROR:', e);
    }
}
main();