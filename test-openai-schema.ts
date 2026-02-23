import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const client = new OpenAI();

async function main() {
    try {
        const response = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'List the key topics and include a short message about them.' }],
            response_format: {
                type: 'json_schema',
                json_schema: {
                    name: 'test',
                    strict: true,
                    schema: {
                        type: 'object',
                        properties: {
                            topics: { type: 'array', items: { type: 'string' } },
                            message: { type: 'string' }
                        },
                        required: ['topics', 'message'],
                        additionalProperties: true
                    }
                }
            }
        });
        console.log(response.choices[0].message.content);
    } catch (e) {
        console.error('ERROR:', e.message);
    }
}
main();