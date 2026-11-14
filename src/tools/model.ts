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
export const TOOL_TYPES = ['BROWSER', 'HARNESS', 'INFERENCE_RUNTIME', 'COMPUTER_CONTROL'] as const;

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
export const HARNESS_VARIANTS = ['OPENAI_CODEX', 'CLAUDE_CODE', 'GITHUB_COPILOT', 'OPENCODE', 'GEMINI', 'QWEN_CODE'] as const;

/**
 * One harness adapter.
 *
 * @private shared tool contract
 */
export type HarnessVariant = (typeof HARNESS_VARIANTS)[number];

/**
 * Supported inference runtimes (shared host services and model stores presented as **Local models**). A runtime serves
 * models; it is never a harness or an agent loop of its own.
 *
 * @private shared tool contract
 */
export const INFERENCE_RUNTIME_VARIANTS = ['OLLAMA', 'LM_STUDIO'] as const;

/**
 * One inference runtime adapter.
 *
 * @private shared tool contract
 */
export type InferenceRuntimeVariant = (typeof INFERENCE_RUNTIME_VARIANTS)[number];

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
 * How a harness instance authenticates: its native account/subscription context, an explicit API key, or `NONE` for an
 * explicitly supported credential-free connection (normally local inference), which never inherits native or cloud
 * authentication.
 *
 * @private shared tool contract
 */
export const AUTHENTICATION_MODES = ['NATIVE', 'API_KEY', 'NONE'] as const;

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
    /** `${{ env.NAME }}` reference only (active for API_KEY, inactive metadata for NATIVE and NONE). */
    readonly apiKey?: string;
    /** Non-secret reference to a distinct adapter-supported native login context. */
    readonly accountProfile?: string;
    /**
     * Model execution endpoint: `OFFICIAL`, `LOCAL` (inference on the engine's host) or an explicit base URL without
     * secrets. Omitted: the plugin's official endpoint.
     */
    readonly baseUrl?: string;
    /**
     * Name of the project's `INFERENCE_RUNTIME` tool serving a managed local connection (`baseUrl: LOCAL`). The harness
     * adapter translates it to its actual provider/transport configuration per invocation, never globally.
     */
    readonly inferenceRuntime?: string;
};

/**
 * A project reference to a shared inference runtime on the engine host. Installed versions, model weights, downloads
 * and active consumers are observed machine state, never saved here.
 *
 * @private shared tool contract
 */
export type InferenceRuntimeToolRecord = ToolCommon & {
    readonly type: 'INFERENCE_RUNTIME';
    readonly variant: InferenceRuntimeVariant;
    /** Non-secret local service URL; omitted: the adapter discovers its supported local service. */
    readonly endpoint?: string;
};

/**
 * Native desktop adapters; input always targets the engine host's logged-in graphical session.
 *
 * @private shared tool contract
 */
export const COMPUTER_CONTROL_VARIANTS = ['NATIVE'] as const;

/**
 * Engine-owned access to the host's primary desktop. Image recording is off; live screenshots are ephemeral.
 *
 * @private shared tool contract
 */
export type ComputerControlToolRecord = ToolCommon & {
    readonly type: 'COMPUTER_CONTROL';
    readonly variant: (typeof COMPUTER_CONTROL_VARIANTS)[number];
};

/**
 * One typed tool record of `ptbk.json.tools`.
 *
 * @private shared tool contract
 */
export type ToolRecord = BrowserToolRecord | HarnessToolRecord | InferenceRuntimeToolRecord | ComputerControlToolRecord;

/**
 * Canonical fields of each tool type, in their saved order (used for tolerant key matching and serialization).
 *
 * @private shared tool contract
 */
export const TOOL_FIELDS: Readonly<Record<ToolType, readonly string[]>> = {
    COMPUTER_CONTROL: ['type', 'variant', 'name', 'description', 'isEnabled'],
    BROWSER: ['type', 'variant', 'name', 'description', 'isEnabled', 'profile', 'isHeadless', 'executable'],
    HARNESS: ['type', 'variant', 'name', 'description', 'isEnabled', 'authentication', 'apiKey', 'accountProfile', 'baseUrl', 'inferenceRuntime'],
    INFERENCE_RUNTIME: ['type', 'variant', 'name', 'description', 'isEnabled', 'endpoint'],
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
    return type === 'BROWSER' ? BROWSER_VARIANTS : type === 'COMPUTER_CONTROL' ? COMPUTER_CONTROL_VARIANTS : type === 'INFERENCE_RUNTIME' ? INFERENCE_RUNTIME_VARIANTS : HARNESS_VARIANTS;
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
    return type === 'BROWSER' ? 'browser' : type === 'COMPUTER_CONTROL' ? 'computer control' : type === 'INFERENCE_RUNTIME' ? 'local model runtime' : 'harness';
}

/**
 * Display name of an inference runtime variant.
 *
 * @private shared tool contract
 */
export function runtimeVariantLabel(variant: InferenceRuntimeVariant): string {
    return variant === 'OLLAMA' ? 'Ollama' : 'LM Studio';
}

/**
 * Harness records that reference a runtime tool by name (enabled or not), in array order.
 *
 * @private shared tool contract
 */
export function dependentHarnesses(tools: readonly ToolRecord[], runtimeName: string): HarnessToolRecord[] {
    return tools.filter((tool): tool is HarnessToolRecord => tool.type === 'HARNESS' && tool.inferenceRuntime === runtimeName);
}

/**
 * Why a harness record cannot reach its referenced runtime (missing, wrong type or disabled), or `undefined` when the
 * reference resolves to an enabled runtime record. A harness without a reference has no runtime dependency.
 *
 * @private shared tool contract
 */
export function runtimeReferenceProblem(tools: readonly ToolRecord[], harness: Pick<HarnessToolRecord, 'inferenceRuntime'>): string | undefined {
    if (!harness.inferenceRuntime) return undefined;
    const target = tools.find((tool) => tool.name === harness.inferenceRuntime);
    if (!target) return `its local model runtime "${harness.inferenceRuntime}" is not configured (removed or renamed); rebind it with --inference-runtime <name>`;
    if (target.type !== 'INFERENCE_RUNTIME') return `"${harness.inferenceRuntime}" is a ${toolTypeLabel(target.type)} tool, not a local model runtime`;
    if (!target.isEnabled) return `its local model runtime "${harness.inferenceRuntime}" is disabled`;
    return undefined;
}

/**
 * Whether a harness record can be selected at all: enabled, and its runtime reference (if any) resolves to an enabled
 * runtime. Readiness of the runtime service itself is observed separately.
 *
 * @private shared tool contract
 */
export function isEffectivelyEnabled(tools: readonly ToolRecord[], tool: ToolRecord): boolean {
    if (!tool.isEnabled) return false;
    return tool.type !== 'HARNESS' || runtimeReferenceProblem(tools, tool) === undefined;
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
