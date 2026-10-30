import { readFile, readdir, rm, stat, statfs } from 'node:fs/promises';
import { connect } from 'node:net';
import os from 'node:os';
import { join, resolve } from 'node:path';
import { PtbkError, errorMessage } from '../common/errors.js';
import { isPathInside, toProjectRelative } from '../common/fs.js';
import { runProcess } from '../common/process.js';
import type { Project } from '../project/workspace.js';
import type { HealthIncidentView, HealthView, PauseReasonView } from './snapshot.js';

/**
 * Interval between two host samples.
 */
const SAMPLE_INTERVAL_MS = 30_000;

/**
 * Interval between connectivity probes while reachable (sooner while unreachable).
 */
const CONNECTIVITY_INTERVAL_MS = 5 * 60_000;

/**
 * Interval between connectivity probes while unreachable.
 */
const CONNECTIVITY_RETRY_MS = 60_000;

/**
 * Bound of one connectivity probe.
 */
const CONNECTIVITY_TIMEOUT_MS = 5_000;

/**
 * Default connectivity target (host:port); `PTBK_HEALTH_CONNECTIVITY` overrides it or turns it `off`.
 */
const DEFAULT_CONNECTIVITY_TARGET = 'cloudflare.com:443';

/**
 * Port of a connectivity target given without one.
 */
const DEFAULT_CONNECTIVITY_PORT = 443;

/**
 * Free capacity below which the disk is treated as actually exhausted (a hard condition, never configurable).
 */
const HARD_DISK_MIB = 16;

/**
 * Available RAM plus swap below which memory is treated as actually exhausted (a hard condition, never configurable).
 */
const HARD_MEMORY_MIB = 16;

/**
 * Consecutive samples a condition must hold before an incident closes (debounce against flapping).
 */
const RECOVERY_SAMPLES = 2;

/**
 * Consecutive failed probes before connectivity is reported unhealthy.
 */
const CONNECTIVITY_FAILURES = 2;

/**
 * Load per core (5-minute average) that marks high CPU pressure, and the level it must fall below to recover.
 */
const CPU_HIGH_LOAD = 2;
const CPU_RECOVERED_LOAD = 1.5;

/**
 * Cache entries changed this recently are kept by cleanup (they may belong to work in progress).
 */
const CACHE_KEEP_RECENT_MS = 10 * 60_000;

/**
 * Bytes per MiB.
 */
const MIB = 1024 * 1024;

/**
 * Recovery margin above a soft limit (10% of it, bounded) before its incident closes.
 */
const RECOVERY_MARGIN = { ratio: 0.1, minMiB: 32, maxMiB: 512 } as const;

/**
 * Size bounds of a proposed swap file (MiB): at least this much, at most this much, in these steps.
 */
const SWAP_SIZE = { minMiB: 1024, maxMiB: 4096, stepMiB: 256 } as const;

/**
 * One host sample (MiB; undefined where a value is not measurable on this platform).
 *
 * @private health sub-engine
 */
export type HostSample = {
    readonly at: string;
    readonly disk: HealthView['disk'];
    readonly memory: HealthView['memory'];
    readonly cpu: HealthView['cpu'];
};

/**
 * Outcome of one connectivity probe.
 *
 * @private health sub-engine
 */
export type ConnectivityProbe = { readonly reachable: boolean; readonly target: string; readonly error?: string };

/**
 * Host measurements used by the Health sub-engine (replaceable in tests).
 *
 * @private health sub-engine
 */
export type HealthProbes = {
    /** Disk, memory and CPU of the filesystems holding `paths`. */
    readonly sample: (paths: readonly string[]) => Promise<HostSample>;
    /** One reachability probe, or undefined when connectivity checks are switched off. */
    readonly connectivity?: () => Promise<ConnectivityProbe>;
};

/**
 * Construction options of the Health sub-engine.
 *
 * @private health sub-engine
 */
export type HealthOptions = {
    readonly project: Project;
    readonly env: NodeJS.ProcessEnv;
    /** Effective `limit.disk`/`limit.memory` (MiB), read at every sample so configuration changes apply live. */
    readonly limits: () => { readonly disk: number; readonly memory: number; readonly source: string };
    /** Any observable change (new sample, incident, action). */
    readonly onChange: () => void;
    /** The set of health pause reasons changed (scheduling re-evaluates). */
    readonly onPauseChange: () => void;
    readonly log: (text: string, level: 'info' | 'warning' | 'error') => void;
    /** Replaces the real host probes (tests). */
    readonly probes?: HealthProbes;
    /** Sampling interval (default 30 s). */
    readonly intervalMs?: number;
};

