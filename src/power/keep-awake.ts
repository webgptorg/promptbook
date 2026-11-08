import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { errorMessage } from '../common/errors.js';
import { ensureDirectory, readJsonIfExists, writeJsonAtomic } from '../common/fs.js';
import type { Project } from '../project/workspace.js';
import { endCarriers, type CarrierRecord, type HoldKind, type LidObservation, type PowerAdapter, type PowerCapability, type PowerHold, type PowerReading } from './adapters.js';
import { effectiveKeepAwakeMode, readKeepAwakePreference, readLastWork, recordLastWork, saveKeepAwakePreference, type KeepAwakeChange, type KeepAwakePreference } from './preference.js';
import type { KeepAwakeProtectionView, KeepAwakeReason, KeepAwakeView } from './view.js';

/**
 * Upper bound of a restart/update handoff: carriers end by themselves after this, so a failed or cancelled replacement
 * never leaves protection behind for long.
 *
 * @private keep-awake
 */
export const KEEP_AWAKE_HANDOFF_SECONDS = 300;

/**
 * Delay before a failed or lost request is tried again (power and lifecycle changes re-evaluate sooner).
 */
const RETRY_MS = 60_000;

/**
 * Capabilities are rechecked this often (a helper can be approved or revoked meanwhile).
 */
const CAPABILITY_REFRESH_MS = 5 * 60_000;

/**
 * Power-source polling while keep-awake is Off (the System page still shows the power source).
 */
const IDLE_POLL_MS = 5 * 60_000;

/**
 * The last work time is saved at most this often while work runs.
 */
const WORK_SAVE_MS = 60_000;

/**
 * Engine facts the policy depends on, read from the agenda at each evaluation.
 *
 * @private keep-awake
 */
export type KeepAwakeFacts = {
    readonly state: 'running' | 'pausing' | 'pause' | 'stopping' | 'stopped' | 'finished';
    /** A force stop is under way: it revokes protection at once. */
    readonly forced: boolean;
    /** A restart (manual or update) is pending or under way: a held request is carried to the replacement. */
    readonly restarting: boolean;
    /** Task or chat work is active now. */
    readonly working: boolean;
    /** The newest durable task result (ISO). */
    readonly lastResultAt?: string;
};

/**
 * Options of the keep-awake controller.
 *
 * @private keep-awake
 */
export type KeepAwakeOptions = {
    readonly project: Project;
    readonly instanceId: string;
    readonly env: NodeJS.ProcessEnv;
    readonly adapter: PowerAdapter;
    readonly facts: () => KeepAwakeFacts;
    /** The view changed (published to every client). */
    readonly onChange: () => void;
    readonly log: (text: string, level?: 'info' | 'warning' | 'error') => void;
    readonly now?: () => number;
};

/**
 * A restart handoff in progress (`.ptbk/service/keep-awake-handoff.json`): the previous engine's bounded carriers.
 */
type HandoffRecord = { readonly version: 1; readonly from: string; readonly startedAt: string; readonly until: string; readonly carriers: readonly CarrierRecord[] };

/**
 * Human label of a kind of protection.
 */
function label(kind: HoldKind): string {
    return kind === 'idle' ? 'idle-sleep' : 'closed-lid';
}

/**
 * File of a project's restart handoff.
 *
 * @private keep-awake
 */
export function keepAwakeHandoffPath(project: Project): string {
    return join(project.runtime.service, 'keep-awake-handoff.json');
}

/**
 * Reads a project's restart handoff record.
 */
async function readHandoff(project: Project): Promise<HandoffRecord | undefined> {
    const record = await readJsonIfExists<HandoffRecord>(keepAwakeHandoffPath(project)).catch(() => undefined);
    return record?.version === 1 && Array.isArray(record.carriers) ? record : undefined;
}

/**
 * Ends a restart handoff that no replacement will take over (for example a restart cancelled by a deliberate stop).
 * Only the recorded carriers whose identity still matches are ended.
 *
 * @private keep-awake
 */
export async function endKeepAwakeHandoff(project: Project): Promise<boolean> {
    const record = await readHandoff(project);
    if (!record) return false;
    await endCarriers(record.carriers);
    await rm(keepAwakeHandoffPath(project), { force: true });
    return true;
}

/**
 * The newer of two ISO times.
 */
