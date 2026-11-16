import { randomUUID } from 'node:crypto';
import { open, readdir, readFile, rm, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { ensureDirectory, readJsonIfExists, writeJsonAtomic } from '../common/fs.js';
import { isProcessAlive } from '../common/process.js';
import type { InferenceRuntimeVariant } from '../tools/model.js';
import { discoverHardware, formatBytes } from './hardware.js';
import { alive, digest, inferenceRegistryDirectory } from './host.js';

/**
 * How often a waiting request re-evaluates the shared capacity of its runtime.
 */
const ADMISSION_POLL_MS = 250;

/**
 * A bridged tool call shorter than this keeps its capacity (a quick tool never lets newer work overtake its turn);
 * a longer wait, such as a nested TEAM consultation, yields it.
 */
const YIELD_GRACE_MS = 1_000;

/**
 * Estimated memory of a loaded model beyond its weights (context/KV cache and runtime buffers), as a fraction of the
 * weights. An honest, conservative estimate: runtimes do not expose their per-request context memory beforehand.
 */
const CONTEXT_OVERHEAD = 0.2;

/**
 * How long the host's inference memory is reused before it is discovered again.
 */
const MEMORY_TTL_MS = 10 * 60_000;

/**
 * State of one inference use of a runtime resource:
 *
 * - `waiting`: it asked for capacity and waits in arrival order
 * - `admitted`: it is running inference (it counts against the capacity)
 * - `yielded`: its turn waits for a tool or a nested consultation and does not hold capacity meanwhile
 *
 * @private local inference admission
 */
export type AdmissionState = 'waiting' | 'admitted' | 'yielded';

/**
 * One inference use of a shared runtime across every engine and installation of this OS user.
 *
 * @private local inference admission
 */
export type AdmissionRecord = {
    readonly id: string;
    /** Engine process and its start time (a reused PID never counts as the same use). */
    readonly pid: number;
    readonly startedAt: string;
    readonly resourceKey: string;
    readonly project: string;
    /** Harness connection of the use. */
    readonly tool: string;
    readonly model?: string;
    /** Size of the model's weights where the runtime reports it. */
    readonly modelBytes?: number;
    /** What the use serves (`turn`, `read-only turn`). */
    readonly purpose: string;
    /** When the use first asked for capacity: its place in the queue, kept when it yields and resumes. */
    readonly requestedAt: string;
    readonly state: AdmissionState;
    /** When the state last changed. */
    readonly since: string;
};

/**
 * What a request asks to use.
 *
 * @private local inference admission
 */
export type AdmissionRequest = Pick<AdmissionRecord, 'resourceKey' | 'project' | 'tool' | 'model' | 'modelBytes' | 'purpose'> & {
    readonly runtime: InferenceRuntimeVariant;
};

/**
 * Supported concurrent inference of one model on a runtime, with where that number comes from.
 *
 * @private local inference admission
 */
export type InferenceCapacity = {
    /** Concurrent requests one loaded model serves. */
    readonly perModel: number;
    /** Human explanation of the number (observed setting or conservative default). */
    readonly source: string;
};

/**
 * An actual wait for runtime capacity, with the uses it waits for.
 *
 * @private local inference admission
 */
export type AdmissionWait = {
    readonly reason: string;
    readonly blockers: readonly AdmissionRecord[];
};

/**
 * Outcome of evaluating one waiting request against the shared state.
 *
 * @private local inference admission
 */
export type AdmissionDecision = { readonly admit: true } | ({ readonly admit: false } & AdmissionWait);

/**
 * The supported concurrency of a runtime. Ollama serves `OLLAMA_NUM_PARALLEL` requests per loaded model; the service
 * Promptbook starts inherits the engine environment, so that setting is the actual one there. Without an observed
 * setting the admission starts conservatively with one request per model, never with a fixed global task count.
 *
 * @private local inference admission
 */
export function inferenceCapacity(runtime: InferenceRuntimeVariant, env: NodeJS.ProcessEnv): InferenceCapacity {
    if (runtime === 'OLLAMA') {
        const configured = Number(env.OLLAMA_NUM_PARALLEL);
        if (Number.isInteger(configured) && configured >= 1) return { perModel: configured, source: `OLLAMA_NUM_PARALLEL=${configured} in the engine environment` };
    }
    return { perModel: 1, source: 'parallelism not observed, conservative default' };
}

/**
 * Short human label of a use (`codex-local for gpt-oss:20b in my-project`).
 *
 * @private local inference admission
 */
export function describeUse(record: Pick<AdmissionRecord, 'tool' | 'model' | 'project' | 'purpose'>): string {
    return `${record.tool}${record.model ? ` (${record.model})` : ''} in ${basename(record.project) || record.project} (${record.purpose})`;
}

/**
 * Queue order: the earliest request first (a yielded use keeps its original place when it resumes, so started work
 * finishes before newer work starts).
 */
function byArrival(a: AdmissionRecord, b: AdmissionRecord): number {
    return a.requestedAt === b.requestedAt ? a.id.localeCompare(b.id) : a.requestedAt < b.requestedAt ? -1 : 1;
}

/**
 * Decides whether a waiting request may run now. Pure: the same shared records give the same answer in every engine.
 *
 * - waiting requests are admitted in arrival order (no starvation, no overtaking);
 * - one model serves at most its supported number of concurrent requests;
 * - a different model may run beside loaded ones only when the known weights plus context estimates fit the host's
 *   inference memory (unknown sizes or memory are a wait, never an assumed fit);
 * - yielded uses hold nothing, so a parent waiting for its nested consultation never blocks the advisor.
 *
 * @private local inference admission
 */
export function admissionDecision(records: readonly AdmissionRecord[], candidate: AdmissionRecord, capacity: InferenceCapacity, memoryBytes: number | undefined): AdmissionDecision {
    const others = records.filter((record) => record.id !== candidate.id);
    const earlier = others.filter((record) => record.state === 'waiting' && byArrival(record, candidate) < 0);
    if (earlier.length) return { admit: false, reason: `${earlier.length} earlier request${earlier.length === 1 ? '' : 's'} for this runtime wait${earlier.length === 1 ? 's' : ''} first`, blockers: earlier };
    const admitted = others.filter((record) => record.state === 'admitted');
    const sameModel = admitted.filter((record) => record.model === candidate.model);
    if (sameModel.length >= capacity.perModel) {
        return { admit: false, reason: `${candidate.model ?? 'the model'} serves ${capacity.perModel} request${capacity.perModel === 1 ? '' : 's'} at a time (${capacity.source})`, blockers: sameModel };
    }
    const otherModels = new Map<string, number | undefined>();
    for (const record of admitted) if (record.model !== candidate.model) otherModels.set(record.model ?? '', record.modelBytes);
    if (!otherModels.size) return { admit: true };
    const loaded = admitted.filter((record) => record.model !== candidate.model);
    const sizes = [candidate.modelBytes, ...otherModels.values()];
    if (memoryBytes === undefined || sizes.some((size) => size === undefined)) {
        return { admit: false, reason: `the memory needed to run ${candidate.model ?? 'this model'} beside ${[...otherModels.keys()].join(', ')} is not known`, blockers: loaded };
    }
    const needed = sizes.reduce<number>((sum, size) => sum + size! * (1 + CONTEXT_OVERHEAD), 0);
    if (needed > memoryBytes) {
        return { admit: false, reason: `${candidate.model ?? 'this model'} and ${[...otherModels.keys()].join(', ')} together need about ${formatBytes(needed)}, more than the ${formatBytes(memoryBytes)} available for inference`, blockers: loaded };
    }
    return { admit: true };
}

/**
 * Directory of one runtime resource's admission records.
 *
 * @private local inference admission
 */
export function admissionDirectory(env: NodeJS.ProcessEnv, resourceKey: string): string {
    return join(inferenceRegistryDirectory(env), 'admission', digest(resourceKey));
}

/**
 * Start time of this process in the form used by every host record.
 */
function processStartedAt(): string {
    return new Date(Date.now() - process.uptime() * 1000).toISOString();
}

/**
 * Verdicts about other engines' processes, reused briefly (polling must not inspect process tables continuously).
 */
const LIVENESS = new Map<string, { readonly alive: boolean; readonly at: number }>();

/**
 * Whether the process of a record is still alive (own records always are).
 */
async function recordAlive(record: AdmissionRecord): Promise<boolean> {
    if (record.pid === process.pid) return true;
    if (!isProcessAlive(record.pid)) return false;
    const key = `${record.pid}@${record.startedAt}`;
    const cached = LIVENESS.get(key);
    if (cached && Date.now() - cached.at < 30_000) return cached.alive;
    const verdict = await alive(record.pid, record.startedAt);
    LIVENESS.set(key, { alive: verdict, at: Date.now() });
    return verdict;
}

/**
 * Live records of a directory; records of dead engines are removed (a crashed engine never keeps capacity).
 */
async function liveRecords(directory: string): Promise<AdmissionRecord[]> {
    const names = await readdir(directory).catch(() => [] as string[]);
    const result: AdmissionRecord[] = [];
    for (const name of names) {
        if (!name.endsWith('.json')) continue;
        const path = join(directory, name);
        const record = await readJsonIfExists<AdmissionRecord>(path).catch(() => undefined);
        if (!record || typeof record.pid !== 'number' || typeof record.id !== 'string') continue;
        if (!(await recordAlive(record))) {
            await rm(path, { force: true });
            continue;
        }
        result.push(record);
    }
    return result.sort(byArrival);
}

/**
 * Waits for a delay unless the signal aborts first.
 */
async function pause(ms: number, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
            signal.removeEventListener('abort', onAbort);
            resolve();
        }, ms);
        const onAbort = (): void => {
            clearTimeout(timer);
            reject(signal.reason instanceof Error ? signal.reason : new Error('Aborted.'));
        };
        signal.addEventListener('abort', onAbort, { once: true });
    });
}