/**
 * Mutable incident record.
 */
type Incident = {
    readonly id: string;
    readonly resource: HealthIncidentView['resource'];
    readonly severity: HealthIncidentView['severity'];
    summary: string;
    readonly openedAt: string;
    overriddenAt?: string;
    /** Consecutive samples in which the condition no longer held. */
    recovered: number;
    /** What the sub-engine did about it by itself (an autonomous remedy is attempted once per incident). */
    remedy?: string;
};

/**
 * How long a pausing memory incident may last before it needs a person (memory often frees by itself; no autonomous
 * remedy exists without new privileges).
 */
const MEMORY_ATTENTION_AFTER_MS = 15 * 60_000;

/**
 * One entry of the Promptbook-owned project cache (`.ptbk/tmp/`).
 *
 * @private health sub-engine
 */
export type CacheEntry = { readonly name: string; readonly bytes: number; readonly modifiedAt: string; readonly kept?: string };

/**
 * Preview of a project-cache cleanup: what would be removed and what is kept.
 *
 * @private health sub-engine
 */
export type CachePreview = { readonly path: string; readonly entries: readonly CacheEntry[]; readonly removableBytes: number; readonly keptBytes: number };

/**
 * Planned swap remediation on a supported Linux host.
 *
 * @private health sub-engine
 */
export type SwapPlan = {
    readonly supported: boolean;
    readonly note: string;
    /** Active swap areas (`/proc/swaps`). */
    readonly current?: readonly { readonly path: string; readonly sizeMiB: number; readonly usedMiB: number }[];
    /** Proposed new swap file (absent when none fits or none is useful). */
    readonly proposal?: {
        readonly path: string;
        readonly sizeMiB: number;
        /** Commands an administrator runs (also what `apply` runs with the available privilege). */
        readonly commands: readonly string[];
        /** `/etc/fstab` line that keeps the swap after a reboot (never written automatically). */
        readonly persistLine: string;
        /** `root`: this engine runs as root; `sudo`: passwordless sudo works; `missing`: an administrator must run it. */
        readonly privilege: 'root' | 'sudo' | 'missing';
    };
};

/**
 * Formats MiB for summaries.
 *
 * @private health sub-engine
 */
export function formatMiB(value: number | undefined): string {
    if (value === undefined) return 'unknown';
    if (value >= 10 * 1024) return `${(value / 1024).toFixed(0)} GiB`;
    if (value >= 1024) return `${(value / 1024).toFixed(1)} GiB`;
    return `${Math.round(value)} MiB`;
}

/**
 * Formats a byte count for summaries (in MiB/GiB).
 *
 * @private health sub-engine
 */
export function formatBytes(bytes: number): string {
    return formatMiB(bytes / MIB);
}

/**
 * Whole MiB of a byte count.
 */
function toMiB(bytes: number): number {
    return Math.floor(bytes / MIB);
}

/**
 * Reads `/proc/meminfo` values in MiB (Linux).
 */
async function linuxMemory(): Promise<HealthView['memory'] | undefined> {
    const text = await readFile('/proc/meminfo', 'utf8').catch(() => undefined);
    if (!text) return undefined;
    const value = (name: string): number | undefined => {
        const match = new RegExp(`^${name}:\\s+(\\d+)\\s*kB`, 'm').exec(text);
        return match ? Math.floor(Number(match[1]) / 1024) : undefined;
    };
    const ramAvailableMiB = value('MemAvailable') ?? value('MemFree');
    const swapFreeMiB = value('SwapFree');
    return { ramAvailableMiB, ramTotalMiB: value('MemTotal'), swapFreeMiB, swapTotalMiB: value('SwapTotal'), availableMiB: ramAvailableMiB === undefined ? undefined : ramAvailableMiB + (swapFreeMiB ?? 0) };
}

/**
 * Reads macOS memory: the kernel's available-memory level (what Activity Monitor's memory pressure uses) and the
 * dynamic swap usage.
 */
