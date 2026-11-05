import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { errorMessage } from '../common/errors.js';
import { ensureDirectory, readJsonIfExists, writeJsonAtomic } from '../common/fs.js';
import type { ChatStore, OutstandingRequest } from '../chats/store.js';
import { nextProgressiveWait, restoreProgressiveWait, WAITING_POLICIES, type ProgressiveSchedule, type WaitingPolicy } from './progressive-waiting.js';

/**
 * Name of the core agent responsible for system-originated and orphaned human attention.
 *
 * @private attention ownership
 */
export const SYSTEM_ATTENTION_OWNER = 'Fixer';

/**
 * State of the relevance supervision of one outstanding request, as every client shows it.
 *
 * - `scheduled`: the next check waits for its time (or relevant evidence)
 * - `checking`: a check runs now
 * - `paused`: a check is due but automatic agent checks wait for Resume
 * - `unavailable`: the responsible agent cannot run (no usable harness); the wait stays honest
 *
 * @private attention ownership
 */
export type RelevanceCheckState = 'scheduled' | 'checking' | 'paused' | 'unavailable';

/**
 * Persisted relevance supervision of one outstanding request.
 *
 * @private attention ownership
 */
export type RelevanceCheck = {
    /** Responsible agent at the last check. */
    readonly owner: string;
    /** Shared progressive-waiting schedule. */
    readonly schedule: ProgressiveSchedule;
    /** Current state. */
    readonly state: RelevanceCheckState;
    /** When the last check ran (ISO). */
    readonly lastCheckAt?: string;
    /** Its outcome (`still needed`, `no new evidence`, the unavailable reason, …). */
    readonly lastOutcome?: string;
    /** Fingerprint of the evidence the last paid assessment saw (unchanged evidence needs no new inference). */
    readonly assessedEvidence?: string;
};

/**
 * Shared, per-request view of relevance supervision (responsible agent, last/next check and state).
 *
 * @private attention ownership
 */
export type RelevanceCheckView = Pick<RelevanceCheck, 'owner' | 'state' | 'lastCheckAt' | 'lastOutcome'> & {
    /** Next check opportunity (ISO). */
    readonly nextAt: string;
};

/**
 * Verdict of a paid relevance assessment about one request.
 *
 * @private attention ownership
 */
export type RelevanceVerdict = { readonly id: string; readonly needed: boolean; readonly reason?: string };

/**
 * Engine services relevance supervision uses.
 *
 * @private attention ownership
 */
export type AttentionOwnerHost = {
    /** Durable chats with their shared attention state. */
    readonly chats: ChatStore;
    /** Project runtime state directory (the schedules live in `attention-checks.json`). */
    readonly stateDirectory: string;
    /** Whether automatic agent work may run now (false while pausing, paused, stopping or in maintenance). */
    readonly agentsAllowed: () => boolean;
    /** Whether a name is a usable project agent (an owner that disappeared transfers to Fixer). */
    readonly agentExists: (name: string) => boolean;
    /**
     * Deterministic domain verification without a model: the reason when the request is provably obsolete (its task is
     * finished, cancelled or gone, its Wallet login was verified, …), otherwise undefined.
     */
    readonly obsolete: (request: OutstandingRequest) => Promise<string | undefined>;
    /** Fingerprint of the evidence relevant to a request (its chat, linked work and project revision). */
    readonly evidence: (request: OutstandingRequest) => Promise<string>;
    /**
     * Bounded paid assessment by the responsible agent of several of its related requests at once (read-only, usage
     * attributed to that agent). Returns verdicts, or why the agent cannot assess now.
     */
    readonly assess: (owner: string, requests: readonly OutstandingRequest[]) => Promise<{ readonly verdicts: readonly RelevanceVerdict[] } | { readonly unavailable: string }>;
    /** Requests were withdrawn: refresh views and let waiting work continue when otherwise eligible. */
    readonly onWithdrawn: (chat: string) => Promise<void>;
    readonly onChange: () => void;
    readonly log: (text: string, level?: 'info' | 'warning') => void;
    /** Timing of relevance checks (the shared attention policy unless a fixture overrides its first delay). */
    readonly policy?: WaitingPolicy;
};

