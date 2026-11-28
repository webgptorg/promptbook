import { createHash } from 'crypto';
import { parseAgentMessageRuntimeLogEvents } from '../../../../src/utils/agent-message-runtime/parseAgentMessageRuntimeLogEvents';
import type { LiveScriptOutputSource } from '../../common/runGoScript/captureLiveScriptOutput';
import { createScriptOutputLineReader } from '../../common/runGoScript/createScriptOutputLineReader';
import { stripAnsi } from '../coderRunUiText';
import {
    type CoderOutputEvent,
    type CoderOutputKind,
    type CoderOutputRecord,
    outputRecord,
    outputText,
} from './CoderOutputEvent';
import { normalizeCoderOutputRecord, type CoderOutputRecordContext } from './normalizeCoderOutputRecord';

/** Dashboard limits only; the runtime log and runner's captured output are untouched. */
const MAX_RAW_CHARACTERS = 256_000;
/** Bound record assembly even when a harness never writes a newline. */
const MAX_FRAGMENT_CHARACTERS = 32_000;
/** Limit both entry count and text size so high-volume tasks cannot grow the dashboard indefinitely. */
const MAX_EVENTS = 160;
/** Long tool output keeps its tail and explicitly points to the raw trace. */
const MAX_EVENT_CHARACTERS = 8_000;
/** Chunk count also needs a bound when a stream emits single-character deltas. */
const MAX_RAW_CHUNKS = 2048;

/** JSON framing, including shell prefixes, without mistaking bracketed logger labels for JSON arrays. */
const STRUCTURED_OUTPUT_PATTERN = /^\s*\{|\{\s*"|^\s*\[\s*(?:[\[{"\d-]|true|false|null|$)/;

/** Text-only diagnostics need explicit markers; merely mentioning an error is not a failure event. */
const REPORTED_FAILURE_PATTERN =
    /^(?:[\w.]*Error|error|fatal):|^FAIL(?:\s|$)|^npm (?:ERR!|error)(?:\s|$)|\bexited (?:with (?:code )?)?[1-9]\d*\b/i;
/** Recognizes standard CLI/runtime warning prefixes without relabeling the agent's prose. */
const REPORTED_WARNING_PATTERN =
    /^(?:(?:\([^)]*\)|\[[^\]]*\])\s*)*(?:warning|warn|DeprecationWarning|ExperimentalWarning):|^npm (?:WARN|warn)(?:\s|$)/i;

/** Deferred presentation input; projection runs on the renderer's tick, outside runner callbacks. */
type PendingOutput =
    | {
          readonly chunk: string;
          readonly source: LiveScriptOutputSource;
          readonly harnessName: string;
          readonly isCheck: boolean;
      }
    | { readonly chunk: string; readonly kind: 'status' | 'warning' | 'error' | 'check' }
    | { readonly chunk: ''; readonly isFlush: true };

/** Original chunks in arrival order, including stream identity. */
export type CoderRawOutputChunk = { readonly text: string; readonly source: string };

/** Per-stream parser state prevents stdout and stderr fragments from being spliced together. */
function createOutputStream() {
    return {
        reader: createScriptOutputLineReader(),
        context: {
            messageId: 'message-0',
            sequence: 0,
        } as CoderOutputRecordContext,
        plainKind: 'unknown' as CoderOutputKind,
        plainTitle: '',
        plainId: '',
        harnessName: '',
        isCheck: false,
        isOversizedRecord: false,
        recentRecords: new Map<string, string>(),
    };
}

/** Bounded, passive projection of existing output. No method calls or controls any harness. */
export class CoderRunOutput {
    /** Lets the renderer reuse wrapping while only the spinner or elapsed timer changes. */
    public revision = 0;
    private readonly projectedEvents: CoderOutputEvent[] = [];
    private readonly pendingOutput: PendingOutput[] = [];
    private pendingCharacterCount = 0;
    private skippedChunkCount = 0;
    public readonly rawChunks: CoderRawOutputChunk[] = [];
    public isHistoryTruncated = false;
    private rawCharacterCount = 0;
    private sequence = 0;
    private generation = 0;
    private streams = { stdout: createOutputStream(), stderr: createOutputStream(), team: createOutputStream() };

