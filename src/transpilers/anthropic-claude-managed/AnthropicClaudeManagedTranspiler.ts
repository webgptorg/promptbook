import { spaceTrim } from 'spacetrim';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { LlmToolDefinition } from '../../types/LlmToolDefinition';
import type { string_script } from '../../types/typeAliases';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { BookTranspiler } from '../_common/BookTranspiler';
import type { BookTranspilerOptions } from '../_common/BookTranspilerOptions';
import { createZodShapeSource } from '../_common/createZodSchemaSource';
import { createTranspiledTeamRuntimeSection } from '../_common/createTranspiledTeamRuntimeSection';
import { formatUsedToolFunctions } from '../_common/formatUsedToolFunctions';
import { prepareSdkTranspilerContext } from '../_common/prepareSdkTranspilerContext';
import { resolveClaudeModelName } from '../_common/resolveClaudeModelName';
import type { TranspiledTeamExport } from '../_common/TranspiledTeamExport';

/**
 * MCP server name used for Promptbook tool commitments in the managed Claude harness.
 *
 * @private internal constant of `AnthropicClaudeManagedTranspiler`
 */
const PROMPTBOOK_MCP_SERVER_NAME = 'promptbook';

/**
 * Transpiler to JavaScript code using Anthropic Claude Agent SDK managed sessions.
 *
 * @public exported from `@promptbook/core`
 */
export const AnthropicClaudeManagedTranspiler = {
    name: 'anthropic-claude-managed',
    title: 'Anthropic Claude Managed',
    packageName: '@promptbook/core',
    className: 'AnthropicClaudeManagedTranspiler',
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
        const shouldGenerateToolkit = Boolean(modelRequirements.tools && modelRequirements.tools.length > 0);

        return spaceTrim(
            (block) => `
                #!/usr/bin/env node

                import * as dotenv from 'dotenv';
                dotenv.config({ path: '.env' });

                import readline from 'readline';
                import { spaceTrim } from '@promptbook/utils';
                import { createSdkMcpServer, query, tool } from '@anthropic-ai/claude-agent-sdk';
                ${
                    isKnowledgeHandledWithRetrieval
                        ? `import { Document, SimpleDirectoryReader, VectorStoreIndex } from 'llamaindex';`
                        : ''
                }
                ${shouldGenerateToolkit ? `import { z } from 'zod';` : ''}

                // ---- CONFIG ----
                const AGENT_NAME = ${block(JSON.stringify(agentName))};
                const MODEL_NAME = ${block(JSON.stringify(anthropicModelName))};
                const SYSTEM_MESSAGE = ${block(JSON.stringify(modelRequirements.systemMessage))};
                const PROMPT_SUFFIX = ${block(JSON.stringify(modelRequirements.promptSuffix.trim()))};
                ${block(
                    createManagedClaudeKnowledgeSection({
                        directKnowledge,
                        knowledgeSources,
                        isKnowledgeHandledWithRetrieval,
                    }),
                )}
                ${block(createManagedClaudeToolkitSection(modelRequirements.tools || [], usedToolFunctions, transpiledTeam))}

                /**
                 * Starts the managed Claude-backed chat harness.
                 */
                async function main() {
                    await setupKnowledge();

                    // ---- CLI ----
                    const rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout,
                    });

                    let sessionId;

                    async function ask(question) {
                        const promptText = await resolvePromptText(question);

                        const queryOptions = {
                            model: MODEL_NAME,
                            cwd: process.cwd(),
                            settingSources: [],
                            systemPrompt: {
                                type: 'preset',
                                preset: 'claude_code',
                                append: SYSTEM_MESSAGE,
                            },
                            ...PROMPTBOOK_TOOL_OPTIONS,
                        };

                        if (sessionId) {
                            queryOptions.resume = sessionId;
                        }

                        const response = query({
                            prompt: createPromptMessages(promptText),
                            options: queryOptions,
                        });

                        for await (const message of response) {
                            if (message.type === 'system' && message.subtype === 'init') {
                                sessionId = message.session_id;
                            }

                            if (message.type === 'result') {
                                if (message.subtype === 'success') {
                                    const answer =
                                        typeof message.result === 'string' && message.result.trim()
                                            ? message.result
                                            : '(Claude returned no text response.)';

                                    console.log('\\n🧠', AGENT_NAME + ':', answer, '\\n');
                                } else {
                                    console.error(message);
                                }
                            }
                        }

                        promptUser();
                    }

                    /**
                     * Resolves the final user prompt by applying retrieved knowledge and the Promptbook suffix.
                     *
                     * @param question - Raw user question typed in the terminal.
                     * @returns Final prompt text sent to Claude.
                     */
                    async function resolvePromptText(question) {
                        let promptText = await appendKnowledgeContext(question);

                        if (PROMPT_SUFFIX) {
                            promptText = spaceTrim(\`
                                \${promptText}

                                \${PROMPT_SUFFIX}
                            \`);
                        }

                        return promptText;
                    }

                    /**
                     * Creates the async iterator consumed by the Claude Agent SDK.
                     *
                     * @param promptText - Final user prompt to send to the SDK.
                     * @returns Async generator that yields one user message.
                     */
                    async function* createPromptMessages(promptText) {
                        yield {
                            type: 'user',
                            message: {
                                role: 'user',
                                content: promptText,
                            },
                        };
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

                    console.log('🤖 Chat with ' + AGENT_NAME + " (type 'exit' to quit)\\n");
                    promptUser();
                }

                main().catch((error) => {
                    console.error(error);
                    process.exit(1);
                });
            `,
        );
    },
} as const satisfies BookTranspiler;