/**
 * Format of the persisted schedules.
 */
type ChecksFile = { readonly version: 1; readonly checks: Readonly<Record<string, RelevanceCheck>> };

/**
 * Supervision of outstanding human attention by its responsible agent ([attention ownership](specs/cli/notifications.md)):
 * every outstanding request has an owner (its author, or Fixer for orphaned requests), deterministic domain checks
 * retire provably obsolete requests at once (also during Pause, without a model), and the owner's progressive
 * relevance checks (about a minute first, up to a week) may include a bounded paid assessment when evidence changed.
 * Rechecking is not reminding: nothing re-pings, re-alerts or resets seen state. Automatic agent checks wait during
 * Pause; at Resume at most the one useful due check runs.
 *
 * @private attention ownership
 */
export class AttentionOwner {
    private checks = new Map<string, RelevanceCheck>();
    /** The reconciliation in progress; a request meanwhile runs once more afterwards (coalesced). */
    private running?: Promise<void>;
    private again = false;
    private readonly file: string;
    private timer?: NodeJS.Timeout;
    private loaded = false;
    private stopped = false;
    /** Owners with an assessment in flight (at most one per owner). */
    private readonly assessing = new Set<string>();

    public constructor(private readonly host: AttentionOwnerHost) {
        this.file = join(host.stateDirectory, 'attention-checks.json');
    }

    /** Timing of the relevance checks. */
    private get policy(): WaitingPolicy {
        return this.host.policy ?? WAITING_POLICIES.attention;
    }

    /** Current relevance supervision of a request (undefined while it is not outstanding). */
    public view(id: string): RelevanceCheckView | undefined {
        const check = this.checks.get(id);
        return check ? { owner: check.owner, state: check.state, nextAt: check.schedule.nextAt, ...(check.lastCheckAt ? { lastCheckAt: check.lastCheckAt } : {}), ...(check.lastOutcome ? { lastOutcome: check.lastOutcome } : {}) } : undefined;
    }

    /** Every supervised request's view by id. */
    public views(): Record<string, RelevanceCheckView> {
        return Object.fromEntries([...this.checks.keys()].map((id) => [id, this.view(id)!]));
    }

    /** Stops scheduling (schedules stay persisted for the next start). */
    public stop(): void {
        this.stopped = true;
        clearTimeout(this.timer);
        this.timer = undefined;
    }

    /**
     * Reconciles supervision with the current requests: completes interrupted withdrawals, transfers orphaned
     * requests to Fixer, retires provably obsolete requests deterministically, drops schedules of requests no longer
     * outstanding and runs due owner checks when lifecycle permits. Called after chat changes, relevant domain events
     * and on its own timer; overlapping calls coalesce.
     */
    public async reconcile(): Promise<void> {
        if (this.stopped) return;
        if (this.running) {
            this.again = true;
            return await this.running;
        }
        this.running = (async () => {
            do {
                this.again = false;
                await this.reconcileOnce().catch((error: unknown) => this.host.log(`Attention supervision failed: ${errorMessage(error)}`, 'warning'));
            } while (this.again && !this.stopped);
        })().finally(() => {
            this.running = undefined;
        });
        return await this.running;
    }

