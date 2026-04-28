import { spaceTrim } from 'spacetrim';
import type { string_javascript_name } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { resolvePseudoAgentKindFromUrl } from '../../book-2.0/agent-source/pseudoAgentReferences';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import type {
    TranspiledTeamAgent,
    TranspiledTeamAgentModelRequirements,
    TranspiledTeamExport,
    TranspiledTeamTeammate,
} from './TranspiledTeamExport';

/**
 * Fallback URL used when transpilers are called outside Agents Server and only have the Book source.
 *
 * @private shared between transpilers
 */
const FALLBACK_TRANSPILED_ROOT_AGENT_URL = 'promptbook://transpiled/root-agent';

/**
 * Metadata key populated by TEAM commitment processing.
 *
 * @private shared between transpilers
 */
const TEAMMATES_METADATA_KEY = 'teammates';

/**
 * Creates the full transpiled TEAM export used by generated harnesses.
 *
 * @param options - Root source, compiled requirements, and optional server-resolved hierarchy.
 * @returns Normalized team export, or `null` when no TEAM tools are present.
 *
 * @private shared between transpilers
 */
export function createTranspiledTeamExportForContext(options: {
    readonly agentName: string;
    readonly agentSource: string_book;
    readonly modelRequirements: AgentModelRequirements;
    readonly transpiledTeam?: TranspiledTeamExport;
}): TranspiledTeamExport | null {
    const { agentName, agentSource, modelRequirements, transpiledTeam } = options;
    const rootAgentUrl = transpiledTeam?.rootAgentUrl || FALLBACK_TRANSPILED_ROOT_AGENT_URL;
    const rootTeammates = extractTranspiledTeamTeammates(modelRequirements);

    if (rootTeammates.length === 0 && (!transpiledTeam || transpiledTeam.agents.length === 0)) {
        return null;
    }

    const rootAgent: TranspiledTeamAgent = {
        url: rootAgentUrl,
        agentName,
        agentSource,
        modelRequirements: createTranspiledTeamAgentModelRequirements(modelRequirements),
        teammates: rootTeammates,
        isRootAgent: true,
    };
    const agentsByUrl = new Map<string, TranspiledTeamAgent>();
    agentsByUrl.set(rootAgent.url, rootAgent);

    for (const agent of transpiledTeam?.agents || []) {
        agentsByUrl.set(agent.url, {
            ...agent,
            isRootAgent: agent.url === rootAgentUrl ? true : agent.isRootAgent,
        });
    }

    agentsByUrl.set(rootAgent.url, {
        ...(agentsByUrl.get(rootAgent.url) || rootAgent),
        ...rootAgent,
    });

    return {
        rootAgentUrl,
        agents: [...agentsByUrl.values()],
    };
}

/**
 * Extracts serializable TEAM teammate metadata from model requirements.
 *
 * @param modelRequirements - Compiled agent requirements with TEAM metadata.
 * @returns Teammates safe to embed in transpiled code.
 *
 * @private shared between transpilers
 */
export function extractTranspiledTeamTeammates(
    modelRequirements: AgentModelRequirements,
): ReadonlyArray<TranspiledTeamTeammate> {
    const teammates = modelRequirements._metadata?.[TEAMMATES_METADATA_KEY];

    if (!Array.isArray(teammates)) {
        return [];
    }

    return teammates
        .map((teammate): TranspiledTeamTeammate | null => {
            if (!teammate || typeof teammate !== 'object') {
                return null;
            }

            const candidate = teammate as {
                url?: unknown;
                label?: unknown;
                toolName?: unknown;
                instructions?: unknown;
            };

            if (typeof candidate.url !== 'string' || typeof candidate.toolName !== 'string') {
                return null;
            }

            return {
                url: candidate.url,
                label: typeof candidate.label === 'string' && candidate.label ? candidate.label : candidate.url,
                toolName: candidate.toolName,
                instructions: typeof candidate.instructions === 'string' ? candidate.instructions : undefined,
                pseudoAgentKind: resolvePseudoAgentKindFromUrl(candidate.url) || undefined,
            };
        })
        .filter((teammate): teammate is TranspiledTeamTeammate => teammate !== null);
}

/**
 * Creates the serializable model-requirement subset embedded for each built-in teammate.
 *
 * @param modelRequirements - Full compiled model requirements.
 * @returns Minimal model requirements needed by transpiled TEAM helpers.
 *
 * @private shared between transpilers
 */
