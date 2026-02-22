import { spaceTrim } from 'spacetrim';
import { string_javascript_name } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { parseTeamCommitmentContent, type TeamTeammate } from '../../book-2.0/agent-source/parseTeamCommitment';
import {
    resolvePseudoAgentKindFromUrl,
    type PseudoAgentKind,
} from '../../book-2.0/agent-source/pseudoAgentReferences';
import type { PromptResult } from '../../execution/PromptResult';
import type { RemoteAgent } from '../../llm-providers/agent/RemoteAgent';
import { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import type { LlmToolDefinition } from '../../types/LlmToolDefinition';
import type { ChatPrompt } from '../../types/Prompt';
import type { ToolCall } from '../../types/ToolCall';
import { computeHash } from '../../utils/misc/computeHash';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import {
    parseToolRuntimeContext,
    serializeToolRuntimeContext,
    TOOL_RUNTIME_CONTEXT_ARGUMENT,
    TOOL_RUNTIME_CONTEXT_PARAMETER,
    type ToolRuntimeContext,
} from '../_common/toolRuntimeContext';

/**
 * Tool registration entry for a teammate.
 *
 * @private
 */
type TeamToolEntry = {
    toolName: string_javascript_name;
    teammate: TeamTeammate;
    agentName: string;
};

/**
 * Serialized result returned by TEAM tool functions.
 *
 * @private
 */
type TeamToolResult = {
    teammate: {
        url: string;
        label: string;
        instructions?: string;
        toolName: string;
        pseudoAgentKind?: PseudoAgentKind;
    };
    request: string;
    response: string;
    /**
     * Additional UI hints for pseudo-agent conversations.
     */
    interaction?: {
        kind: 'PSEUDO_USER_SINGLE_MESSAGE';
        prompt: string;
    };
    /**
     * Tool calls executed by the teammate while answering.
     */
    toolCalls?: ReadonlyArray<ToolCall>;
    error?: string | null;
    conversation: Array<{
        sender: 'AGENT' | 'TEAMMATE';
        name: string;
        content: string;
    }>;
};

/**
 * Arguments accepted by TEAM tool functions.
 *
 * @private
 */
type TeamToolArgs = {
    message?: string;
    context?: string;
    question?: string;
    [TOOL_RUNTIME_CONTEXT_ARGUMENT]?: unknown;
};

const TEAM_TOOL_PREFIX = 'team_chat_';
const teamToolFunctions: Record<string_javascript_name, ToolFunction> = {};
const teamToolTitles: Record<string_javascript_name, string> = {};
const remoteAgentsByUrl = new Map<string, Promise<RemoteAgent>>();

/**
 * TEAM commitment definition
 *
 * The `TEAM` commitment defines teammates that the agent can consult via tools.
 *
 * Example usage in agent source:
 *
 * ```book
 * TEAM https://agents.ptbk.ik/agents/joe-green
 * TEAM You can talk with http://localhost:4440/agents/GMw67JN8TXxN7y to discuss the legal aspects.
 * ```
 *
 * @private [??] Maybe export the commitments through some package
 */
export class TeamCommitmentDefinition extends BaseCommitmentDefinition<'TEAM'> {
    public constructor() {
        super('TEAM');
    }

    /**
     * Short one-line description of TEAM.
     */
    get description(): string {
        return 'Enable the agent to consult teammate agents via dedicated tools.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '??';
    }

    /**
     * Markdown documentation for TEAM commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # TEAM

            Registers teammate agents that the current agent can consult via tools.

            ## Examples

            \`\`\`book
            Legal Assistant

            PERSONA An expert software developer
            TEAM You can talk with http://localhost:4440/agents/GMw67JN8TXxN7y to discuss the legal aspects.
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent: string = content.trim();
        if (!trimmedContent) {
            return requirements;
        }

        // Keep TEAM resilient: unresolved/malformed teammate entries are skipped, valid ones are still registered.
        const teammates: TeamTeammate[] = parseTeamCommitmentContent(trimmedContent, { strict: false });
        if (teammates.length === 0) {
            return requirements;
        }

        const agentName: string = (requirements._metadata?.agentName as string) || 'Agent';

        const teamEntries: TeamToolEntry[] = teammates.map((teammate) => ({
            toolName: createTeamToolName(teammate.url),
            teammate,
            agentName,
        }));

        for (const entry of teamEntries) {
            registerTeamTool(entry);
        }

        const existingTools: readonly LlmToolDefinition[] = requirements.tools || [];
        const updatedTools: LlmToolDefinition[] = [...existingTools];

        for (const entry of teamEntries) {
            if (updatedTools.some((tool) => tool.name === entry.toolName)) {
                continue;
            }

            const whenToConsult = resolveWhenToConsultTeammate(entry);

            updatedTools.push({
                name: entry.toolName,
                description: spaceTrim(`
                    Consult teammate ${entry.teammate.label} (${entry.teammate.url}).
                    Use when: ${whenToConsult}
                `),
                parameters: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            description: 'Question or request to send to the teammate.',
                        },
                        context: {
                            type: 'string',
                            description: 'Optional background context for the teammate.',
                        },
                    },
                    required: ['message'],
                },
            });
        }

        const existingTeammates: Array<{
            url: string;
            toolName: string;
            label?: string;
            instructions?: string;
        }> =
            (requirements._metadata?.teammates as
                | Array<{
                      url: string;
                      toolName: string;
                      label?: string;
                      instructions?: string;
                  }>
                | undefined) || [];
        const updatedTeammates: Array<{
            url: string;
            toolName: string;
            label?: string;
            instructions?: string;
        }> = [...existingTeammates];

        for (const entry of teamEntries) {
            if (updatedTeammates.some((existing) => existing.url === entry.teammate.url)) {
                continue;
            }

            updatedTeammates.push({
                url: entry.teammate.url,
                label: entry.teammate.label,
                instructions: entry.teammate.instructions || undefined,
                toolName: entry.toolName,
            });
        }

        const teamSystemMessage: string = spaceTrim(
            (block) => `
                Teammates:
                ${block(
                    teamEntries
                        .map((entry: TeamToolEntry) => {
                            const whenToConsult: string = resolveWhenToConsultTeammate(entry);
                            return spaceTrim(
                                () => `
                                    - ${entry.teammate.label} (${entry.teammate.url})
                                      - Tool: "${entry.toolName}"
                                      - When to consult: ${whenToConsult}
                                `,
                            );
                        })
                        .join('\n'),
                )}
            `,
        );

        return this.appendToSystemMessage(
            {
                ...requirements,
                tools: updatedTools,
                _metadata: {
                    ...requirements._metadata,
                    teammates: updatedTeammates,
                },
            },
            teamSystemMessage,
        );
    }

    /**
     * Gets human-readable titles for tool functions provided by this commitment.
     */
    getToolTitles(): Record<string_javascript_name, string> {
        return { ...teamToolTitles };
    }

    /**
     * Gets tool function implementations for teammate tools.
     */
    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return { ...teamToolFunctions };
    }
}