    /** One reconciliation pass. */
    private async reconcileOnce(): Promise<void> {
        {
            if (!this.loaded) await this.load();
            await this.host.chats.reconcileWithdrawals().catch((error: unknown) => this.host.log(`Completing a withdrawn request failed: ${errorMessage(error)}`, 'warning'));
            const requests = await this.host.chats.outstandingRequests();
            const now = Date.now();
            const live = new Set(requests.map((request) => request.id));
            let changed = false;
            for (const id of [...this.checks.keys()]) {
                if (live.has(id)) continue;
                // A retired condition cancels its scheduled checks; an in-flight result for it is ignored later.
                this.checks.delete(id);
                changed = true;
            }
            const due: OutstandingRequest[] = [];
            for (const request of requests) {
                // Orphaned requests move to Fixer durably; ordinary temporary waits never transfer ownership.
                let owner = request.owner;
                if (owner !== SYSTEM_ATTENTION_OWNER && !this.host.agentExists(owner)) {
                    await this.host.chats.attention.transfer(request.id, SYSTEM_ATTENTION_OWNER);
                    this.host.log(`${owner} no longer exists, so ${SYSTEM_ATTENTION_OWNER} is now responsible for the request in {${request.chat}}.`);
                    owner = SYSTEM_ATTENTION_OWNER;
                }
                // Deterministic domain truth first: no model, allowed during Pause.
                const obsolete = await this.host.obsolete(request).catch(() => undefined);
                if (obsolete) {
                    await this.withdraw({ ...request, owner }, obsolete);
                    changed = true;
                    continue;
                }
                let check = this.checks.get(request.id);
                if (!check) {
                    // The owner judged the request necessary when asking: that evidence is the baseline, so the first
                    // check pays for inference only when something relevant changed since.
                    const baseline = await this.host.evidence({ ...request, owner }).catch(() => undefined);
                    check = { owner, state: 'scheduled', schedule: nextProgressiveWait(undefined, { cause: 'Asked the user', conditions: request.id }, this.policy, now), ...(baseline !== undefined ? { assessedEvidence: baseline } : {}) };
                    changed = true;
                } else if (check.owner !== owner) {
                    check = { ...check, owner };
                    changed = true;
                }
                this.checks.set(request.id, check);
                if (Date.parse(check.schedule.nextAt) > now) continue;
                if (!this.host.agentsAllowed()) {
                    // Automatic agent checks wait for Resume; evidence is coalesced and backoff kept.
                    if (check.state !== 'paused') {
                        this.checks.set(request.id, { ...check, state: 'paused' });
                        changed = true;
                    }
                    continue;
                }
                due.push({ ...request, owner });
            }
            if (changed) await this.save();
            if (due.length) await this.runDue(due);
            this.arm();
            this.host.onChange();
        }
    }

    /** Runs the due checks, coalesced per owner (one assessment for an owner's related requests). */
    private async runDue(due: readonly OutstandingRequest[]): Promise<void> {
        const byOwner = new Map<string, OutstandingRequest[]>();
        for (const request of due) byOwner.set(request.owner, [...(byOwner.get(request.owner) ?? []), request]);
        for (const [owner, requests] of byOwner) {
            if (this.assessing.has(owner)) continue;
            const now = new Date().toISOString();
            const fresh: OutstandingRequest[] = [];
            const evidence = new Map<string, string>();
            for (const request of requests) {
                const fingerprint = await this.host.evidence(request).catch(() => '');
                evidence.set(request.id, fingerprint);
                const check = this.checks.get(request.id)!;
                // Unchanged evidence since the last assessment: no idle inference, the wait simply backs off.
                if (check.assessedEvidence !== undefined && check.assessedEvidence === fingerprint) this.advance(request.id, 'No new evidence; still waiting.', now);
                else fresh.push(request);
            }
            if (!fresh.length) continue;
            for (const request of fresh) this.checks.set(request.id, { ...this.checks.get(request.id)!, state: 'checking' });
            this.host.onChange();
            this.assessing.add(owner);
            let result: Awaited<ReturnType<AttentionOwnerHost['assess']>>;
            try {
                result = await this.host.assess(owner, fresh);
            } catch (error) {
                result = { unavailable: errorMessage(error) };
            } finally {
                this.assessing.delete(owner);
            }
            if ('unavailable' in result) {
                // An honest pending check: the wait stays and backs off; nothing is fabricated.
                for (const request of fresh) this.advance(request.id, result.unavailable, now, 'unavailable');
                continue;
            }
            const current = new Set((await this.host.chats.outstandingRequests()).map((request) => request.id));
            for (const request of fresh) {
                // A result for a request that resolved meanwhile is obsolete and ignored.
                if (!current.has(request.id)) continue;
                const verdict = result.verdicts.find((candidate) => candidate.id === request.id);
                if (verdict && !verdict.needed && verdict.reason?.trim()) {
                    await this.withdraw(request, verdict.reason.trim());
                    continue;
                }
                this.advance(request.id, verdict?.reason?.trim() ? `Still needed: ${verdict.reason.trim()}` : 'Still needed.', now, 'scheduled', evidence.get(request.id));
            }
        }
        await this.save();
    }

