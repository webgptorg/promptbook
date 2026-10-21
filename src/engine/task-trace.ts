import { createHash } from 'node:crypto';
import { appendFile, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { errorMessage } from '../common/errors.js';
import { ensureDirectory, pathExists, toProjectRelative } from '../common/fs.js';
import { createRedactor } from '../common/redact.js';
import { ENGINE_VERSION } from '../common/version.js';
import type { Project } from '../project/workspace.js';
import { legacyTraceDirectoryOf, traceDirectoryOf } from '../tasks/identity.js';

/**
 * Largest consolidated harness log of one task; further output is omitted with a visible note.
 */
const MAX_HARNESS_LOG_BYTES = 64 * 1024 * 1024;

/**
 * Largest event log of one task.
 */
const MAX_EVENT_LOG_BYTES = 16 * 1024 * 1024;

/**
 * Longest single string rendered from a harness event (huge payloads such as images are cut visibly).
 */
const MAX_FIELD_CHARS = 200_000;

/**
 * File names inside `traces/<task-file-basename>/`.
 *
 * @private task traces
 */
export const TRACE_FILES = {
    /** Consolidated readable harness output of every attempt, occurrence and consultation. */
    harness: 'harness.log',
    /** Task-linked events (selection, attempts, checks, waits, outcomes) as JSON lines. */
    events: 'events.jsonl',
    /** Browser recording status and segments. */
    video: 'video.json',
    /** Directory of browser recordings. */
    videoDirectory: 'video',
    /** Events after the result commit (never part of the committed snapshot). */
    localEvents: join('local', 'events.jsonl'),
} as const;

/**
 * The task a trace belongs to: its declared name (logical identity) and actual project-relative source path (which
 * alone decides the evidence directory).
 *
 * @private task traces
 */
export type TraceSubject = { readonly name: string; readonly source: string };

/**
 * Git blob hash of a source's content: the exact source revision evidence refers to (no Git call needed).
 *
 * @private task traces
 */
export function sourceRevision(content: string | Buffer): string {
    const bytes = typeof content === 'string' ? Buffer.from(content) : content;
    return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

/**
 * Root-level audit trail of one task: `traces/<task-file-basename>/`, named literally after the task's source file.
 *
 * Writing never throws; an unavailable trace is reported once through `problem` instead of inventing a saved path.
 *
 * @private task traces
 */
export class TaskTrace {
    /** Absolute directory. */
    public readonly directory: string;
    /** Project-relative POSIX directory (`traces/<task-file-basename>`). */
    public readonly relativeDirectory: string;
    /** Why evidence could not be written (first failure). */
    public problem?: string;
    private queue: Promise<void> = Promise.resolve();
    private readonly redact: (text: string) => string;
    private readonly truncated = new Set<string>();
    private readonly sizes = new Map<string, number>();

    private constructor(
        private readonly project: Project,
        /** The task the trace belongs to (declared name and actual source). */
        public readonly subject: TraceSubject,
        secrets: readonly string[],
    ) {
        this.relativeDirectory = traceDirectoryOf(subject.source);
        this.directory = join(project.root, this.relativeDirectory);
        this.redact = createRedactor(secrets);
    }

    /** Declared task name the trace belongs to (recorded in its events; not its directory name). */
    public get taskName(): string {
        return this.subject.name;
    }

    /** Literal source basename naming the trace directory (`traces/<basename>/`). */
    public get key(): string {
        return this.relativeDirectory.slice('traces/'.length);
    }

    /**
     * Opens (creating when needed) the trace directory of a task, named literally after its source file.
     *
     * Evidence an older engine stored under the task's name-derived directory stays where it is; when it verifiably
     * belongs to this task (same declared name or source), the new trace links it as historical evidence.
     */
    public static async open(project: Project, subject: TraceSubject, secrets: readonly string[] = []): Promise<TaskTrace> {
        const trace = new TaskTrace(project, subject, secrets);
        let fresh = false;
        try {
            fresh = !(await pathExists(trace.directory));
            await ensureDirectory(trace.directory);
        } catch (error) {
            trace.problem = `Trace storage ${trace.relativeDirectory} is unavailable: ${errorMessage(error)}`;
        }
        if (fresh && !trace.problem) {
            const legacy = await historicalEvidence(project, subject);
            if (legacy && legacy !== trace.relativeDirectory) await trace.event('historical-evidence', { directory: `${legacy}/`, name: subject.name, source: subject.source });
        }
        return trace;
    }

    /**
     * Records the declared name, actual source path and source revision of the evidence that follows (every run,
     * retry, occurrence and consultation remains attributable after renames).
     */
    public async provenance(data: Readonly<Record<string, unknown>> = {}): Promise<void> {
        const content = await readFile(join(this.project.root, this.subject.source)).catch(() => undefined);
        await this.event('provenance', { name: this.subject.name, source: this.subject.source, sourceRevision: content ? sourceRevision(content) : null, ...data });
    }

    /** Project-relative path of the consolidated harness log. */
    public get harnessLog(): string {
        return `${this.relativeDirectory}/${TRACE_FILES.harness}`;
    }

    /** Project-relative path of the event log. */
    public get eventLog(): string {
        return `${this.relativeDirectory}/${TRACE_FILES.events}`;
    }

    /** Usable path for references: the harness log, or `undefined` when nothing could be stored. */
    public get reference(): string | undefined {
        return this.problem ? undefined : this.harnessLog;
    }

    /**
     * Appends a task event (`local` events happen after the result commit and stay out of it).
     */
    public async event(name: string, data: Readonly<Record<string, unknown>> = {}, options: { local?: boolean } = {}): Promise<void> {
        const line = JSON.stringify({ at: new Date().toISOString(), event: name, ...data });
        await this.append(options.local ? TRACE_FILES.localEvents : TRACE_FILES.events, `${this.redact(line)}\n`, MAX_EVENT_LOG_BYTES);
    }

    /**
     * Starts a clearly delimited section of the harness log (attempt, occurrence, consultation, check).
     */
    public async section(title: string, details: readonly string[] = []): Promise<void> {
        const rule = '─'.repeat(Math.max(8, 72 - title.length));
        await this.text(`\n──── ${title} ${rule}\n${details.map((detail) => `${detail}\n`).join('')}`);
    }

    /**
     * Appends readable text to the harness log.
     */
    public async text(text: string): Promise<void> {
        await this.append(TRACE_FILES.harness, this.redact(text.endsWith('\n') ? text : `${text}\n`), MAX_HARNESS_LOG_BYTES);
    }

    /**
     * Appends one line of harness output in readable form (JSON events become indented key/value text).
     */
    public output(stream: 'stdout' | 'stderr', line: string): void {
        void this.text(stream === 'stderr' ? `[stderr] ${line}` : readableHarnessLine(line));
    }

    /** Waits until queued writes are on disk (before staging a commit). */
    public async flush(): Promise<void> {
        await this.queue;
    }

    /**
     * Serialized, bounded and failure-tolerant append.
     */
    private async append(file: string, text: string, maxBytes: number): Promise<void> {
        const write = async (): Promise<void> => {
            if (this.problem && this.problem.startsWith('Trace storage')) return;
            const path = join(this.directory, file);
            try {
                if (!this.sizes.has(file)) {
                    await ensureDirectory(join(path, '..'));
                    this.sizes.set(file, await stat(path).then((stats) => stats.size, () => 0));
                }
                const size = this.sizes.get(file)!;
                if (this.truncated.has(file)) return;
                const bytes = Buffer.byteLength(text);
                if (size + bytes > maxBytes) {
                    this.truncated.add(file);
                    const note = `\n[ptbk] ${toProjectRelative(this.project.root, path)} reached its ${Math.round(maxBytes / 1024 / 1024)} MB bound; further output of this task is omitted here.\n`;
                    await appendFile(path, note);
                    this.sizes.set(file, size + Buffer.byteLength(note));
                    return;
                }
                await appendFile(path, text);
                this.sizes.set(file, size + bytes);
            } catch (error) {
                this.problem ??= `Trace storage ${this.relativeDirectory} is unavailable: ${errorMessage(error)}`;
            }
        };
        this.queue = this.queue.then(write, write);
        await this.queue;
    }
}

/**
 * The name-derived evidence directory of an older engine when it verifiably belongs to the task (its events name the
 * same declared name or source); ambiguous directories are not attributed.
 */
async function historicalEvidence(project: Project, subject: TraceSubject): Promise<string | undefined> {
    const legacy = legacyTraceDirectoryOf(subject.name);
    const events = await readFile(join(project.root, legacy, TRACE_FILES.events), 'utf8').catch(() => undefined);
    if (!events) return undefined;
    for (const line of events.split('\n')) {
        try {
            const event = JSON.parse(line) as { title?: string; name?: string; source?: string };
            if (event.source === subject.source || event.title === subject.name || event.name === subject.name) return legacy;
        } catch {
            // a torn line proves nothing
        }
    }
    return undefined;
}

/**
 * Header line of a new trace (engine version and task identity).
 *
 * @private task traces
 */
export function traceHeader(task: { readonly title: string; readonly source: string }): string {
    return `ptbk ${ENGINE_VERSION} · task {${task.title}} · ${task.source}`;
}

/**
 * Renders one line of harness output: JSON events as indented readable text (losslessly), other text verbatim.
 *
 * @private task traces
 */
export function readableHarnessLine(line: string): string {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return line;
    let value: unknown;
    try {
        value = JSON.parse(trimmed);
    } catch {
        return line;
    }
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return line;
    const record = value as Record<string, unknown>;
    const types = [record.type, (record.item as Record<string, unknown> | undefined)?.type, (record.msg as Record<string, unknown> | undefined)?.type].filter((part): part is string => typeof part === 'string');
    const body = readableValue(value, 1);
    return `[${types.join(' / ') || 'event'}]${body.startsWith('\n') ? body : ` ${body}`}`;
}

/**
 * YAML-like rendering of a JSON value (multi-line strings become indented blocks).
 */
function readableValue(value: unknown, depth: number): string {
    const indent = '  '.repeat(depth);
    if (typeof value === 'string') {
        const text = value.length > MAX_FIELD_CHARS ? `${value.slice(0, MAX_FIELD_CHARS)}… [${value.length - MAX_FIELD_CHARS} more characters omitted]` : value;
        return text.includes('\n') ? `|\n${text.split('\n').map((line) => `${indent}${line}`).join('\n')}` : JSON.stringify(text);
    }
    if (value === null || typeof value !== 'object') return String(value);
    if (Array.isArray(value)) {
        if (!value.length) return '[]';
        return `\n${value.map((item) => `${indent}- ${readableValue(item, depth + 1).replace(/^\n\s*/, '')}`).join('\n')}`;
    }
    const record = value as Record<string, unknown>;
    // Images returned to the model (browser screenshots) are evidence for the model, not readable log text.
    const entries = Object.entries(record).map(([key, item]): [string, unknown] => (record.type === 'image' && key === 'data' && typeof item === 'string' ? [key, `[image data, ${item.length} base64 characters omitted]`] : [key, item]));
    if (!entries.length) return '{}';
    return `\n${entries.map(([key, item]) => `${indent}${key}: ${readableValue(item, depth + 1)}`).join('\n')}`;
}
