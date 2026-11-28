import { spaceTrim } from 'spacetrim';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { LlmToolDefinition } from '../../types/LlmToolDefinition';
import type { string_script } from '../../types/string_markdown';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { BookTranspiler } from '../_common/BookTranspiler';
import type { BookTranspilerOptions } from '../_common/BookTranspilerOptions';
import { createTranspiledTeamRuntimeSection } from '../_common/createTranspiledTeamRuntimeSection';
import { createZodSchemaSource } from '../_common/createZodSchemaSource';
import { formatUsedToolFunctions } from '../_common/formatUsedToolFunctions';
import { prepareSdkTranspilerContext } from '../_common/prepareSdkTranspilerContext';
import type { TranspiledTeamExport } from '../_common/TranspiledTeamExport';

/**
 * Global extension directory scanned by Pi inside the VM home folder.
 *
 * @private internal constant of `AgentOsTranspiler`
 */
const PI_EXTENSION_DIRECTORY_PATH = '/home/user/.pi/agent/extensions';

/**
 * Filename used for the generated Promptbook Pi extension.
 *
 * @private internal constant of `AgentOsTranspiler`
 */
const PI_EXTENSION_FILENAME = 'promptbook-agent.js';

/**
 * Transpiler to JavaScript code using AgentOS.
 *
 * @public exported from `@promptbook/core`
 */
export const AgentOsTranspiler = {
    name: 'agent-os',
    title: 'AgentOS',
    packageName: '@promptbook/core',
    className: 'AgentOsTranspiler',
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

        const shouldGenerateToolkit = Boolean(modelRequirements.tools && modelRequirements.tools.length > 0);
        const resolvedSystemMessage = resolveAgentOsSystemMessage({
            systemMessage: modelRequirements.systemMessage,
            directKnowledge,
            isKnowledgeHandledWithRetrieval,
        });

        return spaceTrim(
            (block) => `
                #!/usr/bin/env node

                import * as dotenv from 'dotenv';

                import { AgentOs } from '@rivet-dev/agent-os-core';
                import common from '@rivet-dev/agent-os-common';
                import pi from '@rivet-dev/agent-os-pi';
                ${shouldGenerateToolkit ? `import { hostTool, toolKit } from '@rivet-dev/agent-os-core';` : ''}
                ${shouldGenerateToolkit ? `import { z } from 'zod';` : ''}
                import readline from 'readline';
                import { spaceTrim } from '@promptbook/utils';
                ${
                    isKnowledgeHandledWithRetrieval
                        ? `import { Document, SimpleDirectoryReader, VectorStoreIndex } from 'llamaindex';`
                        : ''
                }

                dotenv.config({ path: '.env' });

                // ---- CONFIG ----
                const AGENT_NAME = ${block(JSON.stringify(agentName))};
                const PROMPT_SUFFIX = ${block(JSON.stringify(modelRequirements.promptSuffix.trim()))};
                const SYSTEM_MESSAGE = ${block(JSON.stringify(resolvedSystemMessage))};
                ${block(createAgentOsToolkitSection(modelRequirements.tools || [], usedToolFunctions, transpiledTeam))}
                ${block(
                    createAgentOsKnowledgeSection({
                        directKnowledge,
                        knowledgeSources,
                        isKnowledgeHandledWithRetrieval,
                    }),
                )}

                /**
                 * Starts the AgentOS-backed chat harness.
                 */
                async function main() {
                    // ---- VM ----
                    const vm = await AgentOs.create({
                        software: [common, pi],
                        ${shouldGenerateToolkit ? `toolKits: [PROMPTBOOK_TOOLKIT],` : ''}
                    });

                    // Pi discovers the extension automatically after the file exists in the VM filesystem.
                    await vm.mkdir(${block(JSON.stringify(PI_EXTENSION_DIRECTORY_PATH))}, { recursive: true });
                    await vm.writeFile(
                        ${block(JSON.stringify(`${PI_EXTENSION_DIRECTORY_PATH}/${PI_EXTENSION_FILENAME}`))},
                        ${block(JSON.stringify(createPiExtensionCode(resolvedSystemMessage), null, 4))},
                    );

                    const { sessionId } = await vm.createSession('pi', {
                        env: {
                            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
                            ANTHROPIC_CLAUDE_API_KEY: process.env.ANTHROPIC_CLAUDE_API_KEY,
                        },
                    });

                    vm.onSessionEvent(sessionId, (event) => console.log(event));

                    ${isKnowledgeHandledWithRetrieval ? 'await setupKnowledge();' : ''}

                    // ---- CLI ----
                    const rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout,
                    });

                    async function ask(question) {
                        let prompt = question;

                        ${isKnowledgeHandledWithRetrieval ? getKnowledgePromptAugmentationCode() : ''}

                        prompt = appendPromptSuffix(prompt);

                        try {
                            await vm.prompt(sessionId, prompt);
                        } catch (error) {
                            console.error(error);
                        }

                        promptUser();
                    }

                    function appendPromptSuffix(question) {
                        if (!PROMPT_SUFFIX) {
                            return question;
                        }

                        return spaceTrim(\`
                            \${question}

                            \${PROMPT_SUFFIX}
                        \`);
                    }

                    function promptUser() {
                        rl.question('💬 You: ', (input) => {
                            if (input.trim().toLowerCase() === 'exit') {
                                console.log('👋 Bye!');
                                rl.close();
                                return;
                            }

                            void ask(input);
                        });
                    }

                    console.log(\`🤖 Chat with \${AGENT_NAME} (type 'exit' to quit)\\n\`);
                    promptUser();
                }

                main().catch((error) => {
                    console.error(error);
                    process.exit(1);
                });
            `,
        );
    },
} as const satisfies BookTranspiler; /* <- Note: [🤛] */