/**
 * Runs a short decision exclusively for one resource across engines (the lock is held only to read and write records).
 */
async function withAdmissionLock<T>(directory: string, signal: AbortSignal, action: () => Promise<T>): Promise<T> {
    const path = join(directory, '.lock');
    for (;;) {
        signal.throwIfAborted();
        try {
            const handle = await open(path, 'wx', 0o600);
            try {
                await handle.writeFile(JSON.stringify({ pid: process.pid }));
            } finally {
                await handle.close();
            }
            try {
                return await action();
            } finally {
                await rm(path, { force: true });
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        }
        // A holder that died (or never wrote its PID) cannot keep the lock.
        const holder = await readFile(path, 'utf8').then((text) => JSON.parse(text) as { pid?: number }).catch(() => undefined);
        const age = await stat(path).then((info) => Date.now() - info.mtimeMs).catch(() => 0);
        if ((holder?.pid !== undefined && !isProcessAlive(holder.pid)) || (!holder?.pid && age > 5_000)) {
            await rm(path, { force: true });
            continue;
        }
        await pause(10 + Math.floor(Math.random() * 20), signal);
    }
}

/**
 * Memory available for inference on this host (reused for a while; discovered only when two models compete).
 */
let memoryCache: { readonly bytes: number | undefined; readonly at: number } | undefined;

/**
 * The host's inference memory (VRAM of a discrete GPU, otherwise system memory), or undefined when unknown.
 */
async function inferenceMemory(env: NodeJS.ProcessEnv): Promise<number | undefined> {
    if (memoryCache && Date.now() - memoryCache.at < MEMORY_TTL_MS) return memoryCache.bytes;
    const bytes = await discoverHardware(env)
        .then((hardware) => hardware.inferenceMemoryBytes)
        .catch(() => undefined);
    memoryCache = { bytes, at: Date.now() };
    return bytes;
}

/**
 * Admission options of one use.
 *
 * @private local inference admission
 */
export type AdmissionOptions = {
    /** Stops waiting (the request is withdrawn and nothing is admitted). */
    readonly signal?: AbortSignal;
    /** An actual wait begins or changes (`undefined`: the use was admitted after waiting). */
    readonly onWait?: (wait: AdmissionWait | undefined) => void;
};

/**
 * One admitted inference use of a shared runtime. It holds capacity while its turn runs inference, yields it while the
 * turn waits for a bridged tool or nested consultation, and gives it up when the turn ends.
 *
 * @private local inference admission
 */
export class InferenceLease {
    private released = false;
    private readonly stop = new AbortController();
    private calls = 0;
    private timer: NodeJS.Timeout | undefined;
    /** Serializes this use's state transitions. */
    private transition: Promise<void> = Promise.resolve();

    /** @private use {@link acquireInference} */
    public constructor(
        private readonly env: NodeJS.ProcessEnv,
        private readonly directory: string,
        private record: AdmissionRecord,
        private readonly capacity: InferenceCapacity,
        private readonly options: AdmissionOptions,
    ) {}

    /** Current state of this use. */
    public get state(): AdmissionState {
        return this.record.state;
    }

    /** The shared record of this use. */
    private get path(): string {
        return join(this.directory, `${this.record.pid}-${this.record.id}.json`);
    }

    /** Signal of waits: the caller's cancellation or this lease's release. */
    private get signal(): AbortSignal {
        return this.options.signal ? AbortSignal.any([this.options.signal, this.stop.signal]) : this.stop.signal;
    }

    /** Writes this use's state (never after release: a released use leaves no record). */
    private async write(state: AdmissionState): Promise<void> {
        if (this.released) return;
        this.record = { ...this.record, state, since: new Date().toISOString() };
        await writeJsonAtomic(this.path, this.record, { mode: 0o600 });
    }

    /** Waits in the shared queue until this use may run inference. */
    public async admit(): Promise<void> {
        const signal = this.signal;
        let reported: string | undefined;
        try {
            for (;;) {
                const decision = await withAdmissionLock(this.directory, signal, async () => {
                    if (this.released) return { admit: true } as const;
                    const records = await liveRecords(this.directory);
                    const others = records.filter((record) => record.id !== this.record.id);
                    const needsMemory = others.some((record) => record.state === 'admitted' && record.model !== this.record.model);
                    const decision = admissionDecision(records, this.record, this.capacity, needsMemory ? await inferenceMemory(this.env) : undefined);
                    await this.write(decision.admit ? 'admitted' : 'waiting');
                    return decision;
                });
                if (decision.admit) {
                    if (reported !== undefined) this.options.onWait?.(undefined);
                    return;
                }
                const blockers = decision.blockers.map(describeUse);
                const text = `Waiting for local inference capacity: ${decision.reason}.${blockers.length ? ` In use: ${blockers.slice(0, 3).join('; ')}${blockers.length > 3 ? '; …' : ''}.` : ''}`;
                if (text !== reported) {
                    reported = text;
                    this.options.onWait?.({ reason: text, blockers: decision.blockers });
                }
                await pause(ADMISSION_POLL_MS, signal);
            }
        } catch (error) {
            // A withdrawn request leaves nothing behind that others would have to wait for.
            if (!this.released) await rm(this.path, { force: true });
            throw error;
        }
    }

    /** Queues a state transition after the previous one. */
    private enqueue(step: () => Promise<void>): Promise<void> {
        const next = this.transition.then(step, step);
        this.transition = next.catch(() => undefined);
        return next;
    }

    /** Gives up capacity while a long tool call or nested consultation runs (its place in the queue is kept). */
    private async yieldCapacity(): Promise<void> {
        if (this.released || this.calls === 0 || this.record.state !== 'admitted') return;
        await withAdmissionLock(this.directory, this.signal, async () => await this.write('yielded'));
    }

    /** Takes capacity back before the turn continues inference after its tool call. */
    private async reclaim(): Promise<void> {
        if (this.released || this.record.state !== 'yielded') return;
        await this.admit();
    }

    /**
     * Runs a bridged tool call of this turn. When it outlasts a short grace, the turn's capacity is yielded so other
     * work (above all its own nested TEAM advisor) can use the runtime; the result is returned after capacity is
     * reacquired, so the turn never continues inference beyond the runtime's capacity.
     */
    public async during<T>(action: () => Promise<T>): Promise<T> {
        if (this.released) return await action();
        this.calls++;
        if (this.calls === 1) {
            this.timer = setTimeout(() => void this.enqueue(() => this.yieldCapacity()).catch(() => undefined), YIELD_GRACE_MS);
            this.timer.unref();
        }
        try {
            return await action();
        } finally {
            this.calls--;
            if (this.calls === 0) {
                clearTimeout(this.timer);
                // A cancelled turn returns its result at once; the ending run releases the lease anyway.
                await this.enqueue(() => this.reclaim()).catch(() => undefined);
            }
        }
    }

    /** Ends this use: its capacity and record are released at once. */
    public async release(): Promise<void> {
        if (this.released) return;
        this.released = true;
        clearTimeout(this.timer);
        this.stop.abort(new Error('The inference use ended.'));
        await this.transition.catch(() => undefined);
        await rm(this.path, { force: true });
    }
}

/**
 * Asks for capacity of a shared local runtime and waits until it is admitted. The wait is an actual resource wait
 * reported through `onWait`; cancellation withdraws the request.
 *
 * @private local inference admission
 */
export async function acquireInference(env: NodeJS.ProcessEnv, request: AdmissionRequest, options: AdmissionOptions = {}): Promise<InferenceLease> {
    const directory = await ensureDirectory(admissionDirectory(env, request.resourceKey));
    const now = new Date().toISOString();
    const record: AdmissionRecord = {
        id: randomUUID(),
        pid: process.pid,
        startedAt: processStartedAt(),
        resourceKey: request.resourceKey,
        project: request.project,
        tool: request.tool,
        ...(request.model ? { model: request.model } : {}),
        ...(request.modelBytes !== undefined ? { modelBytes: request.modelBytes } : {}),
        purpose: request.purpose,
        requestedAt: now,
        state: 'waiting',
        since: now,
    };
    const lease = new InferenceLease(env, directory, record, inferenceCapacity(request.runtime, env), options);
    await lease.admit();
    return lease;
}

/**
 * Live inference uses of a runtime resource across engines, in queue order (for status views).
 *
 * @private local inference admission
 */
export async function admissionQueue(env: NodeJS.ProcessEnv, resourceKey: string): Promise<AdmissionRecord[]> {
    return await liveRecords(admissionDirectory(env, resourceKey));
}

/**
 * Leases of running turns by the address of their tool bridge.
 */
const BRIDGE_LEASES = new Map<string, InferenceLease>();

/**
 * Associates a turn's lease with its tool bridge until the returned function is called.
 *
 * @private local inference admission
 */
export function bindBridgeLease(address: string, lease: InferenceLease): () => void {
    BRIDGE_LEASES.set(address, lease);
    return () => {
        if (BRIDGE_LEASES.get(address) === lease) BRIDGE_LEASES.delete(address);
    };
}

/**
 * Runs one bridged tool call, yielding the calling turn's local inference capacity while it waits (a turn without a
 * local lease runs the call unchanged).
 *
 * @private local inference admission
 */
export async function duringBridgeCall<T>(address: string, action: () => Promise<T>): Promise<T> {
    const lease = BRIDGE_LEASES.get(address);
    return lease ? await lease.during(action) : await action();
}
