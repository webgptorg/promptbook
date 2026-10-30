import type { HarnessToolRecord, HarnessVariant, ThinkingLevel } from '../tools/model.js';

/**
 * How a harness is authenticated.
 *
 * @private harness plugin contract
 */
export type AuthenticationKind = 'account' | 'api' | 'none' | 'unknown';

/**
 * Observed readiness of one globally installed harness (never obtained through a model call).
 *
 * @private harness plugin contract
 */
export type HarnessInspection = {
    /** Plugin identifier. */
    readonly id: string;
    /** Display name. */
    readonly displayName: string;
    /** Executable found. */
    readonly installed: boolean;
    /** Absolute executable path. */
    readonly executablePath?: string;
    /** Installed version. */
    readonly version?: string;
    /** Authentication state (`unknown` when the integration cannot tell without a model call). */
    readonly authenticated: boolean | 'unknown';
    /** Kind of authentication in use. */
    readonly authentication: AuthenticationKind;
    /** Usable for autonomous execution now. */
    readonly usable: boolean;
    /** Known models (empty when unknown). */
    readonly models: readonly string[];
    /** Supported thinking levels. */
    readonly thinkingLevels: readonly ThinkingLevel[];
    /** Execution capabilities. */
    readonly capabilities: HarnessCapabilities;
    /** One-line state summary. */
    readonly summary: string;
    /** Category of the problem, when not usable. */
    readonly problem?: 'missing' | 'signed-out' | 'unsupported' | 'error';
    /** Concrete next action for a problem. */
    readonly nextAction?: string;
    /** Unusable only until this time (epoch ms) after an observed quota/rate limit; the engine rechecks by itself. */
    readonly recheckAt?: number;
    /** Observation time. */
    readonly checkedAt: number;
};

/**
 * Optional capabilities of an integration.
 *
 * @private harness plugin contract
 */
export type HarnessCapabilities = {
    /** Can load the ptbk MCP bridge (TEAM consultations, chats with the user, browser tools). */
    readonly mcp: boolean;
    /** Can enforce read-only execution (planning, consultations). */
    readonly readOnly: boolean;
};

/**
 * Inputs shared by inspection and maintenance operations.
 *
 * @private harness plugin contract
 */
export type HarnessContext = {
    /** Project directory. */
    readonly projectRoot: string;
    /**
     * Environment of the selected instance: the effective discovery PATH, its own credential/account context, and no
     * ambient API keys for a native instance.
     */
    readonly env: NodeJS.ProcessEnv;
    /** The named instance being inspected or maintained (absent for catalog-level probes). */
    readonly tool?: HarnessToolRecord;
    /** Cancellation. */
    readonly signal?: AbortSignal;
};

/**
 * Where the human part of a native sign-in happens: `local` can open a browser on this machine; `remote` is an
 * SSH/browserless host where the owner completes provider sign-in on another device.
 *
 * @private harness plugin contract
 */
export type LoginLocation = 'local' | 'remote';

/**
 * One native sign-in method supported by the installed harness version.
 *
 * @private harness plugin contract
 */
export type HarnessLoginMethod = {
    /** Stable identifier (`device-code`, `url-code`, `browser`, `callback-forwarding`, `native`). */
    readonly id: string;
    /** Short choice label. */
    readonly label: string;
    /** Arguments after the executable. */
    readonly args: readonly string[];
    /** Completable without a browser on this machine (the owner signs in on another device). */
    readonly remote: boolean;
    /** The exact human step, shown before the native flow starts. */
    readonly instructions: string;
    /**
     * How the native flow uses the terminal: `inherit` hands it over completely (e.g. a prompt for a pasted return
     * code); `relay` keeps input attached and echoes output live, so the outcome can be classified from it in memory.
     */
    readonly terminal: 'inherit' | 'relay';
};

/**
 * A classified unsuccessful sign-in, read from the transient output of a relayed native flow.
 *
 * @private harness plugin contract
 */
export type LoginFailure = {
    /** What happened. */
    readonly outcome: 'expired' | 'denied' | 'unsupported';
    /** Explanation with the supported recovery. */
    readonly diagnostic: string;
};

/**
 * MCP server that the harness should load (the ptbk bridge).
 *
 * @private harness plugin contract
 */