function newest(...times: ReadonlyArray<string | undefined>): string | undefined {
    return times.filter((time): time is string => Boolean(time) && Number.isFinite(Date.parse(time!))).sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}

/**
 * The engine's keep-awake controller. It evaluates the saved preference, the engine lifecycle, the host power source
 * and the host capability, and owns this engine's live OS requests:
 *
 * - an enabled engine in `running` on external power holds protection, also through waits and an empty queue;
 * - an existing request covers `pausing`/`stopping` until the transition completes; completed Pause releases it;
 * - disabling, expiry, loss of external power and force stop revoke it at once, even during a transition;
 * - every change is serialized, and a request confirmed after it was revoked is released again (never kept);
 * - a restart carries held protection to the replacement through bounded carriers.
 *
 * Opening or closing any client has no effect, and notification effects never change it.
 *
 * @private keep-awake
 */
export class KeepAwake {
    private preference: KeepAwakePreference;
    private power: PowerReading & { readonly observedAt?: string } = { source: 'unknown', detail: 'Not read yet.' };
    private capabilities?: { readonly idle: PowerCapability; readonly lid: PowerCapability; readonly at: number };
    private lid?: LidObservation;
    private host: { readonly model?: string; readonly os?: string } = {};
    private readonly holds = new Map<HoldKind, { readonly hold: PowerHold; readonly since: string }>();
    private readonly failures = new Map<HoldKind, { readonly reason: string; readonly until: number }>();
    private queue: Promise<void> = Promise.resolve();
    private queued?: Promise<void>;
    /** Bumped by every revocation: a request confirmed under an older revision is released, never kept. */
    private revision = 0;
    private started = false;
    private ended = false;
    private timer?: NodeJS.Timeout;
    private expiryTimer?: NodeJS.Timeout;
    private lastTick = 0;
    private lastWorkAt?: string;
    private lastWorkSaved = 0;
    private wasWorking = false;
    private lastFacts = '';
    /** The previous engine's handoff, until this engine's own first evaluation settled. */
    private handoff?: HandoffRecord;

    public constructor(private readonly options: KeepAwakeOptions) {
        this.preference = { version: 1, projectRoot: options.project.root, mode: 'off', closedLid: false, updatedAt: new Date(0).toISOString() };
    }

    private now(): number {
        return this.options.now?.() ?? Date.now();
    }

    /**
     * Restores the saved preference and starts evaluating it. The first evaluation runs in the background (it never
     * delays the engine start); a restart handoff ends once it settled.
     */
    public async start(): Promise<void> {
        const { project, env } = this.options;
        this.preference = await readKeepAwakePreference(project.root, env);
        this.lastWorkAt = newest(await readLastWork(project.root, env), this.options.facts().lastResultAt);
        this.handoff = await readHandoff(project);
        if (this.handoff?.from === this.options.instanceId) this.handoff = undefined;
        this.started = true;
        this.lastFacts = this.factsKey(this.options.facts());
        void (async () => {
            this.host = await this.options.adapter.host().catch(() => ({}));
            await this.refresh(true);
            await this.evaluate();
            await this.finishHandoff();
            this.schedule();
        })().catch((error: unknown) => this.options.log(`Keep awake could not start: ${errorMessage(error)}`, 'warning'));
    }

    /** A compact key of the facts whose change requires a re-evaluation. */
    private factsKey(facts: KeepAwakeFacts): string {
        return `${facts.state}|${facts.forced}|${facts.restarting}`;
    }

    /**
     * Follows engine changes: records task/chat activity and re-evaluates on a lifecycle transition (completed Pause
     * and force stop release at once). Cheap enough for every agenda change.
     */
    public observe(): void {
        if (!this.started || this.ended) return;
        const facts = this.options.facts();
        const now = this.now();
        if (facts.working || this.wasWorking) {
            this.lastWorkAt = new Date(now).toISOString();
            if (!facts.working || now - this.lastWorkSaved > WORK_SAVE_MS) {
                this.lastWorkSaved = now;
                void recordLastWork(this.options.project.root, this.lastWorkAt, this.options.env).catch(() => undefined);
            }
        }
        if (facts.working !== this.wasWorking) this.options.onChange();
        this.wasWorking = facts.working;
        const key = this.factsKey(facts);
        if (key === this.lastFacts) return;
        this.lastFacts = key;
        this.revokeNow(facts);
        void this.evaluate();
    }