async function darwinMemory(): Promise<HealthView['memory']> {
    const total = toMiB(os.totalmem());
    const sysctl = async (name: string): Promise<string | undefined> => {
        const result = await runProcess('sysctl', ['-n', name], { cwd: os.tmpdir(), timeoutMs: 5000 }).catch(() => undefined);
        return result?.exitCode === 0 ? result.stdout.trim() : undefined;
    };
    const level = Number(await sysctl('kern.memorystatus_level'));
    const ramAvailableMiB = Number.isFinite(level) && level > 0 && level <= 100 ? Math.floor((total * level) / 100) : toMiB(os.freemem());
    const swap = /total = ([\d.]+)M\s+used = ([\d.]+)M\s+free = ([\d.]+)M/.exec((await sysctl('vm.swapusage')) ?? '');
    const swapTotalMiB = swap ? Math.floor(Number(swap[1])) : undefined;
    const swapFreeMiB = swap ? Math.floor(Number(swap[3])) : undefined;
    return {
        ramAvailableMiB,
        ramTotalMiB: total,
        swapFreeMiB,
        swapTotalMiB,
        availableMiB: ramAvailableMiB + (swapFreeMiB ?? 0),
        note: 'macOS grows swap dynamically while free disk space allows.',
    };
}

/**
 * Measures the free capacity of the filesystems holding the given paths (each filesystem once).
 */
async function diskSample(paths: readonly string[]): Promise<HealthView['disk']> {
    const seen = new Set<string>();
    const measured: Array<{ path: string; freeMiB?: number; totalMiB?: number }> = [];
    let error: string | undefined;
    for (const path of paths) {
        try {
            const device = String((await stat(path)).dev);
            if (seen.has(device)) continue;
            seen.add(device);
            const fs = await statfs(path);
            measured.push({ path, freeMiB: toMiB(fs.bavail * fs.bsize), totalMiB: toMiB(fs.blocks * fs.bsize) });
        } catch (caught) {
            error = errorMessage(caught);
        }
    }
    const known = measured.filter((entry) => entry.freeMiB !== undefined);
    const lowest = known.sort((a, b) => a.freeMiB! - b.freeMiB!)[0];
    return { freeMiB: lowest?.freeMiB, totalMiB: lowest?.totalMiB, paths: measured, ...(measured.length ? {} : { error: error ?? 'No filesystem could be measured.' }) };
}

/**
 * The real host probes of this platform.
 *
 * @private health sub-engine
 */
export function hostProbes(env: NodeJS.ProcessEnv): HealthProbes {
    const configured = env.PTBK_HEALTH_CONNECTIVITY?.trim();
    const target = configured && !['off', '0', 'false', 'no'].includes(configured.toLowerCase()) ? configured : configured ? undefined : DEFAULT_CONNECTIVITY_TARGET;
    return {
        sample: async (paths) => {
            const memory = process.platform === 'linux' ? ((await linuxMemory()) ?? { ramAvailableMiB: toMiB(os.freemem()), ramTotalMiB: toMiB(os.totalmem()) }) : process.platform === 'darwin' ? await darwinMemory() : { ramAvailableMiB: toMiB(os.freemem()), ramTotalMiB: toMiB(os.totalmem()), note: 'Swap is not measured on this platform.' };
            const cores = typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length;
            const [load1, load5, load15] = os.loadavg();
            const loadKnown = process.platform !== 'win32' && (load1! > 0 || load5! > 0 || load15! > 0);
            return {
                at: new Date().toISOString(),
                disk: await diskSample(paths),
                memory: { ...memory, availableMiB: memory.availableMiB ?? (memory.ramAvailableMiB === undefined ? undefined : memory.ramAvailableMiB + (memory.swapFreeMiB ?? 0)) },
                cpu: loadKnown ? { cores, load1, load5, load15, state: load5! / Math.max(1, cores) >= CPU_HIGH_LOAD ? 'high' : 'normal' } : { cores, state: 'unknown' },
            };
        },
        connectivity: target
            ? async () => {
                  const [host, portText] = target.includes(':') ? [target.slice(0, target.lastIndexOf(':')), target.slice(target.lastIndexOf(':') + 1)] : [target, String(DEFAULT_CONNECTIVITY_PORT)];
                  return await new Promise<ConnectivityProbe>((resolvePromise) => {
                      const socket = connect({ host, port: Number(portText) || DEFAULT_CONNECTIVITY_PORT, timeout: CONNECTIVITY_TIMEOUT_MS });
                      const done = (error?: string): void => {
                          socket.destroy();
                          resolvePromise({ reachable: !error, target, ...(error ? { error } : {}) });
                      };
                      socket.once('connect', () => done());
                      socket.once('timeout', () => done(`no answer within ${CONNECTIVITY_TIMEOUT_MS / 1000} s`));
                      socket.once('error', (error) => done(errorMessage(error)));
                  });
              }
            : undefined,
    };
}

/**
 * Total size and newest modification below a path (symbolic links are not followed).
 */
