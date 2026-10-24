import { canonicalEnumValue } from '../common/naming.js';

/**
 * Supported reasoning/effort selectors (internal spelling; saved canonically as `LOW` … `MAX`).
 *
 * @private shared tool contract
 */
export const THINKING_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;

/**
 * One reasoning/effort selector.
 *
 * @private shared tool contract
 */
export type ThinkingLevel = (typeof THINKING_LEVELS)[number];

/**
 * Tool categories of `ptbk.json.tools` (fixed enum values).
 *
 * @private shared tool contract
 */
export const TOOL_TYPES = ['BROWSER', 'HARNESS'] as const;

/**
 * One tool category.
 *
 * @private shared tool contract
 */
export type ToolType = (typeof TOOL_TYPES)[number];

/**
 * Supported browser adapters. `CHROME` uses Google Chrome and, when it is absent, another installed
 * Chrome-compatible browser; `CHROMIUM` and `EDGE` select exactly that browser.
 *
 * @private shared tool contract
 */
export const BROWSER_VARIANTS = ['CHROME', 'CHROMIUM', 'EDGE'] as const;

/**
 * One browser adapter.
 *
 * @private shared tool contract
 */
export type BrowserVariant = (typeof BROWSER_VARIANTS)[number];

/**
 * Supported harness adapters (canonical variants of the harness plugins).
 *
 * @private shared tool contract
 */
export const HARNESS_VARIANTS = ['OPENAI_CODEX', 'CLAUDE_CODE', 'GITHUB_COPILOT', 'CLINE', 'OPENCODE', 'GEMINI', 'QWEN_CODE'] as const;

/**
 * One harness adapter.
 *
 * @private shared tool contract
 */
export type HarnessVariant = (typeof HARNESS_VARIANTS)[number];

/**
 * Where a browser tool's profile comes from.
 *
 * - `MANAGED_GLOBAL`: the dedicated Promptbook profile of this OS user (default)
 * - `PROJECT`: an isolated profile in the project's ignored `.ptbk/`
 * - `USER_EXISTING`: the user's ordinary Chrome profile, explicitly selected
 * - `CUSTOM`: an explicit existing profile path
 *
 * @private shared tool contract
 */
export const PROFILE_SOURCES = ['MANAGED_GLOBAL', 'PROJECT', 'USER_EXISTING', 'CUSTOM'] as const;

/**
 * One browser profile source.
 *
 * @private shared tool contract
 */
export type ProfileSource = (typeof PROFILE_SOURCES)[number];

/**
 * How a harness instance authenticates: its native account/subscription context or an explicit API key.
 *
 * @private shared tool contract
 */
export const AUTHENTICATION_MODES = ['NATIVE', 'API_KEY'] as const;

/**
 * One authentication mode.
 *
 * @private shared tool contract
 */
export type AuthenticationMode = (typeof AUTHENTICATION_MODES)[number];

/**
 * Endpoint keywords of a harness tool's `baseUrl` (an explicit http(s) base URL is the third form; an omitted
 * `baseUrl` means the plugin's official endpoint).
 *
 * @private shared tool contract
 */
export const ENDPOINT_KEYWORDS = ['OFFICIAL', 'LOCAL'] as const;

/**
 * Former per-instance harness fields, superseded by plugin-owned defaults and the shared MODEL commitment (kept and
 * diagnosed until the project migration converts them; never a live configuration source).
 *
 * @private shared tool contract
 */
export const SUPERSEDED_HARNESS_FIELDS = ['model', 'thinkingLevel', 'models'] as const;

/**
 * Fields every tool record shares.
 *
 * @private shared tool contract
 */
type ToolCommon = {
    /** User-editable kebab-case identifier, unique across the project's tools. */
    readonly name: string;
    /** Optional free text (never normalized). */
    readonly description?: string;
    /** Whether the instance is available for new selections (configuration and credentials are retained either way). */
    readonly isEnabled: boolean;
};

/**
 * A named browser/profile context.
 *
 * @private shared tool contract
 */
