import spaceTrim from 'spacetrim';
import { createAgentModelRequirements, parseAgentSource } from '../../_packages/core.index';
import { parseAgentSourceWithCommitments } from '../../book-2.0/agent-source/parseAgentSourceWithCommitments';
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
        const { agentName } = await parseAgentSource(book);
        const modelRequirements = await createAgentModelRequirements(book);
        const { commitments } = parseAgentSourceWithCommitments(book);

        const knowledgeCommitments = commitments.filter((commitment) => commitment.type === 'KNOWLEDGE');
        const directKnowledge = knowledgeCommitments
            .map((commitment) => commitment.content.trim())
            .filter((content) => {
                try {
                    new URL(content);
                    return false;
                } catch {
                    return true;
                }
            });

        const knowledgeSources = knowledgeCommitments
            .map((commitment) => commitment.content.trim())
            .filter((content) => {
                try {
                    new URL(content);
                    return true;
                } catch {
                    return false;
                }
            });

        TODO_USE(tools);
        TODO_USE(options);

        const KNOWLEDGE_THRESHOLD = 1000;

        if (directKnowledge.join('\n').length > KNOWLEDGE_THRESHOLD || knowledgeSources.length > 0) {
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
                    const knowledge = ${JSON.stringify(directKnowledge, null, 4)};
                    const knowledgeSources = ${JSON.stringify(knowledgeSources, null, 4)};
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
                        let context = '';
                        if (index) {
                            const retriever = index.asRetriever();
                            const relevantNodes = await retriever.retrieve(question);
                            context = relevantNodes.map((node) => node.getContent()).join('\\n\\n');
                        }

                        const userMessage = spaceTrim(\`
                            ${block(
                                `
                                Here is some additional context to help you answer the question:
                                \${context}

                                ---

                                My question is:
                                \${question}
                                `,
                            )}
                        \`);


                        chatHistory.push({ role: 'user', content: userMessage });

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

                    (async () => {
                        await setupKnowledge();
                        console.log("🤖 Chat with ${agentName} (type 'exit' to quit)\\n");
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
