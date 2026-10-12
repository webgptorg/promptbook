import { spawn } from 'node:child_process';
import { readFile, access } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { resolve, dirname, isAbsolute, win32 } from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import type { HarnessOutcome } from './harness.js';

/** Secrets learned only for output redaction; these never become provider credentials. @private */
const PROJECT_SECRETS = new Map<string, Set<string>>();

/** Canonicalize a redaction scope without changing files. @private */
function secretScope(projectPath: string): string {
    let canonical: string;
    try { canonical = realpathSync.native(projectPath); } catch { canonical = resolve(projectPath); }
    return process.platform === 'win32' ? win32.normalize(canonical).replace(/^\\\\\?\\UNC\\/i, '\\\\').replace(/^\\\\\?\\/, '').toLowerCase() : canonical;
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
    const lexical = process.platform === 'win32' ? win32.normalize(resolve(projectPath)).replace(/^\\\\\?\\UNC\\/i, '\\\\').replace(/^\\\\\?\\/, '').toLowerCase() : resolve(projectPath);
    PROJECT_SECRETS.set(lexical, secrets);
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

/** Generous task/check deadline; metadata probes and TEAM consultations use shorter explicit bounds. @private */
export const DEFAULT_PROCESS_TIMEOUT_MS = 60 * 60 * 1000;

/** Preserve explicitly selected cmd.exe check syntax using Node's own Windows shell argument convention. @private */
export function prepareProcessArguments(command: string, args: string[], platform: NodeJS.Platform = process.platform): { args: string[]; windowsVerbatimArguments?: boolean } {
    if (platform === 'win32' && /(?:^|[\\/])cmd(?:\.exe)?$/i.test(command) && args.length === 4 && /^\/d$/i.test(args[0]!) && /^\/s$/i.test(args[1]!) && /^\/c$/i.test(args[2]!)) return { args: [args[0]!, args[1]!, args[2]!, `"${args[3]}"`], windowsVerbatimArguments: true };
    return { args };
}

/** Resolve Windows npm shims to their Node entry point instead of passing task text through cmd.exe. @private */
export async function resolveProcessCommand(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): Promise<{ command: string; args: string[] }> {
    if (platform !== 'win32') return { command, args };
    if (/\.(?:exe|com)$/i.test(command)) return { command, args };
    const explicit = isAbsolute(command) || win32.isAbsolute(command) || /[\\/]/.test(command);
    const paths = explicit ? [''] : (env.PATH || env.Path || '').split(';').filter(Boolean);
    const extensions = /\.(?:cmd|bat)$/i.test(command) ? [''] : ['.exe', '.com', '', '.cmd', '.bat'];
    for (const directory of paths) for (const extension of extensions) {
        const candidate = explicit ? resolve(cwd, command + extension) : resolve(directory.replace(/^"|"$/g, ''), command + extension);
        try { await access(candidate); } catch { continue; }
        if (/\.(?:exe|com)$/i.test(candidate)) return { command: candidate, args };
        let wrapper: string;
        try { const bytes = await readFile(candidate); if (bytes.length > 64 * 1024) continue; wrapper = bytes.toString('utf8'); } catch { continue; }
        const shebang = wrapper.split(/\r?\n/)[0]!;
        if (shebang === `#!${process.execPath}` || /^#!\s*\/usr\/bin\/env\s+node\s*$/.test(shebang) || /^#!.*[\\/]node(?:\.exe)?\s*$/i.test(shebang)) return { command: process.execPath, args: [candidate, ...args] };
        if (/\.(?:cmd|bat)$/i.test(candidate)) {
            const entry = /"%(?:dp0|~dp0)%?[\\/]([^"\r\n]+\.(?:mjs|cjs|js))"\s+%\*/i.exec(wrapper);
            if (entry && !entry[1]!.includes('%')) {
                const script = resolve(dirname(candidate), entry[1]!.replace(/[\\/]/g, '/'));
                await access(script);
                return { command: process.execPath, args: [script, ...args] };
            }
            throw new Error(`Cannot safely execute non-Node Windows command wrapper ${candidate}. Configure an executable or a supported npm CLI shim.`);
        }
    }
    return { command, args };
}

/** Spawn argv directly and cancel only the owned process group (or Windows PID tree). @private */
export async function runProcess(command: string, args: string[], options: ProcessOptions): Promise<ProcessResult> {
    if (options.signal?.aborted) return Promise.resolve({ exitCode: null, signal: null, output: '', cancelled: true });
    const timeoutMs = options.timeoutMs ?? DEFAULT_PROCESS_TIMEOUT_MS;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647) return { exitCode: null, signal: null, output: '', cancelled: false, spawnError: 'Subprocess timeout must be a positive integer within the supported timer range.', configurationError: true };
    const redactionPath = options.redactionPath || options.cwd;
    await loadProjectSecrets(redactionPath);
    const secretSnapshot = new Set([...(PROJECT_SECRETS.get(secretScope(redactionPath)) || []), ...(options.redactionSecrets || [])]);
    for (const [key, value] of Object.entries(options.env || {})) if (value && value.length >= 4 && /(?:TOKEN|SECRET|PASSWORD|API_?KEY|PRIVATE_?KEY|CREDENTIAL)/i.test(key)) secretSnapshot.add(value);
    let executable: { command: string; args: string[] };
    try { executable = await resolveProcessCommand(command, args, options.cwd, options.env || process.env); }
    catch (error) { return { exitCode: null, signal: null, output: '', cancelled: false, spawnError: redactSecrets((error as Error).message, redactionPath, secretSnapshot), configurationError: true }; }
    const invocation = prepareProcessArguments(executable.command, executable.args);
    return new Promise((accept) => {
        const child = spawn(executable.command, invocation.args, { cwd: options.cwd, env: options.env || process.env, shell: false, ...(invocation.windowsVerbatimArguments ? { windowsVerbatimArguments: true } : {}), detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
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
                // Console Node providers have no window for taskkill's default close request. Cancel the owned tree immediately.
                const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
                killer.on('error', () => { try { child.kill(hard ? 'SIGKILL' : 'SIGTERM'); } catch { /* Already exited. */ } });
            } else {
                try { process.kill(-child.pid, hard ? 'SIGKILL' : 'SIGTERM'); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') spawnError = (error as Error).message; }
            }
            if (!hard && process.platform !== 'win32') { killTimer ||= setTimeout(() => terminate(true), 1000); killTimer.unref(); }
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
        const timer = setTimeout(() => { spawnError = `Subprocess timeout after ${timeoutMs} ms`; terminate(); }, timeoutMs);
        timer.unref();
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