    /** Makes projection lazy so input keys and process-output callbacks perform no rendering work. */
    public get events(): readonly CoderOutputEvent[] {
        this.drain();
        return this.projectedEvents;
    }

    /** Records the original chunk first and queues its independent presentation projection. */
    public append(chunk: string, source: LiveScriptOutputSource, harnessName: string, isCheck: boolean): void {
        this.retainRaw(chunk, source);
        this.enqueue({ chunk, source, harnessName, isCheck });
    }

    /** Projects a queued chunk, assembling stdout and stderr independently. */
    private projectChunk(
        chunk: string,
        source: LiveScriptOutputSource,
        harnessName: string,
        isCheck: boolean,
    ): void {
        const stream = this.streams[source];
        stream.harnessName = harnessName;
        stream.isCheck = isCheck;
        // Bound temporary allocations even for one unusually large OS/console chunk.
        for (let offset = 0; offset < chunk.length; offset += MAX_FRAGMENT_CHARACTERS) {
            const lines = stream.reader.readCompletedLines(chunk.slice(offset, offset + MAX_FRAGMENT_CHARACTERS));
            for (const line of lines) {
                if (stream.isOversizedRecord) {
                    this.add({ kind: 'unknown', title: `Unparsed long record · ${source}`, text: line });
                    stream.isOversizedRecord = false;
                } else {
                    this.projectLine(line, source, harnessName, isCheck);
                }
            }
            if (stream.reader.getPendingLine().length >= MAX_FRAGMENT_CHARACTERS) {
                this.add({
                    kind: 'unknown',
                    title: `Unparsed long record · ${source} · see Raw output / trace`,
                    text: stream.reader.flush(),
                });
                stream.isOversizedRecord = true;
            }
        }
    }

    /** Runner logs are already complete messages, unlike shell chunks. */
    public appendRunner(text: string, kind: 'status' | 'warning' | 'error' | 'check' = 'status'): void {
        this.retainRaw(`${text}\n`, 'runner');
        this.enqueue({ chunk: text, kind });
    }

    /** Queues the capture boundary; runner callbacks must never perform projection or wrapping. */
    public flush(): void {
        this.revision++;
        this.enqueue({ chunk: '', isFlush: true });
    }

    /** Final plain lines retain their observed speaker/activity; malformed records remain labeled as data. */
    private flushStreams(): void {
        for (const [source, stream] of Object.entries(this.streams)) {
            const fragment = stream.reader.flush();
            if (fragment.trim()) {
                if (stream.isOversizedRecord) {
                    this.add({ kind: 'unknown', title: `Unparsed long record · ${source}`, text: fragment });
                } else {
                    this.projectLine(
                        fragment,
                        source as LiveScriptOutputSource,
                        stream.harnessName,
                        stream.isCheck,
                    );
                }
            }
        }
        this.streams = { stdout: createOutputStream(), stderr: createOutputStream(), team: createOutputStream() };
        this.generation++;
    }

    /** Pending JSON is never presented as an agent message. Plain text remains visible before a newline arrives. */
    public getPendingEvents(): CoderOutputEvent[] {
        this.drain();
        return Object.entries(this.streams).flatMap<CoderOutputEvent>(([source, stream]) => {
            const text = stripAnsi(stream.reader.getPendingLine());
            if (!text.trim()) return [];
            if (STRUCTURED_OUTPUT_PATTERN.test(text))
                return [{ kind: 'status' as const, title: `Receiving structured output · ${source}`, text: '' }];
            return [
                {
                    kind: stream.isCheck ? 'check' : stream.plainKind,
                    title: stream.isCheck
                        ? `Check · ${source}`
                        : stream.plainTitle || `Output · ${source} · partial line`,
                    text,
                },
            ];
        });
    }

    /** Bounds deferred work too; overload is visible and durable logs remain untouched. */
    private enqueue(input: PendingOutput): void {
        if (!('isFlush' in input) && input.chunk.length > MAX_RAW_CHARACTERS) {
            this.skippedChunkCount++;
            input = { ...input, chunk: input.chunk.slice(-MAX_RAW_CHARACTERS) };
        }
        this.pendingOutput.push(input);
        this.pendingCharacterCount += input.chunk.length;
        while (this.pendingCharacterCount > MAX_RAW_CHARACTERS || this.pendingOutput.length > MAX_RAW_CHUNKS) {
            this.pendingCharacterCount -= this.pendingOutput.shift()!.chunk.length;
            this.skippedChunkCount++;
        }
    }

