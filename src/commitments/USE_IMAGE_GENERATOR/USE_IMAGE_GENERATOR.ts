import { spaceTrim } from 'spacetrim';
import { string_javascript_name, TODO_any } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * USE IMAGE GENERATOR commitment definition
 *
 * The `USE IMAGE GENERATOR` commitment indicates that the agent should utilize an image generation tool
 * to create images based on text prompts.
 *
 * Example usage in agent source:
 *
 * ```book
 * USE IMAGE GENERATOR
 * USE IMAGE GENERATOR Create realistic images of nature
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class UseImageGeneratorCommitmentDefinition extends BaseCommitmentDefinition<
    'USE IMAGE GENERATOR' | 'USE IMAGE GENERATION' | 'IMAGE GENERATOR' | 'IMAGE GENERATION' | 'USE IMAGE'
> {
    public constructor(
        type:
            | 'USE IMAGE GENERATOR'
            | 'USE IMAGE GENERATION'
            | 'IMAGE GENERATOR'
            | 'IMAGE GENERATION'
            | 'USE IMAGE' = 'USE IMAGE GENERATOR',
    ) {
        super(type, ['USE IMAGE GENERATION', 'IMAGE GENERATOR', 'IMAGE GENERATION', 'USE IMAGE']);
    }

    /**
     * Short one-line description of USE IMAGE GENERATOR.
     */
    get description(): string {
        return 'Enable the agent to use an image generation tool for creating images from text prompts.';
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

            Enables the agent to use an image generation tool to create images based on text prompts.

            ## Key aspects

            - The content following \`USE IMAGE GENERATOR\` is an arbitrary text that the agent should know (e.g. style instructions or safety guidelines).
            - The actual image generation is handled by the agent runtime using LLM execution tools.
            - Allows the agent to generate visual content based on user requests.
            - Returns the URL of the generated image.

            ## Examples

            \`\`\`book
            Visual Artist

            PERSONA You are a creative visual artist who can generate images.
            USE IMAGE GENERATOR
            RULE Always describe the generated image to the user.
            \`\`\`

            \`\`\`book
            Interior Designer

            PERSONA You are an interior designer who helps users visualize their space.
            USE IMAGE GENERATOR Professional interior design renders.
            ACTION Generate a preview of the designed room.
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        // Get existing tools array or create new one
        const existingTools = requirements.tools || [];

        // Add 'generate_image' to tools if not already present
        const updatedTools = existingTools.some((tool) => tool.name === 'generate_image')
            ? existingTools
            : [
                  ...existingTools,
                  {
                      name: 'generate_image',
                      description: spaceTrim(`
                        Generate an image from a text prompt.
                        Use this tool when the user asks to create, draw, or generate an image.
                        ${!content ? '' : `Style instructions / guidelines: ${content}`}
                    `),
                      parameters: {
                          type: 'object',
                          properties: {
                              prompt: {
                                  type: 'string',
                                  description: 'The detailed description of the image to generate',
                              },
                          },
                          required: ['prompt'],
                      },
                  } as TODO_any,
              ];

        // Return requirements with updated tools and metadata
        return this.appendToSystemMessage(
            {
                ...requirements,
                tools: updatedTools,
                _metadata: {
                    ...requirements._metadata,
                    useImageGenerator: content || true,
                },
            },
            spaceTrim(`
                You have access to an image generator. Use it to create images based on user requests.
                When you generate an image, you will receive a URL of the generated image.
            `),
        );
    }

    /**
     * Gets human-readable titles for tool functions provided by this commitment.
     */
    getToolTitles(): Record<string_javascript_name, string> {
        return {
            generate_image: 'Generate image',
        };
    }

    /**
     * Gets the `generate_image` tool function implementation.
     */
    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return {
            async generate_image(args: { prompt: string }, ...extra: TODO_any[]): Promise<string> {
                console.log('!!!! [Tool] generate_image called', { args });

                const { prompt } = args;

                if (!prompt) {
                    throw new Error('Image prompt is required');
                }

                const { llmTools } = extra[0] || {};

                if (!llmTools || !llmTools.callImageGenerationModel) {
                    throw new Error('Image generation is not supported by the current model provider');
                }

                const result = await llmTools.callImageGenerationModel({
                    content: prompt,
                    modelName: 'dall-e-3', // Defaulting to dall-e-3, but this could be configurable
                });

                return result.content;
            },
        };
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
