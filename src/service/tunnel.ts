import { spawn, type ChildProcess } from 'node:child_process';
import { errorMessage } from '../common/errors.js';
import { terminateProcessTree } from '../common/process.js';
import type { ConnectionView } from '../engine/snapshot.js';
import { findCloudflared, installCloudflared } from './cloudflared.js';

/**
 * Tunnel configuration resolved from settings.
 *
 * @private remote access tunnel
 */
export type TunnelConfiguration = {
    readonly provider: 'cloudflare-quick' | 'cloudflare-named';
    /** Named tunnel public hostname. */
    readonly hostname?: string;
    /** Named tunnel name/UUID. */
    readonly name?: string;
    /** Named tunnel credentials file (reference). */
    readonly credentialsFile?: string;
    /** Environment variable holding a named-tunnel token. */
    readonly tokenEnv?: string;
    /** May download cloudflared when missing (setup flows). */
    readonly allowInstall: boolean;
};

/**
 * Initial retry delay after a tunnel failure.
 */
const INITIAL_RETRY_MS = 5000;

/**
 * Longest retry delay.
 */
const MAX_RETRY_MS = 5 * 60_000;

/**
 * How long a new endpoint may take to become reachable.
 */
const VERIFY_TIMEOUT_MS = 45_000;

/**
 * Owns one tunnel to the service's actual local port, with verification and backoff.
 *
 * @private remote access tunnel
 */
export class TunnelManager {
    private child?: ChildProcess;
    private stopped = false;
    private retryDelay = INITIAL_RETRY_MS;
    private retryTimer?: NodeJS.Timeout;
    private stateValue: ConnectionView['remote'];

    public constructor(
        private readonly configuration: TunnelConfiguration,
        private readonly localUrl: string,
        private readonly publicInstance: string,
        private readonly onState: (state: ConnectionView['remote'], message?: string) => void,
        private readonly env: NodeJS.ProcessEnv,
    ) {
        this.stateValue = { state: 'connecting', provider: configuration.provider };
    }

    /** Current remote state. */
    public get state(): ConnectionView['remote'] {
        return this.stateValue;
    }

    /** Updates and publishes the state. */
    private update(state: ConnectionView['remote'], message?: string): void {
        this.stateValue = { ...state, provider: this.configuration.provider, checkedAt: new Date().toISOString() };
        this.onState(this.stateValue, message);
    }

    /**
     * Starts the tunnel and waits a bounded time for verification; failures are retried in the background.
     */
    public async start(boundMs = 20_000): Promise<void> {
        const attempt = this.connect();
        await Promise.race([attempt, new Promise((resolve) => setTimeout(resolve, boundMs).unref())]);
    }