/**
 * Returns the system prompt used by the generated Pi extension.
 *
 * The extension is intentionally tiny: it only appends Promptbook instructions to Pi's own
 * prompt so Pi can keep its built-in behavior while still respecting the Book source.
 *
 * @param systemMessage - Promptbook system message compiled from the Book source.
 * @returns CommonJS extension source.
 *
 * @private helper of `AgentOsTranspiler`
 */
function createPiExtensionCode(systemMessage: string): string {
    return spaceTrim(
        (block) => `
            module.exports = function (pi) {
                pi.on('before_agent_start', async (event) => {
                    return {
                        systemPrompt: event.systemPrompt + '\\n\\n' + ${block(JSON.stringify(systemMessage))},
                    };
                });
            };
        `,
    );
}

/**
 * Builds the top-level toolkit section used to expose Promptbook tool implementations to AgentOS.
 *
 * @param toolDefinitions - Tool definitions compiled from the Book source.
 * @param usedToolFunctions - Tool function implementations extracted from commitment definitions.
 * @returns Generated JavaScript source or an empty string when no tool is needed.
 *
 * @private helper of `AgentOsTranspiler`
 */
function createAgentOsToolkitSection(
    toolDefinitions: ReadonlyArray<LlmToolDefinition>,
    usedToolFunctions: Record<string, string>,
    transpiledTeam: TranspiledTeamExport | null,
): string {
    if (toolDefinitions.length === 0) {
        return '';
    }

    return spaceTrim(
        (block) => `
            ${block(createTranspiledTeamRuntimeSection(transpiledTeam))}

            // ---- TOOLS ----
            const PROMPTBOOK_TOOL_IMPLEMENTATIONS = {
                ${block(formatUsedToolFunctions(usedToolFunctions))}
            };

            const PROMPTBOOK_TOOLKIT = toolKit({
                name: 'promptbook',
                description: 'Promptbook tools generated from the Book source.',
                tools: {
                    ${block(
                        toolDefinitions
                            .map((toolDefinition) => createAgentOsHostToolSource(toolDefinition))
                            .join('\n\n'),
                    )}
                },
            });
        `,
    );
}

/**
 * Creates one AgentOS host-tool definition.
 *
 * @param toolDefinition - Promptbook tool definition compiled from the Book source.
 * @returns JavaScript source for one `hostTool` entry.
 *
 * @private helper of `AgentOsTranspiler`
 */
