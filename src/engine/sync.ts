import { createRedactor } from '../common/redact.js';
import { git, resolveCommitIdentity } from '../project/git.js';
import type { SyncView } from './snapshot.js';
import { nextProgressiveWait, restoreProgressiveWait, WAITING_POLICIES, type ProgressiveSchedule } from './progressive-waiting.js';

/**
 * Default interval of the background pull attempt.
 *
 * @private Git synchronization
 */
export const SYNC_INTERVAL_MS = 60_000;

/**
 * Why no periodic attempt runs while task Pause is in effect.
 */
const PAUSE_SUSPENSION = 'Paused: periodic synchronization and its retries wait for Resume; Synchronize now and local commits still synchronize.';

/**
 * Last lines of a Git error kept in a (redacted) diagnostic.
 */
const DIAGNOSTIC_LINES = 2;

/**
 * Bound of one remote Git operation.
 */
const REMOTE_TIMEOUT_MS = 90_000;

/**
 * What requested a synchronization cycle.
 *
 * @private Git synchronization
 */
export type SyncTrigger = 'timer' | 'boundary' | 'pre-commit' | 'post-commit' | 'manual';

/**
 * Observed outcome of one requested cycle.
 *
 * @private Git synchronization
 */
export type SyncOutcome = {
    readonly outcome: 'disabled' | 'skipped' | 'synchronized' | 'deferred' | 'pending' | 'conflict' | 'failed' | 'unconfigured';
    readonly message: string;
};

/**
 * A merge that needs judgment (handed to the ordinary Fixer).
 *
 * @private Git synchronization
 */
export type SyncConflict = { readonly upstream: string; readonly branch: string; readonly files: readonly string[]; readonly incoming: number };

/**
 * Services the coordinator needs from its engine.
 *
 * @private Git synchronization
 */
export type SyncHost = {
    readonly repositoryRoot: () => string | undefined;
    readonly env: NodeJS.ProcessEnv;
    /** Serializes Git mutations with every other operation of the engine. */
    readonly gitLock: <T>(action: () => Promise<T>) => Promise<T>;
    /** Effective `isAutoSync` (with invocation overrides). */
    readonly enabled: () => boolean;
    /**
     * Whether task Pause is in effect (`pausing` or `pause`). Periodic cycles, their coalesced follow-ups and
     * timer-driven retries wait for `running`; manual cycles and commit boundaries stay permitted.
     */
    readonly paused?: () => boolean;
    /** Healthy timer cadence (tests shorten it; the product default is {@link SYNC_INTERVAL_MS}). */
    readonly intervalMs?: number;
    /** Whether integrating remote files now is safe; `undefined` when it is, otherwise the reason to defer. */
    readonly integrationBlocker: (incomingFiles: readonly string[]) => Promise<string | undefined>;
    /** A genuine conflict for Fixer. */
    readonly onConflict: (conflict: SyncConflict) => Promise<void>;
    /** Remote changes were integrated: refresh tasks, configuration version, tools and readiness. */
    readonly onIntegrated: () => Promise<void>;
    readonly onChange: () => void;
    readonly log: (text: string, level: 'info' | 'warning' | 'error') => void;
    /** Persisted failure backoff: a restart keeps the progression instead of resetting to the fastest cadence. */
    readonly backoff?: { readonly load: () => Promise<ProgressiveSchedule | undefined>; readonly save: (schedule: ProgressiveSchedule | undefined) => Promise<void> };
};

/**
 * The single synchronization coordinator of one engine: pull = fetch plus safe non-fast-forward integration, then
 * publication of committed local work through the branch's existing tracking destination. Timer, operation-boundary,
 * pre-/post-commit and manual requests are serialized and coalesced; failures back off and never stop local work.
 * History is never rewritten (no rebase, squash, amend, reset or force push).
 *
 * @private Git synchronization
 */
export class SyncCoordinator {
    private state: Omit<SyncView, 'phase'> & { phase: SyncView['phase'] } = { phase: 'idle', state: 'never' };
    private running?: Promise<SyncOutcome>;
    /** Strongest trigger coalesced into one cycle after the running one (a timer follow-up waits during Pause). */
    private again?: SyncTrigger;
    /** A periodic cycle came due during Pause; it runs once the engine is running again. */
    private suspendedTimer = false;
    private failures = 0;
    /** Shared progressive-waiting schedule of the current failure (absent while healthy). */
    private backoff?: ProgressiveSchedule;
    private timer?: NodeJS.Timeout;
    private startedBranch?: string;
    private readonly redact = createRedactor();