/**
 * Creates the knowledge-handling section used by the managed Claude transpiler.
 *
 * The generated harness stays self-contained when retrieval is not required and only loads
 * `llamaindex` when the Book source actually needs local knowledge search.
 *
 * @param options - Knowledge snippets compiled from the Book source.
 * @returns Knowledge loading helpers or a no-op fallback when retrieval is not needed.
 *
 * @private helper of `AnthropicClaudeManagedTranspiler`
 */
function createManagedClaudeKnowledgeSection(options: {
    readonly directKnowledge: ReadonlyArray<string>;
    readonly knowledgeSources: ReadonlyArray<string>;
    readonly isKnowledgeHandledWithRetrieval: boolean;
}): string {
    const { directKnowledge, knowledgeSources, isKnowledgeHandledWithRetrieval } = options;

    if (!isKnowledgeHandledWithRetrieval) {
        return spaceTrim(`
            /**
             * No-op knowledge setup used when the Book source does not require retrieval.
             */
            async function setupKnowledge() {}

            /**
             * Returns the original prompt unchanged when retrieval is disabled.
             *
             * @param promptText - Raw user prompt.
             * @returns Unmodified user prompt.
             */
            async function appendKnowledgeContext(promptText) {
                return promptText;
            }
        `);
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

            /**
             * Adds retrieved knowledge context to the current prompt when available.
             *
             * @param promptText - Current user prompt.
             * @returns Prompt with additional retrieval context when one is available.
             */
            async function appendKnowledgeContext(promptText) {
                if (!knowledgeIndex) {
                    return promptText;
                }

                const retriever = knowledgeIndex.asRetriever();
                const relevantNodes = await retriever.retrieve(promptText);
                const knowledgeContext = relevantNodes.map((node) => node.getContent()).join('\\n\\n');

                if (!knowledgeContext) {
                    return promptText;
                }

                return spaceTrim(\`
                    Here is some additional context to help you answer the question:
                    \${knowledgeContext}

                    ---

                    My question is:
                    \${promptText}
                \`);
            }
        `,
    );
}

/**
 * Creates the managed Claude SDK custom tool section.
 *
 * @param toolDefinitions - Tool definitions compiled from the Book source.
 * @param usedToolFunctions - Tool function implementations extracted from commitment definitions.
 * @returns Generated JavaScript source for the Claude Agent SDK tools section.
 *
 * @private helper of `AnthropicClaudeManagedTranspiler`
 */
function createManagedClaudeToolkitSection(
    toolDefinitions: ReadonlyArray<LlmToolDefinition>,
    usedToolFunctions: Record<string, string>,
    transpiledTeam: TranspiledTeamExport | null,
): string {
    if (toolDefinitions.length === 0) {
        return spaceTrim(`
            const PROMPTBOOK_TOOL_OPTIONS = {};
        `);
    }

    return spaceTrim(
        (block) => `
            ${block(createTranspiledTeamRuntimeSection(transpiledTeam))}

            // ---- TOOLS ----
            const PROMPTBOOK_TOOL_IMPLEMENTATIONS = {
                ${block(formatUsedToolFunctions(usedToolFunctions))}
            };

            ${block(createManagedClaudeToolRuntimeHelpersSection())}

            const PROMPTBOOK_MCP_SERVER = createSdkMcpServer({
                name: ${block(JSON.stringify(PROMPTBOOK_MCP_SERVER_NAME))},
                tools: [
                    ${block(
                        toolDefinitions
                            .map((toolDefinition) => createManagedClaudeToolSource(toolDefinition))
                            .join(',\n\n'),
                    )}
                ],
            });

            const PROMPTBOOK_ALLOWED_TOOLS = [
                ${block(
                    toolDefinitions
                        .map((toolDefinition) => `mcp__${PROMPTBOOK_MCP_SERVER_NAME}__${toolDefinition.name}`)
                        .map((toolName) => JSON.stringify(toolName))
                        .join(',\n'),
                )}
            ];

            const PROMPTBOOK_TOOL_OPTIONS = {
                mcpServers: {
                    ${PROMPTBOOK_MCP_SERVER_NAME}: PROMPTBOOK_MCP_SERVER,
                },
                allowedTools: PROMPTBOOK_ALLOWED_TOOLS,
            };
        `,
    );
}

/**
 * Creates one Claude Agent SDK tool definition for a Promptbook commitment tool.
 *
 * @param toolDefinition - Promptbook tool definition compiled from the Book source.
 * @returns JavaScript source for one `tool(...)` entry.
 *
 * @private helper of `AnthropicClaudeManagedTranspiler`
 */
function createManagedClaudeToolSource(toolDefinition: LlmToolDefinition): string {
    const toolNameLiteral = JSON.stringify(toolDefinition.name);
    const description = JSON.stringify(toolDefinition.description.trim());

    return spaceTrim(
        (block) => `
            tool(
                ${toolNameLiteral},
                ${description},
                ${block(createZodShapeSource(toolDefinition.parameters))},
                async (input) => {
                    const toolImplementation = PROMPTBOOK_TOOL_IMPLEMENTATIONS[${toolNameLiteral}];

                    if (!toolImplementation) {
                        throw new Error(\`Tool ${JSON.stringify(
                            toolDefinition.name,
                        )} is not implemented in the exported harness.\`);
                    }

                    try {
                        return normalizeToolResponse(await toolImplementation(input));
                    } catch (error) {
                        return createToolErrorResponse(error);
                    }
                },
            )
        `,
    );
}

/**
 * Creates helper functions used by generated Claude Agent SDK tools.
 *
 * @private helper of `AnthropicClaudeManagedTranspiler`
 */
function createManagedClaudeToolRuntimeHelpersSection(): string {
    return spaceTrim(`
        /**
         * Detects the SDK response shape already returned by a tool implementation.
         *
         * @param result - Unknown tool response candidate.
         * @returns \`true\` when the result already looks like an SDK text payload.
         */
        function isMcpTextResult(result) {
            if (!result || typeof result !== 'object') {
                return false;
            }

            const content = result.content;
            if (!Array.isArray(content)) {
                return false;
            }

            return content.every((contentItem) => {
                if (!contentItem || typeof contentItem !== 'object') {
                    return false;
                }

                return contentItem.type === 'text';
            });
        }

        /**
         * Normalizes a Promptbook tool result into a Claude Agent SDK text payload.
         *
         * @param result - Raw result returned by a Promptbook commitment tool.
         * @returns SDK-compatible tool result payload.
         */
        function normalizeToolResponse(result) {
            if (isMcpTextResult(result)) {
                return result;
            }

            const text = (typeof result === 'string' ? result : JSON.stringify(result, null, 2)) || String(result);

            return {
                content: [
                    {
                        type: 'text',
                        text,
                    },
                ],
            };
        }

        /**
         * Normalizes one tool failure into a text-only Claude Agent SDK payload.
         *
         * @param error - Tool failure thrown by the generated implementation.
         * @returns SDK-compatible error payload.
         */
        function createToolErrorResponse(error) {
            const message = error instanceof Error ? error.message : String(error);

            return {
                content: [
                    {
                        type: 'text',
                        text: \`Error: \${message}\`,
                    },
                ],
            };
        }
    `);
}