    /** One connection attempt. */
    private async connect(): Promise<void> {
        if (this.stopped) return;
        this.update({ state: 'connecting' });
        let executable = await findCloudflared(this.env);
        if (!executable && this.configuration.allowInstall) {
            try {
                executable = await installCloudflared((text) => this.onState(this.stateValue, text));
            } catch (error) {
                this.fail(`cloudflared is not installed and could not be installed: ${errorMessage(error)}`);
                return;
            }
        }
        if (!executable) {
            this.fail('cloudflared is not installed. Run `ptbk start` interactively once or install cloudflared; local access keeps working.');
            return;
        }
        const args = ['tunnel', '--no-autoupdate'];
        const env: NodeJS.ProcessEnv = { ...this.env };
        if (this.configuration.provider === 'cloudflare-named') {
            if (!this.configuration.hostname || (!this.configuration.name && !this.configuration.tokenEnv)) {
                this.fail('The named tunnel needs server.tunnel.hostname and server.tunnel.name (or tokenEnv) in ptbk.json.', false);
                return;
            }
            args.push('run', '--url', this.localUrl);
            if (this.configuration.credentialsFile) args.push('--credentials-file', this.configuration.credentialsFile);
            if (this.configuration.tokenEnv) {
                const token = this.env[this.configuration.tokenEnv];
                if (!token) {
                    this.fail(`The environment variable ${this.configuration.tokenEnv} holding the tunnel token is not set.`, false);
                    return;
                }
                env.TUNNEL_TOKEN = token;
            } else args.push(this.configuration.name!);
        } else {
            args.push('--url', this.localUrl);
        }
        const child = spawn(executable, args, { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, detached: process.platform !== 'win32' });
        this.child = child;
        let announced: string | undefined = this.configuration.provider === 'cloudflare-named' ? `https://${this.configuration.hostname}` : undefined;
        const found = new Promise<string | undefined>((resolve) => {
            const timer = setTimeout(() => resolve(announced), VERIFY_TIMEOUT_MS);
            const onData = (chunk: Buffer): void => {
                const match = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i.exec(chunk.toString('utf8'));
                if (match && !announced) {
                    announced = match[0];
                    clearTimeout(timer);
                    resolve(announced);
                }
                if (this.configuration.provider === 'cloudflare-named' && /Registered tunnel connection/i.test(chunk.toString('utf8'))) {
                    clearTimeout(timer);
                    resolve(announced);
                }
            };
            child.stdout?.on('data', onData);
            child.stderr?.on('data', onData);
            child.once('exit', () => {
                clearTimeout(timer);
                resolve(undefined);
            });
        });
        child.once('exit', (code) => {
            if (this.child !== child || this.stopped) return;
            this.child = undefined;
            this.fail(`cloudflared exited (code ${String(code)}); the previous address is no longer valid.`);
        });
        const url = await found;
        if (this.stopped || this.child !== child) return;
        if (!url) {
            this.stopChild();
            this.fail('cloudflared did not provide a public address in time.');
            return;
        }
        const verified = await this.verify(url);
        if (this.stopped || this.child !== child) return;
        if (!verified.ok) {
            this.update({ state: 'connecting', url: undefined, error: `Waiting for ${url} to reach this project: ${verified.reason}` });
            this.stopChild();
            this.fail(`The public address ${url} could not be verified: ${verified.reason}`);
            return;
        }
        this.retryDelay = INITIAL_RETRY_MS;
        this.update({ state: 'ready', url: `${url.replace(/\/$/, '')}/` }, `Remote access ready: ${url}`);
    }

    /** Verifies that the public endpoint reaches this exact protected service. */
    private async verify(url: string): Promise<{ ok: true } | { ok: false; reason: string }> {
        const deadline = Date.now() + VERIFY_TIMEOUT_MS;
        let reason = 'no response';
        while (Date.now() < deadline && !this.stopped) {
            try {
                const response = await fetch(`${url.replace(/\/$/, '')}/api/health`, { signal: AbortSignal.timeout(8000), headers: { 'Cache-Control': 'no-cache' } });
                if (response.ok) {
                    const body = (await response.json()) as { service?: string; instance?: string };
                    if (body.service === 'ptbk' && body.instance === this.publicInstance) return { ok: true };
                    return { ok: false, reason: 'the address serves a different service' };
                }
                reason = `HTTP ${response.status}`;
            } catch (error) {
                reason = errorMessage(error);
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        return { ok: false, reason };
    }

    /** Records a failure and schedules a retry with backoff. */
    private fail(reason: string, retry = true): void {
        if (this.stopped) return;
        this.update({ state: 'degraded', error: reason }, `Remote access degraded: ${reason}`);
        if (!retry) return;
        clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(() => void this.connect(), this.retryDelay);
        this.retryTimer.unref();
        this.retryDelay = Math.min(this.retryDelay * 2, MAX_RETRY_MS);
    }

    /** Terminates the owned cloudflared process. */
    private stopChild(): void {
        const child = this.child;
        this.child = undefined;
        if (child) terminateProcessTree(child);
    }

    /** Stops the tunnel and its retries. */
    public stop(): void {
        this.stopped = true;
        clearTimeout(this.retryTimer);
        this.stopChild();
        this.stateValue = { state: 'disabled', provider: this.configuration.provider };
    }
}