    /** Whether the saved choice is in effect now. */
    private get enabled(): boolean {
        return effectiveKeepAwakeMode(this.preference, this.now()) !== 'off';
    }

    /**
     * Whether this engine should hold a kind of protection now, or why not.
     */
    private want(kind: HoldKind, facts: KeepAwakeFacts): true | KeepAwakeReason {
        if (this.ended) return { code: 'stopped', text: 'The engine stopped; it holds no request.' };
        if (!this.enabled) return { code: 'off', text: this.preference.mode === 'limited' ? 'The two-hour session ended; keep awake is off.' : 'Keep awake is off; the OS power policy applies.' };
        if (kind === 'lid' && !this.preference.closedLid) return { code: 'not-chosen', text: 'Closed-lid operation is not chosen, so closing the lid follows the OS policy.' };
        if (facts.forced) return { code: 'stopping', text: 'Force stop revoked the request.' };
        const held = this.holds.has(kind);
        switch (facts.state) {
            case 'running':
                break;
            case 'pausing':
                if (!held) return { code: 'pausing', text: 'Pausing: no new request is acquired while the engine settles into pause.' };
                break;
            case 'stopping':
                if (!held) return { code: 'stopping', text: 'Stopping: no new request is acquired.' };
                break;
            case 'pause':
                return { code: 'paused', text: 'Paused: protection is released while the engine is paused and acquired again when it runs.' };
            default:
                if (!(held && facts.restarting)) return { code: 'stopped', text: 'The engine stopped; it holds no request.' };
        }
        if (this.power.source === 'battery') return { code: 'battery', text: `Waiting for external power: the host runs on battery${this.power.detail ? ` (${this.power.detail})` : ''}.` };
        if (this.power.source !== 'external') return { code: 'power-unknown', text: `Waiting for external power: no reliable power reading${this.power.detail ? ` (${this.power.detail})` : ''}.` };
        const capability = this.capabilities?.[kind];
        if (!capability) return { code: 'starting', text: 'Checking what this host supports…' };
        if (capability.state === 'approval') return { code: 'approval', text: capability.reason ?? 'Local approval required.' };
        if (capability.state === 'unavailable') return { code: 'unsupported', text: capability.reason ?? 'Unsupported on this host.' };
        const failure = this.failures.get(kind);
        if (failure && failure.until > this.now()) return { code: 'failed', text: `${failure.reason} Trying again at ${new Date(failure.until).toLocaleTimeString()}.` };
        return true;
    }

    /**
     * Releases at once every held request that is no longer wanted (outside the serialized evaluation, so a slow
     * acquisition elsewhere never delays a revocation).
     */
    private revokeNow(facts: KeepAwakeFacts = this.options.facts()): void {
        for (const kind of [...this.holds.keys()]) {
            const want = this.want(kind, facts);
            if (want !== true) {
                this.revision++;
                void this.release(kind, want.text);
            }
        }
    }

    /**
     * Queues one evaluation (bursts coalesce into the next one that has not started yet).
     */
    private async evaluate(): Promise<void> {
        if (this.queued) return await this.queued;
        const run = this.queue
            .then(async () => {
                this.queued = undefined;
                await this.reconcile();
            })
            .catch((error: unknown) => this.options.log(`Keep awake evaluation failed: ${errorMessage(error)}`, 'warning'));
        this.queued = run;
        this.queue = run;
        return await run;
    }

    /**
     * One serialized evaluation: expire a limited session, release what is no longer wanted and acquire what is.
     */
    private async reconcile(): Promise<void> {
        const now = this.now();
        if (this.preference.mode === 'limited' && effectiveKeepAwakeMode(this.preference, now) === 'off') {
            this.revision++;
            this.preference = await saveKeepAwakePreference(this.options.project.root, { mode: 'off' }, this.options.env, now).catch(() => ({ ...this.preference, mode: 'off' as const, expiresAt: undefined }));
            this.options.log('Keep awake: the two-hour session ended, so protection is released and keep awake is off.');
        }
        const facts = this.options.facts();
        for (const kind of ['idle', 'lid'] as const) {
            const want = this.want(kind, facts);
            const held = this.holds.has(kind);
            if (want !== true && held) await this.release(kind, want.text);
            else if (want === true && !held) await this.acquire(kind);
        }
        this.scheduleExpiry();
        this.options.onChange();
    }

