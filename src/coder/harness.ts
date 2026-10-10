import { spawn } from 'node:child_process';
import { readFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { prepareAgent } from './agents.js';
import { advisorTools, createToolBridge } from './team.js';
import type { BridgeTool, TeamBudget, ToolBridge } from './team.js';
import { confinePath } from './workspace.js';

/** Explicit outcomes used by the shared execution engine. @private */
export type HarnessOutcome = 'success' | 'configuration' | 'authentication' | 'quota' | 'transient' | 'process-failure' | 'cancelled';

/** One immutable inference request; task text is never interpolated into shell code. @private */
export interface HarnessRequest {
    harness: string; projectPath: string; prompt: string; agentPath?: string; context?: string;
    model?: string; thinkingLevel?: string; allowCredits?: boolean; signal?: AbortSignal; onOutput?: (chunk: string) => void;
    readOnly?: boolean; tools?: BridgeTool[]; teamBudget?: TeamBudget; maxOutputBytes?: number; timeoutMs?: number;
    sessionId?: string; redactionPath?: string;
}

/** Provider report with actual process status and provider-reported usage. @private */
export interface HarnessResult {
    outcome: HarnessOutcome; exitCode: number | null; output: string; usage?: Record<string, number>; sessionId?: string;
    signal?: NodeJS.Signals | null; authentication?: 'account' | 'api' | 'unknown'; effectiveModel?: string;
    quotaResetAt?: number;
}

/** Registry metadata is the single source for runtime selection and CLI help. @private */
export interface HarnessDefinition {
    name: string; executable: string; install: string; login: string; thinkingLevels: readonly string[];
    defaultThinking?: string; defaultModel?: string; nativeDefault: boolean; documentation: string;
    toolDiscovery?: 'codex-app-server' | 'claude-control' | 'copilot-rpc' | 'acp' | 'opencode-preflight';
    readOnlyTools?: boolean;
    teamModelRequirement?: 'explicit-provider-qualified';
}

/** Provider syntax verified against official documentation; models remain adapter-owned. @private */
export const HARNESS_REGISTRY: readonly HarnessDefinition[] = [
    { name: 'openai-codex', executable: 'codex', install: 'npm install --global @openai/codex', login: 'codex login', thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'], defaultThinking: 'xhigh', nativeDefault: true, toolDiscovery: 'codex-app-server', readOnlyTools: true, documentation: 'https://learn.chatgpt.com/docs/app-server' },
    { name: 'claude-code', executable: 'claude', install: 'https://code.claude.com/docs/en/setup', login: 'claude auth login', thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'], nativeDefault: true, toolDiscovery: 'claude-control', readOnlyTools: true, documentation: 'https://code.claude.com/docs/en/cli-reference' },
    { name: 'github-copilot', executable: 'copilot', install: 'npm install --global @github/copilot', login: 'copilot login', thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'], nativeDefault: true, toolDiscovery: 'copilot-rpc', readOnlyTools: true, documentation: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference' },
    { name: 'cline', executable: 'cline', install: 'npm install --global cline', login: 'cline auth', thinkingLevels: ['low', 'medium', 'high', 'xhigh'], defaultModel: 'anthropic/claude-sonnet-4.6', nativeDefault: false, documentation: 'https://github.com/cline/cline/blob/main/docs/cli/cli-reference.mdx' },
    { name: 'opencode', executable: 'opencode', install: 'npm install --global opencode-ai', login: 'opencode auth login', thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'], nativeDefault: true, toolDiscovery: 'opencode-preflight', readOnlyTools: true, teamModelRequirement: 'explicit-provider-qualified', documentation: 'https://opencode.ai/docs/cli/' },
    { name: 'gemini', executable: 'gemini', install: 'npm install --global @google/gemini-cli', login: 'gemini (interactive login)', thinkingLevels: [], defaultModel: 'auto', nativeDefault: false, toolDiscovery: 'acp', readOnlyTools: true, documentation: 'https://geminicli.com/docs/cli/headless/' },
    { name: 'qwen-code', executable: 'qwen', install: 'npm install --global @qwen-code/qwen-code', login: 'qwen (interactive login)', thinkingLevels: [], defaultModel: 'qwen3-coder-plus', nativeDefault: false, toolDiscovery: 'acp', documentation: 'https://qwenlm.github.io/qwen-code-docs/en/users/features/headless/' },
];

/** Secrets learned only for output redaction; these never become provider credentials. @private */
const PROJECT_SECRETS = new Map<string, Set<string>>();

/** Canonicalize a redaction scope without changing files. @private */
function secretScope(projectPath: string): string {
    try { return realpathSync(projectPath); } catch { return resolve(projectPath); }
}

/** Learn local dotenv secret values without applying environment overrides or exposing them. @private */
export async function loadProjectSecrets(projectPath: string): Promise<void> {
    const secrets = new Set<string>();
    for (const filename of ['.env', '.env.local']) {
        let text: string;
        try { text = await readFile(resolve(projectPath, filename), 'utf8'); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
        for (const line of text.split(/\r?\n/)) {
            const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)$/.exec(line);
            if (!match || !/(TOKEN|SECRET|PASSWORD|API_?KEY|PRIVATE_?KEY|CREDENTIAL)/i.test(match[1]!)) continue;
            const value = match[2]!.trim().replace(/^(["'])(.*)\1$/, '$2').replace(/\s+#.*$/, '');
            if (value.length >= 4) secrets.add(value);
        }
    }
    PROJECT_SECRETS.set(secretScope(projectPath), secrets);
}

/** Resolve a known harness or throw an actionable configuration error. @private */
export function getHarness(name: string): HarnessDefinition {
    const harness = HARNESS_REGISTRY.find((entry) => entry.name === name);
    if (!harness) throw new Error(`Unknown harness ${name}; choose ${HARNESS_REGISTRY.map((entry) => entry.name).join(', ')}`);
    return harness;
}

/** Redact known environment secrets and recognizable credentials before output or durable storage. @private */
export function redactSecrets(text: string, projectPath = process.cwd(), secretSnapshot?: ReadonlySet<string>): string {
    let result = text;
    for (const value of secretSnapshot || PROJECT_SECRETS.get(secretScope(projectPath)) || []) result = result.split(value).join('[REDACTED]');
    for (const [key, value] of Object.entries(process.env)) {
        if (value && value.length >= 8 && /(?:TOKEN|SECRET|PASSWORD|API_?KEY|PRIVATE_?KEY|CREDENTIAL)/i.test(key)) result = result.split(value).join('[REDACTED]');
    }
    return result
        .replace(/\b(?:sk-(?:proj-|ant-)?[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]{12,}|github_pat_[A-Za-z0-9_]{12,}|npm_[A-Za-z0-9_]{12,})\b/g, '[REDACTED]')
        .replace(/(Bearer\s+)[A-Za-z0-9._~+\/-]{8,}/gi, '$1[REDACTED]')
        .replace(/((?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret)\s*["']?\s*[:=]\s*["']?)[^\s,"'}]+/gi, '$1[REDACTED]');
}

/** Scoped subprocess options shared by harnesses and user-selected project checks. @private */
export interface ProcessOptions {
    cwd: string; env?: NodeJS.ProcessEnv; input?: string; signal?: AbortSignal; onOutput?: (chunk: string) => void;
    maxOutputBytes?: number; timeoutMs?: number; redactionPath?: string; startupTimeoutMs?: number; redactionSecrets?: ReadonlySet<string>;
    protocol?: ProcessProtocol;
    keepInputOpen?: boolean;
}

/** A host-driven protocol may send requests while stdin remains open; output stays redacted. @private */
export interface ProcessProtocol {
    framing?: 'content-length';
    start(send: (message: unknown) => void, finish: () => void, ready: () => void): void;
    message(message: Record<string, unknown>, send: (message: unknown) => void, finish: () => void, ready: () => void): string | undefined;
}

/** Actual subprocess terminal status, including spawn failures and process-tree cancellation. @private */
export interface ProcessResult { exitCode: number | null; signal: NodeJS.Signals | null; output: string; spawnError?: string; cancelled: boolean; configurationError?: boolean; }

/** Spawn argv directly and cancel only the owned process group (or Windows PID tree). @private */
export async function runProcess(command: string, args: string[], options: ProcessOptions): Promise<ProcessResult> {
    if (options.signal?.aborted) return Promise.resolve({ exitCode: null, signal: null, output: '', cancelled: true });
    const redactionPath = options.redactionPath || options.cwd;
    await loadProjectSecrets(redactionPath);
    const secretSnapshot = new Set([...(PROJECT_SECRETS.get(secretScope(redactionPath)) || []), ...(options.redactionSecrets || [])]);
    return new Promise((accept) => {
        const child = spawn(command, args, { cwd: options.cwd, env: options.env || process.env, shell: false, detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
        let output = '';
        let pending = '';
        let cancelled = false;
        let spawnError: string | undefined;
        let killTimer: ReturnType<typeof setTimeout> | undefined;
        let finishTimer: ReturnType<typeof setTimeout> | undefined;
        let startupTimer: ReturnType<typeof setTimeout> | undefined;
        let configurationError = false;
        let closed = false;
        const decoders = { stdout: new StringDecoder('utf8'), stderr: new StringDecoder('utf8') };
        let protocolPending = '';
        let framedPending: Buffer<ArrayBufferLike> = Buffer.alloc(0);
        /** Send structured requests directly to the owned provider process. */
        const send = (message: unknown) => {
            const body = JSON.stringify(message);
            child.stdin.write(options.protocol?.framing === 'content-length' ? `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}` : `${body}\n`);
        };
        /** Closing input ends the controlled app-server process after terminal status. */
        const finish = () => {
            child.stdin.end();
            finishTimer ||= setTimeout(() => { spawnError ||= 'Provider did not exit after its terminal response'; terminate(); }, 5000);
            finishTimer.unref();
        };
        /** Startup is bounded separately from the potentially long coding turn. */
        const ready = () => { if (startupTimer) { clearTimeout(startupTimer); startupTimer = undefined; } };
        /** Consume an application message after transport framing has been validated. */
        function protocolMessage(body: string): void {
            try { const visible = options.protocol!.message(JSON.parse(body) as Record<string, unknown>, send, finish, ready); if (visible) append(visible); }
            catch (error) { spawnError = (error as Error).message; terminate(); }
        }
        /** Parse standard JSON-RPC Content-Length frames using byte counts, preserving Unicode. */
        function framedChunk(chunk: Buffer): void {
            framedPending = Buffer.concat([framedPending, chunk]);
            const limit = options.maxOutputBytes || 2 * 1024 * 1024;
            for (;;) {
                const boundary = framedPending.indexOf('\r\n\r\n');
                if (boundary < 0) { if (framedPending.length > 8192) { spawnError = 'Provider protocol header exceeded its limit'; terminate(); } return; }
                const header = framedPending.subarray(0, boundary).toString('ascii');
                const lengths = [...header.matchAll(/^Content-Length:\s*(\d+)\s*$/gim)];
                const size = lengths.length === 1 ? Number(lengths[0]![1]) : NaN;
                if (boundary > 8192 || !Number.isSafeInteger(size) || size < 0 || size > limit) { spawnError = 'Provider protocol returned an invalid Content-Length'; terminate(); return; }
                if (framedPending.length < boundary + 4 + size) return;
                const body = framedPending.subarray(boundary + 4, boundary + 4 + size).toString('utf8');
                framedPending = framedPending.subarray(boundary + 4 + size);
                protocolMessage(body);
                if (spawnError) return;
            }
        }
        /** Parse bounded protocol lines before presentation, without displaying config secrets. */
        function protocolChunk(chunk: string): void {
            protocolPending += chunk;
            if (Buffer.byteLength(protocolPending) > (options.maxOutputBytes || 2 * 1024 * 1024)) { spawnError = 'Provider protocol line exceeded output limit'; terminate(); return; }
            let boundary: number;
            while ((boundary = protocolPending.indexOf('\n')) >= 0) {
                const line = protocolPending.slice(0, boundary); protocolPending = protocolPending.slice(boundary + 1);
                if (!line.trim()) continue;
                protocolMessage(line);
                if (spawnError) return;
            }
        }
        /** Signal the owned process tree without touching unrelated processes. */
        function terminate(hard = false): void {
            if (!child.pid || closed) return;
            if (process.platform === 'win32') {
                const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', ...(hard ? ['/F'] : [])], { stdio: 'ignore' });
                killer.on('error', () => { try { child.kill(hard ? 'SIGKILL' : 'SIGTERM'); } catch { /* Already exited. */ } });
            } else {
                try { process.kill(-child.pid, hard ? 'SIGKILL' : 'SIGTERM'); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') spawnError = (error as Error).message; }
            }
            if (!hard) { killTimer ||= setTimeout(() => terminate(true), 1000); killTimer.unref(); }
        }
        /** Cancel the complete process group, escalating after a bounded grace period. */
        function cancel(): void { cancelled = true; terminate(); }
        /** Buffer lines so secrets split across OS stream chunks are redacted together. */
        function append(chunk: string): void {
            pending += chunk;
            const last = pending.lastIndexOf('\n');
            if (last >= 0) {
                const clean = redactSecrets(pending.slice(0, last + 1), redactionPath, secretSnapshot);
                pending = pending.slice(last + 1);
                output += clean;
                options.onOutput?.(clean);
            }
            if (Buffer.byteLength(output) + Buffer.byteLength(pending) > (options.maxOutputBytes || 2 * 1024 * 1024)) {
                spawnError = 'Subprocess output exceeded the configured limit';
                pending = '';
                terminate();
            }
        }
        child.stdout.on('data', (data: Buffer) => { if (options.protocol?.framing === 'content-length') { framedChunk(data); return; } const chunk = decoders.stdout.write(data); if (options.protocol) protocolChunk(chunk); else append(chunk); });
        child.stderr.on('data', (data: Buffer) => append(decoders.stderr.write(data)));
        child.stdin.on('error', () => { /* EPIPE is expected when a provider rejects setup early. */ });
        child.on('error', (error) => { spawnError = error.message; });
        options.signal?.addEventListener('abort', cancel, { once: true });
        const timer = options.timeoutMs ? setTimeout(() => { spawnError = `Subprocess timeout after ${options.timeoutMs} ms`; cancel(); }, options.timeoutMs) : undefined;
        timer?.unref();
        child.on('close', (exitCode, signal) => {
            options.signal?.removeEventListener('abort', cancel);
            if (timer) clearTimeout(timer);
            if (startupTimer) clearTimeout(startupTimer);
            if (finishTimer) clearTimeout(finishTimer);
            if (killTimer) { terminate(true); clearTimeout(killTimer); }
            closed = true;
            const finalStdout = decoders.stdout.end();
            if (options.protocol?.framing === 'content-length') { if (framedPending.length) spawnError ||= 'Provider exited with an incomplete Content-Length frame'; }
            else if (options.protocol) protocolChunk(finalStdout + (protocolPending ? '\n' : '')); else append(finalStdout);
            append(decoders.stderr.end());
            if (pending) { const clean = redactSecrets(pending, redactionPath, secretSnapshot); output += clean; options.onOutput?.(clean); }
            if (finishTimer) clearTimeout(finishTimer);
            accept({ exitCode, signal, output: output.slice(0, options.maxOutputBytes || 2 * 1024 * 1024), ...(spawnError ? { spawnError: redactSecrets(spawnError, redactionPath, secretSnapshot) } : {}), cancelled, ...(configurationError ? { configurationError } : {}) });
        });
        if (options.protocol) {
            startupTimer = setTimeout(() => { spawnError = 'Provider startup discovery timed out before inference'; configurationError = true; terminate(); }, options.startupTimeoutMs || 30_000);
            startupTimer.unref();
            try { options.protocol.start(send, finish, ready); } catch (error) { spawnError = (error as Error).message; terminate(); }
        }
        else if (!options.keepInputOpen) child.stdin.end(options.input || '');
    });
}

/** Categorize failures using terminal process outcome; completion markers never manufacture success. @private */
export function classifyHarnessResult(result: ProcessResult): HarnessOutcome {
    if (result.cancelled) return 'cancelled';
    const text = result.output;
    if (/usage.?limit|quota.?exceed|rate.?limit|insufficient.?quota|credit(?:s)? (?:required|exhausted|balance)|out of credits|hit your limit|too many requests/i.test(text)) return 'quota';
    if (/not (?:logged|signed) in|authentication (?:failed|required)|unauthenticated|invalid.?api.?key|unauthorized|login required|please (?:log|sign) in/i.test(text)) return 'authentication';
    if (result.configurationError) return 'configuration';
    if (/unknown (?:option|argument)|invalid (?:configuration|model)|unsupported (?:model|reasoning|effort)|unrecognized (?:option|argument)/i.test(text)) return 'configuration';
    if (result.spawnError || result.signal) return 'process-failure';
    if (/ECONNRESET|ETIMEDOUT|service unavailable|temporarily unavailable|overloaded|\bHTTP 50[234]\b/i.test(text)) return 'transient';
    if (result.exitCode !== 0 || /"(?:type|status)"\s*:\s*"(?:turn\.failed|failed|error)"|"is_error"\s*:\s*true/.test(text)) return 'process-failure';
    return 'success';
}

/** Extract structured provider usage and session identifiers without counting intermediate summaries twice. @private */
function providerMetadata(output: string): { usage?: Record<string, number>; sessionId?: string; quotaResetAt?: number; effectiveModel?: string } {
    let usage: Record<string, number> | undefined;
    let sessionId: string | undefined;
    let quotaResetAt: number | undefined;
    let effectiveModel: string | undefined;
    const steps = new Map<string, Record<string, number>>();
    for (const line of output.split('\n')) {
        try {
            const event = JSON.parse(line) as Record<string, unknown>;
            const reported = event.usage || (event.result as Record<string, unknown> | undefined)?.usage || (event.type === 'result' ? event.stats : undefined);
            if (reported && typeof reported === 'object') {
                const values = Object.entries(reported).filter(([name, value]) => typeof value === 'number' && Number.isFinite(value) && (reported !== event.stats || /token|cached|^input$/.test(name)));
                if (values.length) usage = Object.fromEntries(values) as Record<string, number>;
            }
            const part = event.part as Record<string, unknown> | undefined;
            if (event.type === 'step_finish' && typeof part?.id === 'string' && part.tokens && typeof part.tokens === 'object') {
                const tokens = part.tokens as Record<string, unknown>;
                const values = Object.fromEntries(Object.entries(tokens).filter(([, value]) => typeof value === 'number' && Number.isFinite(value))) as Record<string, number>;
                const cache = tokens.cache as Record<string, unknown> | undefined;
                for (const name of ['read', 'write']) if (typeof cache?.[name] === 'number' && Number.isFinite(cache[name])) values[`cache_${name}`] = cache[name];
                if (typeof part.cost === 'number' && Number.isFinite(part.cost)) values.cost = part.cost;
                steps.set(part.id, values);
            }
            const id = event.thread_id || event.session_id || event.sessionID;
            if (typeof id === 'string') sessionId = id;
            if (typeof event.model === 'string') effectiveModel = event.model;
            const limit = (event.rate_limit_info || event.error || event) as Record<string, unknown>;
            const reset = limit.resetsAt || limit.reset_at || limit.resetAt;
            if (typeof reset === 'number' && Number.isFinite(reset) && reset > 0) quotaResetAt = reset < 1_000_000_000_000 ? reset * 1000 : reset;
            else if (typeof reset === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(reset) && Number.isFinite(Date.parse(reset))) quotaResetAt = Date.parse(reset);
        } catch { /* Plain provider output is a supported fallback. */ }
    }
    if (steps.size) {
        usage = {};
        for (const values of steps.values()) for (const [name, value] of Object.entries(values)) usage[name] = (usage[name] || 0) + value;
    }
    return { ...(usage ? { usage } : {}), ...(sessionId ? { sessionId } : {}), ...(quotaResetAt ? { quotaResetAt } : {}), ...(effectiveModel ? { effectiveModel } : {}) };
}

/** Validate installed provider capabilities before inference. This never installs a harness. @private */
async function providerHelp(harness: HarnessDefinition, request: HarnessRequest): Promise<string> {
    const helpArgs = harness.name === 'openai-codex' ? ['exec', '--help'] : harness.name === 'opencode' ? ['run', '--help'] : ['--help'];
    const response = await runProcess(harness.executable, helpArgs, { cwd: request.projectPath, signal: request.signal, timeoutMs: 15_000 });
    if (response.spawnError || response.exitCode !== 0) throw new Error(`${harness.name} setup failed: ${response.spawnError || response.output}. Install: ${harness.install}; login: ${harness.login}`);
    return response.output;
}

/** Enforce account preference and require explicit API billing opt-in. @private */
async function codexAuthentication(request: HarnessRequest, env: NodeJS.ProcessEnv): Promise<'account' | 'api'> {
    const probeEnvironment = { ...env };
    delete probeEnvironment.OPENAI_API_KEY; delete probeEnvironment.CODEX_API_KEY;
    const status = await runProcess('codex', ['login', 'status'], { cwd: request.projectPath, env: probeEnvironment, signal: request.signal, timeoutMs: 15_000 });
    if (status.exitCode === 0 && /Logged in using ChatGPT|chatgpt_auth_tokens|"authMode"\s*:\s*"chatgpt"/i.test(status.output)) { delete env.OPENAI_API_KEY; delete env.CODEX_API_KEY; delete env.OPENAI_BASE_URL; return 'account'; }
    if (process.env.PTBK_OPENAI_CODEX_USE_API_KEY === '1' && (env.OPENAI_API_KEY || env.CODEX_API_KEY)) {
        env.CODEX_API_KEY = env.CODEX_API_KEY || env.OPENAI_API_KEY;
        return 'api';
    }
    throw new Error('OpenAI Codex authentication required: run codex login. API billing requires PTBK_OPENAI_CODEX_USE_API_KEY=1 and OPENAI_API_KEY, and is never an automatic fallback.');
}

/** Construct provider argv, transient configuration and capabilities without shell interpolation. @private */
async function invocation(harness: HarnessDefinition, request: HarnessRequest, prompt: string, help: string, bridge: ToolBridge | undefined, env: NodeJS.ProcessEnv, authentication: 'account' | 'api' | 'unknown'): Promise<{ args: string[]; input?: string; cwd: string; cleanup?: () => Promise<void>; redactionSecrets?: Set<string> }> {
    const model = !request.model || request.model === 'default' ? (harness.nativeDefault ? undefined : harness.defaultModel) : request.model;
    const thinking = request.thinkingLevel || harness.defaultThinking;
    if (thinking && !harness.thinkingLevels.includes(thinking)) throw new Error(`${harness.name} does not support --thinking-level ${thinking}; supported: ${harness.thinkingLevels.join(', ') || 'none'}`);
    /** Require a version-advertised option; absent support is an explicit setup failure. */
    function requireFlag(flag: string): void { if (!help.includes(flag)) throw new Error(`${harness.name} installed CLI does not advertise required capability ${flag}; update the provider CLI. See ${harness.documentation}`); }
    const args: string[] = [];
    let cwd = request.projectPath;
    let cleanup: (() => Promise<void>) | undefined;
    const redactionSecrets = new Set<string>();
    if (harness.name === 'openai-codex') {
        requireFlag('--json'); requireFlag('--sandbox');
        args.push('exec', '--json', '--color', 'never', '--sandbox', request.readOnly ? 'read-only' : 'workspace-write', '-c', 'approval_policy="never"');
        // forced_login_method controls authentication, not purchased ChatGPT credits.
        // Require an explicit provider-enforced credit prohibition instead of inventing a config key.
        args.push('-c', authentication === 'api' ? 'forced_login_method="api"' : 'forced_login_method="chatgpt"');
        if (authentication === 'account' && !request.allowCredits) {
            if (help.includes('--no-credits')) args.push('--no-credits');
            else if (help.includes('--disable-credits')) args.push('--disable-credits');
            else throw new Error('The installed Codex CLI cannot enforce credit-free account execution. No model call was made. Use --allow-credits only if you authorize account credits, or select a harness with an enforceable credit policy. API billing remains a separate explicit opt-in.');
        }
        if (request.readOnly) {
            requireFlag('--ignore-user-config'); requireFlag('--ignore-rules'); requireFlag('--disable');
            args.push('--ignore-user-config', '--ignore-rules', '--skip-git-repo-check', '--ephemeral');
            for (const feature of ['shell_tool', 'unified_exec', 'hooks', 'plugins', 'apps', 'multi_agent', 'computer_use', 'browser_use', 'image_generation', 'view_image']) args.push('--disable', feature);
            args.push('-c', 'web_search="disabled"', '-c', 'project_root_markers=[]', '-c', 'project_doc_max_bytes=0');
            const runtime = await confinePath(request.projectPath, resolve(request.projectPath, '.promptbook/ptbk-coder'));
            await mkdir(runtime, { recursive: true });
            cwd = await mkdtemp(resolve(await confinePath(request.projectPath, runtime), 'planner-'));
            cleanup = () => rm(cwd, { recursive: true, force: true });
        }
        if (model) args.push('--model', model);
        if (thinking) args.push('-c', `model_reasoning_effort=${JSON.stringify(thinking)}`);
        if (bridge) args.push('-c', `mcp_servers.ptbk.command=${JSON.stringify(bridge.stdio.command)}`, '-c', `mcp_servers.ptbk.args=${JSON.stringify(bridge.stdio.args)}`, '-c', 'mcp_servers.ptbk.required=true', '-c', 'mcp_servers.ptbk.tool_timeout_sec=300');
        args.push('-');
        return { args, input: prompt, cwd, cleanup };
    }
    if (harness.name === 'claude-code') {
        requireFlag('--output-format');
        args.push('--print', '--output-format', 'stream-json', '--verbose', '--permission-mode', request.readOnly ? 'dontAsk' : 'acceptEdits');
        if (request.readOnly) {
            requireFlag('--tools'); requireFlag('--strict-mcp-config'); requireFlag('--restricted'); requireFlag('--setting-sources'); requireFlag('--settings'); requireFlag('--disable-slash-commands');
            args.push('--tools', '', '--strict-mcp-config', '--restricted', '--setting-sources', '', '--settings', '{"disableAllHooks":true}', '--disable-slash-commands');
        }
        if (thinking) { requireFlag('--effort'); args.push('--effort', thinking); }
        if (model) args.push('--model', model);
        if (bridge) { requireFlag('--mcp-config'); requireFlag('--input-format'); requireFlag('--allowedTools'); args.push('--mcp-config', bridge.configPath, '--input-format', 'stream-json', '--allowedTools', 'mcp__ptbk__*'); }
        if (request.sessionId) args.push('--resume', request.sessionId);
        return { args, input: prompt, cwd };
    }
    if (harness.name === 'github-copilot') {
        if (bridge) {
            // The official SDK transport options are hidden from public help; the versioned connect handshake validates them before inference.
            args.push('--headless', '--stdio');
            for (const flag of ['--no-auto-update', '--disable-builtin-mcps', '--no-custom-instructions', '--no-bash-env']) { requireFlag(flag); args.push(flag); }
            return { args, cwd, input: prompt };
        }
        args.push('--prompt', prompt, '--allow-all-tools');
        if (model) args.push('--model', model);
        if (thinking) { requireFlag('--reasoning-effort'); args.push('--reasoning-effort', thinking); }
    } else if (harness.name === 'gemini' || harness.name === 'qwen-code') {
        requireFlag('--output-format');
        requireFlag('--approval-mode');
        args.push('--prompt', prompt, '--output-format', 'stream-json', '--approval-mode', request.readOnly ? 'plan' : 'yolo');
        if (model) args.push('--model', model);
        if (bridge) {
            requireFlag('--acp');
            if (harness.name === 'qwen-code') {
                requireFlag('--mcp-config'); args.push('--mcp-config', bridge.configPath);
                if (request.readOnly) { requireFlag('--safe-mode'); args.push('--safe-mode'); }
            }
            else {
                const path = resolve(bridge.directory, 'gemini-settings.json');
                let system: Record<string, unknown> = {};
                if (env.GEMINI_CLI_SYSTEM_SETTINGS_PATH) system = JSON.parse(await readFile(env.GEMINI_CLI_SYSTEM_SETTINGS_PATH, 'utf8')) as Record<string, unknown>;
                await writeFile(path, JSON.stringify({
                    ...system,
                    ...(request.readOnly ? { tools: { core: [], discoveryCommand: '', callCommand: '' }, mcp: { allowed: ['ptbk'] }, hooksConfig: { enabled: false }, skills: { enabled: false }, experimental: { enableAgents: false, autoMemory: false } } : {}),
                    mcpServers: { ...(request.readOnly ? {} : system.mcpServers as object || {}), ptbk: { ...bridge.stdio, trust: true, timeout: 300_000 } },
                }), { mode: 0o600 });
                env.GEMINI_CLI_SYSTEM_SETTINGS_PATH = path;
            }
        }
    } else if (harness.name === 'opencode') {
        args.push('run', '--format', 'json', prompt);
        if (model) { if (!model.includes('/')) throw new Error('OpenCode model must be provider-qualified: provider/model'); args.push('--model', model); }
        if (thinking) { requireFlag('--variant'); args.push('--variant', thinking); }
        const prior = env.OPENCODE_CONFIG_CONTENT ? JSON.parse(env.OPENCODE_CONFIG_CONTENT) as Record<string, unknown> : {};
        if (request.readOnly) {
            requireFlag('--pure');
            if (!model) throw new Error('OpenCode read-only advisors require an explicit provider/model so configuration isolation cannot silently change the selected provider. No model call was made.');
            const isolated = resolve(bridge!.directory, 'opencode-config');
            await mkdir(isolated, { mode: 0o700 });
            env.OPENCODE_PURE = '1';
            env.OPENCODE_DISABLE_PROJECT_CONFIG = '1';
            env.OPENCODE_TEST_HOME = isolated;
            env.OPENCODE_CONFIG_DIR = isolated;
            env.XDG_CONFIG_HOME = isolated;
            delete env.OPENCODE_CONFIG; delete env.OPENCODE_PERMISSION;
        }
        env.OPENCODE_CONFIG_CONTENT = JSON.stringify({ ...(request.readOnly ? {} : prior), ...(bridge ? { mcp: { ...(request.readOnly ? {} : prior.mcp as object || {}), ptbk: { type: 'local', command: [bridge.stdio.command, ...bridge.stdio.args], enabled: true, timeout: 300_000 } } } : {}), permission: request.readOnly ? { '*': 'deny', 'ptbk_*': 'allow' } : { '*': 'allow' } });
    } else if (harness.name === 'cline') {
        requireFlag('--json'); requireFlag('--auto-approve'); requireFlag('--config'); requireFlag('--data-dir');
        if (model) requireFlag('--model');
        if (thinking) requireFlag('--thinking');
        // Cline persists --model even for one-shot runs, so copy only credential/provider state into owned temporary storage.
        const providerPath = env.CLINE_PROVIDER_SETTINGS_PATH || resolve(env.CLINE_DATA_DIR || resolve(env.CLINE_DIR || resolve(homedir(), '.cline'), 'data'), 'settings/providers.json');
        const runtime = await confinePath(request.projectPath, resolve(request.projectPath, '.promptbook/ptbk-coder'));
        await mkdir(runtime, { recursive: true });
        const isolated = await mkdtemp(resolve(await confinePath(request.projectPath, runtime), 'cline-'));
        cleanup = () => rm(isolated, { recursive: true, force: true });
        const copiedProviderPath = resolve(isolated, 'providers.json');
        try {
            const bytes = await readFile(providerPath);
            if (bytes.length > 1024 * 1024) throw new Error('Cline provider credential settings exceed 1 MiB');
            /** Learn credential values for redaction without applying them as environment overrides. */
            function credentials(value: unknown): void {
                if (!value || typeof value !== 'object') return;
                for (const [key, entry] of Object.entries(value)) {
                    if (typeof entry === 'string' && entry.length >= 4 && /TOKEN|SECRET|PASSWORD|API_?KEY|PRIVATE_?KEY|CREDENTIAL/i.test(key)) redactionSecrets.add(entry);
                    else if (typeof entry === 'object') credentials(entry);
                }
            }
            let settings: unknown;
            try { settings = JSON.parse(bytes.toString('utf8')); } catch { throw new Error('Cline provider credential settings contain invalid JSON; repair the native configuration before running coder'); }
            credentials(settings);
            await writeFile(copiedProviderPath, bytes, { mode: 0o600 });
        }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') { await cleanup(); throw error; } }
        env.CLINE_PROVIDER_SETTINGS_PATH = copiedProviderPath;
        env.CLINE_GLOBAL_SETTINGS_PATH = resolve(isolated, 'global-settings.json');
        env.CLINE_SESSION_BACKEND_MODE = 'local';
        env.CLINE_DIR = isolated;
        env.CLINE_DATA_DIR = resolve(isolated, 'data');
        args.push('--config', isolated, '--data-dir', env.CLINE_DATA_DIR);
        args.push('--json', '--auto-approve', request.readOnly ? 'false' : 'true');
        if (request.readOnly) { requireFlag('--plan'); requireFlag('--auto-approve'); args.push('--plan'); }
        if (model) args.push('--model', model);
        if (thinking) args.push('--thinking', thinking);
        if (bridge) env.CLINE_MCP_SETTINGS_PATH = bridge.configPath;
        args.push(prompt);
    }
    return { args, cwd, cleanup, redactionSecrets };
}

/** Gate Codex generation behind its native thread startup and actual tool catalog. @private */
async function runCodexWithTools(request: HarnessRequest, command: { args: string[]; input?: string; cwd: string }, bridge: ToolBridge, tools: BridgeTool[], env: NodeJS.ProcessEnv): Promise<ProcessResult> {
    const help = await runProcess('codex', ['app-server', '--help'], { cwd: command.cwd, env, signal: request.signal, timeoutMs: 15_000 });
    if (help.exitCode !== 0 || !help.output.includes('--strict-config')) throw new Error('Installed Codex lacks the required app-server tool discovery protocol. Update Codex before using TEAM or planning.');
    const args = ['app-server', '--strict-config', '-c', 'project_root_markers=[]'];
    for (let index = 0; index < command.args.length; index++) {
        const argument = command.args[index]!;
        if (argument === '-c' || argument === '--disable') args.push(argument, command.args[++index]!);
        else if (argument === '--no-credits' || argument === '--disable-credits') {
            if (!help.output.includes(argument)) throw new Error('Codex app-server cannot enforce the requested credit prohibition; explicit --allow-credits is required for TEAM/planning. No model call was made.');
            args.push(argument);
        }
    }
    let threadId: string | undefined;
    let started = false;
    let finished = false;
    let startupFailure: string | undefined;
    let usage: Record<string, number> | undefined;
    let effectiveModel: string | undefined;
    const catalog: Array<Record<string, unknown>> = [];
    const expected = tools.map((tool) => tool.name);
    let pages = 0;
    /** Configuration errors end transport without starting an inference. */
    function failure(message: string, finish: () => void): string {
        startupFailure = message; finish();
        return `${JSON.stringify({ type: 'error', message })}\n`;
    }
    const protocol: ProcessProtocol = {
        start: (send) => send({ id: 1, method: 'initialize', params: { clientInfo: { name: 'ptbk', title: 'Promptbook coder', version: '1' } } }),
        message: (message, send, finish, ready) => {
            if (message.error) return failure(`Codex ${started ? 'turn' : 'startup'} failed: ${JSON.stringify(message.error)}`, finish);
            const result = message.result as Record<string, unknown> | undefined;
            if (message.id === 1) {
                send({ method: 'initialized', params: {} });
                send({ id: 2, method: 'config/read', params: { includeLayers: false } });
            } else if (message.id === 2) {
                const configuration = result?.config as Record<string, unknown> | undefined;
                if (!configuration || typeof configuration !== 'object') return failure('Codex did not return an effective configuration; no model call was made.', finish);
                if (request.readOnly) {
                    const features = configuration.features as Record<string, unknown> | undefined;
                    const requiredDisabled = ['shell_tool', 'unified_exec', 'hooks', 'plugins', 'apps', 'multi_agent', 'computer_use', 'browser_use', 'image_generation', 'view_image'];
                    if (!features || requiredDisabled.some((name) => features[name] !== false)) return failure('Codex configuration did not enforce disabled native shell, write-capable integrations and delegation. No model call was made.', finish);
                }
                const servers = configuration.mcp_servers;
                if (servers !== undefined && (!servers || typeof servers !== 'object' || Array.isArray(servers))) return failure('Codex returned an invalid MCP configuration; no model call was made.', finish);
                const overrides: Record<string, unknown> = { project_root_markers: [], mcp_servers: { ptbk: { ...bridge.stdio, required: true, tool_timeout_sec: 300 } } };
                if (request.readOnly) {
                    const disabled = Object.fromEntries(Object.keys((servers || {}) as object).filter((name) => name !== 'ptbk').map((name) => [name, { enabled: false }]));
                    overrides.mcp_servers = { ...disabled, ptbk: { ...bridge.stdio, required: true, tool_timeout_sec: 300 } };
                    overrides.project_doc_max_bytes = 0;
                }
                const model = request.model && request.model !== 'default' ? request.model : undefined;
                send({ id: 3, method: 'thread/start', params: { cwd: command.cwd, ephemeral: true, approvalPolicy: 'never', sandbox: request.readOnly ? 'read-only' : 'workspace-write', ...(model ? { model } : {}), config: overrides } });
            } else if (message.id === 3) {
                const thread = result?.thread as Record<string, unknown> | undefined;
                if (typeof thread?.id !== 'string') return failure('Codex thread startup returned no thread identifier; no model call was made.', finish);
                if (request.readOnly && ((result?.sandbox as Record<string, unknown> | undefined)?.type !== 'readOnly' || result?.approvalPolicy !== 'never')) return failure('Codex did not enforce read-only sandbox and approval policy; no model call was made.', finish);
                threadId = thread.id;
                if (typeof result?.model === 'string') effectiveModel = result.model;
                send({ id: 4, method: 'mcpServerStatus/list', params: { threadId, detail: 'toolsAndAuthOnly', limit: 100 } });
            } else if (message.id === 4) {
                if (!Array.isArray(result?.data)) return failure('Codex tool discovery returned no catalog; no model call was made.', finish);
                catalog.push(...result.data as Array<Record<string, unknown>>);
                if (result.nextCursor) {
                    if (++pages > 64 || typeof result.nextCursor !== 'string') return failure('Codex tool catalog pagination exceeded its limit; no model call was made.', finish);
                    send({ id: 4, method: 'mcpServerStatus/list', params: { threadId, detail: 'toolsAndAuthOnly', limit: 100, cursor: result.nextCursor } });
                    return;
                }
                const server = catalog.find((entry) => entry.name === 'ptbk');
                const available = server?.tools && typeof server.tools === 'object' ? Object.keys(server.tools) : [];
                if (!bridge.discovered() || !server || server.toolsError || expected.some((name) => !available.includes(name))) return failure('Codex did not discover all required ptbk tools; no model call was made.', finish);
                if (request.readOnly && catalog.some((entry) => entry.name !== 'ptbk' && entry.tools && Object.keys(entry.tools as object).length)) return failure('Codex exposed external tools in read-only planning; no model call was made.', finish);
                ready(); started = true;
                send({ id: 5, method: 'turn/start', params: { threadId, input: [{ type: 'text', text: command.input || request.prompt }] } });
                return `${JSON.stringify({ type: 'thread.started', thread_id: threadId, ...(effectiveModel ? { model: effectiveModel } : {}) })}\n`;
            }
            const params = message.params as Record<string, unknown> | undefined;
            if (message.method === 'thread/tokenUsage/updated') {
                const reported = (params?.tokenUsage as Record<string, unknown> | undefined)?.total;
                if (reported && typeof reported === 'object') usage = Object.fromEntries(Object.entries(reported).filter(([, value]) => typeof value === 'number')) as Record<string, number>;
                return;
            }
            if (message.method === 'turn/completed') {
                const turn = params?.turn as Record<string, unknown> | undefined;
                finished = true; finish();
                return `${JSON.stringify({ type: turn?.status === 'completed' ? 'turn.completed' : 'turn.failed', ...(usage ? { usage } : {}), ...(turn?.error ? { error: turn.error } : {}) })}\n`;
            }
            if (message.method && message.id !== undefined) {
                // Approval, shell, elicitation and permission requests are never delegated to a human or another tool.
                send({ id: message.id, error: { code: -32601, message: 'ptbk denies provider-initiated host operations' } });
                return;
            }
            if (message.method === 'item/completed' && params?.item) return `${JSON.stringify({ type: 'item.completed', item: params.item })}\n`;
            if (message.method === 'item/agentMessage/delta') return `${JSON.stringify({ type: 'item.delta', delta: params?.delta })}\n`;
            if (message.method === 'error') return `${JSON.stringify({ type: 'error', ...params })}\n`;
            return;
        },
    };
    const result = await runProcess('codex', args, { cwd: command.cwd, redactionPath: request.redactionPath || request.projectPath, env, protocol, signal: request.signal, onOutput: request.onOutput, timeoutMs: request.timeoutMs, maxOutputBytes: request.maxOutputBytes });
    if (startupFailure) return { ...result, spawnError: startupFailure, configurationError: !started };
    if (!finished && !result.cancelled) return { ...result, spawnError: result.spawnError || 'Codex app-server exited without a terminal turn outcome' };
    return result;
}

/** Claude's SDK control protocol discovers MCP tools while the user-message stream is empty. @private */
async function runClaudeWithTools(request: HarnessRequest, command: { args: string[]; input?: string; cwd: string }, bridge: ToolBridge, tools: BridgeTool[], env: NodeJS.ProcessEnv): Promise<ProcessResult> {
    let started = false;
    let finished = false;
    let failure: string | undefined;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    const deadline = Date.now() + 15_000;
    const expected = tools.map((tool) => tool.name);
    /** Refuse startup without submitting a user message or spending inference. */
    function refuse(message: string, finish: () => void): string { failure = message; finish(); return `${JSON.stringify({ type: 'error', message })}\n`; }
    const protocol: ProcessProtocol = {
        start: (send) => send({ type: 'control_request', request_id: 'ptbk_initialize', request: { subtype: 'initialize', hooks: null } }),
        message: (message, send, finish, ready) => {
            if (message.type === 'control_response') {
                const response = message.response as Record<string, unknown> | undefined;
                if (response?.subtype !== 'success') return refuse(`Claude startup control failed: ${JSON.stringify(response)}. No model call was made.`, finish);
                if (response.request_id === 'ptbk_initialize') send({ type: 'control_request', request_id: 'ptbk_mcp_status', request: { subtype: 'mcp_status' } });
                else if (response.request_id === 'ptbk_mcp_status') {
                    const data = response.response as Record<string, unknown> | undefined;
                    const servers = data?.mcpServers;
                    if (!Array.isArray(servers)) return refuse('Claude did not provide a native MCP catalog. No model call was made.', finish);
                    const server = (servers as Array<Record<string, unknown>>).find((entry) => entry.name === 'ptbk');
                    if (server?.status === 'pending' || server?.status === 'connecting') {
                        if (Date.now() >= deadline) return refuse('Claude MCP startup exceeded 15 seconds. No model call was made.', finish);
                        pollTimer = setTimeout(() => send({ type: 'control_request', request_id: 'ptbk_mcp_status', request: { subtype: 'mcp_status' } }), 100); pollTimer.unref();
                        return;
                    }
                    const available = Array.isArray(server?.tools) ? (server.tools as Array<Record<string, unknown>>).map((tool) => tool.name) : [];
                    if (server?.status !== 'connected' || !bridge.discovered() || expected.some((name) => !available.includes(name))) return refuse('Claude did not discover all required ptbk tools. No model call was made.', finish);
                    if (request.readOnly && (servers as Array<Record<string, unknown>>).some((entry) => entry.name !== 'ptbk' && entry.status === 'connected')) return refuse('Claude exposed external tools to a read-only advisor. No model call was made.', finish);
                    ready(); started = true;
                    send({ type: 'user', session_id: '', message: { role: 'user', content: command.input || request.prompt }, parent_tool_use_id: null });
                }
                return;
            }
            if (message.type === 'control_request') {
                const control = message.request as Record<string, unknown> | undefined;
                const name = typeof control?.tool_name === 'string' ? control.tool_name : '';
                const permitted = control?.subtype === 'can_use_tool' && (!request.readOnly || expected.some((tool) => name === `mcp__ptbk__${tool}`));
                send({ type: 'control_response', response: { subtype: 'success', request_id: message.request_id, response: permitted ? { behavior: 'allow', updatedInput: control?.input || {} } : { behavior: 'deny', message: 'ptbk denies operations outside the selected role permissions' } } });
                return;
            }
            if (message.type === 'result') { finished = true; finish(); }
            return `${JSON.stringify(message)}\n`;
        },
    };
    try {
        const result = await runProcess('claude', command.args, { cwd: command.cwd, redactionPath: request.redactionPath || request.projectPath, env, protocol, signal: request.signal, onOutput: request.onOutput, timeoutMs: request.timeoutMs, maxOutputBytes: request.maxOutputBytes });
        if (failure) return { ...result, spawnError: failure, configurationError: !started };
        if (!finished && !result.cancelled) return { ...result, spawnError: result.spawnError || 'Claude exited without a terminal result' };
        return result;
    } finally { if (pollTimer) clearTimeout(pollTimer); }
}

/** Copilot's native SDK transport gates generation on live MCP discovery and source-qualified tool permissions. @private */
async function runCopilotWithTools(request: HarnessRequest, command: { args: string[]; input?: string; cwd: string }, bridge: ToolBridge, tools: BridgeTool[], env: NodeJS.ProcessEnv): Promise<ProcessResult> {
    const sessionId = randomUUID();
    const expected = tools.map((tool) => tool.name);
    let started = false;
    let finished = false;
    let startupFailure: string | undefined;
    let permissionId = 100;
    let reportedUsage: Record<string, number> = {};
    /** End startup without submitting any prompt if native isolation or discovery fails. */
    function refuse(message: string, finish: () => void): string { startupFailure = message; finish(); return `${JSON.stringify({ type: 'error', message })}\n`; }
    const protocol: ProcessProtocol = {
        framing: 'content-length',
        start: (send) => send({ jsonrpc: '2.0', id: 1, method: 'connect', params: { clientInfo: { extensionName: 'ptbk', extensionVersion: '1' } } }),
        message: (message, send, finish, ready) => {
            if (message.error) return refuse(`Copilot ${started ? 'turn' : 'startup'} failed: ${JSON.stringify(message.error)}`, finish);
            const result = message.result as Record<string, unknown> | undefined;
            if (message.id === 1) {
                if (result?.protocolVersion !== 3) return refuse('Copilot does not support SDK protocol version 3; no model call was made.', finish);
                const model = request.model && request.model !== 'default' ? request.model : undefined;
                send({ jsonrpc: '2.0', id: 2, method: 'session.create', params: {
                    sessionId, workingDirectory: command.cwd, streaming: true, requestPermission: true,
                    enableConfigDiscovery: false, customAgentsLocalOnly: true,
                    mcpServers: { ptbk: { type: 'local', ...bridge.stdio, tools: ['*'], deferTools: 'never', disableToolCache: true } },
                    ...(model ? { model } : {}), ...(request.thinkingLevel ? { reasoningEffort: request.thinkingLevel } : {}),
                    ...(request.readOnly ? {
                        availableTools: expected.map((name) => `mcp:ptbk-${name}`),
                        enableFileHooks: false, enableHostGitOperations: false, enableSessionStore: false, enableSkills: false,
                        enableOnDemandInstructionDiscovery: false, memory: { enabled: false }, skipEmbeddingRetrieval: true, mcpOAuthTokenStorage: 'in-memory',
                    } : {}),
                } });
            } else if (message.id === 2) {
                if (result?.sessionId !== sessionId) return refuse('Copilot did not establish the requested isolated session; no model call was made.', finish);
                send({ jsonrpc: '2.0', id: 3, method: 'session.mcp.list', params: { sessionId } });
            } else if (message.id === 3) {
                const servers = result?.servers;
                if (!Array.isArray(servers) || !(servers as Array<Record<string, unknown>>).some((server) => server.name === 'ptbk' && server.status === 'connected')) return refuse('Copilot did not connect the required ptbk MCP server; no model call was made.', finish);
                if (request.readOnly && (servers as Array<Record<string, unknown>>).some((server) => server.name !== 'ptbk' && server.status === 'connected')) return refuse('Copilot exposed external tools to a read-only advisor; no model call was made.', finish);
                send({ jsonrpc: '2.0', id: 4, method: 'session.mcp.listTools', params: { sessionId, serverName: 'ptbk' } });
            } else if (message.id === 4) {
                const available = Array.isArray(result?.tools) ? (result.tools as Array<Record<string, unknown>>).map((tool) => tool.name) : [];
                if (!bridge.discovered() || expected.some((name) => !available.includes(name))) return refuse('Copilot did not discover all required ptbk tools; no model call was made.', finish);
                ready(); started = true;
                send({ jsonrpc: '2.0', id: 5, method: 'session.send', params: { sessionId, prompt: command.input || request.prompt } });
                return `${JSON.stringify({ type: 'init', session_id: sessionId })}\n`;
            }
            if (message.method && message.id !== undefined) { send({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'ptbk denies provider-initiated host operations' } }); return; }
            const params = message.params as Record<string, unknown> | undefined;
            if (message.method !== 'session.event' || params?.sessionId !== sessionId) return;
            const event = params.event as Record<string, unknown> | undefined;
            const data = event?.data as Record<string, unknown> | undefined;
            if (event?.type === 'permission.requested') {
                const permission = data?.permissionRequest as Record<string, unknown> | undefined;
                const toolName = typeof permission?.toolName === 'string' ? permission.toolName : '';
                const allowed = !request.readOnly || (permission?.kind === 'mcp' && permission.serverName === 'ptbk' && expected.some((name) => toolName === name || toolName === `ptbk-${name}`));
                send({ jsonrpc: '2.0', id: ++permissionId, method: 'session.permissions.handlePendingPermissionRequest', params: { sessionId, requestId: data?.requestId, result: { kind: allowed ? 'approved' : 'denied-interactively-by-user' } } });
                return;
            }
            if (event?.type === 'assistant.usage' && data) for (const name of ['inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'cost']) if (typeof data[name] === 'number') reportedUsage[name] = (reportedUsage[name] || 0) + data[name];
            if (event?.type === 'session.error') { finished = true; finish(); return `${JSON.stringify({ type: 'turn.failed', error: data })}\n`; }
            if (event?.type === 'session.idle' && !event.agentId && started) { finished = true; finish(); return `${JSON.stringify({ type: data?.aborted ? 'turn.failed' : 'turn.completed', ...(Object.keys(reportedUsage).length ? { usage: reportedUsage } : {}) })}\n`; }
            return event ? `${JSON.stringify(event)}\n` : undefined;
        },
    };
    const result = await runProcess('copilot', command.args, { cwd: command.cwd, redactionPath: request.redactionPath || request.projectPath, env, protocol, signal: request.signal, onOutput: request.onOutput, timeoutMs: request.timeoutMs, maxOutputBytes: request.maxOutputBytes });
    if (startupFailure) return { ...result, spawnError: startupFailure, configurationError: !started };
    if (!finished && !result.cancelled) return { ...result, spawnError: result.spawnError || 'Copilot exited without a terminal session outcome' };
    return result;
}

/** Execute one provider turn, with immutable agent context and actual on-demand TEAM tools. @private */
async function runAcpWithTools(harness: HarnessDefinition, request: HarnessRequest, command: { args: string[]; input?: string; cwd: string }, bridge: ToolBridge, env: NodeJS.ProcessEnv, prompt: string): Promise<ProcessResult> {
    const args = ['--acp'];
    for (let index = 0; index < command.args.length; index++) {
        const argument = command.args[index]!;
        if (argument === '--prompt' || argument === '--output-format') { index++; continue; }
        args.push(argument);
    }
    let started = false;
    let finished = false;
    let startupFailure: string | undefined;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let sessionId: string | undefined;
    let contextTokens: number | undefined;
    const deadline = Date.now() + 15_000;
    /** Actual MCP initialize/tools/list must settle before session/prompt can be sent. */
    function gate(send: (message: unknown) => void, finish: () => void, ready: () => void): void {
        if (bridge.discovered()) { ready(); started = true; send({ jsonrpc: '2.0', id: 3, method: 'session/prompt', params: { sessionId, prompt: [{ type: 'text', text: prompt }] } }); }
        else if (Date.now() >= deadline) { startupFailure = `${harness.name} did not discover required ptbk tools before inference`; finish(); }
        else { pollTimer = setTimeout(() => gate(send, finish, ready), 50); pollTimer.unref(); }
    }
    const protocol: ProcessProtocol = {
        start: (send) => send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: 1, clientCapabilities: {}, clientInfo: { name: 'ptbk', version: '1' } } }),
        message: (message, send, finish, ready) => {
            if (message.error) { startupFailure = started ? undefined : JSON.stringify(message.error); finished = started; finish(); return `${JSON.stringify({ type: 'error', error: message.error })}\n`; }
            const result = message.result as Record<string, unknown> | undefined;
            if (message.id === 1) {
                if (result?.protocolVersion !== 1) { startupFailure = `${harness.name} does not support ACP protocol version 1`; finish(); return; }
                send({ jsonrpc: '2.0', id: 2, method: 'session/new', params: { cwd: command.cwd, mcpServers: [{ name: 'ptbk', ...bridge.stdio, env: [] }] } });
            } else if (message.id === 2) {
                if (typeof result?.sessionId !== 'string') { startupFailure = `${harness.name} returned no ACP session`; finish(); return; }
                if (request.readOnly && (result.modes as Record<string, unknown> | undefined)?.currentModeId !== 'plan') { startupFailure = `${harness.name} did not enforce read-only plan mode`; finish(); return; }
                sessionId = result.sessionId;
                gate(send, finish, ready);
                return `${JSON.stringify({ type: 'init', session_id: sessionId, model: (result.models as Record<string, unknown> | undefined)?.currentModelId })}\n`;
            } else if (message.id === 3) {
                finished = true; finish();
                return `${JSON.stringify({ type: result?.stopReason === 'end_turn' ? 'turn.completed' : 'turn.failed', stopReason: result?.stopReason, ...(contextTokens === undefined ? {} : { usage: { reported_context_tokens: contextTokens } }) })}\n`;
            }
            const params = message.params as Record<string, unknown> | undefined;
            if (message.method === 'session/request_permission' && message.id !== undefined) {
                const options = Array.isArray(params?.options) ? params.options as Array<Record<string, unknown>> : [];
                const allowed = !request.readOnly && options.find((option) => option.kind === 'allow_once');
                send({ jsonrpc: '2.0', id: message.id, result: { outcome: allowed ? { outcome: 'selected', optionId: allowed.optionId } : { outcome: 'cancelled' } } });
                return;
            }
            if (message.method && message.id !== undefined) { send({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'ptbk denies native filesystem, shell and delegated host operations' } }); return; }
            if (message.method === 'session/update') {
                const update = params?.update as Record<string, unknown> | undefined;
                if (update?.sessionUpdate === 'usage_update' && typeof update.used === 'number') contextTokens = update.used;
                return `${JSON.stringify({ type: 'acp.update', update })}\n`;
            }
            return;
        },
    };
    try {
        const result = await runProcess(harness.executable, args, { cwd: command.cwd, redactionPath: request.redactionPath || request.projectPath, env, protocol, signal: request.signal, onOutput: request.onOutput, timeoutMs: request.timeoutMs, maxOutputBytes: request.maxOutputBytes });
        if (startupFailure) return { ...result, spawnError: startupFailure, configurationError: !started };
        if (!finished && !result.cancelled) return { ...result, spawnError: result.spawnError || `${harness.name} ACP exited without a terminal turn outcome` };
        return result;
    } finally { if (pollTimer) clearTimeout(pollTimer); }
}

/** Probe native provider configuration and actual bridge discovery without any prompt. @private */
async function preflightTools(harness: HarnessDefinition, request: HarnessRequest, command: { args: string[]; input?: string; cwd: string }, bridge: ToolBridge, env: NodeJS.ProcessEnv): Promise<void> {
    const args = ['mcp', 'list'];
    const probe = await runProcess(harness.executable, args, { cwd: command.cwd, redactionPath: request.redactionPath || request.projectPath, env, signal: request.signal, timeoutMs: 15_000 });
    if (probe.exitCode !== 0 || probe.spawnError || !bridge.discovered()) throw new Error(`${harness.name} native tool discovery failed before inference: ${probe.spawnError || probe.output}. No model call was made.`);
    bridge.resetDiscovery();
}

/** Execute one provider turn, with immutable agent context and actual on-demand TEAM tools. @private */
export async function runHarness(request: HarnessRequest): Promise<HarnessResult> {
    let bridge: ToolBridge | undefined;
    let cleanup: (() => Promise<void>) | undefined;
    let authentication: 'account' | 'api' | 'unknown' = 'unknown';
    const budget = request.teamBudget || { calls: 0, depth: 0, usage: {} };
    const requestedModel = request.model;
    try {
        if (request.signal?.aborted) return { outcome: 'cancelled', exitCode: null, output: 'Harness cancelled before startup.' };
        const harness = getHarness(request.harness);
        if (request.readOnly && !harness.readOnlyTools) throw new Error(`${harness.name} lacks verified isolation from native shell, writes and external tools for read-only advisors. No model call was made. Select a harness with verified read-only tool capability.`);
        if (request.thinkingLevel && !harness.thinkingLevels.includes(request.thinkingLevel)) throw new Error(`${harness.name} does not support --thinking-level ${request.thinkingLevel}; supported: ${harness.thinkingLevels.join(', ') || 'none'}`);
        const help = await providerHelp(harness, request);
        const env = { ...process.env };
        if (harness.name === 'openai-codex') authentication = await codexAuthentication(request, env);
        const agent = request.agentPath ? await prepareAgent(request.agentPath, request.projectPath) : undefined;
        if (agent?.team.length && !harness.readOnlyTools) throw new Error(`${harness.name} lacks verified read-only advisor capability; TEAM is refused before inference. Select a harness with verified TEAM support. No model call was made.`);
        if (agent?.modelParameters) throw new Error(`Agent MODEL parameters are not supported by the selected CLI adapter: ${Object.keys(agent.modelParameters).join(', ')}. Remove those parameters or configure a verified native provider capability; no model call was made.`);
        if (request.model === undefined && agent?.model) request = { ...request, model: agent.model };
        if (harness.teamModelRequirement && agent?.team.length && (!requestedModel || requestedModel === 'default')) throw new Error('OpenCode TEAM requires explicit --model provider/model for isolated advisors. No primary model call was made. Ordinary execution without TEAM retains native model configuration.');
        const readTools = request.tools || (request.readOnly ? (await import('./planner.js')).planningReadTools(request.projectPath) : []);
        const tools = [...readTools, ...advisorTools(agent?.team || [], budget, async (member, question, signal, childBudget) => {
            const advisorReadTools = (request.tools || (await import('./planner.js')).planningReadTools(request.projectPath)).filter((tool) => tool.name !== 'propose_task');
            const result = await runHarness({ ...request, model: requestedModel, agentPath: member.path, prompt: question, onOutput: undefined, signal, readOnly: true, tools: advisorReadTools, teamBudget: childBudget, timeoutMs: 300_000, maxOutputBytes: 2 * 1024 * 1024 });
            if (result.outcome !== 'success') throw new Error(`Advisor ${member.name} ${result.outcome}: ${result.output}`);
            return result;
        }, request.signal)];
        if (tools.length && !harness.toolDiscovery) throw new Error(`${harness.name} cannot verify TEAM/read-tool discovery before inference. Select a harness with verified TEAM capability. No model call was made.`);
        if (tools.length) bridge = await createToolBridge(request.projectPath, tools);
        const prompt = [
            'ORCHESTRATION: Implement only the supplied task. Coder owns status, task claiming, checks and Git finalization. Do not commit, push, claim other tasks, modify coder bookkeeping or run database migrations. Preserve pre-existing user work. Do not weaken validation to make checks pass.',
            request.readOnly ? 'PERMISSIONS: Read-only consultation. No shell commands, filesystem writes, application patches, Git operations or delegated implementation. Use host-provided tools to read the project. Only the primary planner may propose tasks.' : '',
            agent ? `AGENT INSTRUCTIONS:\n${agent.instructions}` : '',
            request.context ? `PROJECT CONTEXT:\n${request.context}` : '',
            bridge ? `AVAILABLE ADVISORS/TOOLS: ${tools.map((tool) => tool.name).join(', ')}. Consult advisors only when useful; each advisor has its own Book.` : '',
            `TASK:\n${request.prompt}`,
        ].filter(Boolean).join('\n\n');
        const command = await invocation(harness, request, prompt, help, bridge, env, authentication);
        cleanup = command.cleanup;
        if (bridge && harness.toolDiscovery === 'opencode-preflight') await preflightTools(harness, request, command, bridge, env);
        const processResult = bridge && harness.toolDiscovery === 'codex-app-server' ? await runCodexWithTools(request, command, bridge, tools, env) : bridge && harness.toolDiscovery === 'claude-control' ? await runClaudeWithTools(request, command, bridge, tools, env) : bridge && harness.toolDiscovery === 'copilot-rpc' ? await runCopilotWithTools(request, command, bridge, tools, env) : bridge && harness.toolDiscovery === 'acp' ? await runAcpWithTools(harness, request, command, bridge, env, prompt) : await runProcess(harness.executable, command.args, { cwd: command.cwd, redactionPath: request.redactionPath || request.projectPath, env, input: command.input, redactionSecrets: command.redactionSecrets, signal: request.signal, onOutput: request.onOutput, timeoutMs: request.timeoutMs, maxOutputBytes: request.maxOutputBytes });
        const metadata = providerMetadata(processResult.output);
        if (metadata.usage) for (const [name, value] of Object.entries(metadata.usage)) budget.usage[name] = (budget.usage[name] || 0) + value;
        let outcome = classifyHarnessResult(processResult);
        let output = processResult.output + (processResult.spawnError ? `\n${processResult.spawnError}` : '');
        if (outcome === 'success' && bridge && !bridge.discovered()) {
            outcome = 'configuration';
            output += '\nThe provider did not discover the required ptbk tools. Update the provider CLI or correct its MCP configuration; this turn cannot be reported as successful.';
        }
        if (outcome === 'authentication') output += `\nLogin: ${harness.login}. Authentication failures are not retried automatically.`;
        if (outcome === 'quota' && request.harness === 'openai-codex' && !request.allowCredits && /credit/i.test(output)) output += '\nCredit use is disabled. Explicitly use --allow-credits to authorize credits; API billing still requires PTBK_OPENAI_CODEX_USE_API_KEY=1.';
        return { outcome, exitCode: processResult.exitCode, signal: processResult.signal, output: redactSecrets(output, request.redactionPath || request.projectPath), ...metadata, authentication, effectiveModel: metadata.effectiveModel || (request.model && request.model !== 'default' ? request.model : harness.nativeDefault ? 'provider-native (not reported)' : harness.defaultModel), ...(!request.teamBudget && Object.keys(budget.usage).length ? { usage: budget.usage } : {}) };
    } catch (error) {
        const output = redactSecrets((error as Error).message, request.redactionPath || request.projectPath);
        return { outcome: request.signal?.aborted ? 'cancelled' : /authentication required/i.test(output) ? 'authentication' : 'configuration', exitCode: null, output, authentication };
    } finally { await bridge?.close(); await cleanup?.(); }
}

/** Load project context with explicit input replacing the implicit AGENTS.md. @private */
export async function loadHarnessContext(projectPath: string, context?: string): Promise<string | undefined> {
    if (context !== undefined) {
        if (context === '') return '';
        try { return await readFile(resolve(projectPath, context), 'utf8'); } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
            return context;
        }
    }
    try { return await readFile(resolve(projectPath, 'AGENTS.md'), 'utf8'); } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
        throw error;
    }
}
