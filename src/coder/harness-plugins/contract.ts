import type { HarnessRequest, ProcessResult } from '../harness.js';
import type { BridgeTool, ToolBridge } from '../team.js';

/** Stable integration identity, presentation and declared execution capabilities. @private */
export interface HarnessDefinition {
    id: string; name: string; displayName: string; featured: boolean;
    executable: string; packageName: string; install: string; login: string;
    apiKeyEnvironment?: string; configurationEnvironment?: string;
    loginArgs: readonly string[]; helpArgs: readonly string[]; thinkingLevels: readonly string[];
    defaultThinking?: string; defaultModel?: string; nativeDefault: boolean; documentation: string;
    toolDiscovery?: 'codex-app-server' | 'claude-control' | 'copilot-rpc' | 'acp' | 'opencode-preflight';
    readOnlyTools?: boolean; teamModelRequirement?: 'explicit-provider-qualified';
}

/** Observed installation/login/configuration; unknown metadata is retained explicitly. @private */
export interface NativeInspection {
    name: string; executable: string; executablePath?: string; installed: boolean; authenticated: boolean; configured?: boolean; usable: boolean;
    authentication: 'account' | 'api' | 'unknown' | 'none'; version?: string; models: string[];
    thinkingLevels: string[]; capabilities: { team: boolean; readOnly: boolean };
    diagnostic: string; install: string; login: string;
}

/** Non-secret native settings are explicit references, never credential values. @private */
export interface HarnessConfiguration { apiKeyEnv?: string; configurationPath?: string; }

/** Selected-only, read-only probe inputs with bounded native subprocesses. @private */
export interface InspectionOptions { signal?: AbortSignal; homePath?: string; lockPath?: string; configuration?: HarnessConfiguration; harnessSettings?: Record<string, HarnessConfiguration>; }

/** Provider-owned readiness discovery receives a private home and safe metadata runner. @private */
export interface NativeInspectionContext {
    projectPath: string; signal?: AbortSignal; home: string; env: NodeJS.ProcessEnv;
    probe(args: string[]): Promise<ProcessResult>;
}

/** Effective execution inputs after Promptbook applies task and agent constraints. @private */
export interface InvocationInput {
    request: HarnessRequest; prompt: string; help: string; bridge?: ToolBridge; env: NodeJS.ProcessEnv;
    authentication: 'account' | 'api' | 'unknown';
}

/** Autonomous process command; private configuration is removed when the turn ends. @private */
export interface HarnessCommand {
    args: string[]; input?: string; cwd: string; cleanup?: () => Promise<void>; redactionSecrets?: Set<string>;
}

/** Live tool execution must verify discovery before any inference is submitted. @private */
export interface ExecutionInput extends InvocationInput { command: HarnessCommand; tools: BridgeTool[]; }

/** A latest-version probe distinguishes unknown and unsupported from proved currency. @private */
export interface HarnessVersionCheck {
    name: string; outcome: 'current' | 'outdated' | 'unknown' | 'unsupported' | 'missing';
    currentVersion?: string; latestVersion?: string; diagnostic: string;
}

/** Global maintenance records actual verification rather than command launch. @private */
export interface HarnessOperationResult {
    name: string; outcome: 'installed' | 'updated' | 'failed' | 'unsupported' | 'deferred' | 'cancelled';
    diagnostic: string; version?: string;
}

/** Common extensible setup, execution and global maintenance contract. @private */
export interface HarnessPlugin {
    definition: HarnessDefinition;
    inspect(projectPath: string, options?: InspectionOptions): Promise<NativeInspection>;
    installGlobal(projectPath: string, options?: InspectionOptions & { onOutput?: (text: string) => void }): Promise<HarnessOperationResult>;
    setupNative(projectPath: string, options?: InspectionOptions): Promise<HarnessOperationResult>;
    checkVersion(projectPath: string, current: NativeInspection, options?: InspectionOptions): Promise<HarnessVersionCheck>;
    updateGlobal(projectPath: string, check: HarnessVersionCheck, options?: InspectionOptions & { onOutput?: (text: string) => void }): Promise<HarnessOperationResult>;
    configure(request: HarnessRequest, env: NodeJS.ProcessEnv): Promise<void>;
    version(request: HarnessRequest): Promise<string | undefined>;
    help(request: HarnessRequest): Promise<string>;
    authenticate(request: HarnessRequest, env: NodeJS.ProcessEnv): Promise<'account' | 'api' | 'unknown'>;
    prepare(input: InvocationInput): Promise<HarnessCommand>;
    execute(input: ExecutionInput): Promise<ProcessResult>;
}