export type BrowserToolRecord = ToolCommon & {
    readonly type: 'BROWSER';
    readonly variant: BrowserVariant;
    /** Profile source and, where appropriate, its path (required for CUSTOM). */
    readonly profile: { readonly source: ProfileSource; readonly path?: string };
    /** Headless mode (independent of the profile source). */
    readonly isHeadless: boolean;
    /** Explicit Chrome-compatible executable (non-secret). */
    readonly executable?: string;
};

/**
 * A named harness instance (one authentication context of a globally installed integration).
 *
 * @private shared tool contract
 */
export type HarnessToolRecord = ToolCommon & {
    readonly type: 'HARNESS';
    readonly variant: HarnessVariant;
    readonly authentication: AuthenticationMode;
    /** `${{ env.NAME }}` reference only (active for API_KEY, inactive metadata for NATIVE). */
    readonly apiKey?: string;
    /** Non-secret reference to a distinct adapter-supported native login context. */
    readonly accountProfile?: string;
    /**
     * Model execution endpoint: `OFFICIAL`, `LOCAL` (inference on the engine's host) or an explicit base URL without
     * secrets. Omitted: the plugin's official endpoint.
     */
    readonly baseUrl?: string;
};

/**
 * One typed tool record of `ptbk.json.tools`.
 *
 * @private shared tool contract
 */
export type ToolRecord = BrowserToolRecord | HarnessToolRecord;

/**
 * Canonical fields of each tool type, in their saved order (used for tolerant key matching and serialization).
 *
 * @private shared tool contract
 */
export const TOOL_FIELDS: Readonly<Record<ToolType, readonly string[]>> = {
    BROWSER: ['type', 'variant', 'name', 'description', 'isEnabled', 'profile', 'isHeadless', 'executable'],
    HARNESS: ['type', 'variant', 'name', 'description', 'isEnabled', 'authentication', 'apiKey', 'accountProfile', 'baseUrl'],
};

/**
 * Endpoint of a harness tool as a MODEL `runtime` value: `official`, `local` or the base URL.
 *
 * @private shared tool contract
 */
export function toolRuntime(tool: Pick<HarnessToolRecord, 'baseUrl'>): string {
    if (!tool.baseUrl || tool.baseUrl === 'OFFICIAL') return 'official';
    if (tool.baseUrl === 'LOCAL') return 'local';
    return tool.baseUrl.replace(/\/+$/, '');
}

/**
 * Variants of one tool type.
 *
 * @private shared tool contract
 */
export function variantsOf(type: ToolType): readonly string[] {
    return type === 'BROWSER' ? BROWSER_VARIANTS : HARNESS_VARIANTS;
}

/**
 * Internal plugin identifier of a harness variant (`OPENAI_CODEX` → `openai-codex`).
 *
 * @private shared tool contract
 */
export function harnessPluginId(variant: HarnessVariant): string {
    return variant.toLowerCase().replace(/_/g, '-');
}

/**
 * Harness variant of an internal plugin identifier (`openai-codex` → `OPENAI_CODEX`), if supported.
 *
 * @private shared tool contract
 */
export function harnessVariantOf(pluginId: string): HarnessVariant | undefined {
    const variant = canonicalEnumValue(pluginId);
    return (HARNESS_VARIANTS as readonly string[]).includes(variant) ? (variant as HarnessVariant) : undefined;
}

/**
 * Human label of a tool type.
 *
 * @private shared tool contract
 */
export function toolTypeLabel(type: ToolType): string {
    return type === 'BROWSER' ? 'browser' : 'harness';
}

/**
 * Human description of a browser profile source.
 *
 * @private shared tool contract
 */
export function describeProfileSource(source: ProfileSource, path?: string): string {
    switch (source) {
        case 'MANAGED_GLOBAL':
            return 'dedicated Promptbook profile shared by your projects';
        case 'PROJECT':
            return 'isolated project profile';
        case 'USER_EXISTING':
            return 'your existing Chrome profile';
        case 'CUSTOM':
            return `custom profile ${path ?? '(path missing)'}`;
    }
}

/**
 * Enabled tools of one type in array order.
 *
 * @private shared tool contract
 */
export function enabledToolsOf<T extends ToolType>(tools: readonly ToolRecord[], type: T): Array<Extract<ToolRecord, { type: T }>> {
    return tools.filter((tool): tool is Extract<ToolRecord, { type: T }> => tool.type === type && tool.isEnabled);
}