async function measureEntry(path: string): Promise<{ bytes: number; modified: number }> {
    const info = await stat(path);
    if (!info.isDirectory()) return { bytes: info.size, modified: info.mtimeMs };
    let bytes = 0;
    let modified = info.mtimeMs;
    for (const entry of await readdir(path, { withFileTypes: true }).catch(() => [])) {
        if (entry.isSymbolicLink()) continue;
        const child = await measureEntry(join(path, entry.name)).catch(() => ({ bytes: 0, modified: 0 }));
        bytes += child.bytes;
        modified = Math.max(modified, child.modified);
    }
    return { bytes, modified };
}

/**
 * The per-engine Health sub-engine: it samples host resources, opens and resolves health incidents (with hysteresis),
 * contributes soft/hard health pause reasons and offers remediation. It works with zero viewers; dashboards only
 * read its view and call its operations. Every project engine owns exactly one (no host-wide singleton).
 *
 * @private health sub-engine
 */
export class HealthSubEngine {
    private readonly probes: HealthProbes;
    private readonly intervalMs: number;
    private readonly incidents: Incident[] = [];
    private sample?: HostSample;
    private network: HealthView['network'] = { state: 'unknown' };
    private connectivityFailures = 0;
    private nextConnectivityAt = 0;
    private timer?: NodeJS.Timeout;
    private sampling?: Promise<void>;
    private probing?: Promise<void>;
    private lastAction?: HealthView['lastAction'];
    private counter = 0;

    public constructor(private readonly options: HealthOptions) {
        this.probes = options.probes ?? hostProbes(options.env);
        this.intervalMs = options.intervalMs ?? SAMPLE_INTERVAL_MS;
        if (!this.probes.connectivity) this.network = { state: 'unknown', error: 'Connectivity checks are switched off (PTBK_HEALTH_CONNECTIVITY=off).' };
    }

    /** Starts continuous monitoring: one sample per interval (take the first one with {@link sampleNow}). */
    public start(): void {
        if (this.timer) return;
        const tick = (): void => {
            void this.sampleNow().finally(() => {
                if (!this.timer) return;
                this.timer = setTimeout(tick, this.intervalMs);
                this.timer.unref();
            });
        };
        this.timer = setTimeout(tick, this.intervalMs);
        this.timer.unref();
    }

    /** Stops monitoring with the owning engine. */
    public stop(): void {
        clearTimeout(this.timer);
        this.timer = undefined;
    }

    /** Takes one sample and re-evaluates every incident (concurrent calls share one sample). */
    public async sampleNow(): Promise<void> {
        if (this.sampling) return await this.sampling;
        this.sampling = (async () => {
            const before = this.reasonKey();
            try {
                const { project } = this.options;
                this.sample = await this.probes.sample([project.root, project.runtime.root]);
                this.evaluateResources();
                // A slow network never delays the resource evaluation.
                if (Date.now() >= this.nextConnectivityAt) void this.checkConnectivity();
            } catch (error) {
                this.options.log(`Health could not measure the host: ${errorMessage(error)}`, 'warning');
            }
            this.options.onChange();
            if (this.reasonKey() !== before) this.options.onPauseChange();
        })();
        try {
            await this.sampling;
        } finally {
            this.sampling = undefined;
        }
    }

    /** Probes connectivity once (concurrent calls share one probe) and re-evaluates the network incident. */
    public async checkConnectivity(): Promise<void> {
        if (!this.probes.connectivity) return;
        if (this.probing) return await this.probing;
        const connectivity = this.probes.connectivity;
        this.probing = (async () => {
            const probe = await connectivity().catch((error: unknown) => ({ reachable: false, target: 'unknown', error: errorMessage(error) }));
            this.connectivityFailures = probe.reachable ? 0 : this.connectivityFailures + 1;
            this.network = { state: probe.reachable ? 'reachable' : this.connectivityFailures >= CONNECTIVITY_FAILURES ? 'unreachable' : this.network.state, target: probe.target, checkedAt: new Date().toISOString(), ...(probe.error ? { error: probe.error } : {}) };
            this.nextConnectivityAt = Date.now() + (probe.reachable ? CONNECTIVITY_INTERVAL_MS : CONNECTIVITY_RETRY_MS);
            this.track('network', 'warning', this.network.state === 'unreachable', this.network.state === 'reachable', `No Internet connectivity${this.network.target ? ` to ${this.network.target}` : ''}${this.network.error ? `: ${this.network.error}` : ''}`, 1);
            this.options.onChange();
        })();
        try {
            await this.probing;
        } finally {
            this.probing = undefined;
        }
    }

    /** Identity of the active pause reasons (to notice changes). */
    private reasonKey(): string {
        return this.pauseReasons()
            .map((reason) => reason.id)
            .join('|');
    }