    public constructor(private readonly host: SyncHost) {}

    /** Records the branch the engine started on (synchronization never follows an external branch switch). */
    public async begin(): Promise<void> {
        const root = this.host.repositoryRoot();
        if (root) this.startedBranch = (await git(root, ['symbolic-ref', '--quiet', '--short', 'HEAD'])).stdout.trim() || undefined;
        // A failure backoff from before a restart continues where it was (at most one due attempt, no reset).
        const saved = await this.host.backoff?.load().catch(() => undefined);
        if (saved && !this.backoff) {
            this.backoff = restoreProgressiveWait(saved, WAITING_POLICIES.sync);
            this.failures = this.backoff.rounds;
            this.set({ reason: saved.cause, nextAttemptAt: this.backoff.nextAt });
        }
        clearInterval(this.timer);
        this.timer = setInterval(() => {
            if (this.host.enabled()) void this.request('timer');
        }, this.interval);
        this.timer.unref();
    }

    /** Healthy timer cadence. */
    private get interval(): number {
        return this.host.intervalMs ?? SYNC_INTERVAL_MS;
    }

    /** Whether Pause suspends periodic work right now. */
    private get paused(): boolean {
        return Boolean(this.host.paused?.());
    }

    /**
     * The engine returned to `running`: a periodic cycle (or retry) that came due during Pause runs now, once. Later
     * cycles follow the ordinary cadence.
     */
    public resumed(): void {
        if (!this.suspendedTimer || this.paused) return;
        this.suspendedTimer = false;
        if (this.host.enabled()) void this.request('timer');
    }

    /** Stops the background timer. */
    public end(): void {
        clearInterval(this.timer);
        this.timer = undefined;
    }

    /** The cockpit view, only while synchronization is enabled. */
    public view(): SyncView | undefined {
        if (!this.host.enabled()) return undefined;
        // During Pause no periodic attempt is scheduled: the next one is unknown until Resume (or a commit boundary).
        if (this.paused) return { ...this.state, nextAttemptAt: undefined, suspended: PAUSE_SUSPENSION };
        return { ...this.state };
    }

    /** Updates the observable state. */
    private set(changes: Partial<SyncView>): void {
        this.state = { ...this.state, ...changes };
        this.host.onChange();
    }

    /**
     * Requests one cycle. A request during a running cycle is coalesced into at most one following cycle; a pre-commit
     * attempt only fetches (integration is deferred until after the local commit).
     */
    public async request(trigger: SyncTrigger): Promise<SyncOutcome> {
        if (!this.host.enabled()) return { outcome: 'disabled', message: 'Automatic synchronization is off (isAutoSync false).' };
        // Pause permits only a manual cycle and the commit boundaries of an operation that actually commits.
        if ((trigger === 'timer' || trigger === 'boundary') && this.paused) {
            if (trigger === 'timer') this.suspendedTimer = true;
            return { outcome: 'skipped', message: PAUSE_SUSPENSION };
        }
        if (trigger !== 'manual' && this.failures && this.state.nextAttemptAt && Date.parse(this.state.nextAttemptAt) > Date.now()) {
            return { outcome: 'skipped', message: `Backing off after failures; next attempt at ${this.state.nextAttemptAt}.` };
        }
        if (this.running) {
            // Commit-boundary attempts never wait for (or re-enter) a running cycle, e.g. Fixer's conflict task commit.
            if (trigger === 'pre-commit') return { outcome: 'skipped', message: 'A synchronization cycle is already running.' };
            // A coalesced publication must still follow during Pause; other requests only need some later cycle.
            this.again = trigger === 'post-commit' || this.again === 'post-commit' ? 'post-commit' : 'timer';
            if (trigger === 'post-commit') return { outcome: 'skipped', message: 'Publication follows the running cycle.' };
            return await this.running;
        }
        this.running = this.cycle(trigger).finally(() => {
            this.running = undefined;
        });
        const outcome = await this.running;
        if (this.again) {
            const follow = this.again;
            this.again = undefined;
            void this.request(follow);
        }
        if (trigger === 'manual') this.set({ manual: { at: new Date().toISOString(), outcome: outcome.message } });
        return outcome;
    }

