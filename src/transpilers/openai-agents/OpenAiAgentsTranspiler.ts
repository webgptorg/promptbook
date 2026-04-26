import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { LlmToolDefinition } from '../../types/LlmToolDefinition';
import type { string_script } from '../../types/typeAliases';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { BookTranspiler } from '../_common/BookTranspiler';
import type { BookTranspilerOptions } from '../_common/BookTranspilerOptions';
import { formatUsedToolFunctions } from '../_common/formatUsedToolFunctions';
import { prepareSdkTranspilerContext } from '../_common/prepareSdkTranspilerContext';
import { createTranspiledTeamSection } from '../_common/TranspiledTeamMember';

/**
 * Transpiler to JavaScript code using the OpenAI Agents SDK.
 *
 * @public exported from `@promptbook/core`
 */
export const OpenAiAgentsTranspiler = {
    name: 'openai-agents',
    title: 'OpenAI Agents SDK',
    packageName: '@promptbook/core',
    className: 'OpenAiAgentsTranspiler',
    async transpileBook(
        book: string_book,
        tools: ExecutionTools,
        options?: BookTranspilerOptions,
    ): Promise<string_script> {
        const { agentName, modelRequirements, usedToolFunctions, toolDefinitions, teamHierarchy, isKnowledgeHandledWithRetrieval } =
            await prepareSdkTranspilerContext(book, options);
        const shouldGenerateFunctionTools = toolDefinitions.length > 0;
        const openAiAgentsImportNames = ['Agent', 'run'];
        const teamSection = createTranspiledTeamSection(teamHierarchy);

        TODO_USE(tools);
        TODO_USE(options);

        if (shouldGenerateFunctionTools) {
            openAiAgentsImportNames.push('tool');
        }

        if (isKnowledgeHandledWithRetrieval) {
            openAiAgentsImportNames.push('fileSearchTool');
        }

        return spaceTrim(
            (block) => `
                #!/usr/bin/env node

                import * as dotenv from 'dotenv';
                dotenv.config({ path: '.env' });

                import { ${openAiAgentsImportNames.join(', ')} } from '@openai/agents';
                ${isKnowledgeHandledWithRetrieval ? "import OpenAI from 'openai';" : ''}
                ${isKnowledgeHandledWithRetrieval ? "import { basename } from 'node:path';" : ''}
                ${isKnowledgeHandledWithRetrieval ? "import { readFile } from 'node:fs/promises';" : ''}
                import readline from 'readline';
                import { spaceTrim } from '@promptbook/utils';
                ${teamSection.importSource ? block(teamSection.importSource) : ''}

                // ---- CONFIG ----
                const AGENT_NAME = ${block(JSON.stringify(agentName))};
                const MODEL_NAME = ${block(JSON.stringify(modelRequirements.modelName))};
                const SYSTEM_MESSAGE = ${block(JSON.stringify(modelRequirements.systemMessage))};
                const PROMPT_SUFFIX = ${block(JSON.stringify(modelRequirements.promptSuffix.trim()))};
                const MODEL_SETTINGS = ${block(createOpenAiAgentsModelSettingsSource(modelRequirements))};
                let VECTOR_STORE_ID = null;
                ${teamSection.memberDataSource ? block(teamSection.memberDataSource) : ''}

                ${block(
                    createOpenAiAgentsToolSection({
                        toolDefinitions,
                        usedToolFunctions,
                        teamMembersSource: teamSection.toolMembersSource,
                    }),
                )}
                ${block(
                    createOpenAiAgentsKnowledgeSection({
                        knowledgeSources: modelRequirements.knowledgeSources ?? [],
                        isKnowledgeHandledWithRetrieval,
                    }),
                )}

                /**
                 * Normalizes model output and tool return values into readable text.
                 *
                 * @param value - Value returned by the model or a tool.
                 * @returns String representation safe for CLI logging.
                 */
                function stringifyResult(value) {
                    if (typeof value === 'string') {
                        return value;
                    }

                    if (value === undefined) {
                        return 'undefined';
                    }

                    try {
                        return JSON.stringify(value, null, 2);
                    } catch {
                        return String(value);
                    }
                }

                /**
                 * Formats a runtime error into a model-friendly error string.
                 *
                 * @param error - Error thrown by a tool or the runtime setup.
                 * @returns Consistent error message for CLI output and model-visible tool results.
                 */
                function formatErrorMessage(error) {
                    return \`Error: \${error instanceof Error ? error.message : String(error)}\`;
                }

                /**
                 * Resolves the text shown to the model for a user turn.
                 *
                 * @param question - Raw question entered by the user.
                 * @returns Final prompt text passed to run().
                 */
                function resolvePromptText(question) {
                    if (!PROMPT_SUFFIX) {
                        return question;
                    }

                    return spaceTrim(\`
                        \${question}

                        \${PROMPT_SUFFIX}
                    \`);
                }

                /**
                 * Normalizes the final output returned by the OpenAI Agents SDK.
                 *
                 * @param output - Final agent output from the SDK.
                 * @returns Human-readable text for the terminal.
                 */
                function formatFinalOutput(output) {
                    if (output === undefined || output === null || output === '') {
                        return '(OpenAI Agents SDK returned no text response.)';
                    }

                    return stringifyResult(output);
                }

                /**
                 * Creates the Agent SDK instance with Promptbook tools and optional file search.
                 *
                 * @returns Configured OpenAI Agents SDK agent.
                 */
                function createAgent() {
                    const agentTools = [...PROMPTBOOK_FUNCTION_TOOLS];

                    if (VECTOR_STORE_ID) {
                        agentTools.push(fileSearchTool(VECTOR_STORE_ID));
                    }

                    return new Agent({
                        name: AGENT_NAME,
                        model: MODEL_NAME,
                        instructions: SYSTEM_MESSAGE,
                        modelSettings: MODEL_SETTINGS,
                        tools: agentTools,
                    });
                }

                /**
                 * Starts the OpenAI Agents-backed chat harness.
                 */
                async function main() {
                    ${isKnowledgeHandledWithRetrieval ? 'await setupKnowledge();' : ''}

                    const agent = createAgent();
                    const rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout,
                    });

                    let previousResponseId;

                    async function ask(question) {
                        const promptText = resolvePromptText(question);

                        try {
                            const result = await run(agent, promptText, {
                                ...(previousResponseId
                                    ? {
                                          previousResponseId,
                                      }
                                    : {}),
                            });

                            previousResponseId = result.lastResponseId ?? previousResponseId;

                            console.log('\\n🧠 ' + AGENT_NAME + ':', formatFinalOutput(result.finalOutput), '\\n');
                        } catch (error) {
                            console.error(error);
                        }

                        promptUser();
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
} as const satisfies BookTranspiler;

/**
 * Creates the shared tool scaffold used by the generated OpenAI Agents harness.
 *
 * @param options - Tool definitions and extracted implementation sources from the Book.
 * @returns Generated JavaScript source for Promptbook function tools.
 *
 * @private helper of `OpenAiAgentsTranspiler`
 */
function createOpenAiAgentsToolSection(options: {
    readonly toolDefinitions: ReadonlyArray<LlmToolDefinition>;
    readonly usedToolFunctions: Record<string, string>;
    readonly teamMembersSource: string;
}): string {
    const { toolDefinitions, usedToolFunctions, teamMembersSource } = options;

    if (toolDefinitions.length === 0) {
        return spaceTrim(`
            // ---- TOOLS ----
            const PROMPTBOOK_TOOL_IMPLEMENTATIONS = {
                ${teamMembersSource}
            };
            const PROMPTBOOK_FUNCTION_TOOLS = [];
        `);
    }

    return spaceTrim(
        (block) => `
            // ---- TOOLS ----
            const PROMPTBOOK_TOOL_IMPLEMENTATIONS = {
                ${block(formatUsedToolFunctions(usedToolFunctions))}
                ${block(teamMembersSource)}
            };

            const PROMPTBOOK_FUNCTION_TOOLS = [
                ${block(toolDefinitions.map((toolDefinition) => createOpenAiAgentsFunctionToolSource(toolDefinition)).join('\n\n'))}
            ];
        `,
    );
}

/**
 * Renders one `tool(...)` declaration for the generated OpenAI Agents harness.
 *
 * @param toolDefinition - Promptbook tool definition compiled from the Book source.
 * @returns JavaScript source for a single function tool.
 *
 * @private helper of `OpenAiAgentsTranspiler`
 */
function createOpenAiAgentsFunctionToolSource(toolDefinition: LlmToolDefinition): string {
    const toolNameLiteral = JSON.stringify(toolDefinition.name);
    const toolDescriptionLiteral = JSON.stringify(toolDefinition.description.trim());

    return spaceTrim(
        (block) => `
            tool({
                name: ${toolNameLiteral},
                description: ${toolDescriptionLiteral},
                parameters: ${block(JSON.stringify(toolDefinition.parameters, null, 4))},
                strict: false,
                execute: async (input) => {
                    const toolImplementation = PROMPTBOOK_TOOL_IMPLEMENTATIONS[${toolNameLiteral}];

                    if (!toolImplementation) {
                        return ${JSON.stringify(
                            `Error: Tool "${toolDefinition.name}" is not implemented in the exported harness.`,
                        )};
                    }

                    try {
                        const result = await toolImplementation(input);
                        return stringifyResult(result);
                    } catch (error) {
                        return formatErrorMessage(error);
                    }
                },
            }),
        `,
    );
}

/**
 * Serializes the Agent SDK model settings from Promptbook requirements.
 *
 * @param modelRequirements - Compiled model requirements derived from the Book source.
 * @returns Object-literal source for the `modelSettings` option.
 *
 * @private helper of `OpenAiAgentsTranspiler`
 */
function createOpenAiAgentsModelSettingsSource(modelRequirements: AgentModelRequirements): string {
    const settings: Array<string> = [];

    if (typeof modelRequirements.temperature === 'number') {
        settings.push(`temperature: ${JSON.stringify(modelRequirements.temperature)}`);
    }

    if (typeof modelRequirements.topP === 'number') {
        settings.push(`topP: ${JSON.stringify(modelRequirements.topP)}`);
    }

    if (settings.length === 0) {
        return '{}';
    }

    return spaceTrim(
        (block) => `
            {
                ${block(settings.join(',\n'))}
            }
        `,
    );
}

/**
 * Creates the knowledge-ingestion scaffold for the generated OpenAI Agents harness.
 *
 * @param options - Knowledge sources compiled from the Book source.
 * @returns Runtime helpers for uploading knowledge into a native OpenAI vector store.
 *
 * @private helper of `OpenAiAgentsTranspiler`
 */
function createOpenAiAgentsKnowledgeSection(options: {
    readonly knowledgeSources: ReadonlyArray<string>;
    readonly isKnowledgeHandledWithRetrieval: boolean;
}): string {
    const { knowledgeSources, isKnowledgeHandledWithRetrieval } = options;

    if (!isKnowledgeHandledWithRetrieval) {
        return '';
    }

    return spaceTrim(
        (block) => `
            // ---- KNOWLEDGE ----
            const KNOWLEDGE_SOURCES = ${block(JSON.stringify(knowledgeSources, null, 4))};

            /**
             * Uploads knowledge sources into a native OpenAI vector store and keeps the resulting ID in memory.
             */
            async function setupKnowledge() {
                const uniqueKnowledgeSources = [...new Set(KNOWLEDGE_SOURCES)];
                const knowledgeFiles = [];

                for (const [index, source] of uniqueKnowledgeSources.entries()) {
                    try {
                        const knowledgeFile = await createKnowledgeFileFromSource(source, index);
                        if (knowledgeFile) {
                            knowledgeFiles.push(knowledgeFile);
                        }
                    } catch (error) {
                        console.error(\`Error loading knowledge from \${source}:\`, error);
                    }
                }

                if (knowledgeFiles.length === 0) {
                    return;
                }

                try {
                    const client = new OpenAI({
                        apiKey: process.env.OPENAI_API_KEY,
                    });
                    const vectorStore = await client.vectorStores.create({
                        name: \`\${AGENT_NAME} knowledge base\`,
                    });

                    await client.vectorStores.fileBatches.uploadAndPoll(vectorStore.id, {
                        files: knowledgeFiles,
                    });

                    VECTOR_STORE_ID = vectorStore.id;
                    console.log('🧠 Knowledge base prepared.');
                } catch (error) {
                    console.error('Error preparing knowledge base:', error);
                }
            }

            /**
             * Converts one knowledge source into a File accepted by the OpenAI vector store API.
             *
             * @param source - Knowledge source URL, data URL, or filesystem path.
             * @param index - Zero-based position of the source in the original list.
             * @returns Prepared file or null when the source cannot be read.
             */
            async function createKnowledgeFileFromSource(source, index) {
                if (!source || !source.trim()) {
                    return null;
                }

                const sourceUrl = tryResolveUrl(source);

                if (sourceUrl?.protocol === 'file:') {
                    const buffer = await readFile(sourceUrl);
                    const fileName = resolveKnowledgeSourceFileName(source, index);
                    return new File([buffer], fileName, {
                        type: resolveKnowledgeSourceMimeType(fileName),
                    });
                }

                if (sourceUrl?.protocol === 'http:' || sourceUrl?.protocol === 'https:' || sourceUrl?.protocol === 'data:') {
                    const response = await fetch(source);

                    if (!response.ok) {
                        throw new Error(\`Failed to fetch knowledge source \${source}: \${response.status} \${response.statusText}\`);
                    }

                    const fileName = resolveKnowledgeSourceFileName(source, index);
                    const contentType = response.headers.get('content-type') || resolveKnowledgeSourceMimeType(fileName);
                    const content = await response.arrayBuffer();

                    return new File([content], fileName, {
                        type: contentType,
                    });
                }

                if (sourceUrl) {
                    throw new Error(\`Unsupported knowledge source protocol: \${sourceUrl.protocol}\`);
                }

                const buffer = await readFile(source);
                const fileName = resolveKnowledgeSourceFileName(source, index);
                return new File([buffer], fileName, {
                    type: resolveKnowledgeSourceMimeType(fileName),
                });
            }

            /**
             * Tries to resolve a knowledge source to a URL object.
             *
             * @param source - Knowledge source string.
             * @returns Parsed URL when the source is URL-like, otherwise null.
             */
            function tryResolveUrl(source) {
                try {
                    return new URL(source);
                } catch {
                    return null;
                }
            }

            /**
             * Resolves a stable filename for one knowledge source.
             *
             * @param source - Original knowledge source string.
             * @param index - Zero-based source index.
             * @returns Filename used when uploading the source into the vector store.
             */
            function resolveKnowledgeSourceFileName(source, index) {
                const fallbackFileName = \`knowledge-source-\${index + 1}.txt\`;
                const sourceUrl = tryResolveUrl(source);

                if (sourceUrl?.protocol === 'data:') {
                    return \`inline-knowledge-\${index + 1}.txt\`;
                }

                if (sourceUrl?.protocol === 'file:') {
                    const fileName = basename(sourceUrl.pathname || '');
                    return fileName || fallbackFileName;
                }

                if (sourceUrl?.protocol === 'http:' || sourceUrl?.protocol === 'https:') {
                    const fileName = basename(sourceUrl.pathname || '');
                    return fileName || fallbackFileName;
                }

                const fileName = basename(source || '');
                return fileName || fallbackFileName;
            }

            /**
             * Resolves a content type for a knowledge-source filename.
             *
             * @param fileName - Filename prepared for upload.
             * @returns MIME type hint for the vector store ingest pipeline.
             */
            function resolveKnowledgeSourceMimeType(fileName) {
                const extension = fileName.includes('.') ? (fileName.split('.').pop() || '').toLowerCase() : '';

                switch (extension) {
                    case 'md':
                    case 'markdown':
                        return 'text/markdown';
                    case 'html':
                    case 'htm':
                        return 'text/html';
                    case 'json':
                        return 'application/json';
                    case 'csv':
                        return 'text/csv';
                    case 'pdf':
                        return 'application/pdf';
                    case 'xml':
                        return 'application/xml';
                    case 'yml':
                    case 'yaml':
                        return 'text/yaml';
                    case 'txt':
                    default:
                        return 'text/plain';
                }
            }
        `,
    );
}