    /** Opens, updates or resolves one incident kind for the current sample (`samples` recovered samples close it). */
    private track(resource: Incident['resource'], severity: Incident['severity'], active: boolean, recovered: boolean, summary: string, samples = RECOVERY_SAMPLES): void {
        const open = this.incidents.find((incident) => incident.resource === resource && incident.severity === severity);
        if (open) {
            if (active || !recovered) {
                open.recovered = 0;
                if (active) open.summary = summary;
                return;
            }
            if (++open.recovered < samples) return;
            this.incidents.splice(this.incidents.indexOf(open), 1);
            this.options.log(`Health: resolved — ${open.summary.replace(/^[A-Z]/, (letter) => letter.toLowerCase())}${open.overriddenAt ? ' (it had been overridden)' : ''}.`, 'info');
            return;
        }
        if (!active) return;
        const incident: Incident = { id: `${resource}-${severity}-${Date.now().toString(36)}${(++this.counter).toString(36)}`, resource, severity, summary, openedAt: new Date().toISOString(), recovered: 0 };
        this.incidents.push(incident);
        const effect = severity === 'warning' ? '' : severity === 'hard' ? ' New background work is paused until it is resolved (no override).' : ' New background work is paused; it resumes automatically, or override it on the Health page.';
        this.options.log(`Health: ${summary}.${effect}`, severity === 'warning' ? 'warning' : 'error');
        if (resource === 'disk' && severity !== 'warning') void this.remedyDisk(incident);
    }

    /**
     * The autonomous remedy of low disk, before anyone is asked: reclaim the known-disposable Promptbook-owned project
     * cache (never Wallet, encryption, sessions, browser profiles or recovery data). Attempted once per incident.
     */
    private async remedyDisk(incident: Incident): Promise<void> {
        if (incident.remedy) return;
        incident.remedy = 'Cleaning the owned project cache…';
        const preview = await this.cachePreview().catch(() => undefined);
        if (!preview || !preview.removableBytes) {
            incident.remedy = 'No disposable Promptbook cache to reclaim.';
            this.options.onChange();
            return;
        }
        const cleaned = await this.cleanCache().catch(() => undefined);
        incident.remedy = cleaned ? `Automatically cleaned the owned project cache (${formatBytes(cleaned.freedBytes)} freed).` : 'Cleaning the owned project cache failed.';
        this.options.onChange();
    }

    /**
     * The concrete human action an open incident needs now, or undefined while it is only observed or autonomous
     * remedies are still running: warnings never ask; low disk asks once the owned cache was reclaimed and capacity is
     * still short; memory asks when exhausted or when a pausing shortage persists.
     */
    private neededAction(incident: Incident): string | undefined {
        if (incident.severity === 'warning' || incident.overriddenAt) return undefined;
        if (incident.resource === 'disk') return incident.remedy && !incident.remedy.endsWith('…') ? 'Free disk space or add capacity on this host; no safe automatic cleanup remains.' : undefined;
        if (incident.resource === 'memory' && (incident.severity === 'hard' || Date.now() - Date.parse(incident.openedAt) >= MEMORY_ATTENTION_AFTER_MS)) return 'Free memory or add capacity (on Linux the Health page can add swap).';
        return undefined;
    }

    /** Applies the disk, memory and CPU incident rules to the latest sample. */
    private evaluateResources(): void {
        const sample = this.sample;
        if (!sample) return;
        const limits = this.options.limits();
        const margin = (limit: number): number => Math.min(RECOVERY_MARGIN.maxMiB, Math.max(RECOVERY_MARGIN.minMiB, Math.round(limit * RECOVERY_MARGIN.ratio)));
        const free = sample.disk.freeMiB;
        const where = sample.disk.paths.find((entry) => entry.freeMiB === free)?.path;
        // The project's own filesystem needs no location; a separate runtime filesystem is named.
        const location = where && toProjectRelative(this.options.project.root, where) ? ` on ${toProjectRelative(this.options.project.root, where)}` : '';
        if (free !== undefined) {
            this.track('disk', 'hard', free < HARD_DISK_MIB, free >= HARD_DISK_MIB * 2, `Disk full: ${formatMiB(free)} free${location}`);
            this.track('disk', 'soft', limits.disk > 0 && free < limits.disk, limits.disk === 0 || free >= limits.disk + margin(limits.disk), `Low free disk: ${formatMiB(free)} free${location} (limit ${formatMiB(limits.disk)})`);
        }
        const available = sample.memory.availableMiB;
        if (available !== undefined) {
            const parts = `RAM ${formatMiB(sample.memory.ramAvailableMiB)} + swap ${formatMiB(sample.memory.swapFreeMiB)}`;
            this.track('memory', 'hard', available < HARD_MEMORY_MIB, available >= HARD_MEMORY_MIB * 2, `Memory exhausted: ${formatMiB(available)} available (${parts})`);
            this.track('memory', 'soft', limits.memory > 0 && available < limits.memory, limits.memory === 0 || available >= limits.memory + margin(limits.memory), `Low available memory: ${formatMiB(available)} (${parts}; limit ${formatMiB(limits.memory)})`);
        }
        const { cpu } = sample;
        if (cpu.load5 !== undefined) {
            const perCore = cpu.load5 / Math.max(1, cpu.cores);
            this.track('cpu', 'warning', perCore >= CPU_HIGH_LOAD, perCore < CPU_RECOVERED_LOAD, `High CPU load: ${cpu.load5.toFixed(1)} on ${cpu.cores} core${cpu.cores === 1 ? '' : 's'}`);
        }
    }