export function createTranspiledTeamAgentModelRequirements(
    modelRequirements: AgentModelRequirements,
): TranspiledTeamAgentModelRequirements {
    return {
        systemMessage: modelRequirements.systemMessage,
        promptSuffix: modelRequirements.promptSuffix,
        modelName: modelRequirements.modelName,
        temperature: modelRequirements.temperature,
        topP: modelRequirements.topP,
        topK: modelRequirements.topK,
        knowledgeSources: modelRequirements.knowledgeSources,
        samples: modelRequirements.samples,
        tools: modelRequirements.tools || [],
    };
}

/**
 * Replaces TEAM tool closures with self-contained transpiled TEAM tool functions.
 *
 * @param usedToolFunctions - Tool implementation sources collected from commitment definitions.
 * @param transpiledTeam - Built-in team hierarchy prepared for the generated harness.
 * @returns Tool implementations with TEAM tools pointing to the reusable runtime helper.
 *
 * @private shared between transpilers
 */
export function createTranspiledTeamAwareToolFunctions(
    usedToolFunctions: Record<string_javascript_name, string>,
    transpiledTeam: TranspiledTeamExport | null,
): Record<string_javascript_name, string> {
    if (!transpiledTeam) {
        return usedToolFunctions;
    }

    const nextToolFunctions: Record<string_javascript_name, string> = { ...usedToolFunctions };
    const rootAgent = transpiledTeam.agents.find((agent) => agent.url === transpiledTeam.rootAgentUrl);

    for (const teammate of rootAgent?.teammates || []) {
        nextToolFunctions[teammate.toolName as string_javascript_name] =
            `async (args) => consultPromptbookBuiltInTeamMember(${JSON.stringify(
                transpiledTeam.rootAgentUrl,
            )}, ${JSON.stringify(teammate.toolName)}, args)`;
    }

    return nextToolFunctions;
}

/**
 * Creates the reusable JavaScript TEAM runtime block embedded into generated harnesses.
 *
 * @param transpiledTeam - Built-in team hierarchy prepared for the generated harness.
 * @returns JavaScript source, or an empty string when there is no TEAM hierarchy.
 *
 * @private shared between transpilers
 */
