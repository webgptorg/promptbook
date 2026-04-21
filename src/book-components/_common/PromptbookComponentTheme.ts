/**
 * Supported explicit light/dark themes for shared Promptbook React components.
 *
 * @public exported from `@promptbook/components`
 */
export const PROMPTBOOK_COMPONENT_THEMES = {
    LIGHT: 'LIGHT',
    DARK: 'DARK',
} as const;

/**
 * Explicit light/dark theme consumed by shared Promptbook React components.
 *
 * @public exported from `@promptbook/components`
 */
export type PromptbookComponentTheme =
    (typeof PROMPTBOOK_COMPONENT_THEMES)[keyof typeof PROMPTBOOK_COMPONENT_THEMES];

/**
 * Resolves one raw component theme value to a supported explicit theme.
 *
 * @param value - Raw theme value from a host application.
 * @returns Safe supported explicit component theme.
 *
 * @public exported from `@promptbook/components`
 */
export function resolvePromptbookComponentTheme(value: string | null | undefined): PromptbookComponentTheme {
    return value === PROMPTBOOK_COMPONENT_THEMES.DARK
        ? PROMPTBOOK_COMPONENT_THEMES.DARK
        : PROMPTBOOK_COMPONENT_THEMES.LIGHT;
}
