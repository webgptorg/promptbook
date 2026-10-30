import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { PtbkError, errorMessage } from '../common/errors.js';
import { ensureDirectory, isPathInside, pathExists, readJsonIfExists, writeJsonAtomic } from '../common/fs.js';
import { shortId, slugify } from '../common/ids.js';
import { createRedactor, REDACTED } from '../common/redact.js';
import { formatIsoWithOffset } from '../common/time.js';
import { accessibleProjectPath } from '../project/files.js';
import type { Project } from '../project/workspace.js';
import { ACTIONS_DIRECTORY, actionDirectoryOf } from '../tasks/identity.js';
import type { BridgeTool, ToolResult } from './bridge.js';
import { sourceRevision } from './task-trace.js';

/**
 * Observed outcome of one external action: a `confirmed`, `partial` or `uncertain` effect is a durable record;
 * `not-performed` closes an intent without fabricating a record (a known failure without a mutation belongs in the
 * trace), or corrects an earlier uncertain record after reconciliation.
 *
 * @private external action log
 */
export type ActionOutcome = 'confirmed' | 'partial' | 'uncertain' | 'not-performed';

/**
 * Outcomes accepted from agents.
 */
const OUTCOMES: readonly ActionOutcome[] = ['confirmed', 'partial', 'uncertain', 'not-performed'];

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
    readonly startedAt: string;
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
    readonly at?: string;
    readonly agent?: string;
    readonly reference?: string;
    readonly evidence?: string;
    readonly id?: string;
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
};

/**
 * Most records kept in the snapshot overview.
 */
const VIEW_LIMIT = 200;

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
export type ActionLinks = { readonly task?: string; readonly evidence?: string; readonly receipt?: string };

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
export type ActionPersistence = (record: { readonly path: string; readonly subject: ActionSubject; readonly operation: string; readonly service: string }) => Promise<'committed' | 'uncommitted'>;

/**
 * The engine-owned durable audit of external task actions: one readable Markdown record per logical remote mutation
 * under `actions/<task-file-basename>/`, versioned independently of trace settings and final task success, plus local
 * recovery intents that let a lost acknowledgement be reconciled instead of repeated. Reads, searches and downloads are
 * never recorded; no task directory exists without an action, and nothing is backfilled.
 *
 * @private external action log
 */