    /** Registers a failed remote attempt with bounded exponential backoff. */
    private failed(state: SyncView['state'], reason: string): SyncOutcome {
        // The shared progressive-waiting policy (healthy cadence stays separate); boundary triggers coalesce meanwhile.
        this.backoff = nextProgressiveWait(this.backoff, { cause: reason, conditions: state }, WAITING_POLICIES.sync);
        this.failures = this.backoff.rounds;
        const delay = Math.max(0, Date.parse(this.backoff.nextAt) - Date.now());
        void this.host.backoff?.save(this.backoff).catch(() => undefined);
        this.set({ phase: 'idle', state, reason, nextAttemptAt: this.backoff.nextAt });
        if (this.failures === 1 || this.failures % 10 === 0) this.host.log(`Synchronization ${state}: ${reason} (local work continues; next attempt in ${Math.round(delay / 1000)}s).`, 'warning');
        return { outcome: state === 'pending' ? 'pending' : state === 'unconfigured' ? 'unconfigured' : 'failed', message: reason };
    }

    /** One cycle: fetch, safe integration (unless pre-commit), publication. */
    private async cycle(trigger: SyncTrigger): Promise<SyncOutcome> {
        const root = this.host.repositoryRoot();
        if (!root) return { outcome: 'unconfigured', message: 'The project is not in a Git working tree.' };
        const at = new Date().toISOString();
        this.set({ lastAttemptAt: at });
        const branch = (await git(root, ['symbolic-ref', '--quiet', '--short', 'HEAD'])).stdout.trim() || undefined;
        if (!branch) return this.failed('unconfigured', 'HEAD is detached; synchronization needs the branch the engine started on.');
        if (this.startedBranch && branch !== this.startedBranch) {
            return this.failed('deferred', `The checkout switched from ${this.startedBranch} to ${branch} outside ptbk; synchronization waits until the engine restarts on the intended branch.`);
        }
        const upstream = (await git(root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'])).stdout.trim() || undefined;
        const remote = upstream?.split('/')[0];
        const originUrl = remote ? (await git(root, ['remote', 'get-url', remote])).stdout.trim() : (await git(root, ['remote', 'get-url', 'origin'])).stdout.trim();
        this.set({ branch, upstream, origin: originUrl ? redactUrl(originUrl) : undefined });
        if (!upstream || !remote) {
            return this.failed('unconfigured', originUrl ? `Branch ${branch} has no tracking destination; set it once with \`git push -u origin ${branch}\`.` : 'The repository has no origin remote; add one (git remote add origin <url>) or turn synchronization off.');
        }
        this.set({ phase: 'fetching' });
        const fetch = await git(root, ['fetch', '--quiet', '--no-tags', remote], { env: this.host.env, timeoutMs: REMOTE_TIMEOUT_MS });
        if (fetch.exitCode !== 0) return this.failed('failed', `Fetch from ${remote} failed: ${this.redact((fetch.spawnError ?? fetch.stderr.trim()) || `exit ${String(fetch.exitCode)}`).split('\n').slice(-DIAGNOSTIC_LINES).join(' ')}`);
        let incoming = Number((await git(root, ['rev-list', '--count', `HEAD..${upstream}`])).stdout.trim() || 0);
        let outgoing = Number((await git(root, ['rev-list', '--count', `${upstream}..HEAD`])).stdout.trim() || 0);
        this.set({ incoming, outgoing });
        if (incoming > 0) {
            if (trigger === 'pre-commit') {
                this.set({ phase: 'idle', state: 'deferred', reason: `Fetched ${incoming} incoming commit(s); integration follows after the local commit.` });
                return { outcome: 'deferred', message: `Fetched ${incoming} incoming commit(s); integration is deferred until after the local commit.` };
            }
            const files = (await git(root, ['diff', '--name-only', `HEAD...${upstream}`])).stdout.split('\n').filter(Boolean);
            const blocker = await this.host.integrationBlocker(files);
            if (blocker) {
                this.set({ phase: 'idle', state: 'deferred', reason: `Integration deferred: ${blocker}` });
                return { outcome: 'deferred', message: `Fetched ${incoming} incoming commit(s); integration deferred: ${blocker}` };
            }
            this.set({ phase: 'integrating' });
            const merged = await this.host.gitLock(async () => {
                const identity = await resolveCommitIdentity(root, this.host.env);
                // A visible merge commit even when fast-forward would be possible; history stays append-only.
                const result = await git(root, [...identity.configArgs, 'merge', '--no-ff', '--no-edit', '-m', `ptbk: Merge ${upstream} into ${branch}`, upstream], { env: this.host.env });
                if (result.exitCode === 0) return { ok: true as const };
                const conflicted = (await git(root, ['diff', '--name-only', '--diff-filter=U'])).stdout.split('\n').filter(Boolean);
                // Never leave the sole working tree half-merged: restore the exact pre-attempt state.
                if ((await git(root, ['rev-parse', '-q', '--verify', 'MERGE_HEAD'])).exitCode === 0) await git(root, ['merge', '--abort']);
                return { ok: false as const, conflicted, reason: this.redact(result.stderr.trim() || result.stdout.trim()).split('\n').slice(-DIAGNOSTIC_LINES).join(' ') };
            });
            if (!merged.ok) {
                if (merged.conflicted.length) {
                    this.set({ phase: 'idle', state: 'conflict', reason: `Merging ${upstream} conflicts in ${merged.conflicted.join(', ')}; the local branch is unchanged and Fixer was asked to resolve it.` });
                    await this.host.onConflict({ upstream, branch, files: merged.conflicted, incoming });
                    return { outcome: 'conflict', message: `Conflicting changes in ${merged.conflicted.join(', ')}; handed to Fixer.` };
                }
                this.set({ phase: 'idle', state: 'deferred', reason: `Integration deferred: ${merged.reason}` });
                return { outcome: 'deferred', message: `Integration deferred: ${merged.reason}` };
            }
            this.host.log(`Integrated ${incoming} commit(s) from ${upstream} with a merge commit.`, 'info');
            await this.host.onIntegrated();
            incoming = 0;
            outgoing = Number((await git(root, ['rev-list', '--count', `${upstream}..HEAD`])).stdout.trim() || 0);
        }
        this.set({ incoming, outgoing, lastIntegrationAt: new Date().toISOString() });
        if (outgoing > 0 && trigger !== 'pre-commit') {
            this.set({ phase: 'publishing' });
            const target = upstream.slice(remote.length + 1);
            const push = await git(root, ['push', '--quiet', remote, `HEAD:${target}`], { env: this.host.env, timeoutMs: REMOTE_TIMEOUT_MS });
            if (push.exitCode !== 0) return this.failed('pending', `Push to ${upstream} failed (${outgoing} local commit(s) stay pending): ${this.redact((push.spawnError ?? push.stderr.trim()) || `exit ${String(push.exitCode)}`).split('\n').slice(-DIAGNOSTIC_LINES).join(' ')}`);
            this.host.log(`Published ${outgoing} commit(s) to ${upstream}.`, 'info');
            outgoing = 0;
            this.set({ lastPublicationAt: new Date().toISOString() });
        }
        this.failures = 0;
        if (this.backoff) {
            this.backoff = undefined;
            void this.host.backoff?.save(undefined).catch(() => undefined);
        }
        const pending = outgoing > 0;
        this.set({ phase: 'idle', state: pending ? 'pending' : 'synchronized', reason: pending ? `${outgoing} local commit(s) wait for publication.` : undefined, outgoing, nextAttemptAt: new Date(Date.now() + this.interval).toISOString() });
        return { outcome: pending ? 'pending' : 'synchronized', message: pending ? `${outgoing} local commit(s) wait for publication.` : `Synchronized with ${upstream}.` };
    }
}

/**
 * Removes credentials from a remote URL for display.
 *
 * @private Git synchronization
 */
export function redactUrl(url: string): string {
    return url.replace(/\/\/[^/@]*@/, '//').replace(/([?&](?:token|access_token|key)=)[^&]+/gi, '$1[REDACTED]');
}