    /**
     * Acquires one request. A revocation or another change while the OS was confirming it wins: the late request is
     * released at once.
     */
    private async acquire(kind: HoldKind): Promise<void> {
        const revision = this.revision;
        let hold: PowerHold;
        try {
            hold = await this.options.adapter.hold(kind, `The Promptbook engine of ${this.options.project.name} keeps working`);
        } catch (error) {
            this.failures.set(kind, { reason: `The ${label(kind)} request failed: ${errorMessage(error)}`, until: this.now() + RETRY_MS });
            this.options.log(`Keep awake: the ${label(kind)} request failed: ${errorMessage(error)}`, 'warning');
            return;
        }
        if (this.revision !== revision || this.want(kind, this.options.facts()) !== true) {
            await hold.release().catch(() => undefined);
            return;
        }
        this.holds.set(kind, { hold, since: new Date(this.now()).toISOString() });
        this.failures.delete(kind);
        this.options.log(`Keep awake: ${label(kind)} protection is active on external power.`);
        void hold.ended.then((reason) => this.lost(kind, hold, reason));
    }

    /** A request ended without being released (its helper exited or was killed). */
    private lost(kind: HoldKind, hold: PowerHold, reason: string): void {
        if (this.holds.get(kind)?.hold !== hold || reason === 'released') return;
        this.holds.delete(kind);
        this.failures.set(kind, { reason: `The ${label(kind)} request ended unexpectedly (${reason}).`, until: this.now() + RETRY_MS / 2 });
        this.options.log(`Keep awake: the ${label(kind)} request ended unexpectedly (${reason}).`, 'warning');
        this.options.onChange();
        void this.evaluate();
    }

    /** Releases one held request. */
    private async release(kind: HoldKind, why: string): Promise<void> {
        const current = this.holds.get(kind);
        if (!current) return;
        this.holds.delete(kind);
        await current.hold.release().catch((error: unknown) => this.options.log(`Keep awake: releasing the ${label(kind)} request failed: ${errorMessage(error)}`, 'warning'));
        this.options.log(`Keep awake: ${label(kind)} protection released. ${why}`);
        this.options.onChange();
    }

    /**
     * Reads the power source (and the lid on hosts with a lid mechanism); capabilities only when due.
     */
    private async refresh(full = false): Promise<void> {
        const { adapter } = this.options;
        const before = this.power.source;
        this.power = { ...(await adapter.readPower().catch((error: unknown): PowerReading => ({ source: 'unknown', detail: errorMessage(error) }))), observedAt: new Date(this.now()).toISOString() };
        if (full || !this.capabilities || this.now() - this.capabilities.at > CAPABILITY_REFRESH_MS) {
            const [idle, lid] = await Promise.all([adapter.idleCapability(), adapter.lidCapability()].map((check) => check.catch((error: unknown): PowerCapability => ({ state: 'unavailable', reason: errorMessage(error) }))));
            this.capabilities = { idle: idle!, lid: lid!, at: this.now() };
        }
        if (this.capabilities.lid.state !== 'unavailable' || this.holds.has('lid')) this.lid = await adapter.observeLid().catch(() => undefined);
        if (before !== this.power.source && this.started && before !== 'unknown') {
            this.options.log(`Keep awake: the host now runs on ${this.power.source === 'external' ? 'external power' : this.power.source === 'battery' ? 'battery' : 'an unknown power source'}.`);
            if (this.power.source !== 'external') this.revokeNow();
        }
    }

    /**
     * Polls the power source: often while enabled or holding, rarely while Off. A tick that arrives much later than
     * planned means the host slept; the policy is evaluated again at once.
     */
    private schedule(): void {
        if (this.ended) return;
        clearTimeout(this.timer);
        const interval = this.enabled || this.holds.size ? this.options.adapter.pollMs : Math.max(this.options.adapter.pollMs, IDLE_POLL_MS);
        this.lastTick = this.now();
        this.timer = setTimeout(() => {
            const late = this.now() - this.lastTick - interval;
            if (late > 60_000) this.options.log(`Keep awake: the host was asleep or suspended for about ${Math.round(late / 60_000)} min; evaluating again.`);
            void this.refresh()
                .then(async () => await this.evaluate())
                .finally(() => this.schedule());
        }, interval);
        this.timer.unref();
    }