export function createTranspiledTeamRuntimeSection(transpiledTeam: TranspiledTeamExport | null): string {
    if (!transpiledTeam) {
        return '';
    }

    return spaceTrim(
        (block) => `
            // ---- BUILT-IN TEAM ----
            const PROMPTBOOK_TEAM_ROOT_AGENT_URL = ${block(JSON.stringify(transpiledTeam.rootAgentUrl))};
            const PROMPTBOOK_TEAM_AGENTS = ${block(JSON.stringify(transpiledTeam.agents, null, 4))};
            const PROMPTBOOK_TEAM_AGENTS_BY_URL = new Map(
                PROMPTBOOK_TEAM_AGENTS.map((teamAgent) => [teamAgent.url, teamAgent]),
            );

            /**
             * Finds one built-in teammate by the owning agent and TEAM tool name.
             *
             * @param ownerAgentUrl - URL of the agent that owns the TEAM tool.
             * @param toolName - TEAM tool name selected by the model.
             * @returns Matched owner and teammate metadata.
             */
            function findPromptbookBuiltInTeamMember(ownerAgentUrl, toolName) {
                const ownerAgent = PROMPTBOOK_TEAM_AGENTS_BY_URL.get(ownerAgentUrl);
                const teammate = ownerAgent?.teammates.find((candidate) => candidate.toolName === toolName) || null;

                return {
                    ownerAgent,
                    teammate,
                    teamMemberAgent: teammate ? PROMPTBOOK_TEAM_AGENTS_BY_URL.get(teammate.url) || null : null,
                };
            }

            /**
             * Builds teammate request text from TEAM tool arguments.
             *
             * @param args - Raw TEAM tool arguments.
             * @returns Normalized teammate request.
             */
            function createPromptbookBuiltInTeamRequest(args = {}) {
                const message = String(args.message || args.question || '').trim();
                const context = typeof args.context === 'string' && args.context.trim() ? args.context.trim() : '';

                return context ? \`\${message}\\n\\nContext:\\n\${context}\` : message;
            }

            /**
             * Formats the embedded teammate profile as the model-visible TEAM response.
             *
             * @param teammate - TEAM edge selected by the model.
             * @param teamMemberAgent - Embedded teammate agent data.
             * @param request - User request sent to the teammate.
             * @returns Model-visible teammate context.
             */
            function createPromptbookBuiltInTeamResponse(teammate, teamMemberAgent, request) {
                const nestedTeammates = teamMemberAgent.teammates.length > 0
                    ? teamMemberAgent.teammates
                          .map((nestedTeammate) => \`- \${nestedTeammate.label} (\${nestedTeammate.url}) via tool \${nestedTeammate.toolName}\`)
                          .join('\\n')
                    : '- none';
                const promptSuffix = teamMemberAgent.modelRequirements.promptSuffix
                    ? \`\\n\\nPrompt suffix:\\n\${teamMemberAgent.modelRequirements.promptSuffix}\`
                    : '';
                const teamInstructions = teammate.instructions
                    ? \`\\n\\nTEAM instructions from owner:\\n\${teammate.instructions}\`
                    : '';

                return [
                    \`Built-in teammate: \${teamMemberAgent.agentName}\`,
                    \`URL: \${teamMemberAgent.url}\`,
                    teamInstructions,
                    '',
                    'Compiled teammate system message:',
                    teamMemberAgent.modelRequirements.systemMessage || '(empty)',
                    promptSuffix,
                    '',
                    'Nested teammates in this export:',
                    nestedTeammates,
                    '',
                    'Original teammate Book source:',
                    teamMemberAgent.agentSource || '(not available)',
                    '',
                    'Request for this teammate:',
                    request,
                ]
                    .filter((part) => part !== '')
                    .join('\\n');
            }

            /**
             * Consults a teammate embedded into this transpiled export.
             *
             * @param ownerAgentUrl - URL of the agent that owns the TEAM tool.
             * @param toolName - TEAM tool name selected by the model.
             * @param args - Raw TEAM tool arguments.
             * @returns Serialized TEAM tool result.
             */
            async function consultPromptbookBuiltInTeamMember(ownerAgentUrl, toolName, args = {}) {
                const { ownerAgent, teammate, teamMemberAgent } = findPromptbookBuiltInTeamMember(ownerAgentUrl, toolName);
                const request = createPromptbookBuiltInTeamRequest(args);

                if (!request) {
                    return JSON.stringify({
                        error: 'Message is required to contact teammate.',
                        teammate: teammate
                            ? {
                                  ...teammate,
                                  toolName,
                              }
                            : {
                                  toolName,
                              },
                    });
                }

                if (!ownerAgent || !teammate) {
                    return JSON.stringify({
                        error: \`Built-in TEAM member for tool "\${toolName}" was not found in this transpiled export.\`,
                        request,
                        teammate: {
                            toolName,
                        },
                    });
                }

                if (teammate.pseudoAgentKind === 'USER') {
                    return JSON.stringify({
                        teammate,
                        request,
                        response: 'User response is pending. No Agents Server UI modal is available in this transpiled bundle.',
                        interaction: {
                            kind: 'PSEUDO_USER_SINGLE_MESSAGE',
                            prompt: request,
                        },
                        conversation: [
                            {
                                sender: 'AGENT',
                                name: ownerAgent.agentName,
                                content: request,
                            },
                            {
                                sender: 'TEAMMATE',
                                name: teammate.label,
                                content: 'Waiting for one user reply.',
                            },
                        ],
                    });
                }

                if (teammate.pseudoAgentKind === 'VOID') {
                    return JSON.stringify({
                        teammate,
                        request,
                        response: 'The void remained silent.',
                        conversation: [
                            {
                                sender: 'AGENT',
                                name: ownerAgent.agentName,
                                content: request,
                            },
                            {
                                sender: 'TEAMMATE',
                                name: teammate.label,
                                content: '...',
                            },
                        ],
                    });
                }

                const response = teamMemberAgent
                    ? createPromptbookBuiltInTeamResponse(teammate, teamMemberAgent, request)
                    : \`Built-in teammate metadata for \${teammate.label} is present, but its source was not bundled. URL: \${teammate.url}\`;

                return JSON.stringify({
                    teammate,
                    request,
                    response,
                    conversation: [
                        {
                            sender: 'AGENT',
                            name: ownerAgent.agentName,
                            content: request,
                        },
                        {
                            sender: 'TEAMMATE',
                            name: teamMemberAgent?.agentName || teammate.label,
                            content: response,
                        },
                    ],
                });
            }

            /**
             * Keeps the root URL visible in generated code even when only tool functions use it.
             */
            void PROMPTBOOK_TEAM_ROOT_AGENT_URL;
        `,
    );
}