    /** Active health pause reasons: every hard incident and every soft incident that was not overridden. */
    public pauseReasons(): PauseReasonView[] {
        return this.incidents
            .filter((incident) => incident.severity === 'hard' || (incident.severity === 'soft' && !incident.overriddenAt))
            .map((incident) => ({
                id: `health:${incident.id}`,
                kind: 'health',
                owner: 'Health',
                severity: incident.severity as 'soft' | 'hard',
                summary: incident.summary,
                since: incident.openedAt,
                incident: incident.id,
                removable: incident.severity === 'soft',
            }));
    }

    /**
     * Overrides a soft incident (the newest one when `id` is omitted): new background work continues below the
     * configured limit until this incident recovers. Hard incidents cannot be overridden; `ptbk.json` is unchanged.
     */
    public override(id?: string): { readonly applied: boolean; readonly outcome: string } {
        const incident = id ? this.incidents.find((candidate) => candidate.id === id) : [...this.incidents].reverse().find((candidate) => candidate.severity === 'soft' && !candidate.overriddenAt);
        if (!incident) return this.record('health-override', { applied: false, outcome: id ? 'That health incident is no longer open.' : 'No soft health incident pauses the engine.' });
        if (incident.severity === 'hard') {
            throw new PtbkError('A hard health pause cannot be overridden.', {
                kind: 'conflict',
                reason: `${incident.summary}: the host has actually run out of this resource.`,
                effect: 'Nothing was changed; it clears by itself once the condition is gone.',
                next: ['Free disk space or memory (the Health page offers project-cache cleanup and, on Linux, swap).'],
            });
        }
        if (incident.severity !== 'soft') return this.record('health-override', { applied: false, outcome: `${incident.summary} is a warning only; it does not pause work.` });
        if (incident.overriddenAt) return this.record('health-override', { applied: true, outcome: 'This incident is already overridden.' });
        incident.overriddenAt = new Date().toISOString();
        this.options.log(`Health: continuing below the recommended limit by explicit override — ${incident.summary}. A new drop after recovery pauses again.`, 'warning');
        this.options.onPauseChange();
        return this.record('health-override', { applied: true, outcome: `Overridden for this incident: ${incident.summary}. ptbk.json is unchanged.` });
    }

    /** Remembers the last operation for the Health page. */
    private record<T extends { readonly outcome: string }>(action: string, result: T): T {
        this.lastAction = { action, outcome: result.outcome, at: new Date().toISOString() };
        this.options.onChange();
        return result;
    }

    /** Absolute path of the Promptbook-owned project cache. */
    private get cacheDirectory(): string {
        return this.options.project.runtime.temporary;
    }

    /**
     * Previews cleaning the Promptbook-owned cache of this project (`.ptbk/tmp/`): temporary prompts, screenshots,
     * recording frames and commit scratch files. Entries changed in the last minutes are kept for work in progress.
     */
    public async cachePreview(): Promise<CachePreview> {
        const now = Date.now();
        const entries: CacheEntry[] = [];
        for (const entry of await readdir(this.cacheDirectory, { withFileTypes: true }).catch(() => [])) {
            if (entry.isSymbolicLink()) continue;
            const measured = await measureEntry(join(this.cacheDirectory, entry.name)).catch(() => undefined);
            if (!measured) continue;
            entries.push({ name: entry.name, bytes: measured.bytes, modifiedAt: new Date(measured.modified).toISOString(), ...(now - measured.modified < CACHE_KEEP_RECENT_MS ? { kept: 'changed in the last 10 minutes (may be in use)' } : {}) });
        }
        entries.sort((a, b) => b.bytes - a.bytes);
        return {
            path: toProjectRelative(this.options.project.root, this.cacheDirectory),
            entries,
            removableBytes: entries.filter((entry) => !entry.kept).reduce((sum, entry) => sum + entry.bytes, 0),
            keptBytes: entries.filter((entry) => entry.kept).reduce((sum, entry) => sum + entry.bytes, 0),
        };
    }

