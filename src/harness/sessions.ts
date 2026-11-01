import { runHarness, type HarnessRunResult } from './run.js';
import type { AuthenticationKind, HarnessEvent, HarnessPlugin, HarnessRunRequest, HarnessSessionCapabilities } from './types.js';

/**
 * Observed state of a harness session, from actual adapter evidence. Control mode and engine lifecycle are separate
 * dimensions.
 *
 * @private harness sessions
 */
export type HarnessSessionState = 'opening' | 'idle' | 'working' | 'interrupt-requested' | 'interrupted' | 'waiting' | 'reconnecting' | 'ended' | 'failed' | 'unknown';

/**
 * What a session serves: durable task work or one agent's context in one chat. These are references to the real
 * entities; a session handle is never an AGENT/TASK/CHAT identity.
 *
 * @private harness sessions
 */
export type HarnessSessionWork =
    | { readonly kind: 'task'; readonly task: string; readonly ref: string; readonly source: string; readonly occurrence?: string; readonly run: string; readonly workKind: string }
    | { readonly kind: 'chat'; readonly chat: string }
    | { readonly kind: 'helper'; readonly purpose: string; readonly task?: string; readonly chat?: string };

/**
 * One holder of a session's input: exclusive takeover stops every automatic input to that session until it returns.
 *
 * @private harness sessions
 */
export type HarnessSessionLease = {
    /** Control mode. */
    readonly mode: 'exclusive' | 'shared';
    /** Who holds it (a client identity, never an account). */
    readonly holder: string;
    /** Process of the native client, whose liveness decides whether the lease may lapse. */
    readonly clientPid?: number;
    /** When it was acquired. */
    readonly acquiredAt: string;
    /** It lapses at this time unless renewed or its client is still alive. */
    readonly expiresAt: string;
};

/**
 * One harness session: the harness-owned execution/conversation context, distinct from a process, turn or attempt.
 *
 * @private harness sessions
 */
export type HarnessSessionRecord = {
    /** Stable engine handle (technical, not an entity identity). */
    readonly handle: string;
    /** Logical key this session serves (`task:<run>`, `chat:<chat>:<agent>`). */
    readonly key: string;
    /** Provider-native identifier(s), most recent last. */
    readonly providerIds: readonly string[];
    /** Responsible agent. */
    readonly agent: string;
    /** Task or chat served. */
    readonly work: HarnessSessionWork;
    /** Source revision the session started from, when known. */
    readonly revision?: string;
    /** Named tool instance. */
    readonly tool?: string;
    /** Adapter identifier. */
    readonly harness: string;
    /** Adapter display name. */
    readonly harnessName: string;
    /** Installed harness version, when known. */
    readonly harnessVersion?: string;
    /** Model requested through routing. */
    readonly requestedModel?: string;
    /** Model the provider reported. */
    readonly model?: string;
    /** Requested thinking level. */
    readonly thinkingLevel?: string;
    /** Authentication in use (`unknown` stays explicit). */
    readonly authentication: AuthenticationKind;
    /** The tool's native account context, when it names one. */
    readonly account?: string;
    /** Observed state. */
    readonly state: HarnessSessionState;
    /** Current phase or wait in plain words. */
    readonly detail?: string;
    /** Turns started in this session. */
    readonly turns: number;
    /** When a turn last started. */
    readonly turnStartedAt?: string;
    /** Latest actual observation from the session. */
    readonly observedAt: string;
    /** When the session was opened. */
    readonly openedAt: string;
    /** When it ended. */
    readonly endedAt?: string;
    /** Why it ended. */
    readonly endReason?: string;
    /** Outcome of the latest turn as the harness reported it. */
    readonly lastOutcome?: string;
    /** Bounded tail of actual normalized events (never hidden reasoning, never the prompt). */
    readonly output: readonly string[];
    /** Provider-reported usage of the latest turn (absent: unknown, not zero). */
    readonly usage?: Readonly<Record<string, number>>;
    /** Provider-reported cost of the latest turn (absent: unknown, not zero). */
    readonly costUsd?: number;
    /** The session this one replaced. */
    readonly predecessor?: { readonly handle: string; readonly reason: string };
    /** Input holder other than the engine. */
    readonly lease?: HarnessSessionLease;
    /** Automatic inputs held back by a lease or lifecycle, in plain words. */
    readonly heldInputs?: readonly string[];
    /** Capabilities observed for the installed release. */
    readonly capabilities?: HarnessSessionCapabilities;
    /** The verified way back from the native client. */
    readonly nativeReturn?: string;
};