    /** Processes bounded display work, never a runner action. */
    private drain(): void {
        if (this.skippedChunkCount) {
            this.isHistoryTruncated = true;
            this.streams = { stdout: createOutputStream(), stderr: createOutputStream(), team: createOutputStream() };
            this.generation++;
            this.add({
                kind: 'warning',
                title: 'Display history limit',
                text: `${this.skippedChunkCount} earlier chunks exceeded the display buffer; original output remains in the run trace.`,
            });
            this.skippedChunkCount = 0;
        }
        for (const input of this.pendingOutput) {
            if ('isFlush' in input) this.flushStreams();
            else if ('source' in input)
                this.projectChunk(input.chunk, input.source, input.harnessName, input.isCheck);
            else
                this.add({
                    kind: input.kind,
                    title:
                        input.kind === 'check'
                            ? 'Check'
                            : input.kind === 'status'
                            ? 'Runner'
                            : `Runner ${input.kind}`,
                    text: input.chunk,
                });
        }
        this.pendingOutput.length = 0;
        this.pendingCharacterCount = 0;
    }

    /** Keeps bounded original chunks separately, never replacing the durable log with normalized text. */
    private retainRaw(text: string, source: string): void {
        this.revision++;
        this.rawChunks.push({ text, source });
        this.rawCharacterCount += text.length;
        while (this.rawCharacterCount > MAX_RAW_CHARACTERS || this.rawChunks.length > MAX_RAW_CHUNKS) {
            const first = this.rawChunks[0]!;
            const excess = this.rawCharacterCount - MAX_RAW_CHARACTERS;
            if (excess > 0 && excess < first.text.length && this.rawChunks.length <= MAX_RAW_CHUNKS) {
                this.rawChunks[0] = { ...first, text: first.text.slice(excess) };
                this.rawCharacterCount -= excess;
            } else {
                this.rawCharacterCount -= this.rawChunks.shift()!.text.length;
            }
            this.isHistoryTruncated = true;
        }
    }

    /** Uses the existing shared harness JSON parser; unknown and malformed records stay visible. */
    private projectLine(
        line: string,
        source: LiveScriptOutputSource,
        harnessName: string,
        isCheck: boolean,
    ): void {
        const text = stripAnsi(line);
        const stream = this.streams[source];
        const record = parseAgentMessageRuntimeLogEvents(text)[0] as CoderOutputRecord | undefined;
        if (record && !isCheck) {
            try {
                const isDelta =
                    record.type === 'item.delta' || outputRecord(record.event).type === 'content_block_delta';
                const identity = isDelta
                    ? ''
                    : outputText(record.uuid) ||
                      (record.type !== 'stream_event'
                          ? outputText(outputRecord(record.item).id) || outputText(outputRecord(record.message).id)
                          : '');
                const recordKey = `${outputText(record.type)}:${identity}`;
                const fingerprint = identity ? createHash('sha256').update(text).digest('hex') : '';
                if (identity && stream.recentRecords.get(recordKey) === fingerprint) return;
                const events = normalizeCoderOutputRecord(record, stream.context);
                if (events !== undefined) {
                    if (identity) {
                        stream.recentRecords.set(recordKey, fingerprint);
                        if (stream.recentRecords.size > 64)
                            stream.recentRecords.delete(stream.recentRecords.keys().next().value!);
                    }
                    const prefix = text.slice(0, text.indexOf('{')).trim();
                    if (prefix) this.add({ kind: 'unknown', title: `Output prefix · ${source}`, text: prefix });
                    for (const event of events)
                        this.add({ ...event, id: event.id ? `${this.generation}:${source}:${event.id}` : undefined });
                    return;
                }
            } catch {
                // Protocol evolution must affect presentation only; the original record remains available below.
            }
            this.add({
                kind: 'unknown',
                title: `Unrecognized record · ${String(record.type || 'JSON')} · ${source}`,
                text,
            });
            return;
        }
        if (!text.trim() && !stream.plainId) return;
        if (STRUCTURED_OUTPUT_PATTERN.test(text)) {
            this.add({ kind: 'unknown', title: `Unparsed output · ${source}`, text });
            return;
        }
        // Codex's default human stream has explicit speaker/activity headings. Do not request --json.
        if (!isCheck && /codex/i.test(harnessName)) {
            const HEADINGS: Record<string, [CoderOutputKind, string]> = {
                codex: ['agent', 'Agent'],
                assistant: ['agent', 'Agent'],
                thinking: ['reasoning', 'Harness reasoning'],
                exec: ['tool', 'Command'],
                'file update': ['files', 'Reported file changes'],
                'file update:': ['files', 'Reported file changes'],
                user: ['status', 'User prompt'],
                'tokens used': ['status', 'Harness usage'],
            };
            const heading = Object.hasOwn(HEADINGS, text.trim()) ? HEADINGS[text.trim()] : undefined;
            if (heading) {
                stream.plainKind = heading[0];
                stream.plainTitle = heading[1];
                stream.plainId = `${this.generation}:${source}:plain-${++this.sequence}`;
                return;
            }
        }
        if (REPORTED_FAILURE_PATTERN.test(text) && (isCheck || stream.plainKind !== 'agent')) {
            this.add({ kind: 'error', title: `Reported failure · ${source}`, text });
        } else if (REPORTED_WARNING_PATTERN.test(text) && (isCheck || stream.plainKind !== 'agent')) {
            this.add({ kind: 'warning', title: `Reported warning · ${source}`, text });
        } else if (isCheck) {
            this.addPlain(text, source, 'check', `Check · ${source}`);
        } else {
            this.addPlain(text, source, stream.plainKind, stream.plainTitle || `Unstructured output · ${source}`);
        }
    }