/**
 * Builds a deterministic tool name for a teammate URL.
 */
function createTeamToolName(url: string): string_javascript_name {
    const hash: string = computeHash(url).substring(0, 10);
    return `${TEAM_TOOL_PREFIX}${hash}` as string_javascript_name;
}

/**
 * Registers tool function and title for a teammate tool.
 */
function registerTeamTool(entry: TeamToolEntry): void {
    teamToolFunctions[entry.toolName] = createTeamToolFunction(entry);
    teamToolTitles[entry.toolName] = `Consult ${entry.teammate.label}`;
}

/**
 * Builds teammate metadata for tool results.
 */
function buildTeammateMetadata(entry: TeamToolEntry): TeamToolResult['teammate'] {
    return {
        url: entry.teammate.url,
        label: entry.teammate.label,
        instructions: entry.teammate.instructions,
        toolName: entry.toolName,
        pseudoAgentKind: resolvePseudoAgentKindFromUrl(entry.teammate.url) || undefined,
    };
}

/**
 * Builds the teammate request text, optionally including context.
 */
function buildTeammateRequest(message: string, context?: string): string {
    return context ? `${message}\n\nContext:\n${context}` : message;
}

/**
 * Resolves "when to consult" guidance shown in tool metadata and system message.
 */
function resolveWhenToConsultTeammate(entry: TeamToolEntry): string {
    const pseudoAgentKind = resolvePseudoAgentKindFromUrl(entry.teammate.url);

    if (pseudoAgentKind === 'USER') {
        return 'Use when you need one direct response from the current user.';
    }

    if (pseudoAgentKind === 'VOID') {
        return 'Use when you intentionally consult the void (no concrete answer expected).';
    }

    return entry.teammate.instructions || 'Use when their expertise is needed.';
}

/**
 * Builds a minimal chat prompt for teammate calls.
 */
function buildTeammatePrompt(request: string, runtimeContext: ToolRuntimeContext): ChatPrompt {
    return {
        title: 'Teammate consultation',
        modelRequirements: {
            modelVariant: 'CHAT',
        },
        content: request,
        parameters: {
            [TOOL_RUNTIME_CONTEXT_PARAMETER]: serializeToolRuntimeContext(runtimeContext),
        },
    };
}

/**
 * Creates teammate runtime context and marks conversation as team-only memory-disabled.
 */