export class ActionLog {
    /** Saved records whose commit failed (retried without repeating the remote effect). */
    private readonly pending = new Map<string, { readonly subject: ActionSubject; readonly operation: string; readonly service: string }>();
    /** Saved records persisted as explicitly uncommitted (no-commit workflows). */
    private readonly uncommitted = new Set<string>();
    private retryTimer?: NodeJS.Timeout;
    private cache?: ActionLogView;
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
     * Saves the local recovery intent of a consequential request before it is sent. Returns its id and what this task
     * already recorded, so an earlier effect is reconciled instead of repeated.
     */
    public async begin(subject: ActionSubject, input: Readonly<Record<string, unknown>>): Promise<ToolResult> {
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
            history: [`${this.now()} — intent recorded before the request (attempt ${subject.attempt})`],
            closed: false,
        };
        await this.saveIntent(intent);
        this.touch();
        const earlier = await this.taskContext(subject.source, intent.id);
        return {
            text: `Recorded the intent ${intent.id}. Perform the request now, then call record_external_action with id "${intent.id}" and the observed outcome (confirmed, partial, uncertain, or not-performed if nothing changed). If the response is lost or times out, check the service for the actual result before any retry; never repeat a confirmed effect.${earlier ? `\n\n${earlier}` : ''}`,
        };
    }

    /**
     * Records the observed outcome of an external action: a new or updated Markdown record (never a duplicate for the
     * same logical action), saved at once and persisted independently of the task's later success.
     */
    public async record(subject: ActionSubject, input: Readonly<Record<string, unknown>>): Promise<ToolResult> {
        const outcome = OUTCOMES.find((value) => value === input.outcome);
        if (!outcome) return { text: `outcome must be one of ${OUTCOMES.join(', ')}.`, isError: true };
        const id = typeof input.id === 'string' ? input.id.trim() : '';
        let intent = id ? await this.intent(id) : undefined;
        if (id && !intent) {
            const located = await this.locate(id);
            if (!located) return { text: `No external action ${id} is known to this project. Omit id to record a new action.`, isError: true };
            return await this.amend(located, subject, outcome, input);
        }
        if (!intent) {
            const operation = this.text(input.operation);
            const service = this.text(input.service);
            if (!operation || !service) return { text: 'Without an id, operation and service are required.', isError: true };
            intent = { version: 1, id: newActionId(), subject, operation, service, account: this.text(input.account), target: this.text(input.target), content: this.text(input.content, true), startedAt: this.now(), history: [], closed: false };
        }
        const observed = this.text(input.observed, true);
        const reference = this.text(input.reference);
        const updated: ActionIntent = {
            ...intent,
            subject: { ...intent.subject, attempt: subject.attempt },
            account: intent.account ?? this.text(input.account),
            target: intent.target ?? this.text(input.target),
            content: intent.content ?? this.text(input.content, true),
            outcome,
            observed: observed ?? intent.observed,
            reference: reference ?? intent.reference,
            history: [...intent.history, `${this.now()} — ${outcome}${observed ? `: ${observed.replace(/\s+/g, ' ').slice(0, 200)}` : ''} (attempt ${subject.attempt})`],
            closed: outcome !== 'uncertain',
        };
        if (outcome === 'not-performed' && !intent.record) {
            // Nothing changed remotely: no record is fabricated; the trace keeps the attempt.
            await this.saveIntent(updated);
            this.touch();
            return { text: `Closed ${updated.id} without a record (nothing changed remotely).` };
        }
        const path = intent.record ?? (await this.allocate(updated));
        const saved: ActionIntent = { ...updated, record: path };
        await this.write(saved);
        await this.saveIntent(saved);
        const persistence = await this.persist(path, saved);
        return {
            text: `Saved ${path} (${outcome}${persistence === 'committed' ? ', committed' : persistence === 'uncommitted' ? ', saved without a commit' : ', commit pending'}).${outcome === 'uncertain' ? ` Reconcile it with the service and update it with id "${saved.id}" once the actual result is known; do not repeat the request blindly.` : ''}`,
        };
    }

    /** Updates a versioned record whose local intent is not available (another host or a cleaned runtime). */
    private async amend(path: string, subject: ActionSubject, outcome: ActionOutcome, input: Readonly<Record<string, unknown>>): Promise<ToolResult> {
        const absolute = resolve(this.options.project.root, path);
        const content = await readFile(absolute, 'utf8');
        const observed = this.text(input.observed, true);
        const history = `- ${this.now()} — ${outcome}${observed ? `: ${observed.replace(/\s+/g, ' ').slice(0, 200)}` : ''} (attempt ${subject.attempt}, reconciled)`;
        let updated = content.replace(/^- \*\*Outcome:\*\* .*$/m, `- **Outcome:** ${outcome}`);
        const reference = this.text(input.reference);
        if (reference && !/^- \*\*External reference:\*\*/m.test(updated)) updated = updated.replace(/^(- \*\*Outcome:\*\* .*)$/m, `$1\n- **External reference:** ${reference}`);
        updated = /^## History$/m.test(updated) ? `${updated.trimEnd()}\n${history}\n` : `${updated.trimEnd()}\n\n## History\n\n${history}\n`;
        await writeFile(absolute, updated);
        const summary = parseActionRecord(path, updated);
        await this.persist(path, { subject, operation: summary.operation, service: summary.service ?? 'unknown service' });
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

    /** Writes the readable Markdown record of an action. */
    private async write(intent: ActionIntent): Promise<void> {
        const absolute = resolve(this.options.project.root, intent.record!);
        await ensureDirectory(resolve(absolute, '..'));
        const source = await readFile(resolve(this.options.project.root, intent.subject.source)).catch(() => undefined);
        await writeFile(absolute, renderActionRecord(intent, source ? sourceRevision(source) : undefined));
    }

    /** Persists one saved record; a failure keeps it saved and retries persistence only. */
    private async persist(path: string, intent: Pick<ActionIntent, 'subject' | 'operation' | 'service'>): Promise<'committed' | 'uncommitted' | 'pending'> {
        const entry = { subject: intent.subject, operation: intent.operation, service: intent.service };
        try {
            const outcome = await this.options.persist({ path: resolve(this.options.project.root, path), ...entry });
            this.pending.delete(path);
            if (outcome === 'uncommitted') this.uncommitted.add(path);
            else this.uncommitted.delete(path);
            this.touch();
            return outcome;
        } catch (error) {
            this.pending.set(path, entry);
            this.options.log(`The external action record ${path} is saved, but its commit failed (${errorMessage(error)}); only the commit is retried, never the action.`, 'warning');
            this.scheduleRetry();
            this.touch();
            return 'pending';
        }
    }

    /** Retries pending record commits later. */
    private scheduleRetry(): void {
        if (this.retryTimer) return;
        this.retryTimer = setTimeout(() => {
            this.retryTimer = undefined;
            void this.flush();
        }, this.options.retryMs ?? 60_000);
        this.retryTimer.unref?.();
    }

    /** Retries every pending record commit (persistence only). */
    public async flush(): Promise<void> {
        for (const [path, entry] of [...this.pending]) await this.persist(path, entry);
    }

    /**
     * Commits records an earlier process saved but could not commit (crash, force stop, failed hook), with their task
     * provenance. Never repeats an action.
     */
    public async recover(uncommittedPaths: readonly string[]): Promise<number> {
        let recovered = 0;
        for (const absolute of uncommittedPaths) {
            const path = relative(this.options.project.root, absolute).split(sep).join('/');
            if (!path.startsWith(`${ACTIONS_DIRECTORY}/`) || !path.endsWith('.md')) continue;
            const content = await readFile(absolute, 'utf8').catch(() => undefined);
            if (content === undefined) continue;
            const summary = parseActionRecord(path, content);
            const subject: ActionSubject = { taskName: summary.taskName ?? (summary.system ? '' : summary.task), source: summary.source ?? '', agent: summary.agent ?? '', attempt: 'recovered', trace: summary.evidence ?? '', ...(summary.system ? { system: summary.system } : {}) };
            if ((await this.persist(path, { subject, operation: summary.operation, service: summary.service ?? 'unknown service' })) === 'committed') recovered++;
        }
        return recovered;
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
        const lines = [
            ...records.slice(0, 30).map((summary) => `- ${summary.outcome}: ${summary.operation}${summary.service ? ` on ${summary.service}` : ''}${summary.target ? ` → ${summary.target}` : ''}${summary.at ? ` (${summary.at})` : ''} — \`${summary.path}\`${summary.id ? `, id ${summary.id}` : ''}`),
            ...removed.map((intent) => `- ${intent.outcome ?? 'uncertain'}: ${intent.operation} on ${intent.service}${intent.target ? ` → ${intent.target}` : ''} (${intent.startedAt}, id ${intent.id}) — its record \`${intent.record}\` was removed from the project (e.g. by a Git revert), which did not undo the effect`),
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
    }

    /** Every saved record, newest first (parsed metadata only). */
    private async scan(): Promise<ActionSummary[]> {
        const root = resolve(this.options.project.root, ACTIONS_DIRECTORY);
        const summaries: ActionSummary[] = [];
        for (const directory of await readdir(root, { withFileTypes: true }).catch(() => [])) {
            if (!directory.isDirectory()) continue;
            for (const file of await readdir(join(root, directory.name)).catch(() => [] as string[])) {
                if (!file.endsWith('.md')) continue;
                const path = `${ACTIONS_DIRECTORY}/${directory.name}/${file}`;
                const content = await readFile(join(root, directory.name, file), 'utf8').catch(() => undefined);
                if (content === undefined) continue;
                const summary = parseActionRecord(path, content);
                summaries.push(this.pending.has(path) || this.uncommitted.has(path) ? { ...summary, pending: true } : summary);
            }
        }
        return summaries.sort((a, b) => (b.at ?? '').localeCompare(a.at ?? '') || b.path.localeCompare(a.path));
    }

    /** Refreshes the overview after a change (the previous one stays readable meanwhile) and notifies clients. */
    private touch(): void {
        void this.refresh().then(
            () => this.options.onChange(),
            () => undefined,
        );
    }

    /** Refreshes the bounded snapshot overview (reading saved records only). */
    public async refresh(): Promise<ActionLogView> {
        const records = await this.scan();
        const unresolved = (await this.intents()).filter((intent) => !intent.closed && !intent.record).length;
        this.cache = { total: records.length, recent: records.slice(0, VIEW_LIMIT), pending: this.pending.size + this.uncommitted.size, unresolved };
        return this.cache;
    }

    /** The last refreshed overview (undefined until the first refresh). */
    public get view(): ActionLogView | undefined {
        return this.cache;
    }

    /**
     * Reads one saved record with its verified links (confined to `actions/`; read-only, never a retry or provider call).
     */
    public async read(path: string): Promise<{ readonly summary: ActionSummary; readonly content: string; readonly links: ActionLinks }> {
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
        return { summary, content, links: { ...(task ? { task } : {}), ...(evidence ? { evidence } : {}), ...(receipt ? { receipt } : {}) } };
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
     * observed outcome).
     */
    public tools(subject: ActionSubject): BridgeTool[] {
        const guard = async (action: () => Promise<ToolResult>): Promise<ToolResult> => {
            try {
                return await action();
            } catch (error) {
                return { text: errorMessage(error), isError: true };
            }
        };
        const fields = {
            operation: { type: 'string', description: 'What the action does, e.g. "Send email", "Publish post", "Submit VAT return", "Update shared document".' },
            service: { type: 'string', description: 'Service or website, e.g. "Gmail", "LinkedIn", "Data box".' },
            account: { type: 'string', description: 'Account or identity used (no password or token).' },
            target: { type: 'string', description: 'Recipient, page, document or record affected.' },
            content: { type: 'string', description: 'What is sent or changed: readable content, or a project-relative file that contains it.' },
        };
        return [
            {
                name: 'begin_external_action',
                description:
                    'Call right before a request that changes state outside the repository: sending an email or message, publishing a post, submitting a form or document, creating, updating or deleting a remote record or document. Not for reading, searching or downloading. Saves a local recovery intent and returns its id plus what this task already recorded.',
                inputSchema: { type: 'object', properties: fields, required: ['operation', 'service'] },
                handler: (input) => guard(() => this.begin(subject, input)),
            },
            {
                name: 'record_external_action',
                description:
                    'Record the observed outcome of an external action (with the id from begin_external_action, or without one for an action already performed). outcome: confirmed (the service shows it), partial, uncertain (no reliable acknowledgement; reconcile later and update with the same id) or not-performed (nothing changed). Never infer success from a timeout or from finishing the task.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', description: 'Id returned by begin_external_action (or of an earlier record to update after reconciliation).' },
                        outcome: { type: 'string', enum: [...OUTCOMES] },
                        observed: { type: 'string', description: 'What you observed (confirmation page, sent folder, published URL, error).' },
                        reference: { type: 'string', description: 'External reference or receipt: message id, post URL, submission number.' },
                        ...fields,
                    },
                    required: ['outcome'],
                },
                handler: (input) => guard(() => this.record(subject, input)),
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
        outcome: 'confirmed',
        observed: redact(input.observed),
        reference: input.reference,
        record: path,
        history: [`${now} — confirmed: ${redact(input.observed).replace(/\s+/g, ' ').slice(0, 200)} (${input.system})`],
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
    const field = (label: string, value: string | undefined): string[] => (value ? [`- **${label}:** ${value.replace(/\s+/g, ' ')}`] : []);
    return [
        `# ${intent.operation} · ${intent.service}`,
        '',
        ...field('Outcome', intent.outcome ?? 'uncertain'),
        ...field('Recorded', intent.history.length ? intent.history[intent.history.length - 1]!.split(' — ')[0] : intent.startedAt),
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
        '## History',
        '',
        ...intent.history.map((line) => `- ${line}`),
        '',
    ].join('\n');
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
    const task = path.split('/')[1] ?? '';
    const recorded = fields.get('recorded');
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
        outcome: fields.get('outcome') ?? 'unknown',
        at: recorded,
        agent: fields.get('agent'),
        reference: fields.get('external reference'),
        evidence: fields.get('evidence')?.replace(/\/$/, ''),
        id: fields.get('action id'),
    };
}
