import type { AvailableModel } from '../../../execution/AvailableModel';
import type { ModelRequirements } from '../../../types/ModelRequirements';

/**
 * Removes unsupported model requirements from the given model requirements based on the selected model
 * This is used to filter out properties that specific models don't support (e.g., temperature for some OpenAI models)
 *
 * @param modelRequirements - The model requirements to filter
 * @param availableModel - The selected model with its unsupported requirements list
 * @returns Filtered model requirements with unsupported properties removed
 *
 * @example
 * ```ts
 * const modelRequirements = { temperature: 0.7, maxTokens: 100, modelVariant: 'CHAT' };
 * const model = { modelName: 'o1', unsupportedModelRequirements: ['temperature'] };
 * const filtered = removeUnsupportedModelRequirements(modelRequirements, model);
 * // Result: { maxTokens: 100, modelVariant: 'CHAT' }
 * ```
 */
export function removeUnsupportedModelRequirements<T extends Partial<ModelRequirements>>(
    modelRequirements: T,
    availableModel: AvailableModel,
): T {
    // If no unsupported requirements list, return original requirements
    if (!availableModel.unsupportedModelRequirements) {
        return modelRequirements;
    }

    // Create a copy of the model requirements
    const filteredRequirements = { ...modelRequirements } as T;

    // Remove each unsupported property
    for (const unsupportedKey of availableModel.unsupportedModelRequirements) {
        if (unsupportedKey && unsupportedKey in filteredRequirements) {
            delete filteredRequirements[unsupportedKey as keyof T];
        }
    }

    return filteredRequirements;
}

/**
 * Utility function to check if a specific model requirement is supported by a model
 *
 * @param requirementKey - The model requirement key to check
 * @param availableModel - The model to check against
 * @returns true if the requirement is supported, false otherwise
 */
export function isModelRequirementSupported<T extends keyof ModelRequirements>(
    requirementKey: T,
    availableModel: AvailableModel,
): boolean {
    return !availableModel.unsupportedModelRequirements?.includes(requirementKey);
}
