import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { KnowledgeToolNames } from './KnowledgeToolNames';

/**
 * Concrete type of tool definitions in `AgentModelRequirements`.
 *
 * @private type of KnowledgeCommitmentDefinition
 */
type AgentModelTools = NonNullable<AgentModelRequirements['tools']>;

/**
 * Creates KNOWLEDGE tool definitions while preserving already-registered tools.
 *
 * @private function of KnowledgeCommitmentDefinition
 */
export function createKnowledgeTools(existingTools: AgentModelRequirements['tools']): AgentModelTools {
    const tools = [...(existingTools || [])];

    if (!tools.some((tool) => tool.name === KnowledgeToolNames.search)) {
        tools.push({
            name: KnowledgeToolNames.search,
            description: spaceTrim(`
                Search the configured knowledge base attached to this agent.
                Use this tool whenever the answer may depend on knowledge documents, uploaded files, or configured URLs.
            `),
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'The semantic search query describing what knowledge to retrieve.',
                    },
                    limit: {
                        type: 'integer',
                        description: 'Optional maximum number of relevant sources to return (default 5, max 8).',
                    },
                },
                required: ['query'],
            },
        });
    }

    return tools;
}
