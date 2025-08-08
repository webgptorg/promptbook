import type { TODO_any } from '../../../utils/organization/TODO_any';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import type { AgentModelRequirements } from '../_misc/AgentModelRequirements';

/**
 * MODEL commitment definition
 *
 * The MODEL commitment specifies which AI model to use and can also set
 * model-specific parameters like temperature, topP, and topK.
 *
 * Example usage in agent source:
 *
 * ```book
 * MODEL gpt-4
 * MODEL claude-3-opus temperature=0.3
 * MODEL gpt-3.5-turbo temperature=0.8 topP=0.9
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class ModelCommitmentDefinition extends BaseCommitmentDefinition<'MODEL'> {
    constructor() {
        super('MODEL');
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Parse the model specification
        const parts = trimmedContent.split(/\s+/);
        const modelName = parts[0];

        if (!modelName) {
            return requirements;
        }

        // Start with the model name
        const updatedRequirements: AgentModelRequirements = {
            ...requirements,
            modelName,
        };

        // Parse additional parameters
        const result = { ...updatedRequirements };

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
                        }
                    }
                }
            }
        }

        return result;
    }
}

/**
 * Singleton instance of the MODEL commitment definition
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export const ModelCommitment = new ModelCommitmentDefinition();

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
