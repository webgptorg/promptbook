import { randomBytes } from 'node:crypto';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { readJsonIfExists, writeFileAtomic } from '../common/fs.js';
import { isProcessAlive } from '../common/process.js';
import { Mutex } from '../common/mutex.js';
import type { ComputerReadiness } from '../tools/readiness.js';
import type { TaskTrace } from '../engine/task-trace.js';
import { setting, type EffectiveSettings } from '../project/config.js';
import type { Project } from '../project/workspace.js';
import { NativeComputerBackend, type ComputerBackend, type ComputerBackendStatus, type ComputerCommand } from './native.js';
import { computerDirectory, desktopExclusive, desktopProtectionReason } from './protection.js';
import { recordComputerScreenshot } from './recording.js';

/** Durable human control latch; a restart cannot undo a deliberate pause or emergency stop. */
type ControlLatch = { readonly state: 'running' | 'paused' | 'stopped'; readonly revision: string };

/** Bounded observation/action episode, shared by every engine of the current OS user. */
type DesktopLease = { readonly owner: string; readonly pid: number; readonly started: number; readonly expires: number };

/** A fresh observation, bound to its human-input epoch and desktop coordinate space. */
type Observation = { readonly frame: string; readonly topology: string; readonly context?: string; readonly humanAt: number; readonly at: number };

/** Attribution and observation required by a harness desktop call. @private computer control */
export type ComputerContext = { readonly agent: string; readonly trace?: TaskTrace; readonly frame?: string };

/** Maximum time to hand a new desktop episode to another waiting agent. */
const EPISODE_LIMIT_MS = 60_000;
/** Idle episodes release the desktop without retaining it for an entire task. */
const EPISODE_IDLE_MS = 15_000;
/** Human activity yields automatic input for five seconds without stopping live observation. */
const HUMAN_IDLE_MS = 5_000;

/**
 * Engine-owned desktop coordinator. Shared locks, bounded FIFO admission and durable human latches span
 * projects/installations; native helpers enforce cancellation and visible indication independently.
 * Pixels/clipboard/text stay in memory and only operation metadata is passed to TaskTrace.
 * @private computer control
 */
export class ComputerControl {
    private readonly directory: string;
    private readonly backend: ComputerBackend;
    private readonly serial = new Mutex();
    private readonly frames = new Map<string, Observation>();
    private readonly identity = `${process.pid}-${randomBytes(12).toString('hex')}`;
    private active?: AbortController;
    private activeInput = false;
    private wasEnabled?: boolean;
    private readonly watcher: NodeJS.Timeout;
    private humanAt = 0;
    private closed = false;
    private used = false;
    private seenRevision = '';
    private lastReadiness?: ComputerReadiness;
    private readonly unsubscribe: () => void;

    public constructor(
        private readonly project: Project,
        private readonly settings: () => EffectiveSettings | undefined,
        private readonly env: NodeJS.ProcessEnv = process.env,
        private readonly changed: () => void = () => undefined,
        private readonly protectedReason: (owner?: boolean) => Promise<string | undefined> = async () => undefined,
        backend?: ComputerBackend,
    ) {
        this.directory = computerDirectory(env);
        this.backend = backend ?? new NativeComputerBackend();
        this.unsubscribe = this.backend.onEvent((event) => {
            this.frames.clear();
            if (event.event === 'human-input') {
                this.humanAt = Math.max(this.humanAt, event.at);
                if (this.activeInput) this.active?.abort();
                void this.backend.releaseInputs().catch(() => undefined);
            } else if (event.event === 'pause' || event.event === 'stop') {
                this.active?.abort();
                void this.latch(event.event === 'stop' ? 'stopped' : 'paused').catch(() => undefined);
            } else if (event.event === 'resume') {
                void this.resume().catch(() => undefined);
            } else if (event.event === 'unavailable') this.active?.abort();
            this.changed();
        });
        let checking = false;
        this.watcher = setInterval(() => {
            if (checking || !this.used || this.active) return;
            checking = true;
            void this.idle().catch(() => this.backend.releaseInputs().catch(() => undefined)).finally(() => { checking = false; });
        }, 100);
        this.watcher.unref();
    }

