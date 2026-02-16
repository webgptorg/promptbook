import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import { formatOptionalInstructionBlock } from '../_base/formatOptionalInstructionBlock';

/**
 * USE IMAGE GENERATOR commitment definition
 *
 * The `USE IMAGE GENERATOR` commitment indicates that the agent can output
 * markdown placeholders for UI-driven image generation.
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
    'USE IMAGE GENERATOR' | 'USE IMAGE GENERATION' | 'IMAGE GENERATOR' | 'USE IMAGE'
> {
    public constructor(
        type: 'USE IMAGE GENERATOR' | 'USE IMAGE GENERATION' | 'IMAGE GENERATOR' | 'USE IMAGE' = 'USE IMAGE GENERATOR',
    ) {
        super(type, ['USE IMAGE GENERATION', 'IMAGE GENERATOR', 'USE IMAGE']);
    }

    override get requiresContent(): boolean {
        return false;
    }

    /**
     * Short one-line description of USE IMAGE GENERATOR.
     */
    get description(): string {
        return 'Enable the agent to output markdown image placeholders that the UI turns into generated images.';
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

            Enables the agent to output markdown image placeholders that trigger image generation in the user interface.

            ## Key aspects

            - The content following \`USE IMAGE GENERATOR\` is an arbitrary text that the agent should know (e.g. style instructions or safety guidelines).
            - The agent does **not** call an image-generation tool directly.
            - The agent inserts markdown notation: \`![alt](?image-prompt=...)\`.
            - The user interface detects the notation and generates the image asynchronously.

            ## Examples

            \`\`\`book
            Visual Artist

            PERSONA You are a creative visual artist.
            USE IMAGE GENERATOR
            RULE Always describe the generated image to the user.
            \`\`\`

            \`\`\`book
            Interior Designer

            PERSONA You are an interior designer who helps users visualize their space.
            USE IMAGE GENERATOR Professional interior design renders.
            ACTION Add one generated image placeholder whenever a user asks for a visual.
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const extraInstructions = formatOptionalInstructionBlock('Image instructions', content);

        return this.appendToSystemMessage(
            {
                ...requirements,
                _metadata: {
                    ...requirements._metadata,
                    useImageGenerator: content || true,
                },
            },
            spaceTrim(
                (block) => `
                    Image generation:
                    - You do not generate images directly and you do not call any image tool.
                    - When the user asks for an image, include markdown notation in your message:
                      \`![<alt text>](?image-prompt=<prompt>)\`
                    - Keep \`<alt text>\` short and descriptive.
                    - Keep \`<prompt>\` detailed so the generated image matches the request.
                    - You can include normal explanatory text before and after the notation.
                    ${block(extraInstructions)}
                `,
            ),
        );
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
