import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { Promisable } from 'type-fest';
import { spaceTrim } from 'spacetrim';
import { TODO_any } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * USE TIME commitment definition
 *
 * The `USE TIME` commitment indicates that the agent should be able to determine the current date and time.
 *
 * Example usage in agent source:
 *
 * ```book
 * USE TIME
 * ```
 */
export class UseTimeCommitmentDefinition extends BaseCommitmentDefinition<'USE TIME'> {
    constructor() {
        super('USE TIME', ['CURRENT TIME', 'TIME', 'DATE']);
    }

    /**
     * Short one-line description of USE TIME.
     */
    get description(): string {
        return 'Enable the agent to determine the current date and time.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return 'đź•’';
    }

    /**
     * Markdown documentation for USE TIME commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # USE TIME

            Enables the agent to determine the current date and time.

            ## Key aspects

            - This tool won't receive any input.
            - It outputs the current date and time as an ISO 8601 string.
            - Allows the agent to answer questions about the current time or date.

            ## Examples

            \`\`\`book
            Time-aware Assistant

            PERSONA You are a helpful assistant who knows the current time.
            USE TIME
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, _content: string): AgentModelRequirements {
        // Get existing tools array or create new one
        const existingTools = requirements.tools || [];

        // Add 'get_current_time' to tools if not already present
        const updatedTools = existingTools.some((tool) => tool.name === 'get_current_time')
            ? existingTools
            : [
                  ...existingTools,
                  {
                      name: 'get_current_time',
                      description: 'Get the current date and time in ISO 8601 format.',
                      parameters: {
                          type: 'object',
                          properties: {},
                          required: [],
                      },
                  } as TODO_any,// <- TODO: !!!! Remove any
                  // <- TODO: !!!! define the function in LLM tools
              ];

        // Return requirements with updated tools and metadata
        return {
            ...requirements,
            tools: updatedTools,
            metadata: {
                ...requirements.metadata,
                useTime: true,
            },
        };
    }
}

/**
 * Note: [đź’ž] Ignore a discrepancy between file name and entity name
 */