/**
 * What the Harnesses page, the status view and the API receive.
 *
 * @private harness sessions
 */
export type HarnessSessionsView = {
    /** Every open session, including idle ones, oldest first. */
    readonly open: readonly HarnessSessionRecord[];
    /** Retained evidence of ended sessions, newest first (never live). */
    readonly ended: readonly HarnessSessionRecord[];
    /** Open sessions by state group. */
    readonly counts: { readonly open: number; readonly working: number; readonly idle: number; readonly waiting: number; readonly attention: number };
};

/**
 * What entering one session can offer now. Do not enter and the common view always exist.
 *
 * @private harness sessions
 */
export type SessionEntryView =
    | { readonly available: false; readonly reason: string }
    | {
          readonly available: true;
          /** Watch only: the client cannot enforce read-only input, so it means the common read-only event view. */
          readonly watch: { readonly native: boolean; readonly reason?: string };
          /** Exclusive takeover. */
          readonly exclusive: { readonly available: boolean; readonly reason?: string };
          /** Shared control. */
          readonly shared: { readonly available: boolean; readonly reason?: string };
          /** The verified way back and its effect, shown before entry. */
          readonly returnHint: string;
      };

/**
 * The actual provider client a local terminal hands over to.
 *
 * @private harness sessions
 */
export type SessionClientLaunch = {
    /** Executable. */
    readonly command: string;
    /** Arguments naming this very session. */
    readonly args: readonly string[];
    /** Working directory of the session. */
    readonly cwd: string;
    /** Account context of the session's named tool (never a credential). */
    readonly env: Readonly<Record<string, string>>;
    /** The verified way back. */
    readonly returnHint: string;
};

/**
 * Describes the session a harness call runs in.
 *
 * @private harness sessions
 */
export type HarnessSessionDescriptor = {
    /** Logical key: the same key continues the same session. */
    readonly key: string;
    /** Responsible agent. */
    readonly agent: string;
    /** Task or chat served. */
    readonly work: HarnessSessionWork;
    /** Source revision, when known. */
    readonly revision?: string;
    /** Named tool. */
    readonly tool?: string;
    /** Adapter. */
    readonly plugin: HarnessPlugin;
    /** Installed version. */
    readonly harnessVersion?: string;
    /** Requested model. */
    readonly model?: string;
    /** Requested thinking level. */
    readonly thinkingLevel?: string;
    /** Authentication in use. */
    readonly authentication: AuthenticationKind;
    /** The tool's native account context. */
    readonly account?: string;
    /** A helper session ends with its one turn (a consultation, a routing decision, a composed brief). */
    readonly ephemeral?: boolean;
    /** Removes secrets from observed text. */
    readonly redact?: (text: string) => string;
};

/**
 * Lines kept of a session's event tail.
 */
const OUTPUT_TAIL = 24;

/**
 * Longest kept line of a session's event tail.
 */
const OUTPUT_LINE = 240;

/**
 * Ended sessions kept as evidence.
 */
const ENDED_RETAINED = 100;

/**
 * An idle session unused for this long is closed (its provider context stays with the provider).
 */
const IDLE_RETENTION_MS = 14 * 24 * 60 * 60_000;

/**
 * How long a lease survives without a renewal when its client cannot be observed.
 *
 * @private harness sessions
 */
export const LEASE_TTL_MS = 30_000;

/**
 * Whether a process is alive.
 */
function processAlive(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return (error as NodeJS.ErrnoException).code === 'EPERM';
    }
}

/**
 * Whether a session state is open (ended and failed evidence is retained separately only once closed).
 *
 * @private harness sessions
 */
export function isOpenSession(record: Pick<HarnessSessionRecord, 'endedAt'>): boolean {
    return !record.endedAt;
}

/**
 * The inventory of harness sessions of one engine, persisted so identity, ownership, interrupted turns and leases
 * survive a restart. A restored session is retained context, never permission to continue.
 *
 * @private harness sessions
 */
