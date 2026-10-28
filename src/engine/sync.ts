import { createRedactor } from '../common/redact.js';
import { git, resolveCommitIdentity } from '../project/git.js';
import type { SyncView } from './snapshot.js';

/**
 * Default interval of the background pull attempt.
 *
 * @private Git synchronization
 */
export const SYNC_INTERVAL_MS = 60_000;

/**
 * Longest backoff between automatic attempts after repeated failures.
 */
const MAX_BACKOFF_MS = 30 * 60_000;

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
    /** Whether integrating remote files now is safe; `undefined` when it is, otherwise the reason to defer. */
    readonly integrationBlocker: (incomingFiles: readonly string[]) => Promise<string | undefined>;
    /** A genuine conflict for Fixer. */
    readonly onConflict: (conflict: SyncConflict) => Promise<void>;
    /** Remote changes were integrated: refresh tasks, configuration version, tools and readiness. */
    readonly onIntegrated: () => Promise<void>;
    readonly onChange: () => void;
    readonly log: (text: string, level: 'info' | 'warning' | 'error') => void;
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
    private again = false;
    private failures = 0;
    private timer?: NodeJS.Timeout;
    private startedBranch?: string;
    private readonly redact = createRedactor();

    public constructor(private readonly host: SyncHost) {}

    /** Records the branch the engine started on (synchronization never follows an external branch switch). */
    public async begin(): Promise<void> {
        const root = this.host.repositoryRoot();
        if (root) this.startedBranch = (await git(root, ['symbolic-ref', '--quiet', '--short', 'HEAD'])).stdout.trim() || undefined;
        clearInterval(this.timer);
        this.timer = setInterval(() => {
            if (this.host.enabled()) void this.request('timer');
        }, SYNC_INTERVAL_MS);
        this.timer.unref();
    }

    /** Stops the background timer. */
    public end(): void {
        clearInterval(this.timer);
        this.timer = undefined;
    }

    /** The cockpit view, only while synchronization is enabled. */
    public view(): SyncView | undefined {
        if (!this.host.enabled()) return undefined;
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
        if (trigger !== 'manual' && this.failures && this.state.nextAttemptAt && Date.parse(this.state.nextAttemptAt) > Date.now()) {
            return { outcome: 'skipped', message: `Backing off after failures; next attempt at ${this.state.nextAttemptAt}.` };
        }
        if (this.running) {
            // Commit-boundary attempts never wait for (or re-enter) a running cycle, e.g. Fixer's conflict task commit.
            if (trigger === 'pre-commit') return { outcome: 'skipped', message: 'A synchronization cycle is already running.' };
            this.again = true;
            if (trigger === 'post-commit') return { outcome: 'skipped', message: 'Publication follows the running cycle.' };
            return await this.running;
        }
        this.running = this.cycle(trigger).finally(() => {
            this.running = undefined;
        });
        const outcome = await this.running;
        if (this.again) {
            this.again = false;
            void this.request('timer');
        }
        if (trigger === 'manual') this.set({ manual: { at: new Date().toISOString(), outcome: outcome.message } });
        return outcome;
    }

    /** Registers a failed remote attempt with bounded exponential backoff. */
    private failed(state: SyncView['state'], reason: string): SyncOutcome {
        this.failures++;
        const delay = Math.min(MAX_BACKOFF_MS, SYNC_INTERVAL_MS * 2 ** Math.min(this.failures - 1, 6));
        this.set({ phase: 'idle', state, reason, nextAttemptAt: new Date(Date.now() + delay).toISOString() });
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
        const pending = outgoing > 0;
        this.set({ phase: 'idle', state: pending ? 'pending' : 'synchronized', reason: pending ? `${outgoing} local commit(s) wait for publication.` : undefined, outgoing, nextAttemptAt: new Date(Date.now() + SYNC_INTERVAL_MS).toISOString() });
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
