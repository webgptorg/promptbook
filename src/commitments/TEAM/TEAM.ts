import { spaceTrim } from 'spacetrim';
import { string_javascript_name } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { parseTeamCommitmentContent, type TeamTeammate } from '../../book-2.0/agent-source/parseTeamCommitment';
import type { RemoteAgent } from '../../llm-providers/agent/RemoteAgent';
import { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import type { ChatPrompt } from '../../types/Prompt';
import { computeHash } from '../../utils/misc/computeHash';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

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
    };
    request: string;
    response: string;
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
        const trimmedContent = content.trim();
        if (!trimmedContent) {
            return requirements;
        }

        const teammates = parseTeamCommitmentContent(trimmedContent, { strict: true });
        if (teammates.length === 0) {
            return requirements;
        }

        const agentName = (requirements.metadata?.agentName as string) || 'Agent';

        const teamEntries = teammates.map((teammate) => ({
            toolName: createTeamToolName(teammate.url),
            teammate,
            agentName,
        }));

        for (const entry of teamEntries) {
            registerTeamTool(entry);
        }

        const existingTools = requirements.tools || [];
        const updatedTools = [...existingTools];

        for (const entry of teamEntries) {
            if (updatedTools.some((tool) => tool.name === entry.toolName)) {
                continue;
            }

            const instructionSuffix = entry.teammate.instructions
                ? `Use when: ${entry.teammate.instructions}`
                : 'Use when their expertise is needed.';

            updatedTools.push({
                name: entry.toolName,
                description: spaceTrim(`
                    Consult teammate ${entry.teammate.label} (${entry.teammate.url}).
                    ${instructionSuffix}
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

        const existingTeammates =
            (requirements.metadata?.teammates as
                | Array<{
                      url: string;
                      toolName: string;
                      label?: string;
                      instructions?: string;
                  }>
                | undefined) || [];
        const updatedTeammates = [...existingTeammates];

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

        const teamSystemMessage = spaceTrim(
            (block) => `
                Teammates:
                ${block(
                    teamEntries
                        .map((entry) => {
                            const whenToConsult = entry.teammate.instructions || 'Use when their expertise is needed.';
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
                metadata: {
                    ...requirements.metadata,
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
    const hash = computeHash(url).substring(0, 10);
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
    };
}

/**
 * Builds the teammate request text, optionally including context.
 */
function buildTeammateRequest(message: string, context?: string): string {
    return context ? `${message}\n\nContext:\n${context}` : message;
}

/**
 * Builds a minimal chat prompt for teammate calls.
 */
function buildTeammatePrompt(request: string): ChatPrompt {
    return {
        title: 'Teammate consultation',
        modelRequirements: {
            modelVariant: 'CHAT',
        },
        content: request,
        parameters: {},
    };
}

/**
 * Resolves a RemoteAgent for the given teammate URL, caching the connection.
 */
async function getRemoteTeammateAgent(agentUrl: string): Promise<RemoteAgent> {
    const cached = remoteAgentsByUrl.get(agentUrl);
    if (cached) {
        return cached;
    }

    const connection = (async () => {
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
        const message = (args.message || args.question || '').trim();
        const teammateMetadata = buildTeammateMetadata(entry);

        if (!message) {
            const result: Partial<TeamToolResult> = {
                error: 'Message is required to contact teammate.',
                teammate: teammateMetadata,
            };
            return JSON.stringify(result);
        }

        const request = buildTeammateRequest(message, args.context);
        let response = '';
        let error: string | null = null;

        try {
            const remoteAgent = await getRemoteTeammateAgent(entry.teammate.url);
            const prompt = buildTeammatePrompt(request);
            const teammateResult = await remoteAgent.callChatModel(prompt);
            response = teammateResult.content || '';
        } catch (err) {
            error = err instanceof Error ? err.message : String(err);
        }

        const teammateReply =
            response || (error ? `Unable to reach teammate. Error: ${error}` : 'No response received.');

        const result: TeamToolResult = {
            teammate: teammateMetadata,
            request,
            response: teammateReply,
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