export class HarnessSessions {
    private readonly records = new Map<string, HarnessSessionRecord>();
    private readonly keys = new Map<string, string>();
    private readonly ended: HarnessSessionRecord[] = [];
    private readonly ephemeral = new Set<string>();
    private readonly redactors = new Map<string, (text: string) => string>();
    private readonly leaseWaiters = new Map<string, Array<() => void>>();
    private sequence = 0;
    private saveTimer?: NodeJS.Timeout;

    public constructor(private readonly options: { readonly save: (records: readonly HarnessSessionRecord[]) => Promise<void>; readonly changed?: () => void; readonly log?: (message: string, level?: 'info' | 'warning') => void }) {}

    /**
     * Restores persisted sessions. A turn that was running when the engine stopped has an uncertain outcome: it is
     * never continued or repeated from here; a lease is kept only while its client is verifiably alive.
     */
    public restore(records: readonly HarnessSessionRecord[]): void {
        for (const stored of records) {
            let record = stored;
            if (record.endedAt) {
                this.ended.push(record);
                continue;
            }
            if (record.state === 'working' || record.state === 'opening' || record.state === 'interrupt-requested' || record.state === 'reconnecting') {
                record = { ...record, state: 'interrupted', detail: 'The engine stopped while a turn ran here: its outcome is uncertain and it is not repeated automatically.' };
            }
            if (record.lease && !(record.lease.clientPid && processAlive(record.lease.clientPid))) {
                this.options.log?.(`Control of the session of ${record.agent} returned to Promptbook: its client is gone.`, 'warning');
                record = { ...record, lease: undefined };
            }
            this.records.set(record.handle, record);
            this.keys.set(record.key, record.handle);
        }
        this.ended.sort((first, second) => (second.endedAt ?? '').localeCompare(first.endedAt ?? ''));
        this.ended.splice(ENDED_RETAINED);
        this.sequence = records.length;
    }

    /** The open session serving this key. */
    public byKey(key: string): HarnessSessionRecord | undefined {
        const handle = this.keys.get(key);
        return handle ? this.records.get(handle) : undefined;
    }

    /** Any retained session by its handle (open first). */
    public byHandle(handle: string): HarnessSessionRecord | undefined {
        return this.records.get(handle) ?? this.ended.find((record) => record.handle === handle);
    }

    /**
     * Opens the session of this key, or returns the open one. A different named tool cannot continue a session (no
     * silent account or billing change): it is a real replacement, recorded with its predecessor and reason.
     */
    public open(descriptor: HarnessSessionDescriptor): HarnessSessionRecord {
        const current = this.byKey(descriptor.key);
        if (descriptor.ephemeral) this.ephemeral.add(descriptor.key);
        if (descriptor.redact) this.redactors.set(descriptor.key, descriptor.redact);
        if (current && (current.tool === descriptor.tool || !descriptor.tool) && current.harness === descriptor.plugin.id) {
            return this.update(current.handle, { requestedModel: descriptor.model, thinkingLevel: descriptor.thinkingLevel, harnessVersion: descriptor.harnessVersion ?? current.harnessVersion, revision: descriptor.revision ?? current.revision });
        }
        const replaced = current ? this.close(descriptor.key, `Replaced: work continues with the tool ${descriptor.tool ?? descriptor.plugin.displayName}.`) : undefined;
        const at = new Date().toISOString();
        const record: HarnessSessionRecord = {
            handle: `hs-${Date.now().toString(36)}-${(this.sequence++).toString(36)}`,
            key: descriptor.key,
            providerIds: [],
            agent: descriptor.agent,
            work: descriptor.work,
            revision: descriptor.revision,
            tool: descriptor.tool,
            harness: descriptor.plugin.id,
            harnessName: descriptor.plugin.displayName,
            harnessVersion: descriptor.harnessVersion,
            requestedModel: descriptor.model,
            thinkingLevel: descriptor.thinkingLevel,
            authentication: descriptor.authentication,
            account: descriptor.account,
            state: 'opening',
            turns: 0,
            observedAt: at,
            openedAt: at,
            output: [],
            nativeReturn: descriptor.plugin.sessions?.nativeReturn,
            ...(replaced ? { predecessor: { handle: replaced.handle, reason: replaced.endReason ?? 'replaced' } } : {}),
        };
        this.records.set(record.handle, record);
        this.keys.set(record.key, record.handle);
        this.changed(true);
        return record;
    }