    /** Ends a limited session exactly at its saved absolute time. */
    private scheduleExpiry(): void {
        clearTimeout(this.expiryTimer);
        if (this.preference.mode !== 'limited' || this.ended) return;
        const remaining = Date.parse(this.preference.expiresAt ?? '') - this.now();
        if (!Number.isFinite(remaining)) return;
        this.expiryTimer = setTimeout(() => {
            this.revokeNow();
            void this.evaluate();
        }, Math.min(Math.max(0, remaining) + 50, 2 ** 31 - 1));
        this.expiryTimer.unref();
    }

    /**
     * Changes the saved choice (the shared operation of the terminal, browser, desktop app and `ptbk keep-awake`). It
     * can be changed while paused without acquiring anything until the engine runs.
     */
    public async set(change: KeepAwakeChange): Promise<KeepAwakeView> {
        const previous = this.preference;
        this.preference = await saveKeepAwakePreference(this.options.project.root, change, this.options.env, this.now());
        if (!this.enabled || (previous.closedLid && !this.preference.closedLid)) this.revokeNow();
        if (this.started) {
            await this.refresh(change.closedLid === true || change.mode !== undefined);
            await this.evaluate();
            this.schedule();
        }
        const mode = this.preference.mode;
        this.options.log(`Keep awake set to ${mode === 'off' ? 'Off' : mode === 'limited' ? `two hours (until ${new Date(Date.parse(this.preference.expiresAt!)).toLocaleTimeString()})` : 'Always on external power'}${this.preference.closedLid ? ', with closed-lid operation' : ''}.`);
        return this.view();
    }

    /**
     * Ends the previous engine's handoff once this engine's own first evaluation settled (its protection is verified,
     * or it is not eligible, for example because it started paused).
     */
    private async finishHandoff(): Promise<void> {
        const record = this.handoff;
        if (!record) return;
        this.handoff = undefined;
        await endCarriers(record.carriers).catch(() => undefined);
        await rm(keepAwakeHandoffPath(this.options.project), { force: true }).catch(() => undefined);
        const reason = this.want('idle', this.options.facts());
        this.options.log(this.holds.size ? `Keep awake: this engine took over ${[...this.holds.keys()].map(label).join(' and ')} protection, so the restart handoff ended.` : `Keep awake: the restart handoff ended without protection (${reason === true ? 'no request is needed' : reason.text}).`);
        this.options.onChange();
    }

    /**
     * Why held protection could not be carried through a restart now (only closed-lid continuity defers an update:
     * without it, a closed-lid Mac would sleep before the replacement takes over).
     */
    public async handoffProblem(): Promise<string | undefined> {
        if (!this.holds.has('lid')) return undefined;
        return await this.options.adapter.carryProblem([...this.holds.keys()]).catch((error: unknown) => errorMessage(error));
    }

    /**
     * A restart: starts bounded carriers for every held request, then releases this engine's own requests. A carrier
     * that cannot start is reported; the restart itself proceeds.
     */
    public async handOff(): Promise<void> {
        const kinds = [...this.holds.keys()];
        if (kinds.length && !this.ended) {
            try {
                await ensureDirectory(this.options.project.runtime.service);
                const startedAt = new Date(this.now()).toISOString();
                const carriers = await this.options.adapter.carry(kinds, KEEP_AWAKE_HANDOFF_SECONDS, this.options.project.runtime.service);
                const record: HandoffRecord = { version: 1, from: this.options.instanceId, startedAt, until: new Date(this.now() + KEEP_AWAKE_HANDOFF_SECONDS * 1000).toISOString(), carriers };
                await writeJsonAtomic(keepAwakeHandoffPath(this.options.project), record, { mode: 0o600 });
                this.options.log(`Keep awake: carrying ${kinds.map(label).join(' and ')} protection to the replacement engine (for at most ${KEEP_AWAKE_HANDOFF_SECONDS / 60} minutes).`);
            } catch (error) {
                this.options.log(`Keep awake: protection could not be carried to the replacement engine, so the host may sleep during the restart: ${errorMessage(error)}`, 'warning');
            }
        }
        await this.stop({ endHandoff: false });
    }