    /** Removes the removable entries of the project cache (recomputed here, never taken from a client). */
    public async cleanCache(): Promise<{ readonly applied: boolean; readonly outcome: string; readonly freedBytes: number }> {
        const preview = await this.cachePreview();
        let freedBytes = 0;
        let removed = 0;
        for (const entry of preview.entries.filter((candidate) => !candidate.kept)) {
            const target = resolve(this.cacheDirectory, entry.name);
            if (!isPathInside(this.cacheDirectory, target)) continue;
            await rm(target, { recursive: true, force: true }).then(
                () => {
                    freedBytes += entry.bytes;
                    removed++;
                },
                () => undefined,
            );
        }
        this.options.log(`Health: cleaned the project cache ${preview.path}/ — ${removed} entr${removed === 1 ? 'y' : 'ies'}, ${formatBytes(freedBytes)} freed.`, 'info');
        const result = this.record('health-clean-cache', { applied: true, outcome: `Removed ${removed} cache entr${removed === 1 ? 'y' : 'ies'} (${formatBytes(freedBytes)})${preview.keptBytes ? `; kept ${formatBytes(preview.keptBytes)} changed recently` : ''}.`, freedBytes });
        void this.sampleNow();
        return result;
    }

    /** How swap can be inspected or added on this host (Linux only; elsewhere guidance). */
    public async swapPlan(): Promise<SwapPlan> {
        if (process.platform === 'darwin') return { supported: false, note: 'macOS manages swap automatically with dynamic swap files; free disk space lets it grow. No manual swap action is needed.' };
        if (process.platform === 'win32') return { supported: false, note: 'Windows manages the paging file; adjust it in System Properties › Advanced › Performance › Virtual memory.' };
        if (process.platform !== 'linux') return { supported: false, note: 'Swap management is not supported on this platform.' };
        const swaps = await readFile('/proc/swaps', 'utf8').catch(() => '');
        const current = swaps
            .split('\n')
            .slice(1)
            .filter(Boolean)
            .map((line) => line.trim().split(/\s+/))
            .map((columns) => ({ path: columns[0]!, sizeMiB: Math.floor(Number(columns[2]) / 1024), usedMiB: Math.floor(Number(columns[3]) / 1024) }));
        const ram = toMiB(os.totalmem());
        const root = await statfs('/').catch(() => undefined);
        const freeRoot = root ? toMiB(root.bavail * root.bsize) : 0;
        const reserve = Math.max(SWAP_SIZE.minMiB, this.options.limits().disk);
        const size = Math.max(0, Math.min(SWAP_SIZE.maxMiB, Math.max(SWAP_SIZE.minMiB, ram), freeRoot - reserve));
        const sizeMiB = Math.floor(size / SWAP_SIZE.stepMiB) * SWAP_SIZE.stepMiB;
        const existing = new Set(current.map((area) => area.path));
        const path = existing.has('/swapfile') ? '/swapfile-ptbk' : '/swapfile';
        const total = current.reduce((sum, area) => sum + area.sizeMiB, 0);
        if (sizeMiB < SWAP_SIZE.stepMiB) return { supported: true, note: `Not enough free disk on / for a useful swap file (${formatMiB(freeRoot)} free, ${formatMiB(reserve)} kept free).`, current };
        const privilege = process.getuid?.() === 0 ? 'root' : (await runProcess('sudo', ['-n', 'true'], { cwd: '/', timeoutMs: 5000 }).catch(() => undefined))?.exitCode === 0 ? 'sudo' : 'missing';
        return {
            supported: true,
            note: total ? `${formatMiB(total)} of swap is active; another swap file adds ${formatMiB(sizeMiB)}.` : `No swap is active; a ${formatMiB(sizeMiB)} swap file gives memory headroom.`,
            current,
            proposal: {
                path,
                sizeMiB,
                commands: [`fallocate -l ${sizeMiB}M ${path}`, `chmod 600 ${path}`, `mkswap ${path}`, `swapon ${path}`],
                persistLine: `${path} none swap sw 0 0`,
                privilege,
            },
        };
    }