    /** Records capabilities observed for the installed release. */
    public capabilities(key: string, capabilities: HarnessSessionCapabilities): void {
        const current = this.byKey(key);
        if (current) this.update(current.handle, { capabilities });
    }

    /** A turn starts: the input was accepted for delivery. */
    public turnStarted(key: string, detail?: string): void {
        const current = this.byKey(key);
        if (current) this.update(current.handle, { state: 'working', detail, turns: current.turns + 1, turnStartedAt: new Date().toISOString(), usage: undefined, costUsd: undefined }, true);
    }

    /** One actual event of the running turn. */
    public observe(key: string, event: HarnessEvent): void {
        const current = this.byKey(key);
        if (!current) return;
        const redact = this.redactors.get(key) ?? ((text: string) => text);
        const line = (text: string): string[] => {
            const flat = redact(text).replace(/\s+/g, ' ').trim();
            return flat ? [...current.output, flat.length > OUTPUT_LINE ? `${flat.slice(0, OUTPUT_LINE - 1)}…` : flat].slice(-OUTPUT_TAIL) : [...current.output];
        };
        switch (event.type) {
            case 'session':
                if (!current.providerIds.includes(event.id)) this.update(current.handle, { providerIds: [...current.providerIds, event.id].slice(-8) }, true);
                return;
            case 'model':
                this.update(current.handle, { model: event.model });
                return;
            case 'message':
            case 'activity':
            case 'error':
            case 'turn-failed':
                this.update(current.handle, { output: line(event.text), state: current.state === 'opening' ? 'working' : current.state });
                return;
            case 'files':
                this.update(current.handle, { output: line(`Changed ${event.paths.join(', ')}`) });
                return;
            default:
                // Hidden reasoning is never captured; usage is taken from the finished turn so it is never counted twice.
                this.update(current.handle, {});
        }
    }

    /** The turn asked to stop at its nearest supported boundary. */
    public interruptRequested(key: string, detail: string): void {
        const current = this.byKey(key);
        if (current?.state === 'working' || current?.state === 'opening') this.update(current.handle, { state: 'interrupt-requested', detail }, true);
    }

    /** The turn finished with this adapter outcome. A finished turn does not end its session. */
    public turnEnded(key: string, result: Pick<HarnessRunResult, 'outcome' | 'diagnostic' | 'usage' | 'costUsd' | 'model'>): void {
        const current = this.byKey(key);
        if (!current) return;
        const state: HarnessSessionState = result.outcome === 'completed' ? 'idle' : result.outcome === 'cancelled' ? 'interrupted' : result.outcome === 'quota' || result.outcome === 'authentication' ? 'waiting' : 'failed';
        const next = this.update(current.handle, { state, detail: result.outcome === 'completed' ? undefined : result.diagnostic, lastOutcome: result.outcome, usage: result.usage, costUsd: result.costUsd, model: result.model ?? current.model }, true);
        if (this.ephemeral.has(key)) this.close(key, result.outcome === 'completed' ? 'Its one turn finished.' : result.diagnostic, next.state === 'failed');
    }

    /** The session waits (for the user, a resource or a lifecycle decision). */
    public waiting(key: string, detail: string, state: Extract<HarnessSessionState, 'waiting' | 'interrupted' | 'reconnecting'> = 'waiting'): void {
        const current = this.byKey(key);
        if (current) this.update(current.handle, { state, detail }, true);
    }

    /** Ends a session: its evidence is retained, never shown as live. */
    public close(key: string, reason: string, failed = false): HarnessSessionRecord | undefined {
        const current = this.byKey(key);
        if (!current) return undefined;
        this.records.delete(current.handle);
        this.keys.delete(key);
        this.ephemeral.delete(key);
        this.redactors.delete(key);
        const at = new Date().toISOString();
        const ended: HarnessSessionRecord = { ...current, state: failed ? 'failed' : 'ended', endedAt: at, endReason: reason, observedAt: at, lease: undefined };
        this.ended.unshift(ended);
        this.ended.splice(ENDED_RETAINED);
        this.releaseWaiters(key);
        this.changed(true);
        return ended;
    }

