import { spaceTrim } from 'spacetrim';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { string_script } from '../../types/string_markdown';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { BookTranspiler } from '../_common/BookTranspiler';
import type { BookTranspilerOptions } from '../_common/BookTranspilerOptions';
import { createTranspiledTeamRuntimeSection } from '../_common/createTranspiledTeamRuntimeSection';
import { formatUsedToolFunctions } from '../_common/formatUsedToolFunctions';
import { prepareSdkTranspilerContext } from '../_common/prepareSdkTranspilerContext';
import { resolveClaudeModelName } from '../_common/resolveClaudeModelName';

/**
 * Default output-token budget required by Anthropic's Messages API.
 *
 * @private used by `AnthropicClaudeSdkTranspiler`
 */
const DEFAULT_ANTHROPIC_MAX_TOKENS = 8192;

/**
 * Transpiler to JavaScript code using Anthropic's Claude SDK.
 *
 * @public exported from `@promptbook/core`
 */
export const AnthropicClaudeSdkTranspiler = {
    name: 'anthropic-claude-sdk',
    title: 'Anthropic Claude SDK',
    packageName: '@promptbook/core',
    className: 'AnthropicClaudeSdkTranspiler',
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

        const anthropicModelName = resolveClaudeModelName(modelRequirements.modelName);

        if (isKnowledgeHandledWithRetrieval) {
            return spaceTrim(
                (block) => `
                    #!/usr/bin/env node

                    import * as dotenv from 'dotenv';
                    dotenv.config({ path: '.env' });

                    import { spaceTrim } from '@promptbook/utils';
                    import Anthropic from '@anthropic-ai/sdk';
                    import readline from 'readline';
                    import { Document, VectorStoreIndex, SimpleDirectoryReader } from 'llamaindex';

                    // ---- CONFIG ----
                    const client = new Anthropic({
                        apiKey: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_CLAUDE_API_KEY,
                    });

                    // ---- KNOWLEDGE ----
                    const knowledge = ${block(JSON.stringify(directKnowledge, null, 4))};
                    const knowledgeSources = ${block(JSON.stringify(knowledgeSources, null, 4))};
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
                    const toolImplementations = {
                        ${block(formatUsedToolFunctions(usedToolFunctions))}
                    };

                    const toolDefinitions = ${block(JSON.stringify(modelRequirements.tools || [], null, 4))};
                    const anthropicTools = toolDefinitions.map((toolDefinition) => ({
                        name: toolDefinition.name,
                        description: toolDefinition.description,
                        input_schema: toolDefinition.parameters,
                    }));

                    // ---- CLI SETUP ----
                    const rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout,
                    });

                    const chatHistory = [];

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
                                )}
                            \`);
                        }

                        chatHistory.push({ role: 'user', content: question });
                        await performAiCall();
                    }

                    async function performAiCall() {
                        const response = await client.messages.create({
                            model: '${anthropicModelName}',
                            system: spaceTrim(\`
                                ${block(modelRequirements.systemMessage.split('`').join('\\`'))}
                            \`),
                            messages: chatHistory,
                            max_tokens: ${DEFAULT_ANTHROPIC_MAX_TOKENS},
                            temperature: ${modelRequirements.temperature},
                            ${
                                modelRequirements.tools && modelRequirements.tools.length > 0
                                    ? `tools: anthropicTools,`
                                    : ''
                            }
                        });

                        const toolUseBlocks = response.content.filter((contentBlock) => contentBlock.type === 'tool_use');

                        if (toolUseBlocks.length > 0) {
                            chatHistory.push({ role: 'assistant', content: response.content });

                            const toolResults = [];

                            for (const toolUseBlock of toolUseBlocks) {
                                const functionName = toolUseBlock.name;
                                const functionArgs = toolUseBlock.input;
                                const toolImplementation = toolImplementations[functionName];

                                console.log(\`🛠️ Calling tool \${functionName}...\`);

                                let result;
                                let isError = false;

                                try {
                                    if (!toolImplementation) {
                                        throw new Error(\`Tool "\${functionName}" is not implemented in the exported harness.\`);
                                    }

                                    result = await toolImplementation(functionArgs);
                                } catch (error) {
                                    result = \`Error: \${error instanceof Error ? error.message : String(error)}\`;
                                    isError = true;
                                }

                                toolResults.push({
                                    type: 'tool_result',
                                    tool_use_id: toolUseBlock.id,
                                    content: typeof result === 'string' ? result : JSON.stringify(result),
                                    ...(isError ? { is_error: true } : {}),
                                });
                            }

                            chatHistory.push({
                                role: 'user',
                                content: toolResults,
                            });

                            await performAiCall();
                            return;
                        }

                        const answer =
                            response.content
                                .filter((contentBlock) => contentBlock.type === 'text')
                                .map((contentBlock) => contentBlock.text)
                                .join('\\n\\n') || '(Claude returned no text response.)';

                        console.log('\\n🧠 ${agentName}:', answer, '\\n');

                        chatHistory.push({ role: 'assistant', content: response.content });
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

        return spaceTrim(
            (block) => `
                #!/usr/bin/env node

                import * as dotenv from 'dotenv';
                dotenv.config({ path: '.env' });

                import Anthropic from '@anthropic-ai/sdk';
                import readline from 'readline';
                import { spaceTrim } from '@promptbook/utils';

                // ---- CONFIG ----
                const client = new Anthropic({
                    apiKey: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_CLAUDE_API_KEY,
                });

                ${block(createTranspiledTeamRuntimeSection(transpiledTeam))}

                // ---- TOOLS ----
                const toolImplementations = {
                    ${block(formatUsedToolFunctions(usedToolFunctions))}
                };

                const toolDefinitions = ${block(JSON.stringify(modelRequirements.tools || [], null, 4))};
                const anthropicTools = toolDefinitions.map((toolDefinition) => ({
                    name: toolDefinition.name,
                    description: toolDefinition.description,
                    input_schema: toolDefinition.parameters,
                }));

                // ---- CLI SETUP ----
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout,
                });

                const chatHistory = [];

                async function ask(question) {
                    chatHistory.push({ role: 'user', content: question });
                    await performAiCall();
                }

                async function performAiCall() {
                    const response = await client.messages.create({
                        model: '${anthropicModelName}',
                        system: spaceTrim(\`
                            ${block(modelRequirements.systemMessage.split('`').join('\\`'))}
                        \`),
                        messages: chatHistory,
                        max_tokens: ${DEFAULT_ANTHROPIC_MAX_TOKENS},
                        temperature: ${modelRequirements.temperature},
                        ${modelRequirements.tools && modelRequirements.tools.length > 0 ? `tools: anthropicTools,` : ''}
                    });

                    const toolUseBlocks = response.content.filter((contentBlock) => contentBlock.type === 'tool_use');

                    if (toolUseBlocks.length > 0) {
                        chatHistory.push({ role: 'assistant', content: response.content });

                        const toolResults = [];

                        for (const toolUseBlock of toolUseBlocks) {
                            const functionName = toolUseBlock.name;
                            const functionArgs = toolUseBlock.input;
                            const toolImplementation = toolImplementations[functionName];

                            console.log(\`🛠️ Calling tool \${functionName}...\`);

                            let result;
                            let isError = false;

                            try {
                                if (!toolImplementation) {
                                    throw new Error(\`Tool "\${functionName}" is not implemented in the exported harness.\`);
                                }

                                result = await toolImplementation(functionArgs);
                            } catch (error) {
                                result = \`Error: \${error instanceof Error ? error.message : String(error)}\`;
                                isError = true;
                            }

                            toolResults.push({
                                type: 'tool_result',
                                tool_use_id: toolUseBlock.id,
                                content: typeof result === 'string' ? result : JSON.stringify(result),
                                ...(isError ? { is_error: true } : {}),
                            });
                        }

                        chatHistory.push({
                            role: 'user',
                            content: toolResults,
                        });

                        await performAiCall();
                        return;
                    }

                    const answer =
                        response.content
                            .filter((contentBlock) => contentBlock.type === 'text')
                            .map((contentBlock) => contentBlock.text)
                            .join('\\n\\n') || '(Claude returned no text response.)';

                    console.log('\\n🧠 ${agentName}:', answer, '\\n');

                    chatHistory.push({ role: 'assistant', content: response.content });
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
    },
} as const satisfies BookTranspiler; /* <- Note: [🤛] */
