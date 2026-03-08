import { spaceTrim } from 'spacetrim';
import { string_javascript_name } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import {
    createCreateAgentInputToolParametersSchema,
    CREATE_AGENT_INPUT_SOURCE_MAX_LENGTH,
} from '../../collection/agent-collection/CreateAgentInput';
import { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import type { LlmToolDefinition } from '../../types/LlmToolDefinition';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import { formatOptionalInstructionBlock } from '../_base/formatOptionalInstructionBlock';
import { spawnAgentViaBrowser } from './spawnAgentViaBrowser';

/**
 * Tool name used by USE SPAWN.
 *
 * @private internal USE SPAWN constant
 */
const SPAWN_AGENT_TOOL_NAME = 'spawn_agent' as string_javascript_name;

/**
 * USE SPAWN commitment definition.
 *
 * The `USE SPAWN` commitment enables creating new persistent child agents through one tool call.
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class UseSpawnCommitmentDefinition extends BaseCommitmentDefinition<'USE SPAWN'> {
    public constructor() {
        super('USE SPAWN', ['SPAWN']);
    }

    override get requiresContent(): boolean {
        return false;
    }

    /**
     * Short one-line description of USE SPAWN.
     */
    public get description(): string {
        return 'Enable the agent to create persistent child agents via Agents Server create-agent flow.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🧬';
    }

    /**
     * Markdown documentation for USE SPAWN commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # USE SPAWN

            Enables the agent to create a new persistent child agent using the \`spawn_agent\` tool.

            ## Key aspects

            - The spawned agent is persisted exactly like manually created agents.
            - Tool input mirrors create-agent fields currently supported by Agents Server:
              - \`source\` (required)
              - \`folderId\` (optional)
              - \`sortOrder\` (optional)
              - \`visibility\` (optional)
            - Unknown fields are rejected to avoid silent misconfiguration.
            - \`source\` payload is size-limited.
            - Agents Server applies permission and abuse protections (auth checks, limits).
            - Optional text after \`USE SPAWN\` is treated as spawn-policy instructions.

            ## Examples

            \`\`\`book
            Team Builder

            PERSONA You can create specialized assistants for the user.
            USE SPAWN Spawn only when the user explicitly asks for a new persistent agent.
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const extraInstructions = formatOptionalInstructionBlock('Spawn instructions', content);
        const existingTools = requirements.tools || [];
        const tools: ReadonlyArray<LlmToolDefinition> = existingTools.some(
            (tool) => tool.name === SPAWN_AGENT_TOOL_NAME,
        )
            ? existingTools
            : [
                  ...existingTools,
                  {
                      name: SPAWN_AGENT_TOOL_NAME,
                      description: spaceTrim(`
                          Creates one new persistent child agent in Agents Server.
                          Use this when the user asks to create a new dedicated agent profile.
                          The tool returns JSON with \`status\`, \`agentId\`, and created \`agent\` or \`error\`.
                      `),
                      parameters: createCreateAgentInputToolParametersSchema(),
                  },
              ];

        return this.appendToSystemMessage(
            {
                ...requirements,
                tools,
                _metadata: {
                    ...requirements._metadata,
                    useSpawn: content || true,
                },
            },
            spaceTrim(
                (block) => `
                    Spawning agents:
                    - Use "${SPAWN_AGENT_TOOL_NAME}" only when user asks to create a persistent new agent.
                    - Pass full agent source in \`source\`.
                    - Keep \`source\` concise; the maximum accepted length is ${CREATE_AGENT_INPUT_SOURCE_MAX_LENGTH} characters.
                    - Do not add unknown fields in tool arguments.
                    ${block(extraInstructions)}
                `,
            ),
        );
    }

    /**
     * Gets human-readable titles for tool functions provided by this commitment.
     */
    getToolTitles(): Record<string_javascript_name, string> {
        return {
            [SPAWN_AGENT_TOOL_NAME]: 'Spawn agent',
        };
    }

    /**
     * Gets browser-safe `spawn_agent` implementation.
     *
     * Node.js runtime overrides this through `getAllCommitmentsToolFunctionsForNode`.
     */
    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return {
            async [SPAWN_AGENT_TOOL_NAME](args: unknown): Promise<string> {
                return spawnAgentViaBrowser(args as Record<string, unknown>);
            },
        };
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
