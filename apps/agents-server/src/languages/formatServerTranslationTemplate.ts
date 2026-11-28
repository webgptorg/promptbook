import type { ServerTranslationVariables } from './ServerLanguagePack';

/**
 * Pattern used to resolve `{variableName}` placeholders in translation strings.
 */
const TRANSLATION_VARIABLE_PATTERN = /\{([a-zA-Z0-9_]+)\}/g;

/**
 * Interpolates variables into one translation template.
 *
 * @param template - Translation template that may include `{variable}` placeholders.
 * @param variables - Optional variable values for interpolation.
 * @returns Rendered translation string with placeholders replaced when values exist.
 */
export function formatServerTranslationTemplate(
    template: string,
    variables: ServerTranslationVariables = {},
): string {
    return template.replace(TRANSLATION_VARIABLE_PATTERN, (matchedPlaceholder, variableName: string) => {
        const value = variables[variableName];
        return value === undefined || value === null ? matchedPlaceholder : String(value);
    });
}