    /**
     * Ends this engine's ownership: releases every request before the process exits. A stop also ends a handoff this
     * engine had not taken over yet.
     */
    public async stop(options: { readonly endHandoff?: boolean } = {}): Promise<void> {
        this.ended = true;
        this.revision++;
        clearTimeout(this.timer);
        clearTimeout(this.expiryTimer);
        await Promise.all([...this.holds.keys()].map(async (kind) => await this.release(kind, 'The engine is stopping.')));
        if (options.endHandoff !== false && this.handoff) {
            const record = this.handoff;
            this.handoff = undefined;
            await endCarriers(record.carriers).catch(() => undefined);
            await rm(keepAwakeHandoffPath(this.options.project), { force: true }).catch(() => undefined);
        }
        if (this.lastWorkAt) await recordLastWork(this.options.project.root, this.lastWorkAt, this.options.env).catch(() => undefined);
    }

    /**
     * The shared keep-awake view.
     */
    public view(): KeepAwakeView {
        const facts = this.options.facts();
        const mode = effectiveKeepAwakeMode(this.preference, this.now());
        const protection = (kind: HoldKind): KeepAwakeProtectionView => {
            const held = this.holds.get(kind);
            if (held) {
                if (kind === 'lid' && this.lid?.sleepDisabled === false) return { state: 'degraded', reason: { code: 'changed-outside', text: 'The closed-lid setting was turned off outside Promptbook: closing the lid would put the Mac to sleep.' }, since: held.since };
                return {
                    state: 'active',
                    reason: { code: 'active', text: kind === 'idle' ? 'This engine holds an idle-sleep request. The display may still sleep and the session may lock.' : 'This engine keeps the Mac awake with its lid closed.' },
                    since: held.since,
                };
            }
            const want = this.want(kind, facts);
            const reason: KeepAwakeReason = want === true ? { code: 'starting', text: 'Requesting protection from the OS…' } : want;
            if (reason.code === 'unsupported') return { state: 'unavailable', reason };
            if (reason.code === 'failed' || reason.code === 'approval') return { state: kind === 'lid' && reason.code === 'approval' ? 'inactive' : 'degraded', reason };
            return { state: 'inactive', reason };
        };
        const idle = protection('idle');
        const lidProtection = protection('lid');
        const capability = this.capabilities?.lid;
        const lidOs = (text: string): KeepAwakeProtectionView => ({ state: 'os-policy', reason: { code: 'os-policy', text } });
        const lidPolicy =
            this.lid?.sleepsOnClose === false ? 'Closing the lid follows the OS policy; macOS reports that it would not sleep now (for example with an external display).' : this.lid?.sleepsOnClose === true ? 'Closing the lid follows the OS policy: it puts the Mac to sleep.' : 'Closing the lid follows the OS policy.';
        const lid =
            lidProtection.state === 'active' || lidProtection.state === 'degraded'
                ? lidProtection
                : capability?.state === 'unavailable'
                  ? capability.reason?.startsWith('Closing the lid') ? lidOs(capability.reason) : { state: 'unavailable' as const, reason: { code: 'unsupported' as const, text: capability.reason ?? 'Unsupported on this host.' } }
                  : ['off', 'not-chosen'].includes(lidProtection.reason.code)
                    ? lidOs(`${lidProtection.reason.code === 'not-chosen' ? 'Closed-lid operation is not chosen. ' : ''}${lidPolicy}`)
                    : lidProtection;
        return {
            mode,
            ...(mode === 'limited' && this.preference.expiresAt ? { expiresAt: this.preference.expiresAt } : {}),
            closedLid: this.preference.closedLid,
            power: { source: this.power.source, ...(this.power.detail ? { detail: this.power.detail } : {}), ...(this.power.observedAt ? { observedAt: this.power.observedAt } : {}) },
            idle,
            lid: {
                ...lid,
                capability: capability?.state ?? 'unavailable',
                ...(capability?.validation ? { validation: capability.validation } : {}),
                ...(this.lid?.sleepsOnClose !== undefined ? { sleepsOnClose: this.lid.sleepsOnClose } : {}),
            },
            holding: this.holds.size > 0,
            ...(newest(this.lastWorkAt, facts.lastResultAt) ? { lastWorkAt: newest(this.lastWorkAt, facts.lastResultAt) } : {}),
            host: { platform: this.options.adapter.platform, ...this.host },
            ...(this.handoff ? { handoff: { until: this.handoff.until, kinds: this.handoff.carriers.map((carrier) => carrier.kind) } } : {}),
        };
    }
}