    /** Schedules the next, longer round of one request after a check. */
    private advance(id: string, outcome: string, at: string, state: RelevanceCheckState = 'scheduled', assessedEvidence?: string): void {
        const check = this.checks.get(id);
        if (!check) return;
        this.checks.set(id, {
            ...check,
            state,
            lastCheckAt: at,
            lastOutcome: outcome,
            schedule: nextProgressiveWait(check.schedule, { cause: outcome, conditions: id }, this.policy),
            ...(assessedEvidence !== undefined ? { assessedEvidence } : {}),
        });
    }

    /** Withdraws one request through the shared chat operation (the owner appends its explanation once). */
    private async withdraw(request: OutstandingRequest, reason: string): Promise<void> {
        try {
            const written = await this.host.chats.withdrawRequests(request.chat, { messages: [request.message], by: request.owner, reason });
            this.checks.delete(request.id);
            if (written.withdrawn.length) {
                this.host.log(`${request.owner} withdrew the request in {${request.chat}}: ${reason}`);
                await this.host.onWithdrawn(request.chat).catch(() => undefined);
            }
        } catch (error) {
            this.host.log(`Withdrawing the request in {${request.chat}} failed: ${errorMessage(error)}`, 'warning');
        }
    }

    /** Arms the timer for the earliest scheduled check (none while nothing is outstanding). */
    private arm(): void {
        clearTimeout(this.timer);
        this.timer = undefined;
        if (this.stopped) return;
        const next = Math.min(...[...this.checks.values()].filter((check) => check.state !== 'paused' && check.state !== 'checking').map((check) => Date.parse(check.schedule.nextAt)));
        if (!Number.isFinite(next)) return;
        // Timers are bounded by the platform's maximum delay; a later wake simply re-arms.
        this.timer = setTimeout(() => void this.reconcile().catch(() => undefined), Math.min(Math.max(1_000, next - Date.now()), 2_147_000_000));
        this.timer.unref?.();
    }

    /** Restores persisted schedules without resetting backoff or replaying missed rounds. */
    private async load(): Promise<void> {
        this.loaded = true;
        const file = await readJsonIfExists<ChecksFile>(this.file).catch(() => undefined);
        for (const [id, check] of Object.entries(file?.checks ?? {})) {
            if (!check?.schedule) continue;
            this.checks.set(id, { ...check, state: check.state === 'checking' ? 'scheduled' : check.state, schedule: restoreProgressiveWait(check.schedule, this.policy) });
        }
    }

    /** Persists the schedules with the project's runtime state. */
    private async save(): Promise<void> {
        await ensureDirectory(this.host.stateDirectory);
        await writeJsonAtomic(this.file, { version: 1, checks: Object.fromEntries(this.checks) } satisfies ChecksFile).catch((error: unknown) => this.host.log(`Attention checks could not be saved: ${errorMessage(error)}`, 'warning'));
    }
}

/**
 * Stable fingerprint of evidence parts.
 *
 * @private attention ownership
 */
export function evidenceFingerprint(parts: readonly unknown[]): string {
    return createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 16);
}
