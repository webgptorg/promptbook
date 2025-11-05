import spaceTrim from 'spacetrim';
import { createAgentModelRequirements, parseAgentSource } from '../../_packages/core.index';
import {
    BookTranspiler,
    BookTranspilerOptions,
    ExecutionTools,
    string_book,
    string_script,
} from '../../_packages/types.index';
import { TODO_USE } from '../../utils/organization/TODO_USE';

/**
 * Transpiler to Javascript code using OpenAI SDK.
 *
 * @public exported from `@promptbook/core`
 */
export const OpenAiSdkTranspiler = {
    name: 'openai-sdk',
    title: 'OpenAI SDK',
    packageName: '@promptbook/core',
    className: 'OpenAiSdkTranspiler',
    async transpileBook(
        book: string_book,
        tools: ExecutionTools,
        options?: BookTranspilerOptions,
    ): Promise<string_script> {
        const { agentName, personaDescription } = await parseAgentSource(book);
        const modelRequirements = await createAgentModelRequirements(book);

        TODO_USE(tools);
        TODO_USE(options);
        TODO_USE(personaDescription);

        const source = spaceTrim(
            (block) => `

                #!/usr/bin/env node

                import * as dotenv from 'dotenv';

                dotenv.config({ path: '.env' });

                import { spaceTrim } from '@promptbook/utils';
                import OpenAI from 'openai';
                import readline from 'readline';

                // ---- CONFIG ----
                const client = new OpenAI({
                    apiKey: process.env.OPENAI_API_KEY,
                });

                // ---- CLI SETUP ----
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout,
                });

                const chatHistory = [
                    {
                        role: 'system',
                        content: spaceTrim(\`
                            ${block(modelRequirements.systemMessage)}
                        \`),
                    },
                ];

                async function ask(question) {
                    chatHistory.push({ role: 'user', content: question });

                    const response = await client.chat.completions.create({
                        model: 'gpt-4o',
                        messages: chatHistory,
                        temperature: ${modelRequirements.temperature},
                    });

                    const answer = response.choices[0].message.content;
                    console.log('\\n🧠 ${agentName}:', answer, '\\n');

                    chatHistory.push({ role: 'assistant', content: answer });
                    promptUser();
                }

                function promptUser() {
                    rl.question('💬 You: ', (input) => {
                        if (input.trim().toLowerCase() === 'exit') {
                            console.log('👋 Bye!');
                            rl.close();
                            return;
                        }
                        ask(input);
                    });
                }

                console.log("🤖 Chat with ${agentName} (type 'exit' to quit)\\n");
                promptUser();

            `,
        );

        return source;
    },
} as const satisfies BookTranspiler;
