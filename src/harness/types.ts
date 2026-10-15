import type { HarnessSettings, ThinkingLevel } from '../project/config.js';

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
    /** Observation time. */
    readonly checkedAt: number;
};

/**
 * Optional capabilities of an integration.
 *
 * @private harness plugin contract
 */
export type HarnessCapabilities = {
    /** Can load the ptbk MCP bridge (TEAM consultations, user requests, browser tools). */
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
    /** Environment with the effective discovery PATH. */
    readonly env: NodeJS.ProcessEnv;
    /** Non-secret project configuration of the harness. */
    readonly settings?: HarnessSettings;
    /** Cancellation. */
    readonly signal?: AbortSignal;
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
};

/**
 * Normalized streaming event of a harness.
 *
 * @private harness plugin contract
 */
export type HarnessEvent =
    | { readonly type: 'message'; readonly text: string }
    | { readonly type: 'activity'; readonly text: string }
    | { readonly type: 'reasoning'; readonly text: string }
    | { readonly type: 'usage'; readonly usage: Readonly<Record<string, number>>; readonly costUsd?: number }
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
 * The common integration contract implemented by every harness folder.
 *
 * @private harness plugin contract
 */
export type HarnessPlugin = {
    /** Stable identifier used in ptbk.json and flags. */
    readonly id: string;
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
    /** Static capabilities (may be refined by inspection). */
    readonly capabilities: HarnessCapabilities;
    /** Native interactive login arguments (inherit the terminal). */
    readonly loginArgs?: readonly string[];
    /** Human login instruction. */
    readonly loginHint: string;
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