function createTeamConversationRuntimeContext(value: unknown): ToolRuntimeContext {
    const runtimeContext = parseToolRuntimeContext(value) || {};

    return {
        ...runtimeContext,
        memory: {
            ...(runtimeContext.memory || {}),
            enabled: false,
            isTeamConversation: true,
        },
    };
}

/**
 * Builds a synthetic TEAM result for `{User}` pseudo-agent calls.
 */
function createPseudoUserTeamToolResult(entry: TeamToolEntry, request: string): TeamToolResult {
    const teammateMetadata = buildTeammateMetadata(entry);

    return {
        teammate: teammateMetadata,
        request,
        response: 'User response is pending in the UI modal.',
        interaction: {
            kind: 'PSEUDO_USER_SINGLE_MESSAGE',
            prompt: request,
        },
        conversation: [
            {
                sender: 'AGENT',
                name: entry.agentName,
                content: request,
            },
            {
                sender: 'TEAMMATE',
                name: entry.teammate.label,
                content: 'Waiting for one user reply.',
            },
        ],
    };
}

/**
 * Builds a synthetic TEAM result for `{Void}` pseudo-agent calls.
 */
function createPseudoVoidTeamToolResult(entry: TeamToolEntry, request: string): TeamToolResult {
    const teammateMetadata = buildTeammateMetadata(entry);

    return {
        teammate: teammateMetadata,
        request,
        response: 'The void remained silent.',
        conversation: [
            {
                sender: 'AGENT',
                name: entry.agentName,
                content: request,
            },
            {
                sender: 'TEAMMATE',
                name: entry.teammate.label,
                content: '...',
            },
        ],
    };
}

/**
 * Resolves a RemoteAgent for the given teammate URL, caching the connection.
 */
async function getRemoteTeammateAgent(agentUrl: string): Promise<RemoteAgent> {
    const cached: Promise<RemoteAgent> | undefined = remoteAgentsByUrl.get(agentUrl);
    if (cached) {
        return cached;
    }

    const connection: Promise<RemoteAgent> = (async (): Promise<RemoteAgent> => {
        const { RemoteAgent } = await import('../../llm-providers/agent/RemoteAgent');
        return RemoteAgent.connect({ agentUrl });
    })();
    remoteAgentsByUrl.set(agentUrl, connection);

    try {
        return await connection;
    } catch (error) {
        remoteAgentsByUrl.delete(agentUrl);
        throw error;
    }
}

/**
 * Creates a tool function for consulting a teammate agent.
 */
function createTeamToolFunction(entry: TeamToolEntry): ToolFunction {
    return async (args: TeamToolArgs): Promise<string> => {
        const message: string = (args.message || args.question || '').trim();
        const teammateMetadata: TeamToolResult['teammate'] = buildTeammateMetadata(entry);

        if (!message) {
            const result: Partial<TeamToolResult> = {
                error: 'Message is required to contact teammate.',
                teammate: teammateMetadata,
            };
            return JSON.stringify(result);
        }

        const request: string = buildTeammateRequest(message, args.context);
        const pseudoAgentKind = resolvePseudoAgentKindFromUrl(entry.teammate.url);

        if (pseudoAgentKind === 'USER') {
            return JSON.stringify(createPseudoUserTeamToolResult(entry, request));
        }

        if (pseudoAgentKind === 'VOID') {
            return JSON.stringify(createPseudoVoidTeamToolResult(entry, request));
        }

        let response: string = '';
        let error: string | null = null;
        let toolCalls: ReadonlyArray<ToolCall> | undefined;

        try {
            const remoteAgent: RemoteAgent = await getRemoteTeammateAgent(entry.teammate.url);
            const prompt: ChatPrompt = buildTeammatePrompt(
                request,
                createTeamConversationRuntimeContext(args[TOOL_RUNTIME_CONTEXT_ARGUMENT]),
            );
            const teammateResult: PromptResult = await remoteAgent.callChatModel(prompt);
            response = teammateResult.content || '';
            toolCalls =
                'toolCalls' in teammateResult && Array.isArray(teammateResult.toolCalls)
                    ? (teammateResult.toolCalls as ReadonlyArray<ToolCall>)
                    : undefined;
        } catch (err: unknown) {
            error = err instanceof Error ? err.message : String(err);
        }

        const teammateReply: string =
            response || (error ? `Unable to reach teammate. Error: ${error}` : 'No response received.');

        const result: TeamToolResult = {
            teammate: teammateMetadata,
            request,
            response: teammateReply,
            toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
            error,
            conversation: [
                {
                    sender: 'AGENT',
                    name: entry.agentName,
                    content: request,
                },
                {
                    sender: 'TEAMMATE',
                    name: entry.teammate.label,
                    content: teammateReply,
                },
            ],
        };

        return JSON.stringify(result);
    };
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
