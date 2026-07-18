import {
    AGENT_PROJECT_VSCODE_THEMES,
    type AgentProjectVscodeTheme,
} from './AgentProjectVscodeRuntimeInfo';

/**
 * Fallback browser VS Code theme used when the current request does not carry a resolved light/dark value.
 */
export const DEFAULT_AGENT_PROJECT_VSCODE_THEME: AgentProjectVscodeTheme = 'LIGHT';

/**
 * Returns whether the supplied value is one of the browser VS Code theme values.
 *
 * @param value - Unknown input.
 * @returns `true` when the input is a supported theme value.
 */
export function isAgentProjectVscodeTheme(value: unknown): value is AgentProjectVscodeTheme {
    return typeof value === 'string' && AGENT_PROJECT_VSCODE_THEMES.includes(value as AgentProjectVscodeTheme);
}

/**
 * Normalizes an unknown value into a browser VS Code theme.
 *
 * @param value - Unknown input.
 * @returns Browser VS Code theme.
 */
export function resolveAgentProjectVscodeTheme(value: unknown): AgentProjectVscodeTheme {
    return isAgentProjectVscodeTheme(value) ? value : DEFAULT_AGENT_PROJECT_VSCODE_THEME;
}
