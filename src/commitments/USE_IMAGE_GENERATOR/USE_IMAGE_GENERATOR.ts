import { spaceTrim } from 'spacetrim';
import { TODO_any } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * USE IMAGE GENERATOR commitment definition
 *
 * The `USE IMAGE GENERATOR` commitment indicates that the agent should utilize an image generation tool
 * to create images based on textual descriptions when necessary.
 *
 * The content following `USE IMAGE GENERATOR` is an arbitrary text that the agent should know (e.g. generation constraints or instructions).
 *
 * Example usage in agent source:
 *
 * ```book
 * USE IMAGE GENERATOR
 * USE IMAGE GENERATOR Create realistic oil paintings
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class UseImageGeneratorCommitmentDefinition extends BaseCommitmentDefinition<'USE IMAGE GENERATOR'> {
    constructor() {
        super('USE IMAGE GENERATOR', ['IMAGE GENERATOR', 'GENERATE IMAGE', 'IMAGE GENERATION']);
    }

    /**
     * Short one-line description of USE IMAGE GENERATOR.
     */
    get description(): string {
        return 'Enable the agent to use an image generation tool for creating images from text.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🖼️';
    }

    /**
     * Markdown documentation for USE IMAGE GENERATOR commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # USE IMAGE GENERATOR

            Enables the agent to use an image generation tool to create images from textual descriptions.

            ## Key aspects

            - The content following \`USE IMAGE GENERATOR\` is an arbitrary text that the agent should know (e.g. generation constraints or instructions).
            - The actual image generation tool usage is handled by the agent runtime
            - Allows the agent to create visual content based on user requests
            - Useful for creative tasks, illustrating concepts, and generating visual assets

            ## Examples

            \`\`\`book
            Visual Artist

            PERSONA You are a helpful visual artist specialized in creating digital art
            USE IMAGE GENERATOR
            RULE Always describe the image you are about to generate
            \`\`\`

            \`\`\`book
            Illustrator

            PERSONA You are an illustrator for children's books
            USE IMAGE GENERATOR Create whimsical and colorful illustrations
            ACTION Generate images that match the story's mood
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        // Get existing tools array or create new one
        const existingTools = requirements.tools || [];

        // Add 'image_generator' to tools if not already present
        const updatedTools = existingTools.some((tool) => tool.name === 'image_generator')
            ? existingTools
            : [
                  ...existingTools,
                  { type: 'image_generator' } as TODO_any,
                  // <- Note: [🔰] Similar to web_search, in future we will use proper MCP tool
                  /*
                  {
                      name: 'image_generator',
                      description: spaceTrim(`
                        Generate an image based on a textual description.
                        Use this tool when you need to create a visual representation of something.
                        ${!content ? '' : `Generation instructions: ${content}`}
                    `),
                      parameters: {
                          type: 'object',
                          properties: {
                              prompt: {
                                  type: 'string',
                                  description: 'The description of the image to generate',
                              },
                          },
                          required: ['prompt'],
                      },
                  },
                  */
              ];

        // Return requirements with updated tools and metadata
        return {
            ...requirements,
            tools: updatedTools,
            metadata: {
                ...requirements.metadata,
                useImageGenerator: content || true,
            },
        };
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