function createAgentOsHostToolSource(toolDefinition: LlmToolDefinition): string {
    const toolNameLiteral = JSON.stringify(toolDefinition.name);
    const description = JSON.stringify(toolDefinition.description.trim());

    return spaceTrim(
        (block) => `
            ${toolNameLiteral}: hostTool({
                description: ${description},
                inputSchema: ${block(createZodSchemaSource(toolDefinition.parameters))},
                execute: async (input) => {
                    const toolImplementation = PROMPTBOOK_TOOL_IMPLEMENTATIONS[${toolNameLiteral}];

                    if (!toolImplementation) {
                        throw new Error(\`Tool ${JSON.stringify(
                            toolDefinition.name,
                        )} is not implemented in the exported harness.\`);
                    }

                    return await toolImplementation(input);
                },
            }),
        `,
    );
}

/**
 * Creates the knowledge-handling section for the generated harness.
 *
 * @param options - Knowledge snippets compiled from the Book source.
 * @returns Knowledge loading helpers or an empty string when retrieval is not needed.
 *
 * @private helper of `AgentOsTranspiler`
 */
function createAgentOsKnowledgeSection(options: {
    readonly directKnowledge: ReadonlyArray<string>;
    readonly knowledgeSources: ReadonlyArray<string>;
    readonly isKnowledgeHandledWithRetrieval: boolean;
}): string {
    const { directKnowledge, knowledgeSources, isKnowledgeHandledWithRetrieval } = options;

    if (!isKnowledgeHandledWithRetrieval) {
        return '';
    }

    return spaceTrim(
        (block) => `
            // ---- KNOWLEDGE ----
            const DIRECT_KNOWLEDGE = ${block(JSON.stringify(directKnowledge, null, 4))};
            const KNOWLEDGE_SOURCES = ${block(JSON.stringify(knowledgeSources, null, 4))};
            let knowledgeIndex;

            /**
             * Builds a local retrieval index from inline knowledge and external sources.
             */
            async function setupKnowledge() {
                const documents = DIRECT_KNOWLEDGE.map((text) => new Document({ text }));

                for (const source of KNOWLEDGE_SOURCES) {
                    try {
                        // Note: SimpleDirectoryReader is a bit of a misnomer, it can read single files.
                        const reader = new SimpleDirectoryReader();
                        const sourceDocuments = await reader.loadData(source);
                        documents.push(...sourceDocuments);
                    } catch (error) {
                        console.error(\`Error loading knowledge from \${source}:\`, error);
                    }
                }

                if (documents.length > 0) {
                    knowledgeIndex = await VectorStoreIndex.fromDocuments(documents);
                    console.log('🧠 Knowledge base prepared.');
                }
            }
        `,
    );
}

/**
 * Creates the prompt augmentation block used when knowledge retrieval is enabled.
 *
 * @returns JavaScript source that prepends retrieved context to the current user prompt.
 *
 * @private helper of `AgentOsTranspiler`
 */
function getKnowledgePromptAugmentationCode(): string {
    return spaceTrim(`
        let knowledgeContext = '';

        if (knowledgeIndex) {
            const retriever = knowledgeIndex.asRetriever();
            const relevantNodes = await retriever.retrieve(prompt);
            knowledgeContext = relevantNodes.map((node) => node.getContent()).join('\\n\\n');
        }

        if (knowledgeContext) {
            prompt = spaceTrim(\`
                Here is some additional context to help you answer the question:
                \${knowledgeContext}

                ---

                My question is:
                \${prompt}
            \`);
        }
    `);
}

/**
 * Resolves the final system prompt that Pi should receive.
 *
 * The AgentOS extension only needs a single string, so small inline knowledge blocks are embedded
 * directly when retrieval is not necessary.
 *
 * @param options - System prompt and knowledge snippets derived from the Book source.
 * @returns Final prompt string injected into the Pi extension.
 *
 * @private helper of `AgentOsTranspiler`
 */
function resolveAgentOsSystemMessage(options: {
    readonly systemMessage: string;
    readonly directKnowledge: ReadonlyArray<string>;
    readonly isKnowledgeHandledWithRetrieval: boolean;
}): string {
    const { systemMessage, directKnowledge, isKnowledgeHandledWithRetrieval } = options;

    if (isKnowledgeHandledWithRetrieval || directKnowledge.length === 0) {
        return systemMessage;
    }

    return spaceTrim(
        (block) => `
            ${systemMessage}

            Direct knowledge:
            ${block(directKnowledge.join('\n\n'))}
        `,
    );
}