export type McpServerLaunch = {
    /** Executable (Node). */
    readonly command: string;
    /** Arguments (bridge script). */
    readonly args: readonly string[];
    /** Environment for the server (bridge socket and token). */
    readonly env: Readonly<Record<string, string>>;
};

/**
 * One autonomous harness invocation.
 *
 * @private harness plugin contract
 */
export type HarnessRunRequest = {
    /** Project directory. */
    readonly projectRoot: string;
    /** Working directory (project or isolated worktree). */
    readonly cwd: string;
    /** Full effective instructions. */
    readonly prompt: string;
    /** Path of a file containing the prompt (for harnesses that take short command-line prompts). */
    readonly promptFile: string;
    /** Model to request (undefined = harness default). */
    readonly model?: string;
    /** Thinking level to request. */
    readonly thinkingLevel?: ThinkingLevel;
    /** Base URL of a local or custom endpoint selected through the tool (undefined = the official endpoint). */
    readonly baseUrl?: string;
    /** Enforce read-only execution. */
    readonly readOnly: boolean;
    /** ptbk MCP bridge to load. */
    readonly mcp?: McpServerLaunch;
    /** Process environment. */
    readonly env: NodeJS.ProcessEnv;
    /** Hard timeout. */
    readonly timeoutMs?: number;
    /** Cancellation. */
    readonly signal?: AbortSignal;
    /** Explicit paid-credit fallback authorization. */
    readonly allowCredits: boolean;
    /** Authentication observed during inspection. */
    readonly authentication: AuthenticationKind;
    /** Additional readable directories (engine documentation for Expert). */
    readonly readableDirectories: readonly string[];
    /** Streaming events. */
    readonly onEvent?: (event: HarnessEvent) => void;
    /** Every raw output line as exposed by the harness (for the task's consolidated trace). */
    readonly onOutput?: (stream: 'stdout' | 'stderr', line: string) => void;
    /** Silence after which the harness is considered stalled (unattended operation; 0 disables). */
    readonly stallTimeoutMs?: number;
};

/**
 * Normalized streaming event of a harness.
 *
 * @private harness plugin contract
 */
export type HarnessEvent =
    | { readonly type: 'message'; readonly text: string }
    | { readonly type: 'activity'; readonly text: string }
    /** The reply text streamed so far (cumulative), where the harness streams it before the complete message. */
    | { readonly type: 'partial'; readonly text: string }
    /** Files the harness reports it changed (authorship evidence for per-file ownership). */
    | { readonly type: 'files'; readonly paths: readonly string[] }
    | { readonly type: 'reasoning'; readonly text: string }
    /**
     * Provider-native usage numbers. `semantics` says whether this observation is a running/final total of the turn
     * (`cumulative`: a later one supersedes it) or an increment (`delta`: increments add up); unknown when omitted.
     */
    | { readonly type: 'usage'; readonly usage: Readonly<Record<string, number>>; readonly costUsd?: number; readonly semantics?: 'delta' | 'cumulative' }
    | { readonly type: 'model'; readonly model: string }
    | { readonly type: 'session'; readonly id: string }
    | { readonly type: 'error'; readonly text: string }
    | { readonly type: 'turn-failed'; readonly text: string };

/**
 * Concrete process invocation built by a plugin.
 *
 * @private harness plugin contract
 */
export type HarnessInvocation = {
    /** Arguments after the executable. */
    readonly args: readonly string[];
    /** Text written to stdin. */
    readonly input?: string;
    /** Process environment. */
    readonly env: NodeJS.ProcessEnv;
    /** Cleanup after the run. */
    readonly cleanup?: () => Promise<void>;
};

/**
 * Mutable per-run parser state.
 *
 * @private harness plugin contract
 */
export type ParserState = {
    /** Accumulated text of the assistant message being streamed. */
    pendingText: string;
    /** Additional plugin-specific fields. */
    [key: string]: unknown;
};

/**
 * Model execution endpoints an adapter can reach. `official` is fixed by the plugin and cannot be redefined by a
 * tool's custom URL.
 *
 * @private harness plugin contract
 */
export type HarnessEndpoints = {
    /** The provider's fixed official endpoint (reached when the tool selects no other one). */
    readonly official: string;
    /** How inference local to the engine's host is reached (absent: local execution is unsupported). */
    readonly local?: string;
    /** Whether an explicit custom base URL is supported. */
    readonly custom: boolean;
};