    /**
     * Creates and enables the planned swap file after the operator's explicit approval. It never prompts for a
     * password: without root or passwordless sudo it fails with the commands for an administrator.
     */
    public async applySwap(): Promise<{ readonly applied: boolean; readonly outcome: string }> {
        const plan = await this.swapPlan();
        if (!plan.supported || !plan.proposal) return this.record('health-swap', { applied: false, outcome: plan.note });
        const { proposal } = plan;
        if (proposal.privilege === 'missing') {
            throw new PtbkError('Creating swap needs administrator privileges, which this engine does not have.', {
                kind: 'incomplete',
                reason: 'The engine runs unattended and never waits for a sudo password.',
                effect: 'Nothing was changed.',
                next: [`Run as an administrator: ${proposal.commands.map((command) => `sudo ${command}`).join(' && ')}`, `To keep it after a reboot, add to /etc/fstab: ${proposal.persistLine}`],
            });
        }
        for (const command of proposal.commands) {
            const [program, ...args] = command.split(' ');
            const invocation = proposal.privilege === 'sudo' ? ['sudo', ['-n', program!, ...args]] as const : [program!, args] as const;
            let result = await runProcess(invocation[0], invocation[1], { cwd: '/', timeoutMs: 120_000 });
            if (result.exitCode !== 0 && program === 'fallocate') {
                // Filesystems without fallocate support get the file written explicitly.
                const dd = ['dd', 'if=/dev/zero', `of=${proposal.path}`, 'bs=1M', `count=${proposal.sizeMiB}`];
                result = await runProcess(proposal.privilege === 'sudo' ? 'sudo' : dd[0]!, proposal.privilege === 'sudo' ? ['-n', ...dd] : dd.slice(1), { cwd: '/', timeoutMs: 600_000 });
            }
            if (result.exitCode !== 0) {
                throw new PtbkError(`Swap setup failed at \`${command}\`.`, { kind: 'technical', reason: (result.stderr || result.stdout || result.spawnError || '').trim().slice(0, 500), effect: 'Earlier steps may have been applied; nothing else was changed.', next: ['Inspect `swapon --show` and the swap file, then retry or finish it manually.'] });
            }
        }
        this.options.log(`Health: enabled a ${formatMiB(proposal.sizeMiB)} swap file at ${proposal.path} (add "${proposal.persistLine}" to /etc/fstab to keep it after a reboot).`, 'info');
        void this.sampleNow();
        return this.record('health-swap', { applied: true, outcome: `Enabled ${formatMiB(proposal.sizeMiB)} of swap at ${proposal.path}. Keep it after reboot with the /etc/fstab line: ${proposal.persistLine}` });
    }

    /** The shared Health view (terminal, browser and API). */
    public view(): HealthView {
        const limits = this.options.limits();
        const incidents: HealthIncidentView[] = this.incidents.map((incident) => ({
            id: incident.id,
            resource: incident.resource,
            severity: incident.severity,
            summary: incident.summary,
            openedAt: incident.openedAt,
            ...(incident.overriddenAt ? { overriddenAt: incident.overriddenAt } : {}),
            pauses: incident.severity === 'hard' || (incident.severity === 'soft' && !incident.overriddenAt),
            ...(incident.remedy ? { remedy: incident.remedy } : {}),
            ...(this.neededAction(incident) ? { needsAction: this.neededAction(incident) } : {}),
        }));
        const rank = { hard: 0, soft: 1, warning: 2 } as const;
        const worst = [...incidents].sort((a, b) => Number(!a.pauses) - Number(!b.pauses) || rank[a.severity] - rank[b.severity])[0];
        const status: HealthView['status'] = !this.sample ? 'unknown' : !worst ? 'ok' : worst.pauses ? (worst.severity as 'soft' | 'hard') : 'warning';
        const sample = this.sample;
        return {
            status,
            summary: !sample ? 'Measuring…' : worst ? `${worst.summary}${incidents.length > 1 ? ` (+${incidents.length - 1})` : ''}` : 'System OK',
            observedAt: sample?.at,
            intervalMs: this.intervalMs,
            limits,
            disk: sample?.disk ?? { paths: [] },
            memory: sample?.memory ?? {},
            cpu: sample?.cpu ?? { cores: typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length, state: 'unknown' },
            network: this.network,
            incidents,
            remediation: {
                cache: { path: toProjectRelative(this.options.project.root, this.cacheDirectory) },
                swap: { supported: process.platform === 'linux', note: process.platform === 'linux' ? 'Inspect or add a swap file (needs root or passwordless sudo; never prompts).' : process.platform === 'darwin' ? 'macOS manages swap automatically.' : 'Swap is managed by the operating system.' },
            },
            ...(this.lastAction ? { lastAction: this.lastAction } : {}),
        };
    }
}
