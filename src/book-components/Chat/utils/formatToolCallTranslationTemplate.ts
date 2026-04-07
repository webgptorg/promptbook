/**
 * Applies `{placeholder}` values to one tool-call translation template.
 *
 * @param template - Template from the host application or fallback copy.
 * @param variables - Placeholder values keyed by variable name.
 * @returns Formatted string ready for rendering.
 *
 * @private utility of `<Chat/>`
 */
export function formatToolCallTranslationTemplate(
    template: string,
    variables: Record<string, string | number>,
): string {
    return Object.entries(variables).reduce<string>(
        (formatted, [key, value]) => formatted.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
        template,
    );
}
