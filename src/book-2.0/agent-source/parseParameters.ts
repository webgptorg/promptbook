import type { BookParameter } from './AgentBasicInformation';

/**
 * Parses parameters from text using both supported notations:
 * 1. @Parameter - single word parameter starting with @
 * 2. {parameterName} or {parameter with multiple words} or {parameterName: description text}
 *
 * Both notations represent the same syntax feature - parameters
 *
 * @param text - Text to extract parameters from
 * @returns Array of parsed parameters with unified representation
 * @public exported from `@promptbook/core`
 */
export function parseParameters(text: string): BookParameter[] {
    const parameters: BookParameter[] = [];

    // [🧠] Parameter syntax parsing - unified approach for two different notations of the same syntax feature
    // The Book language supports parameters in two different notations but they represent the same concept

    // Extract @Parameter notation (single word parameters starting with @)
    const atParameterRegex = /@[\w\u00C0-\u017F\u0100-\u024F\u1E00-\u1EFF]+/gim;
    text.replace(atParameterRegex, (match: string) => {
        const parameterName = match.slice(1); // Remove the @ symbol
        parameters.push({
            text: match,
            notation: 'at',
            name: parameterName,
        });
        return match;
    });

    // Extract {parameter} notation (parameters in braces)
    const braceParameterRegex = /\{([^}]+)\}/gim;
    text.replace(braceParameterRegex, (match: string, content: string) => {
        // Check if the parameter has a description (parameterName: description)
        const colonIndex = content.indexOf(':');
        if (colonIndex !== -1) {
            const name = content.substring(0, colonIndex).trim();
            const description = content.substring(colonIndex + 1).trim();
            parameters.push({
                text: match,
                notation: 'brace',
                name,
                description,
            });
        } else {
            // Simple parameter without description
            parameters.push({
                text: match,
                notation: 'brace',
                name: content.trim(),
            });
        }
        return match;
    });

    // Remove duplicates based on name (keep the first occurrence)
    const uniqueParameters = parameters.filter((parameter, index, array) => {
        return array.findIndex((parameterItem) => parameterItem.name === parameter.name) === index;
    });

    return uniqueParameters;
}
