import { spawn, execFile, type ChildProcess } from 'node:child_process';
import { chmod, lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { promisify } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import type { Workspace } from './domain.js';
import { confinePath, InputError } from './workspace.js';

/** Versioned tunnel choices contain references to credentials, never credential bytes. @private */
export interface TunnelOptions { noTunnel?: boolean; tunnelProvider?: 'cloudflare-quick' | 'cloudflare-named'; tunnelClient?: string; tunnelHostname?: string; tunnelId?: string; tunnelCredentialsFile?: string }
/** Public connection observations are safe for ordinary status/API output. @private */
export interface TunnelState { enabled: boolean; provider: string; status: 'disabled' | 'connecting' | 'ready' | 'degraded'; url?: string; diagnostic?: string; nextAttemptAt?: number }
/** Injectable process/network boundaries keep lifecycle and failure fixtures offline. @private */
export interface TunnelDependencies { findClient?: () => Promise<string>; spawn?: (command: string, args: string[]) => ChildProcess; verify?: (origin: string) => Promise<boolean>; attemptMs?: number; retryMs?: number }

/** Validate explicit choices before starting work or silently substituting a provider. @private */
export function validateTunnelOptions(options: TunnelOptions): void {
    if (options.tunnelProvider !== undefined && !['cloudflare-quick', 'cloudflare-named'].includes(options.tunnelProvider)) throw new InputError('Unknown tunnel provider; use cloudflare-quick or cloudflare-named.');
    if (options.tunnelProvider === 'cloudflare-named') {
        if (!options.tunnelHostname || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(options.tunnelHostname) || !options.tunnelHostname.includes('.') || !options.tunnelId || !/^[a-f0-9-]{36}$/i.test(options.tunnelId) || !options.tunnelCredentialsFile) throw new InputError('cloudflare-named requires tunnel.hostname, tunnel.id and tunnel.credentialsFile in ptbk.json; reuse an existing configured tunnel.');
    }
}
/** Check a supplied named credential reference without provisioning an account or revealing its contents. */
async function inspectNamedCredentials(options: TunnelOptions): Promise<void> {
    if (options.tunnelProvider !== 'cloudflare-named') return;
    try {
        const path = resolve(options.tunnelCredentialsFile!);
        const attributes = await lstat(path);
        if (!attributes.isFile() || attributes.size > 64 * 1024) throw new Error('not a bounded credential file');
        await readFile(path);
    } catch { throw new InputError('The named tunnel credential-file reference is missing, unreadable or invalid. Correct tunnel.credentialsFile before publishing this project; no provider setup was changed.'); }
}
/** Find a compatible installed connector without installing anything during inspection/start. @private */
export async function findTunnelClient(workspace: Workspace, options: TunnelOptions): Promise<string> {
    const managed = await confinePath(workspace.projectPath, join(workspace.statePath, 'tools', process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared'));
    for (const command of options.tunnelClient ? [options.tunnelClient] : ['cloudflared', managed]) {
        try {
            const { stdout } = await promisify(execFile)(command, ['--version'], { timeout: 5000, maxBuffer: 4096, windowsHide: true });
            if (/cloudflared version (?:202[5-9]|20[3-9]\d)\./.test(stdout)) return command;
        } catch { /* Missing/incompatible candidates are reported with the setup action below. */ }
    }
    throw new InputError('A supported cloudflared connector is missing. Run ptbk init to prepare remote access, or use --no-tunnel for local HTTP.');
}
/** Install an official release into ignored runtime tools during authorized setup only. @private */
export async function prepareTunnelClient(workspace: Workspace, options: TunnelOptions, signal?: AbortSignal): Promise<void> {
    validateTunnelOptions(options);
    if (options.noTunnel) return;
    await inspectNamedCredentials(options);
    try { await findTunnelClient(workspace, options); return; } catch (error) { if (options.tunnelClient) throw error; }
    const platform = { linux: 'linux', darwin: 'darwin', win32: 'windows' }[process.platform as 'linux' | 'darwin' | 'win32'];
    const arch = { x64: 'amd64', arm64: 'arm64', arm: 'arm', ia32: '386' }[process.arch as 'x64' | 'arm64' | 'arm' | 'ia32'];
    if (!platform || !arch) throw new InputError('No supported cloudflared download exists for this platform; configure tunnel.client or use --no-tunnel.');
    const boundedSignal = AbortSignal.any([AbortSignal.timeout(60_000), ...(signal ? [signal] : [])]);
    const release = await fetch('https://api.github.com/repos/cloudflare/cloudflared/releases/latest', { signal: boundedSignal, headers: { Accept: 'application/vnd.github+json' } });
    if (!release.ok) throw new InputError(`Cannot prepare cloudflared: release lookup returned HTTP ${release.status}. Retry init or use --no-tunnel.`);
    const document = await release.json() as { assets: Array<{ name: string; digest?: string; size: number; browser_download_url: string }> };
    const name = `cloudflared-${platform}-${arch}${platform === 'darwin' ? '.tgz' : platform === 'windows' ? '.exe' : ''}`;
    const asset = document.assets.find(entry => entry.name === name);
    if (!asset || !/^sha256:[a-f0-9]{64}$/.test(asset.digest ?? '') || !asset.browser_download_url.startsWith('https://github.com/cloudflare/cloudflared/releases/download/') || asset.size > 100 * 1024 * 1024) throw new InputError('The official cloudflared release has no verifiable supported artifact. Configure an installed connector or retry setup.');
    const download = await fetch(asset.browser_download_url, { signal: boundedSignal });
    if (!download.ok || !download.body) throw new InputError(`Cannot download cloudflared: HTTP ${download.status}.`);
    const chunks: Uint8Array[] = []; let size = 0;
    for await (const chunk of download.body) { size += chunk.length; if (size > asset.size) throw new InputError('cloudflared download exceeds its verified release size.'); chunks.push(chunk); }
    const bytes = Buffer.concat(chunks);
    if (size !== asset.size || `sha256:${createHash('sha256').update(bytes).digest('hex')}` !== asset.digest) throw new InputError('cloudflared download checksum mismatch; no connector was installed.');
    const directory = await confinePath(workspace.projectPath, join(workspace.statePath, 'tools'));
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const staging = await confinePath(workspace.projectPath, join(directory, randomUUID()));
    await mkdir(staging, { mode: 0o700 });
    try {
        const artifact = join(staging, name); await writeFile(artifact, bytes, { flag: 'wx', mode: 0o700 });
        let executable = artifact;
        if (platform === 'darwin') {
            await promisify(execFile)('tar', ['-xzf', artifact, '-C', staging, 'cloudflared'], { timeout: 10_000, signal: boundedSignal });
            executable = join(staging, 'cloudflared');
        }
        if (!(await lstat(executable)).isFile()) throw new InputError('cloudflared artifact is not an ordinary executable.');
        await chmod(executable, 0o700);
        await rename(executable, join(directory, process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared'));
        await findTunnelClient(workspace, options);
    } finally { await rm(staging, { recursive: true, force: true }); }
}

/** One owned connector publishes only the protected HTTP port and retries independently of task work. @private */
export class ManagedTunnel {
    /** Public state never includes provider output or secrets. */
    readonly state: TunnelState;
    private child?: ChildProcess;
    private timer?: ReturnType<typeof setTimeout>;
    private closed = false;
    private attempts = 0;
    private active?: Promise<void>;
    /** The dashboard authorizes only the exact candidate origin while verifying its service identity. */
    constructor(private readonly workspace: Workspace, private readonly options: TunnelOptions, private readonly localUrl: string, private readonly challenge: string,
        private readonly onOrigin: (origin?: string) => void, private readonly dependencies: TunnelDependencies = {}) {
        validateTunnelOptions(options);
        this.state = { enabled: !options.noTunnel, provider: options.tunnelProvider ?? 'cloudflare-quick', status: options.noTunnel ? 'disabled' : 'connecting' };
    }
    /** A bounded initial attempt reports degraded access while safe local execution continues. */
    async start(): Promise<void> { if (!this.state.enabled || this.closed) return; if (this.active) { await this.active; return; } this.active = this.attempt(); await this.active; }
    /** Back off without launching duplicate children after inspection or client reconnect. */
    private retry(): void {
        if (this.closed || this.timer) return;
        const milliseconds = this.dependencies.retryMs ?? Math.min(60_000, 5000 * 2 ** Math.min(this.attempts++, 4));
        this.state.nextAttemptAt = Date.now() + milliseconds;
        this.timer = setTimeout(() => { this.timer = undefined; this.active = this.attempt(); void this.active; }, milliseconds); this.timer.unref();
    }
    /** Verify the assigned endpoint against a random public service challenge, never hostname alone. */
    private async verify(origin: string): Promise<boolean> {
        if (this.dependencies.verify) return this.dependencies.verify(origin);
        try {
            const response = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(3000), redirect: 'error', cache: 'no-store' });
            if (!response.ok || !response.body) return false;
            let text = '';
            for await (const chunk of response.body) { if (text.length + chunk.length > 128) return false; text += Buffer.from(chunk).toString('utf8'); }
            return text === this.challenge;
        } catch { return false; }
    }
    /** Connect with an isolated connector configuration and verify bounded output before advertising readiness. */
    private async attempt(): Promise<void> {
        if (this.closed) return;
        this.state.status = 'connecting'; delete this.state.url; delete this.state.nextAttemptAt; this.onOrigin();
        try {
            const command = await (this.dependencies.findClient?.() ?? findTunnelClient(this.workspace, this.options));
            if (this.closed) return;
            const config = await confinePath(this.workspace.projectPath, join(this.workspace.statePath, 'tunnel-config.json'));
            await mkdir(dirname(config), { recursive: true, mode: 0o700 });
            const named = this.state.provider === 'cloudflare-named';
            await inspectNamedCredentials(this.options);
            await writeFile(config, JSON.stringify(named ? { tunnel: this.options.tunnelId, 'credentials-file': this.options.tunnelCredentialsFile,
                ingress: [{ hostname: this.options.tunnelHostname, service: this.localUrl }, { service: 'http_status:404' }] } : {}), { mode: 0o600 });
            const args = ['tunnel', '--config', config, '--no-autoupdate', '--loglevel', 'info', ...(named ? ['run', this.options.tunnelId!] : ['--url', this.localUrl])];
            const child = this.dependencies.spawn?.(command, args) ?? spawn(command, args, { cwd: this.workspace.projectPath, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
            this.child = child;
            const origin = await new Promise<string>((accept, reject) => {
                let output = ''; let candidate: string | undefined; let probing = false; let settled = false;
                /** Release attempt timers before settling or replacing the owned process. */
                const finish = (error?: Error, origin?: string) => { if (settled) return; settled = true; clearTimeout(timeout); clearInterval(probeTimer); if (error) reject(error); else accept(origin!); };
                const timeout = setTimeout(() => finish(new Error('Tunnel did not verify within the bounded connection window.')), this.dependencies.attemptMs ?? 15_000);
                /** DNS/relay readiness may lag the assigned URL, so retry bounded identity probes. */
                const probe = () => {
                    if (!candidate || probing || settled || this.closed) return;
                    probing = true; this.onOrigin(candidate);
                    void this.verify(candidate).then(valid => { probing = false; if (valid && candidate && !this.closed && !settled) finish(undefined, candidate); }).catch(() => { probing = false; });
                };
                const probeTimer = setInterval(probe, 500);
                /** Inspect bounded connector output; it is never forwarded into project logs. */
                const inspect = (chunk: Buffer) => {
                    output = (output + chunk.toString()).slice(-16_384);
                    candidate ??= named ? /Registered tunnel connection/.test(output) ? `https://${this.options.tunnelHostname}` : undefined : /https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/.exec(output)?.[0];
                    probe();
                };
                child.stdout?.on('data', inspect); child.stderr?.on('data', inspect);
                child.once('error', error => finish(error));
                child.once('exit', () => finish(new Error('Owned tunnel connector exited.')));
            });
            if (this.closed || child.exitCode !== null || child.signalCode !== null) return;
            this.state.status = 'ready'; this.state.url = origin; delete this.state.diagnostic; this.attempts = 0;
            child.once('exit', () => { if (this.closed) return; if (this.timer) clearTimeout(this.timer); this.timer = undefined; this.child = undefined; this.degraded('Tunnel connector disconnected; local controls remain available.'); this.retry(); });
            this.monitor(origin);
        } catch (error) {
            this.degraded(error instanceof InputError ? error.message : 'Remote connection failed; local controls remain available. Retry setup or inspect outbound connectivity.');
            try { await this.stopChild(); } catch { this.state.diagnostic = 'Tunnel shutdown could not be verified; no replacement connector will be started.'; return; }
            this.retry();
        }
    }
    /** Verify health periodically rather than leaving a disconnected hostname marked ready. */
    private monitor(origin: string): void {
        const owner = this.child;
        this.timer = setTimeout(() => {
            this.timer = undefined;
            this.active = (async () => {
                if (this.closed) return;
                const verified = await this.verify(origin);
                if (this.closed || this.child !== owner || this.state.status !== 'ready' || this.state.url !== origin) return;
                if (verified) this.monitor(origin);
                else { this.degraded('Remote endpoint is unreachable; local work continues.'); await this.stopChild(); this.retry(); }
            })().catch(() => { this.degraded('Tunnel shutdown failed; inspect the owned connector before restarting.'); });
        }, 30_000); this.timer.unref();
    }
    /** Invalidate public readiness and the exact allowed origin together. */
    private degraded(diagnostic: string): void { this.state.status = this.state.enabled ? 'degraded' : 'disabled'; this.state.diagnostic = diagnostic; delete this.state.url; this.onOrigin(); }
    /** Terminate only the connector this service spawned, with a bounded escalation. */
    private async stopChild(): Promise<void> {
        const child = this.child;
        if (!child || child.exitCode !== null || child.signalCode !== null) { this.child = undefined; return; }
        child.kill('SIGTERM');
        await new Promise<void>((accept, reject) => {
            const force = setTimeout(() => child.kill('SIGKILL'), 1000);
            const deadline = setTimeout(() => { clearTimeout(force); reject(new Error('Owned tunnel did not stop.')); }, 3000);
            child.once('exit', () => { clearTimeout(force); clearTimeout(deadline); accept(); });
        });
        this.child = undefined;
    }
    /** Stop retry/health timers and the owned connector before closing its HTTP listener. */
    async close(): Promise<void> { this.closed = true; if (this.timer) clearTimeout(this.timer); await this.stopChild(); await this.active; this.degraded('Remote access stopped.'); }
}