/**
 * The common integration contract implemented by every harness folder.
 *
 * @private harness plugin contract
 */
export type HarnessPlugin = {
    /** Internal identifier (`openai-codex`); also the accepted CLI/Book spelling of the variant. */
    readonly id: string;
    /** Canonical variant of `ptbk.json.tools` (`OPENAI_CODEX`). */
    readonly variant: HarnessVariant;
    /** Variable through which the CLI accepts an API key for an explicit `API_KEY` instance (absent: unsupported). */
    readonly apiKeyVariable?: string;
    /** Ambient variables that would silently switch a native instance to API billing (removed for `NATIVE`). */
    readonly ambientApiKeyVariables?: readonly string[];
    /** Variable selecting a separate native account/configuration home (`accountProfile`; absent: unsupported). */
    readonly accountHomeVariable?: string;
    /** Display name. */
    readonly displayName: string;
    /** Shown in default catalog views. */
    readonly featured: boolean;
    /** Executable name. */
    readonly executable: string;
    /** npm package for global installation, if distributed through npm. */
    readonly npmPackage?: string;
    /** Documentation URL. */
    readonly homepage: string;
    /** Supported thinking levels. */
    readonly thinkingLevels: readonly ThinkingLevel[];
    /** The harness's own name of the thinking-level setting (e.g. `reasoning effort`), shown instead of a generic label. */
    readonly thinkingLabel?: string;
    /**
     * Default model of the plugin (owned by plugin code, never by a tool's settings). With a complete catalog that
     * lacks it, the catalog's first model is the default instead.
     */
    readonly defaultModel: string;
    /** Default thinking level (absent when the harness has no thinking control). */
    readonly defaultThinkingLevel?: ThinkingLevel;
    /** Whether `listModels` reports every accepted model (`complete`) or only examples/aliases (`partial`). */
    readonly modelCatalog: 'complete' | 'partial';
    /** Reachable model execution endpoints. */
    readonly endpoints: HarnessEndpoints;
    /** Static capabilities (may be refined by inspection). */
    readonly capabilities: HarnessCapabilities;
    /** Native interactive login arguments (inherit the terminal). */
    readonly loginArgs?: readonly string[];
    /** Human login instruction. */
    readonly loginHint: string;
    /**
     * Native sign-in methods of the installed version, most suitable first for the location (absent: one generic
     * method from `loginArgs`, not known to work without a browser on this machine).
     */
    readonly loginMethods?: (context: HarnessContext, location: LoginLocation) => Promise<readonly HarnessLoginMethod[]>;
    /** Classifies the transient output of an unsuccessful relayed sign-in (expiry, denial, a disabled method). */
    readonly classifyLogin?: (output: string) => LoginFailure | undefined;
    /** Native self-update arguments when not installed through npm. */
    readonly selfUpdateArgs?: readonly string[];
    /** Read-only inspection: installation, version, authentication, capabilities. */
    readonly inspect: (context: HarnessContext) => Promise<HarnessInspection>;
    /** Model catalog (bounded, best effort; empty when unknown). */
    readonly listModels?: (context: HarnessContext) => Promise<string[]>;
    /** Builds the autonomous invocation. */
    readonly buildInvocation: (request: HarnessRunRequest) => Promise<HarnessInvocation>;
    /** Parses one stdout line into events. */
    readonly parseLine: (line: string, state: ParserState) => HarnessEvent[];
    /** Final assistant message when the format has no explicit message events (plain-text output). */
    readonly finalMessageFromOutput?: (stdout: string) => string;
};

/**
 * One usage observation of a harness run exactly as the provider exposed it, with its observation time.
 *
 * @private harness plugin contract
 */
export type UsageObservation = {
    /** Observation time (ISO with offset). */
    readonly at: string;
    /** Provider-native numeric fields (nested provider objects flattened as `cache.read`). */
    readonly usage: Readonly<Record<string, number>>;
    /** Provider-reported cost in USD, when exposed. */
    readonly costUsd?: number;
    /** Delta or cumulative semantics; `unknown` when the adapter cannot tell. */
    readonly semantics: 'delta' | 'cumulative' | 'unknown';
};