    /** Groups adjacent lines only within the same observed activity and stream. */
    private addPlain(text: string, source: LiveScriptOutputSource, kind: CoderOutputKind, title: string): void {
        const stream = this.streams[source];
        const previous = this.projectedEvents[this.projectedEvents.length - 1];
        if (!stream.plainId || previous?.id !== stream.plainId || previous.kind !== kind) {
            stream.plainId = `${this.generation}:${source}:plain-${++this.sequence}`;
        }
        const isContinuation = this.projectedEvents.some((event) => event.id === stream.plainId);
        this.add({ id: stream.plainId, kind, title, text: `${isContinuation ? '\n' : ''}${text}`, isDelta: true });
    }

    /** Updates known message/tool snapshots in place and suppresses duplicate result text. */
    private add(event: CoderOutputEvent): void {
        const index = event.id ? this.projectedEvents.findIndex((entry) => entry.id === event.id) : -1;
        const previous = index < 0 ? undefined : this.projectedEvents[index];
        let text = event.isDelta ? (previous?.text || '') + event.text : event.text;
        let title = event.title;
        let kind = event.kind;
        if (
            previous &&
            /^(Tool|Reported file changes) ·/.test(previous.title) &&
            (title === 'Tool · completed' || title === 'Tool · failed')
        ) {
            if (previous.title.endsWith(title.slice(4)) && previous.text.endsWith(event.text)) return;
            title = previous.title.replace(/ · (running|reported|completed|failed)$/, '') + title.slice(4);
            text = `${previous.text}\n${text}`;
            if (event.kind !== 'error' && /^Tool · (Edit|Write|MultiEdit|apply_patch) · /i.test(title)) {
                kind = 'files';
                title = title.replace('Tool ·', 'Reported file changes ·');
            }
        }
        if (
            event.kind === 'result' &&
            text &&
            this.projectedEvents.some((entry) => entry.kind === 'agent' && entry.text.trim() === text.trim())
        )
            text = 'Response complete';
        if (text.length > MAX_EVENT_CHARACTERS) {
            const notice = '[Earlier text in Raw output / trace]\n';
            const summary = ['tool', 'files', 'error'].includes(kind)
                ? `${text.split('\n', 1)[0]!.slice(0, 200)}\n`
                : '';
            text = `${summary}${notice}${text.slice(-(MAX_EVENT_CHARACTERS - notice.length - summary.length))}`;
            this.isHistoryTruncated = true;
        }
        const entry = { ...event, text, title, kind };
        if (previous) this.projectedEvents[index] = entry;
        else {
            this.projectedEvents.push(entry);
            if (this.projectedEvents.length > MAX_EVENTS) {
                this.projectedEvents.shift();
                this.isHistoryTruncated = true;
            }
        }
    }
}