    /** A configured desktop tool is revocable immediately, including one already acquired by an agent. */
    private enabled(): boolean {
        return !this.closed && Boolean(this.settings()?.tools.some((tool) => tool.type === 'COMPUTER_CONTROL' && tool.isEnabled));
    }

    /** Current manual control state; damaged state is an error, never permission to operate. */
    private async control(): Promise<ControlLatch> {
        const value = await readJsonIfExists<ControlLatch>(join(this.directory, 'control.json'));
        const stopped = await readdir(this.directory).then((files) => files.some((name) => /^stop-[a-f0-9]+\.json$/.test(name))).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return false; throw error; });
        if (!value) return { state: stopped ? 'stopped' : 'running', revision: '' };
        if (!['running', 'paused', 'stopped'].includes(value.state) || typeof value.revision !== 'string') throw new Error('Desktop control state is unreadable. Use an explicit owner resume to restore it.');
        return stopped ? { ...value, state: 'stopped' } : value;
    }

    /** Persist deliberate pause/stop before acknowledging it to any client. */
    private async latch(state: ControlLatch['state']): Promise<void> {
        this.active?.abort();
        if (state === 'paused' && (await this.control()).state === 'stopped') state = 'stopped';
        this.frames.clear();
        if (state === 'stopped') await writeFileAtomic(join(this.directory, `stop-${randomBytes(12).toString('hex')}.json`), '{}\n', { mode: 0o600 });
        await writeFileAtomic(join(this.directory, 'control.json'), `${JSON.stringify({ state, revision: randomBytes(12).toString('hex') })}\n`, { mode: 0o600 });
        if (this.used) {
            await this.backend.releaseInputs();
            if (state === 'stopped') await this.backend.stop?.(); else await this.backend.pause?.();
            await this.backend.setIndicator({ project: basename(this.project.root), agent: 'User', state: state === 'stopped' ? 'stopped' : 'paused' });
        }
        this.changed();
    }

    /** Cached checked readiness for Tools; reading it never starts a helper. @private computer control */
    public readiness(): ComputerReadiness | undefined { return this.lastReadiness; }

    /** Cache only actual platform/permission results, not configured or speculative availability. */
    private remember(status: ComputerBackendStatus, state: ControlLatch['state'] = 'running'): void {
        const blocked = state !== 'running' || status.isPaused || status.isStopped;
        const next: ComputerReadiness = { usable: status.available && !blocked, summary: blocked ? 'Desktop access is paused or stopped; explicit owner return is required.' : status.available ? 'Native primary desktop and permissions are available; cursor and keyboard focus are shared.' : status.reason ?? 'Native desktop permissions are unavailable.', ...(!status.available ? { nextAction: 'Open the Computer Control tool detail to grant native permissions and check again.' } : blocked ? { nextAction: 'Return control explicitly from the Computer Control tool detail or native bar.' } : {}) };
        const changed = JSON.stringify(next) !== JSON.stringify(this.lastReadiness);
        this.lastReadiness = next;
        if (changed) this.changed();
    }

    /** Truthful runtime/permission state; checking does not capture pixels or inject input. */
    public async status(): Promise<Readonly<Record<string, unknown>>> {
        const control = await this.control();
        const native = await this.backend.status();
        this.remember(native, control.state);
        this.used = native.supported;
        return { ...native, enabled: this.enabled(), state: !this.enabled() ? 'disabled' : control.state, humanIdleMs: Math.max(0, HUMAN_IDLE_MS - (Date.now() - Math.max(this.humanAt, native.lastHumanInputAt))), recording: this.settings() ? setting<boolean>(this.settings()!, 'computer.isRecordingEnabled') : false, monitor: 'primary', nextAction: native.available ? undefined : 'Use Computer Control permissions to open the native permission settings, then check again.' };
    }

    /** Opens native permission guidance, without blocking initialization or changing application authority. */
    public async requestPermissions(): Promise<Readonly<Record<string, unknown>>> {
        if (!this.enabled()) throw new Error('Computer Control is disabled for this project.');
        this.used = true;
        const status = await this.backend.requestPermissions();
        this.remember(status);
        this.changed();
        return { ...status };
    }

    /** Explicit human takeover stops automatic observation and input across projects. */
    public async pause(): Promise<Readonly<Record<string, unknown>>> {
        await this.latch('paused');
        return { state: (await this.control()).state };
    }

    /** Explicit return of control; fresh observation is always required afterwards. */
    public async resume(): Promise<Readonly<Record<string, unknown>>> {
        if (!this.enabled()) throw new Error('Enable Computer Control before returning control.');
        this.frames.clear();
        // Remove only the stop markers present at this explicit handoff. A concurrent new stop has a unique
        // filename and cannot be cleared by a stale read/overwrite of the shared control record.
        const stops = await readdir(this.directory).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return [] as string[]; throw error; });
        for (const name of stops.filter((name) => /^stop-[a-f0-9]+\.json$/.test(name))) await rm(join(this.directory, name), { force: true });
        if (this.used) await this.backend.resume();
        await writeFileAtomic(join(this.directory, 'control.json'), `${JSON.stringify({ state: 'running', revision: randomBytes(12).toString('hex') })}\n`, { mode: 0o600 });
        this.changed();
        return { state: 'running', requiresObservation: true };
    }

    /** Dedicated emergency stop, independent of ptbk panic, immediately cancels native inputs. */
    public async stop(): Promise<Readonly<Record<string, unknown>>> {
        await this.latch('stopped');
        return { state: 'stopped' };
    }

    /** Propagate live configuration/lifecycle changes to in-flight commands without undoing a manual latch. */
    public async refresh(): Promise<void> {
        if (this.closed) return;
        const enabled = this.enabled();
        const disabledNow = this.wasEnabled === true && !enabled;
        this.wasEnabled = enabled;
        if (disabledNow) await this.latch('stopped');
        if (!enabled || await this.protectedReason()) {
            this.frames.clear();
            this.active?.abort();
            if (this.used) await this.backend.releaseInputs();
        }
    }

    /** Verify every desktop boundary both before capture and during native input. */
    private async permitted(owner: boolean): Promise<ControlLatch> {
        if (!this.enabled()) throw new Error('Computer Control is disabled; no further desktop access is allowed.');
        const control = await this.control();
        if (control.state === 'stopped' || (!owner && control.state === 'paused')) throw new Error(`Computer Control is ${control.state}. Only an explicit owner resume returns automatic control.`);
        const protection = (owner ? undefined : await desktopProtectionReason(this.env)) ?? await this.protectedReason(owner);
        if (protection) throw new Error(protection);
        if (this.used && control.state === 'running' && control.revision && control.revision !== this.seenRevision) await this.backend.resume();
        this.seenRevision = control.revision;
        return control;
    }

    /** Agent identity is unique to this engine, even for equally named agents in two projects. */
    private owner(agent: string): string { return `${this.identity}/${agent}`; }

    /** Admit new episodes in FIFO ticket order; a busy desktop is a resource wait, never a replay of input. */
    private async admit(owner: string, signal: AbortSignal): Promise<void> {
        const queue = join(this.directory, 'queue');
        await mkdir(queue, { recursive: true, mode: 0o700 });
        const ticket = `${String(Date.now()).padStart(16, '0')}-${randomBytes(8).toString('hex')}.json`;
        const file = join(queue, ticket);
        await writeFile(file, JSON.stringify({ pid: process.pid, at: Date.now() }), { mode: 0o600 });
        const deadline = Date.now() + 75_000;
        try {
            for (;;) {
                signal.throwIfAborted();
                await this.permitted(false);
                const admitted = await desktopExclusive(this.env, async () => {
                    const current = await readJsonIfExists<DesktopLease>(join(this.directory, 'lease.json'));
                    const now = Date.now();
                    if (current && isProcessAlive(current.pid)) {
                        if (current.expires > now && now - current.started < EPISODE_LIMIT_MS) return current.owner === owner;
                        if (current.owner.startsWith(`${this.identity}/`)) {
                            if (this.used) await this.backend.releaseInputs();
                            await rm(join(this.directory, 'lease.json'), { force: true });
                            this.frames.clear();
                        } else return false; // The live previous owner must finish releasing held inputs before handoff.
                    }
                    const waiting: string[] = [];
                    for (const candidate of (await readdir(queue)).filter((name) => name.endsWith('.json')).sort()) {
                        const entry = await readJsonIfExists<{ pid: number; at: number }>(join(queue, candidate));
                        if (entry && isProcessAlive(entry.pid) && now - entry.at < 90_000) waiting.push(candidate);
                        else await rm(join(queue, candidate), { force: true });
                    }
                    if (waiting[0] !== ticket) return false;
                    const lease: DesktopLease = { owner, pid: process.pid, started: now, expires: now + EPISODE_IDLE_MS };
                    await writeFileAtomic(join(this.directory, 'lease.json'), JSON.stringify(lease), { mode: 0o600 });
                    this.frames.clear();
                    return true;
                }, signal);
                if (admitted) return;
                if (Date.now() > deadline) throw new Error('Desktop is busy with another agent. Retry observation later.');
                await delay(50, undefined, { signal });
            }
        } finally {
            await rm(file, { force: true });
        }
    }

    /** Perform an agent primitive, with screenshot evidence required before every state-changing step. */
    public async execute(command: ComputerCommand, context: ComputerContext): Promise<Readonly<Record<string, unknown>>> {
        return await this.run(command, context, false);
    }

    /** Owner viewing is available during an explicit takeover; it is never exposed as an agent tool. */
    public async ownerScreenshot(): Promise<Readonly<Record<string, unknown>>> {
        return await this.run({ op: 'screenshot' }, { agent: 'User' }, true);
    }

    /** Remote human input first takes control, preventing simultaneous automatic input. */
    public async ownerInput(command: ComputerCommand): Promise<Readonly<Record<string, unknown>>> {
        await this.pause();
        return await this.run(command, { agent: 'User' }, true);
    }

    /** Shared implementation with no input contents in diagnostics or evidence. */
    private async run(command: ComputerCommand, context: ComputerContext, owner: boolean): Promise<Readonly<Record<string, unknown>>> {
        return await this.serial.run(async () => {
            const abort = new AbortController();
            this.active = abort;
            this.activeInput = command.op !== 'screenshot' && command.op !== 'accessibility';
            this.wasEnabled = this.enabled();
            let dispatched = false;
            let checking = false;
            const watch = setInterval(() => {
                if (checking) return;
                checking = true;
                void this.permitted(owner).catch(() => abort.abort()).finally(() => { checking = false; });
            }, 50);
            // Pending explicit work must keep its cancellation polling alive even when a backend has no native
            // process or referenced I/O handle. The idle watcher remains unref'ed; this timer is cleared below.
            try {
                await this.permitted(owner);
                const observes = command.op === 'screenshot' || command.op === 'accessibility';
                if (observes && !owner) await this.admit(this.owner(context.agent), abort.signal);
                return await desktopExclusive(this.env, async () => {
                    try {
                        await this.permitted(owner);
                        const native = await this.backend.status();
                        this.remember(native);
                        this.used = native.supported;
                        if (!native.available || !native.primaryScreen) throw new Error(native.reason ?? 'Native desktop or permissions are unavailable.');
                        if (native.isStopped || (!owner && native.isPaused)) throw new Error('Native desktop control is paused. Return it explicitly before continuing.');
                        const humanAt = Math.max(this.humanAt, native.lastHumanInputAt);
                        const leaseFile = join(this.directory, 'lease.json');
                        const lease = await readJsonIfExists<DesktopLease>(leaseFile);
                        if (!owner && (!lease || lease.owner !== this.owner(context.agent) || lease.expires < Date.now() || Date.now() - lease.started >= EPISODE_LIMIT_MS)) throw new Error('Desktop episode expired or changed owner. Take a new screenshot before acting.');
                        if (!observes && !owner) {
                            const frame = this.frames.get(context.agent);
                            if (!frame || context.frame !== frame.frame || frame.topology !== native.primaryScreen.topology || frame.context !== native.context || humanAt !== frame.humanAt || Date.now() - frame.at > EPISODE_IDLE_MS) throw new Error('Desktop observation is stale. Take a fresh screenshot before input.');
                            if (Date.now() - humanAt < HUMAN_IDLE_MS) throw new Error('Human input has priority. Wait for five seconds of inactivity, then observe again.');
                        }
                        this.validate(command, native);
                        // Owner takeover has its own explicitly authorized observation/input path.
                        if (owner && native.isPaused) await this.backend.resume();
                        await this.backend.setIndicator({ project: basename(this.project.root), agent: context.agent, state: !owner && Date.now() - humanAt < HUMAN_IDLE_MS ? 'human-paused' : 'active' });
                        abort.signal.throwIfAborted();
                        dispatched = true;
                        const result = await this.backend.execute({ ...command, ...(!observes && native.context ? { context: native.context } : {}) }, abort.signal);
                        abort.signal.throwIfAborted();
                        await this.permitted(owner);
                        if (!owner && lease) await writeFileAtomic(leaseFile, JSON.stringify({ ...lease, expires: Math.min(Date.now() + EPISODE_IDLE_MS, lease.started + EPISODE_LIMIT_MS) }), { mode: 0o600 });
                        let frame: string | undefined;
                        if (observes && !owner) {
                            frame = randomBytes(12).toString('hex');
                            this.frames.set(context.agent, { frame, topology: typeof result.topology === 'string' ? result.topology : native.primaryScreen.topology, context: typeof result.context === 'string' ? result.context : native.context, humanAt, at: Date.now() });
                        } else if (!observes && command.op !== 'button') this.frames.delete(context.agent);
                        if (!owner && command.op === 'screenshot' && this.settings() && setting<boolean>(this.settings()!, 'computer.isRecordingEnabled')) await recordComputerScreenshot(this.project, result).catch(() => undefined);
                        await context.trace?.event('computer-operation', { operation: command.op, agent: context.agent, outcome: 'completed', ...(frame ? { frame } : {}) });
                        return { ...result, ...(frame ? { frame } : {}), ...(observes ? { coordinateSpace: 'primary display pixels', cursor: 'shared' } : {}) };
                    } catch (error) {
                        let released = !this.used;
                        if (this.used) {
                            try { await this.backend.releaseInputs(); released = true; } catch { /* Keep ownership until cleanup can be verified. */ }
                        }
                        // A failed observation must not strand an episode under a live engine PID (in particular
                        // when an unsupported/missing helper never starts the idle cleanup watcher).
                        const file = join(this.directory, 'lease.json');
                        const failedLease = await readJsonIfExists<DesktopLease>(file);
                        if (released && !owner && failedLease?.owner === this.owner(context.agent)) await rm(file, { force: true });
                        throw error;
                    } finally {
                        if (owner && this.used) {
                            const state = (await this.control()).state;
                            if (state !== 'running') {
                                if (state === 'stopped') await this.backend.stop?.(); else await this.backend.pause?.();
                                await this.backend.setIndicator({ project: basename(this.project.root), agent: 'User', state });
                            }
                        }
                    }
                }, abort.signal);
            } catch (error) {
                this.frames.delete(context.agent);
                await context.trace?.event('computer-operation', { operation: command.op, agent: context.agent, outcome: abort.signal.aborted ? 'interrupted-effect-unknown' : dispatched ? 'failed-effect-unknown' : 'failed' });
                if (abort.signal.aborted) throw new Error('Desktop control was interrupted. Any partial input may already have taken effect; observe and reconcile before retrying.');
                if (dispatched && this.activeInput) throw new Error(`${error instanceof Error ? error.message : 'Native desktop operation failed.'} Partial input may already have taken effect; observe and reconcile before retrying.`);
                throw error;
            } finally {
                clearInterval(watch);
                if (this.active === abort) { this.active = undefined; this.activeInput = false; }
            }
        });
    }

    /** Release held input when a lease expires, tool is disabled, or a global/lifecycle gate changes. */
    private async idle(): Promise<void> {
        await this.serial.run(async () => {
            if (this.closed || this.active) return;
            await this.refresh();
            await desktopExclusive(this.env, async () => {
                const control = await this.control();
                const file = join(this.directory, 'lease.json');
                const lease = await readJsonIfExists<DesktopLease>(file);
                const own = lease?.owner.startsWith(`${this.identity}/`);
                if (control.state !== 'running' || !lease || lease.expires <= Date.now() || !own) {
                    await this.backend.releaseInputs();
                    if (control.state === 'stopped') await this.backend.stop?.();
                    else if (control.state === 'paused') await this.backend.pause?.();
                    this.frames.clear();
                    if (own) await rm(file, { force: true });
                    await this.backend.setIndicator({ project: basename(this.project.root), agent: 'User', state: control.state === 'running' ? 'idle' : control.state });
                }
            });
        });
    }

    /** Validate coordinate and payload bounds before native execution. */
    private validate(command: ComputerCommand, status: ComputerBackendStatus): void {
        if ('x' in command || 'y' in command) {
            if (command.x !== undefined && (!Number.isFinite(command.x) || command.x < 0 || command.x >= status.primaryScreen!.width)) throw new Error('x is outside the primary display.');
            if (command.y !== undefined && (!Number.isFinite(command.y) || command.y < 0 || command.y >= status.primaryScreen!.height)) throw new Error('y is outside the primary display.');
        }
        if ('durationMs' in command && command.durationMs !== undefined && (!Number.isFinite(command.durationMs) || command.durationMs < 100 || command.durationMs > 5_000)) throw new Error('Movement duration must be 100–5000 ms.');
        if ('text' in command && (typeof command.text !== 'string' || command.text.length > 100_000)) throw new Error('Desktop text exceeds the allowed length.');
        if (command.op === 'scroll' && [command.deltaX ?? 0, command.deltaY ?? 0].some((value) => !Number.isFinite(value) || Math.abs(value) > 10_000)) throw new Error('Scroll values must be finite and within 10000 pixels.');
        if (command.op === 'key' && (!Array.isArray(command.keys) || command.keys.length < 1 || command.keys.length > 8 || command.keys.some((key) => typeof key !== 'string' || key.length > 40))) throw new Error('Specify a bounded keyboard chord.');
    }

    /** End an agent's episode without retaining the desktop while it does unrelated work. */
    public async release(agent: string): Promise<void> {
        this.frames.delete(agent);
        const released = await desktopExclusive(this.env, async () => {
            const file = join(this.directory, 'lease.json');
            const lease = await readJsonIfExists<DesktopLease>(file);
            if (lease?.owner !== this.owner(agent)) return false;
            if (this.used) await this.backend.releaseInputs();
            await rm(file, { force: true });
            return true;
        });
        if (released && this.used) await this.backend.setIndicator({ project: basename(this.project.root), agent, state: 'idle' });
    }

    /** Engine shutdown cancels its native work and releases its own lease, preserving human pause/stop. */
    public async close(): Promise<void> {
        this.closed = true;
        clearInterval(this.watcher);
        this.active?.abort();
        this.frames.clear();
        this.unsubscribe();
        await this.backend.close();
        await desktopExclusive(this.env, async () => {
            const file = join(this.directory, 'lease.json');
            const lease = await readJsonIfExists<DesktopLease>(file);
            if (lease?.owner.startsWith(`${this.identity}/`)) await rm(file, { force: true });
        });
    }
}
