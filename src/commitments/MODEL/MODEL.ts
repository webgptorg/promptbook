import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * MODEL commitment definition
 *
 * The MODEL commitment specifies which AI model to use and can also set
 * model-specific parameters like temperature, topP, topK, and maxTokens.
 *
 * Supports multiple syntax variations:
 *
 * Single-line format:
 * ```book
 * MODEL gpt-4
 * MODEL claude-3-opus temperature=0.3
 * MODEL gpt-3.5-turbo temperature=0.8 topP=0.9
 * ```
 *
 * Multi-line named parameter format:
 * ```book
 * MODEL NAME gpt-4
 * MODEL TEMPERATURE 0.7
 * MODEL TOP_P 0.9
 * MODEL MAX_TOKENS 2048
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class ModelCommitmentDefinition extends BaseCommitmentDefinition<'MODEL' | 'MODELS'> {
    constructor(type: 'MODEL' | 'MODELS' = 'MODEL') {
        super(type);
    }

    /**
     * Short one-line description of MODEL.
     */
    get description(): string {
        return 'Enforce AI model requirements including name and technical parameters.';
    }

    /**
     * Markdown documentation for MODEL commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Enforces technical parameters for the AI model, ensuring consistent behavior across different execution environments.

            ## Key aspects

            - When no \`MODEL\` commitment is specified, the best model requirement is picked automatically based on the agent \`PERSONA\`, \`KNOWLEDGE\`, \`TOOLS\` and other commitments
            - Multiple \`MODEL\` commitments can be used to specify different parameters
            - Both \`MODEL\` and \`MODELS\` terms work identically and can be used interchangeably
            - Parameters control the randomness, creativity, and technical aspects of model responses

            ## Syntax variations

            ### Single-line format (legacy support)
            \`\`\`book
            MODEL gpt-4
            MODEL claude-3-opus temperature=0.3
            MODEL gpt-3.5-turbo temperature=0.8 topP=0.9
            \`\`\`

            ### Multi-line named parameter format (recommended)
            \`\`\`book
            MODEL NAME gpt-4
            MODEL TEMPERATURE 0.7
            MODEL TOP_P 0.9
            MODEL MAX_TOKENS 2048
            \`\`\`

            ## Supported parameters

            - \`NAME\`: The specific model to use (e.g., 'gpt-4', 'claude-3-opus')
            - \`TEMPERATURE\`: Controls randomness (0.0 = deterministic, 1.0+ = creative)
            - \`TOP_P\`: Nucleus sampling parameter for controlling diversity
            - \`TOP_K\`: Top-k sampling parameter for limiting vocabulary
            - \`MAX_TOKENS\`: Maximum number of tokens the model can generate

            ## Examples

            ### Precise deterministic assistant
            \`\`\`book
            Precise Assistant

            PERSONA You are a precise and accurate assistant
            MODEL NAME gpt-4
            MODEL TEMPERATURE 0.1
            MODEL MAX_TOKENS 1024
            RULE Always provide factual information
            \`\`\`

            ### Creative writing assistant
            \`\`\`book
            Creative Writer

            PERSONA You are a creative writing assistant
            MODEL NAME claude-3-opus
            MODEL TEMPERATURE 0.8
            MODEL TOP_P 0.9
            MODEL MAX_TOKENS 2048
            STYLE Be imaginative and expressive
            ACTION Can help with storytelling and character development
            \`\`\`

            ### Balanced conversational agent
            \`\`\`book
            Balanced Assistant

            PERSONA You are a helpful and balanced assistant
            MODEL NAME gpt-4
            MODEL TEMPERATURE 0.7
            MODEL TOP_P 0.95
            MODEL TOP_K 40
            MODEL MAX_TOKENS 1500
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        const parts = trimmedContent.split(/\s+/);
        const firstPart = parts[0]?.toUpperCase();

        // Check if this is the new named parameter format
        if (this.isNamedParameter(firstPart)) {
            return this.parseNamedParameter(requirements, firstPart!, parts.slice(1));
        } else {
            // Legacy single-line format: "MODEL gpt-4 temperature=0.3 topP=0.9"
            return this.parseLegacyFormat(requirements, parts);
        }
    }

    /**
     * Check if the first part is a known named parameter
     */
    private isNamedParameter(part: string | undefined): boolean {
        if (!part) return false;
        const knownParams = ['NAME', 'TEMPERATURE', 'TOP_P', 'TOP_K', 'MAX_TOKENS'];
        return knownParams.includes(part);
    }

    /**
     * Parse the new named parameter format: "MODEL TEMPERATURE 0.7"
     */
    private parseNamedParameter(
        requirements: AgentModelRequirements,
        parameterName: string,
        valueParts: string[],
    ): AgentModelRequirements {
        const value = valueParts.join(' ').trim();

        if (!value) {
            return requirements;
        }

        const result = { ...requirements };

        switch (parameterName) {
            case 'NAME':
                result.modelName = value;
                break;
            case 'TEMPERATURE': {
                const temperature = parseFloat(value);
                if (!isNaN(temperature)) {
                    (result as TODO_any).temperature = temperature;
                }
                break;
            }
            case 'TOP_P': {
                const topP = parseFloat(value);
                if (!isNaN(topP)) {
                    (result as TODO_any).topP = topP;
                }
                break;
            }
            case 'TOP_K': {
                const topK = parseFloat(value);
                if (!isNaN(topK)) {
                    (result as TODO_any).topK = Math.round(topK);
                }
                break;
            }
            case 'MAX_TOKENS': {
                const maxTokens = parseFloat(value);
                if (!isNaN(maxTokens)) {
                    (result as TODO_any).maxTokens = Math.round(maxTokens);
                }
                break;
            }
        }

        return result;
    }

    /**
     * Parse the legacy format: "MODEL gpt-4 temperature=0.3 topP=0.9"
     */
    private parseLegacyFormat(requirements: AgentModelRequirements, parts: string[]): AgentModelRequirements {
        const modelName = parts[0];

        if (!modelName) {
            return requirements;
        }

        // Start with the model name
        const result: AgentModelRequirements = {
            ...requirements,
            modelName,
        };

        // Parse additional key=value parameters
        for (let i = 1; i < parts.length; i++) {
            const param = parts[i];
            if (param && param.includes('=')) {
                const [key, value] = param.split('=');
                if (key && value) {
                    const numValue = parseFloat(value);

                    if (!isNaN(numValue)) {
                        switch (key.toLowerCase()) {
                            case 'temperature':
                                (result as TODO_any).temperature = numValue;
                                break;
                            case 'topp':
                            case 'top_p':
                                (result as TODO_any).topP = numValue;
                                break;
                            case 'topk':
                            case 'top_k':
                                (result as TODO_any).topK = Math.round(numValue);
                                break;
                            case 'max_tokens':
                            case 'maxTokens':
                                (result as TODO_any).maxTokens = Math.round(numValue);
                                break;
                        }
                    }
                }
            }
        }

        return result;
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