    /** Provider session a next input may continue: the same tool only, and only with a verified continuation. */
    public continuable(key: string, tool: string | undefined): string | undefined {
        const current = this.byKey(key);
        if (!current || current.tool !== tool || current.capabilities?.continueInput !== true) return undefined;
        return current.providerIds[current.providerIds.length - 1];
    }

    /** Whether automatic input may reach this session now. */
    public automaticInputAllowed(key: string): boolean {
        return !this.byKey(key)?.lease;
    }

    /** Waits until automatic input may reach this session, showing what is held back. */
    public async untilAutomaticInput(key: string, held: string, signal: AbortSignal): Promise<void> {
        const current = this.byKey(key);
        if (!current?.lease) return;
        this.update(current.handle, { heldInputs: [...(current.heldInputs ?? []), held].slice(-8) }, true);
        await new Promise<void>((resolve) => {
            const done = (): void => {
                signal.removeEventListener('abort', done);
                resolve();
            };
            signal.addEventListener('abort', done, { once: true });
            this.leaseWaiters.set(key, [...(this.leaseWaiters.get(key) ?? []), done]);
        });
        const after = this.byKey(key);
        if (after) this.update(after.handle, { heldInputs: after.heldInputs?.filter((input) => input !== held) }, true);
    }

    /**
     * Acquires control of one session. A second controller cannot take it; a running turn cannot be joined through the
     * current integrations; revalidating at confirmation is the caller's reason to pass what it last saw.
     */
    public acquireLease(handle: string, request: { readonly holder: string; readonly clientPid?: number; readonly mode: 'exclusive' | 'shared' }): { readonly ok: true; readonly session: HarnessSessionRecord } | { readonly ok: false; readonly reason: string } {
        const current = this.records.get(handle);
        if (!current) return { ok: false, reason: 'This session is no longer open.' };
        if (current.lease) return { ok: false, reason: `${current.lease.holder === request.holder ? 'You already hold' : 'Another client holds'} control of this session since ${current.lease.acquiredAt}; control cannot be taken over silently.` };
        if (current.state === 'working' || current.state === 'opening' || current.state === 'interrupt-requested') return { ok: false, reason: 'A turn is running in this session and its transport cannot be joined; enter once it reached its boundary.' };
        if (request.mode === 'shared' && !current.capabilities?.sharedControl) return { ok: false, reason: 'Shared control is unavailable: this integration cannot serialize human and Promptbook inputs in one session.' };
        const at = Date.now();
        const lease: HarnessSessionLease = { mode: request.mode, holder: request.holder, ...(request.clientPid ? { clientPid: request.clientPid } : {}), acquiredAt: new Date(at).toISOString(), expiresAt: new Date(at + LEASE_TTL_MS).toISOString() };
        return { ok: true, session: this.update(handle, { lease }, true) };
    }

    /** Extends a lease; a client whose lease lapsed has lost it and learns so here. */
    public renewLease(handle: string, holder: string, clientPid?: number): boolean {
        const current = this.records.get(handle);
        if (current?.lease?.holder !== holder) return false;
        this.update(handle, { lease: { ...current.lease, ...(clientPid ? { clientPid } : {}), expiresAt: new Date(Date.now() + LEASE_TTL_MS).toISOString() } }, true);
        return true;
    }

    /** Returns control to Promptbook; held inputs are re-evaluated by their owners, never replayed from here. */
    public releaseLease(handle: string, holder: string, detail?: string): boolean {
        const current = this.records.get(handle);
        if (current?.lease?.holder !== holder) return false;
        this.update(handle, { lease: undefined, ...(detail ? { detail } : {}), observedAt: new Date().toISOString() }, true);
        this.releaseWaiters(current.key);
        return true;
    }

