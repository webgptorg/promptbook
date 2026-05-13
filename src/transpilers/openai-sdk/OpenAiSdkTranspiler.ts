import { spaceTrim } from 'spacetrim';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { string_script } from '../../types/string_markdown';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { BookTranspilerOptions } from '../_common/BookTranspilerOptions';
import { createTranspiledTeamRuntimeSection } from '../_common/createTranspiledTeamRuntimeSection';
import { formatUsedToolFunctions } from '../_common/formatUsedToolFunctions';
import { prepareSdkTranspilerContext } from '../_common/prepareSdkTranspilerContext';

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
        const {
            agentName,
            modelRequirements,
            directKnowledge,
            knowledgeSources,
            usedToolFunctions,
            isKnowledgeHandledWithRetrieval,
            transpiledTeam,
        } = await prepareSdkTranspilerContext(book, options);

        TODO_USE(tools);

        if (isKnowledgeHandledWithRetrieval) {
            return spaceTrim(
                (block) => `
                    #!/usr/bin/env node

                    import * as dotenv from 'dotenv';
                    dotenv.config({ path: '.env' });

                    import { spaceTrim } from '@promptbook/utils';
                    import OpenAI from 'openai';
                    import readline from 'readline';
                    import { Document, VectorStoreIndex, SimpleDirectoryReader } from 'llamaindex';

                    // ---- CONFIG ----
                    const client = new OpenAI({
                        apiKey: process.env.OPENAI_API_KEY,
                    });

                    // ---- KNOWLEDGE ----
                    const knowledge = ${block(
                        JSON.stringify(directKnowledge, null, 4) /* <- TODO: Use here Promptbook stringify */,
                    )};
                    const knowledgeSources = ${block(
                        JSON.stringify(knowledgeSources, null, 4) /* <- TODO: Use here Promptbook stringify */,
                    )};
                    let index;

                    async function setupKnowledge() {
                        const documents = knowledge.map((text) => new Document({ text }));

                        for (const source of knowledgeSources) {
                            try {
                                // Note: SimpleDirectoryReader is a bit of a misnomer, it can read single files
                                const reader = new SimpleDirectoryReader();
                                const sourceDocuments = await reader.loadData(source);
                                documents.push(...sourceDocuments);
                            } catch (error) {
                                console.error(\`Error loading knowledge from \${source}:\`, error);
                            }
                        }

                        if (documents.length > 0) {
                            index = await VectorStoreIndex.fromDocuments(documents);
                            console.log('🧠 Knowledge base prepared.');
                        }
                    }

                    ${block(createTranspiledTeamRuntimeSection(transpiledTeam))}

                    // ---- TOOLS ----
                    const tools = {
                        ${block(formatUsedToolFunctions(usedToolFunctions))}
                    };

                    const toolDefinitions = ${block(JSON.stringify(modelRequirements.tools || [], null, 4))};

                    // ---- CLI SETUP ----
                    const rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout,
                    });

                    const chatHistory = [
                        {
                            role: 'system',
                            content: spaceTrim(\`
                                ${block(modelRequirements.systemMessage.split('`').join('\\`'))}
                            \`),
                        },
                    ];

                    async function ask(question) {
                        let context = '';
                        if (index) {
                            const retriever = index.asRetriever();
                            const relevantNodes = await retriever.retrieve(question);
                            context = relevantNodes.map((node) => node.getContent()).join('\\n\\n');
                        }

                        if (context) {
                            question = spaceTrim(\`
                                ${block(
                                    spaceTrim(`
                                        Here is some additional context to help you answer the question:
                                        \${context}

                                        ---

                                        My question is:
                                        \${question}
                                    `),
                                    // <- TODO: !!! Maybe block in the spaceTrim shoud do the spaceTrim automatically?
                                )}
                            \`);
                        }

                        chatHistory.push({ role: 'user', content: question });

                        await performAiCall();
                    }

                    async function performAiCall() {
                        const response = await client.chat.completions.create({
                            model: 'gpt-4o',
                            messages: chatHistory,
                            temperature: ${modelRequirements.temperature},
                            ${
                                modelRequirements.tools && modelRequirements.tools.length > 0
                                    ? `tools: toolDefinitions.map(tool => ({ type: 'function', function: tool })),`
                                    : ''
                            }
                        });

                        const message = response.choices[0].message;

                        if (message.tool_calls && message.tool_calls.length > 0) {
                            chatHistory.push(message);

                            for (const toolCall of message.tool_calls) {
                                const functionName = toolCall.function.name;
                                const functionArgs = JSON.parse(toolCall.function.arguments);

                                console.log(\`🛠️ Calling tool \${functionName}...\`);
                                let result;
                                try {
                                    result = await tools[functionName](functionArgs);
                                } catch (error) {
                                    result = \`Error: \${error.message}\`;
                                }

                                chatHistory.push({
                                    tool_call_id: toolCall.id,
                                    role: 'tool',
                                    name: functionName,
                                    content: typeof result === 'string' ? result : JSON.stringify(result),
                                });
                            }

                            await performAiCall();
                            return;
                        }

                        const answer = message.content;
                        console.log('\\n🧠 ${
                            agentName /* <- TODO: [🕛] There should be `agentFullname` not `agentName` */
                        }:', answer, '\\n');

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

                    (async () => {
                        await setupKnowledge();
                        console.log("🤖 Chat with ${
                            agentName /* <- TODO: [🕛] There should be `agentFullname` not `agentName` */
                        } (type 'exit' to quit)\\n");
                        promptUser();
                    })();
                `,
            );
        }

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

                ${block(createTranspiledTeamRuntimeSection(transpiledTeam))}

                // ---- TOOLS ----
                const tools = {
                    ${block(formatUsedToolFunctions(usedToolFunctions))}
                };

                const toolDefinitions = ${block(JSON.stringify(modelRequirements.tools || [], null, 4))};

                // ---- CLI SETUP ----
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout,
                });

                const chatHistory = [
                    {
                        role: 'system',
                        content: spaceTrim(\`
                            ${block(modelRequirements.systemMessage.split('`').join('\\`'))}
                        \`),
                    },
                ];

                async function ask(question) {
                    chatHistory.push({ role: 'user', content: question });
                    await performAiCall();
                }

                async function performAiCall() {
                    const response = await client.chat.completions.create({
                        model: 'gpt-4o',
                        messages: chatHistory,
                        temperature: ${modelRequirements.temperature},
                        ${
                            modelRequirements.tools && modelRequirements.tools.length > 0
                                ? `tools: toolDefinitions.map(tool => ({ type: 'function', function: tool })),`
                                : ''
                        }
                    });

                    const message = response.choices[0].message;

                    if (message.tool_calls && message.tool_calls.length > 0) {
                        chatHistory.push(message);

                        for (const toolCall of message.tool_calls) {
                            const functionName = toolCall.function.name;
                            const functionArgs = JSON.parse(toolCall.function.arguments);

                            console.log(\`🛠️ Calling tool \${functionName}...\`);
                            let result;
                            try {
                                result = await tools[functionName](functionArgs);
                            } catch (error) {
                                result = \`Error: \${error.message}\`;
                            }

                            chatHistory.push({
                                tool_call_id: toolCall.id,
                                role: 'tool',
                                name: functionName,
                                content: typeof result === 'string' ? result : JSON.stringify(result),
                            });
                        }

                        await performAiCall();
                        return;
                    }

                    const answer = message.content;
                    console.log('\\n🧠 ${
                        agentName /* <- TODO: [🕛] There should be `agentFullname` not `agentName` */
                    }:', answer, '\\n');

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

                console.log("🤖 Chat with ${
                    agentName /* <- TODO: [🕛] There should be `agentFullname` not `agentName` */
                } (type 'exit' to quit)\\n");
                promptUser();

            `,
        );

        return source;
    },
} as const satisfies BookTranspiler;
