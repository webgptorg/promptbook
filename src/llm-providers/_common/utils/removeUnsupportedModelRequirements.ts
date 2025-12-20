import type { ChatModelRequirements, ModelRequirements } from '../../../types/ModelRequirements';

/**
 * Parses an OpenAI error message to identify which parameter is unsupported
 *
 * @param errorMessage The error message from OpenAI API
 * @returns The parameter name that is unsupported, or null if not an unsupported parameter error
 * @private utility of LLM Tools
 */
export function parseUnsupportedParameterError(errorMessage: string): string | null {
    // Pattern to match "Unsupported value: 'parameter' does not support ..."
    const unsupportedValueMatch = errorMessage.match(/Unsupported value:\s*'([^']+)'\s*does not support/i);

    if (unsupportedValueMatch?.[1]) {
        return unsupportedValueMatch[1];
    }

    // Pattern to match "'parameter' of type ... is not supported with this model"
    const parameterTypeMatch = errorMessage.match(/'([^']+)'\s*of type.*is not supported with this model/i);

    if (parameterTypeMatch?.[1]) {
        return parameterTypeMatch[1];
    }

    return null;
}

/**
 * Creates a copy of model requirements with the specified parameter removed
 *
 * @param modelRequirements Original model requirements
 * @param unsupportedParameter The parameter to remove
 * @returns New model requirements without the unsupported parameter
 * @private utility of LLM Tools
 */
export function removeUnsupportedModelRequirement(
    modelRequirements: ModelRequirements,
    unsupportedParameter: string,
): ModelRequirements {
    const newRequirements = { ...modelRequirements };

    // Map of parameter names that might appear in error messages to ModelRequirements properties
    const parameterMap: Record<string, keyof ModelRequirements | keyof ChatModelRequirements> = {
        temperature: 'temperature',
        max_tokens: 'maxTokens',
        maxTokens: 'maxTokens',
        seed: 'seed',
    };

    const propertyToRemove = parameterMap[unsupportedParameter];

    if (propertyToRemove && propertyToRemove in newRequirements) {
        delete (newRequirements as Record<string, unknown>)[propertyToRemove];
    }

    return newRequirements;
}

/**
 * Checks if an error is an "Unsupported value" error from OpenAI
 * @param error The error to check
 * @returns true if this is an unsupported parameter error
 * @private utility of LLM Tools
 */
export function isUnsupportedParameterError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();

    return (
        errorMessage.includes('unsupported value:') ||
        errorMessage.includes('is not supported with this model') ||
        errorMessage.includes('does not support')
    );
}