    /** Lapses leases whose client neither renewed nor is alive; also closes long-unused idle sessions. */
    public reconcile(now = Date.now()): void {
        for (const record of [...this.records.values()]) {
            if (record.lease && Date.parse(record.lease.expiresAt) <= now && !(record.lease.clientPid && processAlive(record.lease.clientPid))) {
                this.options.log?.(`Control of the session of ${record.agent} returned to Promptbook: its client stopped answering.`, 'warning');
                this.update(record.handle, { lease: undefined, detail: 'Control returned to Promptbook after its client stopped answering.' }, true);
                this.releaseWaiters(record.key);
            }
            if (record.state === 'idle' && !record.lease && now - Date.parse(record.observedAt) > IDLE_RETENTION_MS) this.close(record.key, 'Unused for two weeks.');
        }
    }

    /** The inventory for clients. */
    public view(): HarnessSessionsView {
        const open = [...this.records.values()].sort((first, second) => first.openedAt.localeCompare(second.openedAt));
        const waiting = open.filter((record) => record.state === 'waiting' || record.state === 'interrupted' || record.state === 'reconnecting').length;
        return {
            open,
            ended: this.ended.slice(0, ENDED_RETAINED),
            counts: {
                open: open.length,
                working: open.filter((record) => record.state === 'working' || record.state === 'opening' || record.state === 'interrupt-requested').length,
                idle: open.filter((record) => record.state === 'idle').length,
                waiting,
                attention: open.filter((record) => record.state === 'failed' || record.state === 'unknown').length,
            },
        };
    }

    /** Writes pending changes now (on stop). */
    public async flush(): Promise<void> {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = undefined;
        await this.options.save([...this.records.values(), ...this.ended]).catch(() => undefined);
    }

    private update(handle: string, changes: Partial<HarnessSessionRecord>, important = false): HarnessSessionRecord {
        const current = this.records.get(handle)!;
        const next: HarnessSessionRecord = { ...current, observedAt: new Date().toISOString(), ...changes };
        this.records.set(handle, next);
        this.changed(important);
        return next;
    }

    private releaseWaiters(key: string): void {
        for (const waiter of this.leaseWaiters.get(key) ?? []) waiter();
        this.leaseWaiters.delete(key);
    }

    private changed(important: boolean): void {
        this.options.changed?.();
        if (important && this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = undefined;
        }
        if (this.saveTimer) return;
        this.saveTimer = setTimeout(
            () => {
                this.saveTimer = undefined;
                void this.options.save([...this.records.values(), ...this.ended]).catch(() => undefined);
            },
            important ? 0 : 1_000,
        );
        this.saveTimer.unref?.();
    }
}

/**
 * Runs one harness turn inside its session: the session is opened or continued, every actual event is observed and the
 * outcome recorded. Without an inventory (a project command outside the engine) it is a plain harness run.
 *
 * @private harness sessions
 */
export async function runHarnessInSession(sessions: HarnessSessions | undefined, descriptor: Omit<HarnessSessionDescriptor, 'plugin'>, plugin: HarnessPlugin, request: HarnessRunRequest, executable: string, options: { readonly detail?: string; readonly continueSession?: boolean } = {}): Promise<HarnessRunResult> {
    if (!sessions) return await runHarness(plugin, request, executable);
    sessions.open({ ...descriptor, plugin });
    const capabilities = await plugin.sessions?.capabilities({ projectRoot: request.projectRoot, env: request.env, ...(request.signal ? { signal: request.signal } : {}) }).catch(() => undefined);
    if (capabilities) sessions.capabilities(descriptor.key, capabilities);
    const resumeSessionId = options.continueSession ? sessions.continuable(descriptor.key, descriptor.tool) : undefined;
    sessions.turnStarted(descriptor.key, options.detail);
    const onInterrupt = (): void => sessions.interruptRequested(descriptor.key, 'Asked to stop at its nearest safe point.');
    request.interruptSignal?.addEventListener('abort', onInterrupt, { once: true });
    try {
        const result = await runHarness(
            plugin,
            {
                ...request,
                ...(resumeSessionId ? { resumeSessionId } : {}),
                onEvent: (event) => {
                    sessions.observe(descriptor.key, event);
                    request.onEvent?.(event);
                },
            },
            executable,
        );
        sessions.turnEnded(descriptor.key, result);
        return result;
    } catch (error) {
        sessions.turnEnded(descriptor.key, { outcome: 'failed', diagnostic: error instanceof Error ? error.message : String(error) });
        throw error;
    } finally {
        request.interruptSignal?.removeEventListener('abort', onInterrupt);
    }
}
