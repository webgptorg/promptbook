import { copyFile, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { PtbkError, errorMessage } from '../common/errors.js';
import { ensureDirectory, isPathInside, pathExists, readJsonIfExists, writeJsonAtomic } from '../common/fs.js';
import { shortId, slugify } from '../common/ids.js';
import { Mutex } from '../common/mutex.js';
import { createRedactor, REDACTED } from '../common/redact.js';
import { formatIsoWithOffset } from '../common/time.js';
import { accessibleProjectPath } from '../project/files.js';
import type { Project } from '../project/workspace.js';
import { ACTIONS_DIRECTORY, actionDirectoryOf } from '../tasks/identity.js';
import { buildActionView, type ActionView, type ActionViewQuery } from './action-impact.js';
import type { BridgeTool, ToolResult } from './bridge.js';
import type { MethodologyEvidence } from './knowledge.js';
import { sourceRevision } from './task-trace.js';

/**
 * Observed outcome of one logical external action, separate from its impact and from the task's result. `failed` is a
 * meaningful rejected attempt (a refused payment); it never suggests that the effect happened. `not-performed` closes an
 * intent that never became an attempt (a setup failure stays in traces) or corrects an earlier uncertain record.
 *
 * @private external action log
 */
export type ActionOutcome = 'success' | 'failed' | 'pending' | 'partial' | 'uncertain' | 'not-performed';

/**
 * Outcomes accepted from agents.
 */
const OUTCOMES: readonly ActionOutcome[] = ['success', 'failed', 'pending', 'partial', 'uncertain', 'not-performed'];

/**
 * An outcome as saved or reported: `confirmed` is the former name of `success`, still present in earlier records.
 */
function normalizeOutcome(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const outcome = value.trim().toLowerCase();
    return outcome === 'confirmed' ? 'success' : outcome || undefined;
}

/**
 * Who performs external actions: the task, its actual source, its occurrence and the executing agent's attempt.
 *
 * @private external action log
 */
export type ActionSubject = {
    /** Declared task name (logical identity). */
    readonly taskName: string;
    /** Project-relative source path (it alone decides `actions/<task-file-basename>/`). */
    readonly source: string;
    /** Recurring occurrence slot (ISO), when any. */
    readonly occurrence?: string;
    /** Executing agent. */
    readonly agent: string;
    /** Attempt label of the run (`<run>-a<n>`). */
    readonly attempt: string;
    /** Project-relative trace directory of the task. */
    readonly trace: string;
    /**
     * Engine-owned operation that performed the action where no source-backed task exists (e.g. `Initialization`):
     * `taskName`, `source` and `trace` are then empty, never an invented Book or source filename.
     */
    readonly system?: string;
    /** Harness session of the attempt, when known (a verified link in the record). */
    readonly session?: string;
    /** Effective methodology the agent received in this attempt (provenance of its impact estimate). */
    readonly methodology?: MethodologyEvidence;
};

/**
 * The local recovery intent and record state of one logical external action (`.ptbk/state/actions/<id>.json`): saved
 * before the consequential request, so a lost acknowledgement is reconciled rather than repeated.
 *
 * @private external action log
 */
export type ActionIntent = {
    readonly version: 1;
    readonly id: string;
    readonly subject: ActionSubject;
    readonly operation: string;
    readonly service: string;
    readonly account?: string;
    readonly target?: string;
    /** What is sent or changed (redacted). */
    readonly content?: string;
    /** The logical action's own time: what ages it, unchanged by later reconciliation. */
    readonly startedAt: string;
    /** Contextual estimate of the consequence if the action succeeds; `unknown` is different from impact 0. */
    readonly impact?: number | 'unknown';
    /** Why this estimate fits the actual context. */
    readonly impactReason?: string;
    /** Inherent bulk operation this action belongs to (at most one; assigned by the executing agent). */
    readonly group?: string;
    /** Another logical action this one relates to, e.g. a duplicate effect caused by a retry. */
    readonly related?: string;
    /** Technical attempts of this one logical action. */
    readonly attempts?: number;
    /** An attempt was begun and has no outcome yet. */
    readonly awaiting?: boolean;
    /** Latest observed outcome, once reported. */
    readonly outcome?: ActionOutcome;
    readonly observed?: string;
    readonly reference?: string;
    /** Project-relative Markdown record, once an effect was recorded. */
    readonly record?: string;
    /** Chronological history (redacted, readable). */
    readonly history: readonly string[];
    /** The intent is settled (recorded effect or explicitly not performed). */
    readonly closed: boolean;
};

/**
 * One saved external-action record, as lists and pages show it (parsed from its Markdown; never secrets).
 *
 * @private external action log
 */
export type ActionSummary = {
    /** Project-relative path (`actions/<task-file-basename>/<file>.md`). */
    readonly path: string;
    /** Task source basename (the directory). */
    readonly task: string;
    readonly taskName?: string;
    readonly source?: string;
    /** Engine-owned operation of a record without a task (its directory is under `actions/.engine/`). */
    readonly system?: string;
    readonly operation: string;
    readonly service?: string;
    readonly account?: string;
    readonly target?: string;
    readonly outcome: string;
    /** The logical action's own time (what ages it); a record from before this field gives its last update. */
    readonly at?: string;
    /** Latest change of the record, e.g. a reconciliation. */
    readonly recordedAt?: string;
    readonly agent?: string;
    readonly reference?: string;
    readonly evidence?: string;
    readonly id?: string;
    /** Numeric impact; absent means explicitly unknown (also for a record from before estimates), never 0. */
    readonly impact?: number;
    /** Inherent batch membership. */
    readonly group?: string;
    readonly related?: string;
    readonly attempts?: number;
    /** Harness session of the attempt, when known. */
    readonly session?: string;
    /** Saved but not committed yet (pending or explicitly uncommitted persistence). */
    readonly pending?: boolean;
};

/**
 * Lightweight overview of saved external actions for snapshots: newest first and bounded.
 *
 * @private external action log
 */
export type ActionLogView = {
    readonly total: number;
    readonly recent: readonly ActionSummary[];
    /** Records saved but not committed yet. */
    readonly pending: number;
    /** Intents of interrupted runs without a reported outcome (to reconcile before any retry). */
    readonly unresolved: number;
    /** Capture is prospective: tasks before it may have external work without records. */
    readonly since?: string;
    /** Changes whenever saved records or their persistence state change (clients reload views on it). */
    readonly revision?: number;
};

/**
 * Most records kept in the snapshot overview.
 */
const VIEW_LIMIT = 50;

/**
 * Most records of a task listed one by one for its next attempt.
 */
const CONTEXT_LIMIT = 30;

/**
 * Longest wait before saved records of a bulk operation share one scoped commit: one commit per email of a campaign
 * would flood the history, while each record is on disk at once.
 */
const GROUP_COMMIT_MS = 15_000;

/**
 * Debounce of the snapshot refresh after a change, so a bulk operation does not rescan once per record.
 */
const TOUCH_DEBOUNCE_MS = 150;

/**
 * Least time between saves of the rebuildable summary index.
 */
const INDEX_SAVE_MS = 5_000;

/**
 * Version of the summary index; a change of the parsed fields invalidates every saved summary.
 */
const INDEX_VERSION = 2;

/**
 * Subdirectory of durable copies of the methodologies evaluations relied on. Their `.book.txt` name keeps every Book
 * tool from treating them as agents.
 */
const METHODOLOGY_DIRECTORY = `${ACTIONS_DIRECTORY}/.methodology`;

/**
 * Longest stored content of one field (more is cut visibly).
 */
const MAX_CONTENT_CHARS = 20_000;

/**
 * Secret URL parameters redacted from every stored field.
 */
const SECRET_URL_PARAMETERS = /([?&#](?:access_token|refresh_token|id_token|token|api[_-]?key|key|secret|sig|signature|password|passwd|code|auth|session|sessionid|otp)=)[^&#\s"'<>]+/gi;

/**
 * Line of one metadata field in a record.
 */
const FIELD_LINE = /^- \*\*(.+?):\*\* (.*)$/;

/**
 * Verified navigation targets of one record: its task Book and evidence only when Files can open them now, and its
 * receipt only as a plain http(s) URL without credentials.
 *
 * @private external action log
 */
export type ActionLinks = { readonly task?: string; readonly evidence?: string; readonly receipt?: string; readonly harness?: string };

/**
 * One saved record with what its detail page shows beyond the summary.
 *
 * @private external action log
 */
export type ActionDetail = {
    readonly summary: ActionSummary;
    readonly content: string;
    readonly links: ActionLinks;
    /** Why this estimate fits the context. */
    readonly impactReason?: string;
    /** Saved evidence of the methodology behind the estimate, in words. */
    readonly methodology: readonly string[];
};

/**
 * A receipt that is safe to offer as a link: a plain http(s) URL without embedded credentials or whitespace.
 */
function safeReceipt(reference: string | undefined): string | undefined {
    if (!reference || !/^https?:\/\/[^\s<>"'`]+$/i.test(reference)) return undefined;
    try {
        const url = new URL(reference);
        return url.username || url.password ? undefined : url.href;
    } catch {
        return undefined;
    }
}

/**
 * Persistence of one saved record through the engine's scoped Git boundaries.
 *
 * @private external action log
 */
export type ActionPersistence = (record: { readonly path: string; readonly paths?: readonly string[]; readonly count?: number; readonly subject: ActionSubject; readonly operation: string; readonly service: string }) => Promise<'committed' | 'uncommitted'>;

/**
 * Persistence of one or more saved records still to be committed.
 */
type PendingRecord = { readonly subject: ActionSubject; readonly operation: string; readonly service: string; readonly group?: string; readonly also: readonly string[] };

/**
 * One saved summary of the rebuildable index, valid while its file keeps this size and time.
 */
type IndexEntry = { readonly mtimeMs: number; readonly size: number; readonly summary: ActionSummary };

/**
 * The engine-owned durable audit of external task actions: one readable Markdown record per logical remote mutation
 * under `actions/<task-file-basename>/`, versioned independently of trace settings and final task success, plus local
 * recovery intents that let a lost acknowledgement be reconciled instead of repeated. Reads, searches and downloads are
 * never recorded; no task directory exists without an action, and nothing is backfilled.
 *
 * @private external action log
 */
export class ActionLog {
    /** Saved records not committed yet: a bulk operation's, or a commit that failed (never repeating the remote effect). */
    private readonly pending = new Map<string, PendingRecord>();
    /** Saved records persisted as explicitly uncommitted (no-commit workflows). */
    private readonly uncommitted = new Set<string>();
    private flushTimer?: NodeJS.Timeout;
    private touchTimer?: NodeJS.Timeout;
    private cache?: ActionLogView;
    /** Rebuildable summaries of saved records by path (read from `.ptbk/tmp/`, validated against each file). */
    private index?: Map<string, IndexEntry>;
    private indexDirty = false;
    private indexSaved = 0;
    private revision = Date.now();
    /** One record operation at a time: filename allocation and read-modify-write of intents must not interleave. */
    private readonly serial = new Mutex();
    /** One flush at a time. */
    private readonly flushing = new Mutex();
    private readonly redactSecrets: (text: string) => string;

    public constructor(
        private readonly options: {
            readonly project: Project;
            readonly env: NodeJS.ProcessEnv;
            readonly timeZone: () => string;
            readonly persist: ActionPersistence;
            readonly onChange: () => void;
            readonly log: (text: string, level?: 'info' | 'warning' | 'error') => void;
            /** Delay before a failed record commit is retried. */
            readonly retryMs?: number;
            /** Longest wait before records of one bulk operation are committed together. */
            readonly groupCommitMs?: number;
            /** Marks saved files as engine-authored at once, so a task's result commit never absorbs them. */
            readonly reserve?: (paths: readonly string[]) => void;
            /** Whether a harness session handle is still known (only then is it offered as a link). */
            readonly sessionKnown?: (handle: string) => boolean;
        },
    ) {
        this.redactSecrets = createRedactor([], options.env);
    }

    /** Redacts secrets, credential shapes and secret URL parameters from one stored value. */
    private redact(text: string): string {
        return this.redactSecrets(text).replace(SECRET_URL_PARAMETERS, `$1${REDACTED}`);
    }

    /** Directory of local intents. */
    private get intentDirectory(): string {
        return join(this.options.project.runtime.state, 'actions');
    }

    /** Reads one intent. */
    private async intent(id: string): Promise<ActionIntent | undefined> {
        if (!/^act-[a-z0-9]+$/.test(id)) return undefined;
        return await readJsonIfExists<ActionIntent>(join(this.intentDirectory, `${id}.json`)).catch(() => undefined);
    }

    /** Saves one intent. */
    private async saveIntent(intent: ActionIntent): Promise<void> {
        await ensureDirectory(this.intentDirectory);
        await writeJsonAtomic(join(this.intentDirectory, `${intent.id}.json`), intent, { mode: 0o600 });
    }

    /** Every local intent. */
    private async intents(): Promise<ActionIntent[]> {
        const names = await readdir(this.intentDirectory).catch(() => [] as string[]);
        const intents: ActionIntent[] = [];
        for (const name of names) {
            if (!name.endsWith('.json')) continue;
            const intent = await readJsonIfExists<ActionIntent>(join(this.intentDirectory, name)).catch(() => undefined);
            if (intent?.version === 1) intents.push(intent);
        }
        return intents.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    }

    /** Readable local time of now. */
    private now(): string {
        return formatIsoWithOffset(Date.now(), this.options.timeZone());
    }

    /** One bounded, redacted single-line or multi-line text. */
    private text(value: unknown, multiline = false): string | undefined {
        if (typeof value !== 'string' || !value.trim()) return undefined;
        let text = this.redact(value.trim());
        if (!multiline) text = text.replace(/\s+/g, ' ');
        return text.length > MAX_CONTENT_CHARS ? `${text.slice(0, MAX_CONTENT_CHARS)}\n\n[… ${text.length - MAX_CONTENT_CHARS} more characters were not stored]` : text;
    }

    /**
     * Reads an impact estimate from a tool input. Absent means not given; a number must be finite and nonnegative
     * (fractions and values above 6 are valid, and nothing is clamped or rounded).
     */
    private estimate(input: Readonly<Record<string, unknown>>): { readonly impact?: number | 'unknown'; readonly reason?: string; readonly problem?: string } {
        const reason = this.text(input.impact_reason, true);
        const raw = input.impact;
        if (raw === undefined || raw === null || (typeof raw === 'string' && !raw.trim())) return { ...(reason ? { reason } : {}) };
        if (typeof raw === 'string' && raw.trim().toLowerCase() === 'unknown') return { impact: 'unknown', ...(reason ? { reason } : {}) };
        const value = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw.trim()) : Number.NaN;
        if (!Number.isFinite(value) || value < 0) return { problem: `impact must be one finite nonnegative number such as 2 or 3.5 (above 6 is fine when justified), or "unknown"; got ${JSON.stringify(raw)}.` };
        return { impact: value, ...(reason ? { reason } : {}) };
    }

    /**
     * Saves the local recovery intent of a consequential request before it is sent, or starts another attempt of the
     * same logical action. Returns its id and what this task already recorded, so an earlier effect is reconciled
     * instead of repeated.
     */
    public async begin(subject: ActionSubject, input: Readonly<Record<string, unknown>>): Promise<ToolResult> {
        return await this.serial.run(async () => {
            const estimate = this.estimate(input);
            if (estimate.problem) return { text: estimate.problem, isError: true };
            const id = typeof input.id === 'string' ? input.id.trim() : '';
            if (id) {
                const known = await this.intent(id);
                if (!known) return { text: `No external action ${id} is known here. Omit id to begin a new action.`, isError: true };
                if (normalizeOutcome(known.outcome) === 'success') return { text: `${id} is already recorded as successful: repeating it would be a second real effect, which is a separate action. Begin a new action without id only if that is intended, and set related_to to ${id}.`, isError: true };
                const attempt: ActionIntent = { ...known, attempts: (known.attempts ?? 1) + 1, awaiting: true, closed: false, history: [...known.history, `${this.now()} — another attempt of the same action begun (attempt ${subject.attempt})`] };
                await this.saveIntent(attempt);
                this.touch();
                return { text: `Continuing ${id} as one logical action. Perform the request now, then call record_external_action with id "${id}" and the observed outcome.` };
            }
            const operation = this.text(input.operation);
            const service = this.text(input.service);
            if (!operation || !service) return { text: 'operation and service are required (what you are about to do, and on which service).', isError: true };
            const intent: ActionIntent = {
                version: 1,
                id: newActionId(),
                subject,
                operation,
                service,
                account: this.text(input.account),
                target: this.text(input.target),
                content: this.text(input.content, true),
                startedAt: this.now(),
                ...(estimate.impact === undefined ? {} : { impact: estimate.impact }),
                ...(estimate.reason ? { impactReason: estimate.reason } : {}),
                ...this.relations(input),
                attempts: 1,
                awaiting: true,
                history: [`${this.now()} — intent recorded before the request (attempt ${subject.attempt})`],
                closed: false,
            };
            await this.saveIntent(intent);
            this.touch();
            const earlier = await this.taskContext(subject.source, intent.id);
            return {
                text: `Recorded the intent ${intent.id}. Perform the request now, then call record_external_action with id "${intent.id}" and the observed outcome (success, failed, pending, partial, uncertain, or not-performed if no real attempt happened). If the response is lost or times out, check the service for the actual result before any retry; never repeat a successful effect. A retry of this same intended action keeps this id.${earlier ? `\n\n${earlier}` : ''}`,
            };
        });
    }

    /** Batch membership and relation to another action from a tool input. */
    private relations(input: Readonly<Record<string, unknown>>): Pick<ActionIntent, 'group' | 'related'> {
        const group = this.text(input.group)?.slice(0, 80);
        const related = this.text(input.related_to)?.slice(0, 40);
        return { ...(group ? { group } : {}), ...(related ? { related } : {}) };
    }

    /**
     * Records the observed outcome of an external action: a new or updated Markdown record (never a duplicate for the
     * same logical action), saved at once and persisted independently of the task's later success. A later report of the
     * same id is a retry or a reconciliation of one action; a different estimate is an attributable reassessment that
     * keeps the original in the record's history.
     */
    public async record(subject: ActionSubject, input: Readonly<Record<string, unknown>>): Promise<ToolResult> {
        // Another agent's slow commit never delays saving this record.
        const step = await this.serial.run(async () => await this.saveReported(subject, input));
        if ('text' in step) return step;
        const { path, saved, snapshots, outcome } = step;
        const persistence = await this.persist(path, saved, snapshots);
        return {
            text: `Saved ${path} (${outcome}, id ${saved.id}, impact ${saved.impact}${persistence === 'committed' ? ', committed' : persistence === 'uncommitted' ? ', saved without a commit' : ', commit pending'}).${outcome === 'uncertain' || outcome === 'pending' ? ` Reconcile it with the service and update it with id "${saved.id}" once the actual result is known; do not repeat the request blindly.` : ''}${outcome === 'failed' ? ` A retry of this same intended action keeps id "${saved.id}", and its record stays one action.` : ''}`,
        };
    }

    /** Validates a reported outcome and saves its record, returning what remains to be committed (or the tool's answer). */
    private async saveReported(subject: ActionSubject, input: Readonly<Record<string, unknown>>): Promise<ToolResult | { readonly path: string; readonly saved: ActionIntent; readonly snapshots: readonly string[]; readonly outcome: ActionOutcome }> {
        const outcome = OUTCOMES.find((value) => value === normalizeOutcome(input.outcome));
        if (!outcome) return { text: `outcome must be one of ${OUTCOMES.join(', ')}.`, isError: true };
        const estimate = this.estimate(input);
        if (estimate.problem) return { text: estimate.problem, isError: true };
        const id = typeof input.id === 'string' ? input.id.trim() : '';
        let intent = id ? await this.intent(id) : undefined;
        if (id && !intent) {
            const located = await this.locate(id);
            if (!located) return { text: `No external action ${id} is known to this project. Omit id to record a new action.`, isError: true };
            return await this.amend(located, subject, outcome, input, estimate);
        }
        if (!intent) {
            const operation = this.text(input.operation);
            const service = this.text(input.service);
            if (!operation || !service) return { text: 'Without an id, operation and service are required.', isError: true };
            intent = { version: 1, id: newActionId(), subject, operation, service, account: this.text(input.account), target: this.text(input.target), content: this.text(input.content, true), startedAt: this.now(), ...this.relations(input), history: [], closed: false };
        }
        const observed = this.text(input.observed, true);
        const reference = this.text(input.reference);
        const relations = this.relations(input);
        const lines: string[] = [];
        const changed = estimate.impact !== undefined && intent.impact !== undefined && estimate.impact !== intent.impact;
        if (changed) lines.push(`${this.now()} — impact reassessed from ${intent.impact} to ${estimate.impact}${estimate.reason ? `: ${estimate.reason.replace(/\s+/g, ' ').slice(0, 200)}` : ''} (attempt ${subject.attempt}${intent.impactReason ? `; the original reason was: ${intent.impactReason.replace(/\s+/g, ' ').slice(0, 200)}` : ''})`);
        lines.push(`${this.now()} — ${outcome}${observed ? `: ${observed.replace(/\s+/g, ' ').slice(0, 200)}` : ''} (attempt ${subject.attempt})`);
        // Reconciling an uncertain or pending result finds out what one attempt did; it is not another attempt.
        const reconciling = intent.outcome === 'uncertain' || intent.outcome === 'pending';
        const attempts = intent.awaiting || reconciling ? (intent.attempts ?? 1) : (intent.attempts ?? 0) + 1;
        const estimatedNow = estimate.impact !== undefined && (changed || intent.impact === undefined);
        const updated: ActionIntent = {
            ...intent,
            // The methodology belongs to the estimate: a later attempt that does not re-estimate leaves it unchanged.
            subject: { ...intent.subject, attempt: subject.attempt, ...(subject.session ? { session: subject.session } : {}), ...(estimatedNow && subject.methodology ? { methodology: subject.methodology } : {}) },
            account: intent.account ?? this.text(input.account),
            target: intent.target ?? this.text(input.target),
            content: intent.content ?? this.text(input.content, true),
            outcome,
            observed: observed ?? intent.observed,
            reference: reference ?? intent.reference,
            impact: estimate.impact ?? intent.impact ?? 'unknown',
            ...(estimate.reason ?? intent.impactReason ? { impactReason: estimate.reason ?? intent.impactReason } : {}),
            // An action belongs to at most one batch: its first membership stays.
            ...(intent.group ?? relations.group ? { group: intent.group ?? relations.group } : {}),
            ...(intent.related ?? relations.related ? { related: intent.related ?? relations.related } : {}),
            attempts,
            awaiting: false,
            history: [...intent.history, ...lines],
            closed: outcome !== 'uncertain' && outcome !== 'pending',
        };
        if (outcome === 'not-performed' && !intent.record) {
            // No real attempt happened: no record is fabricated; the trace keeps the setup failure.
            await this.saveIntent(updated);
            this.touch();
            return { text: `Closed ${updated.id} without a record (no real attempt happened).` };
        }
        const path = intent.record ?? (await this.allocate(updated));
        const saved: ActionIntent = { ...updated, record: path };
        const snapshots = await this.write(saved);
        await this.saveIntent(saved);
        return { path, saved, snapshots, outcome };
    }

    /** Updates a versioned record whose local intent is not available (another host or a cleaned runtime). */
    private async amend(path: string, subject: ActionSubject, outcome: ActionOutcome, input: Readonly<Record<string, unknown>>, estimate: { readonly impact?: number | 'unknown'; readonly reason?: string }): Promise<ToolResult> {
        const absolute = resolve(this.options.project.root, path);
        const content = await readFile(absolute, 'utf8');
        const before = parseActionRecord(path, content);
        const observed = this.text(input.observed, true);
        const lines = [`- ${this.now()} — ${outcome}${observed ? `: ${observed.replace(/\s+/g, ' ').slice(0, 200)}` : ''} (attempt ${subject.attempt}, reconciled)`];
        let updated = content.replace(/^- \*\*Outcome:\*\* .*$/m, `- **Outcome:** ${outcome}`);
        const reference = this.text(input.reference);
        if (reference && !/^- \*\*External reference:\*\*/m.test(updated)) updated = updated.replace(/^(- \*\*Outcome:\*\* .*)$/m, `$1\n- **External reference:** ${reference}`);
        if (estimate.impact !== undefined && estimate.impact !== (before.impact ?? 'unknown')) {
            // Explicit reassessment: the earlier value stays in the history.
            lines.unshift(`- ${this.now()} — impact reassessed from ${before.impact ?? 'unknown'} to ${estimate.impact}${estimate.reason ? `: ${estimate.reason.replace(/\s+/g, ' ').slice(0, 200)}` : ''} (attempt ${subject.attempt})`);
            updated = /^- \*\*Impact:\*\*/m.test(updated) ? updated.replace(/^- \*\*Impact:\*\* .*$/m, `- **Impact:** ${estimate.impact}`) : updated.replace(/^(- \*\*Outcome:\*\* .*)$/m, `$1\n- **Impact:** ${estimate.impact}`);
        }
        updated = /^## History$/m.test(updated) ? `${updated.trimEnd()}\n${lines.join('\n')}\n` : `${updated.trimEnd()}\n\n## History\n\n${lines.join('\n')}\n`;
        await writeFile(absolute, updated);
        const summary = parseActionRecord(path, updated);
        await this.persist(path, { subject, operation: summary.operation, service: summary.service ?? 'unknown service', ...(summary.group ? { group: summary.group } : {}) });
        return { text: `Updated ${path} (${outcome}).` };
    }

    /** Finds the record of an action id among saved records. */
    private async locate(id: string): Promise<string | undefined> {
        for (const summary of await this.scan()) if (summary.id === id) return summary.path;
        return undefined;
    }

    /** A readable, collision-safe record filename inside the task's action directory. */
    private async allocate(intent: ActionIntent): Promise<string> {
        const directory = actionDirectoryOf(intent.subject.source);
        const stamp = intent.startedAt.slice(0, 16).replace('T', '-').replace(':', '');
        const base = `${stamp}-${slugify(`${intent.operation} ${intent.service}`, 60)}`;
        const existing = new Set(await readdir(resolve(this.options.project.root, directory)).catch(() => [] as string[]));
        for (let index = 1; ; index++) {
            const name = `${base}${index === 1 ? '' : `-${index}`}.md`;
            if (!existing.has(name)) return `${directory}/${name}`;
        }
    }

    /**
     * Writes the readable Markdown record of an action and durable copies of the methodologies its estimate relied on
     * (returned for its commit), so a later change or removal of a remote source cannot erase that evidence.
     */
    private async write(intent: ActionIntent): Promise<string[]> {
        const root = this.options.project.root;
        const snapshots: string[] = [];
        for (const source of intent.subject.methodology?.sources ?? []) {
            if (!source.hash) continue;
            const path = `${METHODOLOGY_DIRECTORY}/${source.hash.slice(0, 24)}.book.txt`;
            const from = join(this.options.project.runtime.root, 'knowledge', 'content', `${source.hash}.book`);
            if (await pathExists(resolve(root, path))) continue;
            await ensureDirectory(resolve(root, METHODOLOGY_DIRECTORY));
            if (await copyFile(from, resolve(root, path)).then(() => true, () => false)) snapshots.push(path);
        }
        const absolute = resolve(root, intent.record!);
        await ensureDirectory(dirname(absolute));
        const source = intent.subject.source ? await readFile(resolve(root, intent.subject.source)).catch(() => undefined) : undefined;
        await writeFile(absolute, renderActionRecord(intent, source ? sourceRevision(source) : undefined));
        return snapshots;
    }

    /**
     * Persists one saved record; a failure keeps it saved and retries persistence only. A bulk operation's records wait
     * a bounded moment to share one scoped commit, and are reserved at once so no task commit absorbs them.
     */
    private async persist(path: string, intent: Pick<ActionIntent, 'subject' | 'operation' | 'service' | 'group'>, also: readonly string[] = []): Promise<'committed' | 'uncommitted' | 'pending'> {
        const entry: PendingRecord = { subject: intent.subject, operation: intent.operation, service: intent.service, ...(intent.group ? { group: intent.group } : {}), also };
        if (intent.group) {
            this.options.reserve?.([path, ...also].map((item) => resolve(this.options.project.root, item)));
            const earlier = this.pending.get(path);
            this.pending.set(path, { ...entry, also: [...new Set([...(earlier?.also ?? []), ...also])] });
            this.scheduleFlush(this.options.groupCommitMs ?? GROUP_COMMIT_MS);
            this.touch();
            return 'pending';
        }
        return await this.commitRecords([path], entry);
    }

    /** Commits saved records together; a failure leaves them saved and pending. */
    private async commitRecords(paths: readonly string[], entry: PendingRecord): Promise<'committed' | 'uncommitted' | 'pending'> {
        const root = this.options.project.root;
        try {
            const outcome = await this.options.persist({ path: resolve(root, paths[0]!), paths: [...paths, ...entry.also].map((path) => resolve(root, path)), count: paths.length, subject: entry.subject, operation: entry.operation, service: entry.service });
            for (const path of paths) {
                this.pending.delete(path);
                if (outcome === 'uncommitted') this.uncommitted.add(path);
                else this.uncommitted.delete(path);
            }
            this.touch();
            return outcome;
        } catch (error) {
            for (const path of paths) this.pending.set(path, this.pending.get(path) ?? entry);
            this.options.log(`The external action record${paths.length > 1 ? 's' : ''} ${paths.length > 1 ? `of ${entry.operation} (${paths.length})` : paths[0]} ${paths.length > 1 ? 'are' : 'is'} saved, but ${paths.length > 1 ? 'their' : 'its'} commit failed (${errorMessage(error)}); only the commit is retried, never the action.`, 'warning');
            this.scheduleFlush(this.options.retryMs ?? 60_000);
            this.touch();
            return 'pending';
        }
    }

    /** Commits pending records later. */
    private scheduleFlush(delayMs: number): void {
        if (this.flushTimer) return;
        this.flushTimer = setTimeout(() => {
            this.flushTimer = undefined;
            void this.flush();
        }, delayMs);
        this.flushTimer.unref?.();
    }

    /**
     * Commits every pending record (persistence only, never the action), one scoped commit per bulk operation. Returns
     * how many records were committed.
     */
    public async flush(): Promise<number> {
        return await this.flushing.run(async () => {
            const groups = new Map<string, { readonly paths: string[]; readonly entry: PendingRecord; readonly also: Set<string> }>();
            for (const [path, entry] of [...this.pending]) {
                const key = entry.group ? `group\0${entry.group}\0${entry.subject.agent}\0${entry.operation}\0${entry.service}` : `single\0${path}`;
                const group = groups.get(key) ?? { paths: [], entry, also: new Set<string>() };
                group.paths.push(path);
                for (const item of entry.also) group.also.add(item);
                groups.set(key, group);
            }
            let committed = 0;
            for (const group of groups.values()) {
                if ((await this.commitRecords(group.paths, { ...group.entry, also: [...group.also] })) === 'committed') committed += group.paths.length;
            }
            return committed;
        });
    }

    /**
     * Commits records an earlier process saved but could not commit (crash, force stop, failed hook), with their task
     * provenance. Never repeats an action.
     */
    public async recover(uncommittedPaths: readonly string[]): Promise<number> {
        const snapshots: string[] = [];
        for (const absolute of uncommittedPaths) {
            const path = relative(this.options.project.root, absolute).split(sep).join('/');
            if (path.startsWith(`${METHODOLOGY_DIRECTORY}/`)) {
                snapshots.push(path);
                continue;
            }
            if (!path.startsWith(`${ACTIONS_DIRECTORY}/`) || !path.endsWith('.md')) continue;
            const content = await readFile(absolute, 'utf8').catch(() => undefined);
            if (content === undefined) continue;
            const summary = parseActionRecord(path, content);
            const subject: ActionSubject = { taskName: summary.taskName ?? (summary.system ? '' : summary.task), source: summary.source ?? '', agent: summary.agent ?? '', attempt: 'recovered', trace: summary.evidence ?? '', ...(summary.system ? { system: summary.system } : {}) };
            this.pending.set(path, { subject, operation: summary.operation, service: summary.service ?? 'unknown service', ...(summary.group ? { group: summary.group } : {}), also: [] });
        }
        if (snapshots.length) {
            const [first] = [...this.pending.keys()];
            if (first) this.pending.set(first, { ...this.pending.get(first)!, also: [...this.pending.get(first)!.also, ...snapshots] });
            else await this.commitRecords([snapshots[0]!], { subject: { taskName: '', source: '', agent: '', attempt: 'recovered', trace: '', system: 'Knowledge evidence' }, operation: 'Methodology snapshot', service: 'Promptbook', also: snapshots.slice(1) });
        }
        return await this.flush();
    }

    /**
     * What a task already recorded or left unresolved: given to each attempt so earlier effects are reconciled before
     * any send, submission or publication is repeated. A record removed from the project (e.g. by a Git revert) still
     * describes an effect that happened, so its local intent keeps it listed.
     */
    public async taskContext(source: string, exceptId?: string): Promise<string | undefined> {
        const directory = actionDirectoryOf(source);
        const records = (await this.scan()).filter((summary) => summary.path.startsWith(`${directory}/`));
        const intents = (await this.intents()).filter((intent) => intent.subject.source === source && intent.id !== exceptId);
        const open = intents.filter((intent) => !intent.closed && !intent.record);
        const saved = new Set(records.map((summary) => summary.path));
        const removed = intents.filter((intent) => intent.record && !saved.has(intent.record) && intent.outcome !== 'not-performed');
        if (!records.length && !open.length && !removed.length) return undefined;
        const line = (summary: ActionSummary): string => `- ${summary.outcome}: ${summary.operation}${summary.service ? ` on ${summary.service}` : ''}${summary.target ? ` → ${summary.target}` : ''}${summary.at ? ` (${summary.at})` : ''} — \`${summary.path}\`${summary.id ? `, id ${summary.id}` : ''}`;
        // A bulk operation is summarized with what still needs attention, so a large one neither floods the prompt nor
        // hides its unsuccessful members; its records say exactly who was already reached.
        const batches = new Map<string, ActionSummary[]>();
        for (const summary of records) if (summary.group) batches.set(summary.group, [...(batches.get(summary.group) ?? []), summary]);
        const singles = records.filter((summary) => !summary.group);
        const lines = [
            ...singles.slice(0, CONTEXT_LIMIT).map(line),
            ...(singles.length > CONTEXT_LIMIT ? [`- … ${singles.length - CONTEXT_LIMIT} older records of this task are in \`${directory}/\`; read them before repeating anything`] : []),
            ...[...batches].flatMap(([group, members]) => {
                const outcomes = new Map<string, number>();
                for (const member of members) outcomes.set(member.outcome, (outcomes.get(member.outcome) ?? 0) + 1);
                const unsettled = members.filter((member) => member.outcome !== 'success');
                return [`- batch "${group}": ${members.length} recorded action${members.length === 1 ? '' : 's'} (${[...outcomes].sort(([a], [b]) => a.localeCompare(b)).map(([outcome, count]) => `${count} ${outcome}`).join(', ')}); each one's target is in \`${directory}/\`. Read them before continuing, never repeat a successful member, and give further members the same group.`, ...unsettled.slice(0, 10).map(line), ...(unsettled.length > 10 ? [`- … ${unsettled.length - 10} more unsuccessful members of this batch`] : [])];
            }),
            ...removed.map((intent) => `- ${normalizeOutcome(intent.outcome) ?? 'uncertain'}: ${intent.operation} on ${intent.service}${intent.target ? ` → ${intent.target}` : ''} (${intent.startedAt}, id ${intent.id}) — its record \`${intent.record}\` was removed from the project (e.g. by a Git revert), which did not undo the effect`),
            ...open.map((intent) => `- intent without a reported outcome: ${intent.operation} on ${intent.service}${intent.target ? ` → ${intent.target}` : ''} (begun ${intent.startedAt}, id ${intent.id}) — it may or may not have happened`),
        ];
        return `External actions this task already recorded (reconcile them with the service before repeating anything; update a record with its id instead of creating a duplicate):\n${lines.join('\n')}`;
    }

    /**
     * Converts intents a finished run left without an outcome into `uncertain` records: the effect may have happened, so
     * the uncertainty is preserved durably instead of being lost or assumed.
     */
    public async settle(source: string): Promise<void> {
        for (const intent of await this.intents()) {
            if (intent.subject.source !== source || intent.closed || intent.record) continue;
            await this.record(intent.subject, { id: intent.id, outcome: 'uncertain', observed: 'The run ended without reporting the outcome; the request may or may not have taken effect.' });
        }
        // The finished work's bulk records need no further waiting.
        if ([...this.pending.values()].some((entry) => entry.subject.source === source)) await this.flush();
    }

    /** Project-relative paths of every saved record: `actions/<task>/*.md` and `actions/.engine/<operation>/*.md`. */
    private async recordPaths(): Promise<string[]> {
        const root = resolve(this.options.project.root, ACTIONS_DIRECTORY);
        const paths: string[] = [];
        const files = async (directory: string): Promise<void> => {
            for (const file of await readdir(join(root, directory)).catch(() => [] as string[])) if (file.endsWith('.md')) paths.push(`${ACTIONS_DIRECTORY}/${directory}/${file}`);
        };
        for (const directory of await readdir(root, { withFileTypes: true }).catch(() => [])) {
            if (!directory.isDirectory() || `${ACTIONS_DIRECTORY}/${directory.name}` === METHODOLOGY_DIRECTORY) continue;
            if (directory.name !== '.engine') {
                await files(directory.name);
                continue;
            }
            for (const operation of await readdir(join(root, directory.name), { withFileTypes: true }).catch(() => [])) if (operation.isDirectory()) await files(`${directory.name}/${operation.name}`);
        }
        return paths;
    }

    /** Path of the rebuildable summary index (Health's cache cleanup may remove it at any time). */
    private get indexPath(): string {
        return join(this.options.project.runtime.temporary, 'external-activity-index.json');
    }

    /** Saves the rebuilt index at a bounded rate; losing it costs one re-read of the records, nothing else. */
    private saveIndex(index: Map<string, IndexEntry>): void {
        if (Date.now() - this.indexSaved < INDEX_SAVE_MS) return;
        this.indexSaved = Date.now();
        this.indexDirty = false;
        void writeJsonAtomic(this.indexPath, { version: INDEX_VERSION, files: Object.fromEntries(index) }).catch(() => undefined);
    }

    /**
     * Every saved record, newest first (parsed metadata only). Only records whose size or time changed are read again,
     * so viewing a long history stays bounded; the summaries are rebuildable from the records alone.
     */
    private async scan(): Promise<ActionSummary[]> {
        if (!this.index) {
            const saved = await readJsonIfExists<{ version: number; files: Record<string, IndexEntry> }>(this.indexPath).catch(() => undefined);
            // A foreign or damaged index is only a cold start: everything in it is rebuildable from the records.
            this.index = new Map(saved?.version === INDEX_VERSION && saved.files && typeof saved.files === 'object' ? Object.entries(saved.files).filter(([path, entry]) => entry?.summary?.path === path) : []);
        }
        const index = this.index;
        const root = this.options.project.root;
        const paths = await this.recordPaths();
        const present = new Set(paths);
        let changed = false;
        for (const path of [...index.keys()]) {
            if (present.has(path)) continue;
            index.delete(path);
            changed = true;
        }
        for (const path of paths) {
            const info = await stat(resolve(root, path)).catch(() => undefined);
            if (!info) {
                if (index.delete(path)) changed = true;
                continue;
            }
            const known = index.get(path);
            if (known && known.mtimeMs === info.mtimeMs && known.size === info.size) continue;
            const content = await readFile(resolve(root, path), 'utf8').catch(() => undefined);
            if (content === undefined) continue;
            index.set(path, { mtimeMs: info.mtimeMs, size: info.size, summary: parseActionRecord(path, content) });
            changed = true;
        }
        if (changed) {
            this.revision++;
            this.indexDirty = true;
        }
        if (this.indexDirty) this.saveIndex(index);
        const summaries = [...index.values()].map(({ summary }) => (this.pending.has(summary.path) || this.uncommitted.has(summary.path) ? { ...summary, pending: true } : summary));
        return summaries.sort((a, b) => (b.at ?? '').localeCompare(a.at ?? '') || b.path.localeCompare(a.path));
    }

    /** Refreshes the overview soon after a change (the previous one stays readable meanwhile) and notifies clients. */
    private touch(): void {
        this.revision++;
        if (this.touchTimer) return;
        this.touchTimer = setTimeout(() => {
            this.touchTimer = undefined;
            void this.refresh().then(
                () => this.options.onChange(),
                () => undefined,
            );
        }, TOUCH_DEBOUNCE_MS);
        this.touchTimer.unref?.();
    }

    /** Refreshes the bounded snapshot overview (reading saved records only). */
    public async refresh(): Promise<ActionLogView> {
        const records = await this.scan();
        const unresolved = (await this.intents()).filter((intent) => !intent.closed && !intent.record).length;
        this.cache = { total: records.length, recent: records.slice(0, VIEW_LIMIT), pending: this.pending.size + this.uncommitted.size, unresolved, revision: this.revision };
        return this.cache;
    }

    /**
     * One level of the External activity log over saved records: default batches, ungrouped, by task or by agent, with
     * the outcome filter, the post-aggregation cutoff and the chosen order. Read-only: never a retry, provider or model
     * call, backfill or commit.
     */
    public async activity(query: ActionViewQuery = {}): Promise<ActionView> {
        const records = await this.scan();
        return buildActionView(records, query, Date.now(), this.revision);
    }

    /** The last refreshed overview (undefined until the first refresh). */
    public get view(): ActionLogView | undefined {
        return this.cache;
    }

    /**
     * Reads one saved record with its verified links (confined to `actions/`; read-only, never a retry or provider call).
     */
    public async read(path: string): Promise<ActionDetail> {
        const absolute = resolve(this.options.project.root, path);
        const root = resolve(this.options.project.root, ACTIONS_DIRECTORY);
        if (!isPathInside(root, absolute) || !absolute.endsWith('.md')) throw new PtbkError(`${path} is not an external action record.`, { kind: 'usage' });
        const content = await readFile(absolute, 'utf8').catch(() => undefined);
        if (content === undefined) throw new PtbkError(`The action record ${path} no longer exists.`, { kind: 'not-found' });
        const relativePath = relative(this.options.project.root, absolute).split(sep).join('/');
        const summary = parseActionRecord(relativePath, content);
        const task = summary.source ? await accessibleProjectPath(this.options.project.root, summary.source) : undefined;
        const evidence = summary.evidence ? await accessibleProjectPath(this.options.project.root, summary.evidence) : undefined;
        const receipt = safeReceipt(summary.reference);
        const harness = summary.session && this.options.sessionKnown?.(summary.session) ? summary.session : undefined;
        const impact = sectionOf(content, 'Impact');
        const reason = /^Reason: (.*)$/m.exec(impact)?.[1];
        const methodology = impact
            .split(/\r?\n/)
            .filter((line) => line.startsWith('- '))
            .map((line) => line.slice(2));
        return { summary, content, links: { ...(task ? { task } : {}), ...(evidence ? { evidence } : {}), ...(receipt ? { receipt } : {}), ...(harness ? { harness } : {}) }, ...(reason ? { impactReason: reason } : {}), methodology };
    }

    /**
     * Removes local intents of settled actions older than a bound (records stay versioned). An intent whose record was
     * removed from the project is kept: it is the remaining evidence that the effect happened.
     */
    public async prune(maxAgeMs = 30 * 24 * 3_600_000): Promise<void> {
        for (const intent of await this.intents()) {
            if (!intent.closed || Date.now() - Date.parse(intent.startedAt) <= maxAgeMs) continue;
            if (intent.record && intent.outcome !== 'not-performed' && !(await pathExists(resolve(this.options.project.root, intent.record)))) continue;
            await rm(join(this.intentDirectory, `${intent.id}.json`), { force: true });
        }
    }

    /**
     * The bridge tools of one task attempt: begin (local intent before a consequential request) and record (the
     * observed outcome). The session is read when an action is reported, because the attempt's session opens later.
     */
    public tools(subject: ActionSubject, options: { readonly session?: () => string | undefined } = {}): BridgeTool[] {
        const guard = async (action: () => Promise<ToolResult>): Promise<ToolResult> => {
            try {
                return await action();
            } catch (error) {
                return { text: errorMessage(error), isError: true };
            }
        };
        const current = (): ActionSubject => {
            const session = options.session?.();
            return session ? { ...subject, session } : subject;
        };
        const fields = {
            operation: { type: 'string', description: 'What the action does, e.g. "Send email", "Attempt payment", "Publish post", "Submit VAT return", "Update shared document", "Open email (marks it read)".' },
            service: { type: 'string', description: 'Service or website, e.g. "Gmail", "LinkedIn", "Data box".' },
            account: { type: 'string', description: 'Account or identity used (no password or token).' },
            target: { type: 'string', description: 'Recipient, page, document or record affected.' },
            content: { type: 'string', description: 'What is sent or changed: readable content, or a project-relative file that contains it.' },
            impact: { type: 'string', description: 'Your estimate of the consequence if this action succeeds, whatever its outcome, from its content, recipient, scale and reversibility under your effective methodology: one number on the decimal logarithmic scale such as "1", "2.5" or "7" (each point is ten times the weight; never a fixed score per operation type), or "unknown" when you have no defensible estimate. Unknown is different from 0.' },
            impact_reason: { type: 'string', description: 'Short contextual reason for the estimate.' },
            group: { type: 'string', description: 'Only for one bulk operation made of many real actions, e.g. 1,000 campaign emails: a shared distinctive id such as "autumn-campaign-2026-11", the same for every member. Never for retries of one action, and never merely because operations look alike.' },
            related_to: { type: 'string', description: 'Id of a related action, e.g. the earlier one when a retry caused a second real effect.' },
        };
        return [
            {
                name: 'begin_external_action',
                description:
                    'Call right before an operation that changes or meaningfully attempts to change state outside this project: sending an email or message, attempting a payment, publishing, submitting a form or document, creating, updating or deleting a remote record or document, or a read that changes state (opening an email that marks it read), and a login when it changes session or service state or can have an external consequence. Not for pure reading, searching or downloading, internal project edits or the engine\'s own Git synchronization. Saves a local recovery intent and returns its id plus what this task already recorded. For another attempt of the same intended action, pass its id instead of the other fields: retries stay one logical action.',
                inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Id of the same intended action when this is another attempt.' }, ...fields } },
                handler: (input) => guard(() => this.begin(current(), input)),
            },
            {
                name: 'record_external_action',
                description:
                    'Record the observed outcome of an external action (with the id from begin_external_action, or without one for an action already performed). outcome: success (the service shows it), failed (a meaningful rejected attempt, e.g. a refused payment; record it, it does not mean the effect happened), pending (accepted, awaiting the result), partial, uncertain (no reliable acknowledgement; reconcile later and update with the same id) or not-performed (no real attempt happened, e.g. a setup failure). Never infer success from a timeout or from finishing the task. Two actually executed effects are two actions, even if identical or accidental: never merge or hide them.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', description: 'Id returned by begin_external_action (or of an earlier record to update after a retry or reconciliation).' },
                        outcome: { type: 'string', enum: [...OUTCOMES] },
                        observed: { type: 'string', description: 'What you observed (confirmation page, sent folder, published URL, error).' },
                        reference: { type: 'string', description: 'External reference or receipt: message id, post URL, submission number.' },
                        ...fields,
                    },
                    required: ['outcome'],
                },
                handler: (input) => guard(() => this.record(current(), input)),
            },
        ];
    }
}

/**
 * A new action id (`act-` and lowercase letters/digits).
 */
function newActionId(): string {
    return `act-${shortId(12)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 10)}`;
}

/**
 * Directory of the records of engine-owned operations (no task source): `actions/.engine/<operation>/`. The dot keeps
 * it apart from every task's `actions/<task-file-basename>/`.
 *
 * @private external action log
 */
export function engineActionDirectory(system: string): string {
    return `${ACTIONS_DIRECTORY}/.engine/${slugify(system, 40)}`;
}

/**
 * Saves the confirmed record of an external action an engine-owned operation performed itself (for example the GitHub
 * repository initialization created), attributed honestly to that operation. Returns its project-relative path; the
 * caller commits it (a record left uncommitted is committed by the next engine start, never repeated).
 *
 * @private external action log
 */
export async function saveEngineAction(
    project: Pick<Project, 'root'>,
    input: { readonly system: string; readonly operation: string; readonly service: string; readonly account?: string; readonly target?: string; readonly content: string; readonly observed: string; readonly reference?: string; readonly timeZone?: string },
): Promise<string> {
    const now = formatIsoWithOffset(Date.now(), input.timeZone);
    const directory = engineActionDirectory(input.system);
    const base = `${now.slice(0, 16).replace('T', '-').replace(':', '')}-${slugify(`${input.operation} ${input.service}`, 60)}`;
    const existing = new Set(await readdir(resolve(project.root, directory)).catch(() => [] as string[]));
    let name = `${base}.md`;
    for (let index = 2; existing.has(name); index++) name = `${base}-${index}.md`;
    const path = `${directory}/${name}`;
    const redact = createRedactor();
    const intent: ActionIntent = {
        version: 1,
        id: newActionId(),
        subject: { taskName: '', source: '', agent: '', attempt: input.system, trace: '', system: input.system },
        operation: input.operation,
        service: input.service,
        account: input.account,
        target: input.target,
        content: redact(input.content),
        startedAt: now,
        // No executing agent evaluated it, so no score is invented for the engine's own operation.
        impact: 'unknown',
        impactReason: 'An engine-owned operation: no executing agent estimated its impact.',
        attempts: 1,
        outcome: 'success',
        observed: redact(input.observed),
        reference: input.reference,
        record: path,
        history: [`${now} — success: ${redact(input.observed).replace(/\s+/g, ' ').slice(0, 200)} (${input.system})`],
        closed: true,
    };
    await ensureDirectory(resolve(project.root, directory));
    await writeFile(resolve(project.root, path), renderActionRecord(intent));
    return path;
}

/**
 * Renders the readable Markdown record of an action (metadata as labelled fields, then content, outcome and history).
 *
 * @private external action log
 */
export function renderActionRecord(intent: ActionIntent, revision?: string): string {
    const field = (label: string, value: string | number | undefined): string[] => (value === undefined || value === '' ? [] : [`- **${label}:** ${String(value).replace(/\s+/g, ' ')}`]);
    const impact = intent.impact ?? 'unknown';
    const methodology = methodologyLines(intent.subject.methodology);
    return [
        `# ${intent.operation.replace(/\s+/g, ' ')} · ${intent.service.replace(/\s+/g, ' ')}`,
        '',
        ...field('Outcome', normalizeOutcome(intent.outcome) ?? 'uncertain'),
        ...field('Impact', impact),
        ...field('Action time', intent.startedAt),
        ...field('Recorded', intent.history.length ? intent.history[intent.history.length - 1]!.split(' — ')[0] : intent.startedAt),
        ...field('Group', intent.group),
        ...field('Related action', intent.related),
        ...field('Attempts', intent.attempts),
        ...field('Agent', intent.subject.agent),
        ...field('System operation', intent.subject.system),
        ...field('Task', intent.subject.taskName),
        ...field('Task source', intent.subject.source ? `${intent.subject.source}${revision ? ` (revision ${revision.slice(0, 12)})` : ''}` : undefined),
        ...field('Occurrence', intent.subject.occurrence),
        ...field('Service', intent.service),
        ...field('Account', intent.account),
        ...field('Target', intent.target),
        ...field('External reference', intent.reference),
        ...field('Evidence', intent.subject.trace ? `${intent.subject.trace}/` : undefined),
        ...field('Harness session', intent.subject.session),
        ...field('Action ID', intent.id),
        '',
        '## What was sent or changed',
        '',
        intent.content ?? '_Not described by the agent._',
        '',
        '## Observed outcome',
        '',
        intent.observed ?? '_No observation was reported._',
        '',
        '## Impact',
        '',
        impact === 'unknown' ? 'Unknown: no defensible estimate was given. This is different from impact 0.' : `${impact}, the estimated consequence if the action succeeds, whatever its outcome.`,
        ...(intent.impactReason ? ['', `Reason: ${intent.impactReason.replace(/\s+/g, ' ')}`] : []),
        ...(methodology.length ? ['', 'Methodology:', '', ...methodology.map((line) => `- ${line}`)] : []),
        '',
        '## History',
        '',
        ...intent.history.map((line) => `- ${line}`),
        '',
    ].join('\n');
}

/**
 * The saved methodology evidence of an estimate in words: what the agent received, from where, and which local Books may
 * extend or override it. A missing source is stated, never presented as if its rules were applied.
 */
function methodologyLines(methodology: MethodologyEvidence | undefined): string[] {
    if (!methodology) return [];
    return [
        ...methodology.sources.map((source) =>
            source.availability === 'missing'
                ? `${source.url}: not available when estimated (${source.reason ?? 'unknown reason'}); referenced by ${source.via} (${source.book})`
                : `${source.url}: ${source.release ? `release ${source.release}` : 'no declared release'}, sha256 ${source.hash}, ${source.availability === 'cached' ? `cached copy${source.reason ? ` (${source.reason})` : ''}` : source.availability}${source.fetchedAt ? `, retrieved ${source.fetchedAt}` : ''}; referenced by ${source.via} (${source.book}); durable copy \`${METHODOLOGY_DIRECTORY}/${source.hash?.slice(0, 24)}.book.txt\``,
        ),
        ...methodology.books.map((book) => `Local Book ${book.path} (${book.agent}): revision ${book.revision}`),
        ...(methodology.engine ? [`Engine ${methodology.engine}: Expert layer`] : []),
    ];
}

/**
 * The text of one `## Section` of a record.
 */
function sectionOf(content: string, heading: string): string {
    const lines = content.split(/\r?\n/);
    // The last one: the free-form sections above it could contain the same heading.
    const start = lines.lastIndexOf(`## ${heading}`);
    if (start < 0) return '';
    const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
    return lines.slice(start + 1, end < 0 ? undefined : end).join('\n');
}

/**
 * Parses the metadata of a saved record (tolerant: an edited or foreign record keeps what can be read).
 *
 * @private external action log
 */
export function parseActionRecord(path: string, content: string): ActionSummary {
    const fields = new Map<string, string>();
    let title = '';
    for (const line of content.split(/\r?\n/)) {
        if (line.startsWith('## ')) break;
        if (!title && line.startsWith('# ')) title = line.slice(2).trim();
        const match = FIELD_LINE.exec(line);
        if (match) fields.set(match[1]!.toLowerCase(), match[2]!.trim());
    }
    const [operation, service] = title.split(' · ');
    // The task's source basename, or `.engine/<operation>` of an engine-owned operation.
    const task = path.split('/').slice(1, -1).join('/');
    const recorded = fields.get('recorded');
    const impact = fields.get('impact');
    const score = impact === undefined || impact.toLowerCase() === 'unknown' ? Number.NaN : Number(impact);
    const attempts = Number(fields.get('attempts'));
    return {
        path,
        task,
        taskName: fields.get('task'),
        source: fields.get('task source')?.replace(/ \(revision [0-9a-f]+\)$/, ''),
        system: fields.get('system operation'),
        operation: operation?.trim() || path.split('/').pop()!.replace(/\.md$/, ''),
        service: fields.get('service') ?? service?.trim(),
        account: fields.get('account'),
        target: fields.get('target'),
        outcome: normalizeOutcome(fields.get('outcome')) ?? 'unknown',
        at: fields.get('action time') ?? recorded,
        recordedAt: recorded,
        // Anything but one finite nonnegative number stays unknown rather than becoming 0.
        ...(Number.isFinite(score) && score >= 0 ? { impact: score } : {}),
        ...(fields.get('group') ? { group: fields.get('group') } : {}),
        ...(fields.get('related action') ? { related: fields.get('related action') } : {}),
        ...(Number.isInteger(attempts) && attempts > 0 ? { attempts } : {}),
        ...(fields.get('harness session') ? { session: fields.get('harness session') } : {}),
        agent: fields.get('agent'),
        reference: fields.get('external reference'),
        evidence: fields.get('evidence')?.replace(/\/$/, ''),
        id: fields.get('action id'),
    };
}
