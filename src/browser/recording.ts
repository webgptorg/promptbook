import { mkdir, open, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { errorMessage } from '../common/errors.js';
import { ensureDirectory } from '../common/fs.js';
import { runProcess, which } from '../common/process.js';
import type { Project } from '../project/workspace.js';
import { TRACE_FILES, type TaskTrace } from '../engine/task-trace.js';

/**
 * Longest real-time hold of one frame in a recording (longer idle periods are shortened and reported).
 */
const MAX_FRAME_HOLD_MS = 60_000;

/**
 * Largest recorded segment; further frames are dropped with a visible gap.
 */
const MAX_SEGMENT_BYTES = 1024 * 1024 * 1024;

/**
 * Status of one recorded segment as listed in `traces/<task-file-basename>/video.json`.
 *
 * @private browser recording
 */
export type RecordingSegment = {
    /** Attempt/occurrence label the segment belongs to. */
    readonly label: string;
    /** Video path relative to the trace directory (absent when nothing playable was produced). */
    readonly file?: string;
    /** Container/codec. */
    readonly format?: 'mp4 (H.264)' | 'mov (Motion JPEG)';
    /** Start and end (ISO). */
    readonly startedAt: string;
    readonly endedAt: string;
    /** Number of captured frames. */
    readonly frames: number;
    /** Pages visited in order. */
    readonly pages: readonly string[];
    /** Intentional or accidental gaps (secret entry, human sign-in, capture failure, size bound). */
    readonly gaps: ReadonlyArray<{ readonly at: string; readonly reason: string }>;
    /** Outcome of this segment. */
    readonly status: 'recorded' | 'empty' | 'failed';
    /** Explanation for empty/failed segments. */
    readonly note?: string;
};

/**
 * Recording status file (`video.json`) of a task.
 *
 * @private browser recording
 */
export type RecordingStatus = {
    /** Overall state: recorded, disabled by configuration, not applicable (no browser use) or failed. */
    readonly state: 'recorded' | 'disabled' | 'not-applicable' | 'failed' | 'incomplete';
    readonly segments: readonly RecordingSegment[];
    readonly note?: string;
};

/**
 * One captured frame of the current segment.
 */
type FrameEntry = { readonly file: string; readonly at: number; readonly bytes: number };

/**
 * Reads the pixel size of a baseline/progressive JPEG.
 *
 * @private browser recording
 */
export function jpegSize(data: Buffer): { width: number; height: number } | undefined {
    let offset = 2;
    while (offset + 9 < data.length) {
        if (data[offset] !== 0xff) {
            offset++;
            continue;
        }
        const marker = data[offset + 1]!;
        if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
            return { height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) };
        }
        if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
            offset += 2;
            continue;
        }
        offset += 2 + data.readUInt16BE(offset + 2);
    }
    return undefined;
}

/**
 * Builds a QuickTime atom.
 */
function atom(type: string, ...parts: Buffer[]): Buffer {
    const body = Buffer.concat(parts);
    const header = Buffer.alloc(8);
    header.writeUInt32BE(body.length + 8, 0);
    header.write(type, 4, 'latin1');
    return Buffer.concat([header, body]);
}

/**
 * Big-endian unsigned integers.
 */
function u32(...values: number[]): Buffer {
    const buffer = Buffer.alloc(values.length * 4);
    values.forEach((value, index) => buffer.writeUInt32BE(value >>> 0, index * 4));
    return buffer;
}

/**
 * Big-endian 16-bit integers.
 */
function u16(...values: number[]): Buffer {
    const buffer = Buffer.alloc(values.length * 2);
    values.forEach((value, index) => buffer.writeUInt16BE(value & 0xffff, index * 2));
    return buffer;
}

/**
 * Identity transformation matrix of QuickTime headers.
 */
const MATRIX = u32(0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000);

/**
 * Writes JPEG frames with per-frame durations (ms) as a Motion-JPEG QuickTime movie, streaming frame data from disk.
 *
 * @private browser recording
 */
export async function writeMotionJpegMovie(path: string, frames: ReadonlyArray<{ readonly file: string; readonly durationMs: number }>, size: { width: number; height: number }): Promise<void> {
    const sizes: number[] = [];
    for (const frame of frames) sizes.push((await readFile(frame.file)).length);
    const durations = frames.map((frame) => Math.max(1, Math.round(frame.durationMs)));
    const total = durations.reduce((sum, value) => sum + value, 0);
    const ftyp = atom('ftyp', Buffer.from('qt  ', 'latin1'), u32(0x200), Buffer.from('qt  ', 'latin1'));
    const mdatPayload = sizes.reduce((sum, value) => sum + value, 0);
    const mdatHeader = Buffer.alloc(8);
    mdatHeader.writeUInt32BE(mdatPayload + 8, 0);
    mdatHeader.write('mdat', 4, 'latin1');
    const chunkOffset = ftyp.length + 8;
    const stts: number[] = [];
    for (const duration of durations) {
        if (stts.length && stts[stts.length - 1] === duration) stts[stts.length - 2]!++;
        else stts.push(1, duration);
    }
    const compressor = Buffer.alloc(32);
    const name = 'Photo - JPEG';
    compressor.writeUInt8(name.length, 0);
    compressor.write(name, 1, 'latin1');
    const sampleEntry = atom(
        'jpeg',
        Buffer.alloc(6),
        u16(1),
        u16(0, 0),
        Buffer.from('appl', 'latin1'),
        u32(0, 0x200),
        u16(size.width, size.height),
        u32(72 << 16, 72 << 16, 0),
        u16(1),
        compressor,
        u16(24, 0xffff),
    );
    const stbl = atom(
        'stbl',
        atom('stsd', u32(0, 1), sampleEntry),
        atom('stts', u32(0, stts.length / 2, ...stts)),
        atom('stsc', u32(0, 1, 1, frames.length, 1)),
        atom('stsz', u32(0, 0, frames.length, ...sizes)),
        atom('stco', u32(0, 1, chunkOffset)),
    );
    const handlerName = (text: string): Buffer => Buffer.concat([Buffer.from([text.length]), Buffer.from(text, 'latin1')]);
    const minf = atom(
        'minf',
        atom('vmhd', u32(1), u16(0, 0, 0, 0)),
        atom('hdlr', u32(0), Buffer.from('dhlralis', 'latin1'), u32(0, 0, 0), handlerName('DataHandler')),
        atom('dinf', atom('dref', u32(0, 1), atom('alis', u32(1)))),
        stbl,
    );
    const mdia = atom(
        'mdia',
        atom('mdhd', u32(0, 0, 0, 1000, total), u16(0, 0)),
        atom('hdlr', u32(0), Buffer.from('mhlrvide', 'latin1'), u32(0, 0, 0), handlerName('VideoHandler')),
        minf,
    );
    const tkhd = atom('tkhd', u32(0x0000000f, 0, 0, 1, 0, total, 0, 0), u16(0, 0, 0, 0), MATRIX, u32(size.width << 16, size.height << 16));
    const mvhd = atom('mvhd', u32(0, 0, 0, 1000, total, 0x00010000), u16(0x0100), Buffer.alloc(10), MATRIX, u32(0, 0, 0, 0, 0, 0, 2));
    const moov = atom('moov', mvhd, atom('trak', tkhd, mdia));
    const handle = await open(path, 'w');
    try {
        await handle.write(ftyp);
        await handle.write(mdatHeader);
        for (const frame of frames) await handle.write(await readFile(frame.file));
        await handle.write(moov);
    } finally {
        await handle.close();
    }
}

/**
 * Minimal surface of the browser connection the recorder needs.
 *
 * @private browser recording
 */
export type ScreencastPort = {
    readonly send: (method: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    readonly onFrame: (listener: (frame: { data: string; sessionId: number; timestamp?: number }) => void) => () => void;
};

/**
 * Records the project browser for the task that currently owns it, into `traces/<task-file-basename>/video/`.
 *
 * Only the project browser's page is captured (never the desktop or other browsers); human sign-in and secret entry
 * are excluded and listed as gaps. Failures degrade to an honest status and never stop the task.
 *
 * @private browser recording
 */
export class BrowserRecorder {
    private trace?: TaskTrace;
    private label?: string;
    private frames: FrameEntry[] = [];
    private pages: string[] = [];
    private gaps: Array<{ at: string; reason: string }> = [];
    private startedAt = 0;
    private bytes = 0;
    private paused = false;
    private recording = false;
    private unsubscribe?: () => void;
    private port?: ScreencastPort;
    private frameDirectory?: string;
    private segments = 0;
    private used = false;
    private reported = false;
    private writeQueue: Promise<void> = Promise.resolve();

    public constructor(
        private readonly project: Project,
        private readonly enabled: () => boolean,
        private readonly env: NodeJS.ProcessEnv,
    ) {}

    /** Associates the next browser activity with a task attempt (finishing a segment of another attempt/task). */
    public async attach(trace: TaskTrace, label: string): Promise<void> {
        if (this.trace && this.trace.key !== trace.key) await this.detach();
        else if (this.trace && this.label !== label) await this.finish();
        this.trace = trace;
        this.label = label;
    }

    /** Whether the attached task is the given one. */
    public isAttachedTo(taskKey: string): boolean {
        return this.trace?.key === taskKey;
    }

    /** Starts capturing on first browser use of the attached task (no-op when disabled or already recording). */
    public async begin(port: ScreencastPort, url?: string): Promise<void> {
        if (!this.trace || !this.label) return;
        this.used = true;
        if (url && this.pages[this.pages.length - 1] !== url) this.pages.push(url);
        if (this.recording || this.paused) return;
        if (!this.enabled()) {
            await this.writeStatus({ state: 'disabled', segments: [], note: 'traces.recordVideo is false; no new browser video is recorded (text traces continue).' });
            return;
        }
        try {
            this.port = port;
            this.frameDirectory = await ensureDirectory(join(this.project.runtime.temporary, 'recordings', `${this.trace.key.replace(/\//g, '-')}-${this.label}-${++this.segments}`));
            this.frames = [];
            this.bytes = 0;
            this.startedAt = Date.now();
            this.unsubscribe = port.onFrame((frame) => {
                void port.send('Page.screencastFrameAck', { sessionId: frame.sessionId }).catch(() => undefined);
                if (this.paused) return;
                this.writeQueue = this.writeQueue.then(() => this.store(frame.data));
            });
            await port.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: 1280, maxHeight: 900, everyNthFrame: 1 });
            this.recording = true;
            await this.trace.event('recording-started', { label: this.label, url });
        } catch (error) {
            this.unsubscribe?.();
            this.recording = false;
            await this.writeSegment({ label: this.label, startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), frames: 0, pages: this.pages, gaps: [], status: 'failed', note: `Recording could not start: ${errorMessage(error)}` });
        }
    }

    /** Records a visited page (page transitions are listed with the segment). */
    public visited(url: string): void {
        if (url && this.pages[this.pages.length - 1] !== url) this.pages.push(url);
    }

    /** Pauses capture around secret entry or human sign-in, recording an intentional gap. */
    public async pause(reason: string): Promise<void> {
        if (!this.recording || this.paused) return;
        this.paused = true;
        this.gaps.push({ at: new Date().toISOString(), reason });
        await this.port?.send('Page.stopScreencast').catch(() => undefined);
    }

    /** Resumes capture after a pause. */
    public async resume(): Promise<void> {
        if (!this.recording || !this.paused) return;
        this.paused = false;
        await this.port?.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: 1280, maxHeight: 900, everyNthFrame: 1 }).catch(() => undefined);
    }

    /**
     * Finishes the current segment and writes a playable video plus its status (before the result commit).
     */
    public async finish(): Promise<void> {
        const trace = this.trace;
        const label = this.label;
        if (!trace || !label) return;
        if (!this.recording) {
            if (this.pages.length) this.pages = [];
            await this.reportUnused();
            return;
        }
        this.recording = false;
        this.unsubscribe?.();
        await this.port?.send('Page.stopScreencast').catch(() => undefined);
        await this.writeQueue;
        const endedAt = Date.now();
        const base = { label, startedAt: new Date(this.startedAt).toISOString(), endedAt: new Date(endedAt).toISOString(), frames: this.frames.length, pages: [...this.pages], gaps: [...this.gaps] };
        this.pages = [];
        this.gaps = [];
        try {
            if (!this.frames.length) {
                await this.writeSegment({ ...base, status: 'empty', note: 'The browser was used but showed no visual change to capture.' });
                return;
            }
            const first = await readFile(this.frames[0]!.file);
            const size = jpegSize(first) ?? { width: 1280, height: 800 };
            let shortened = 0;
            const timed = this.frames.map((frame, index) => {
                const next = this.frames[index + 1]?.at ?? endedAt;
                const raw = Math.max(1, next - frame.at);
                if (raw > MAX_FRAME_HOLD_MS) shortened++;
                return { file: frame.file, durationMs: Math.min(raw, MAX_FRAME_HOLD_MS) };
            });
            const directory = await ensureDirectory(join(trace.directory, TRACE_FILES.videoDirectory));
            const movie = join(directory, `${label}.mov`);
            await writeMotionJpegMovie(movie, timed, size);
            let file = `${TRACE_FILES.videoDirectory}/${label}.mov`;
            let format: RecordingSegment['format'] = 'mov (Motion JPEG)';
            const ffmpeg = await which('ffmpeg', this.env);
            if (ffmpeg) {
                const mp4 = join(directory, `${label}.mp4`);
                // Keep the recorded (variable) frame timing; older ffmpeg without -fps_mode falls back to defaults.
                const encode = async (timing: string[]) =>
                    await runProcess(ffmpeg, ['-y', '-loglevel', 'error', '-i', movie, ...timing, '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { cwd: directory, timeoutMs: 15 * 60_000 });
                let result = await encode(['-fps_mode', 'passthrough']);
                if (result.exitCode !== 0) result = await encode([]);
                if (result.exitCode === 0) {
                    await rm(movie, { force: true });
                    file = `${TRACE_FILES.videoDirectory}/${label}.mp4`;
                    format = 'mp4 (H.264)';
                } else await rm(mp4, { force: true });
            }
            if (shortened) base.gaps.push({ at: base.endedAt, reason: `${shortened} idle period(s) longer than ${MAX_FRAME_HOLD_MS / 1000}s were shortened in playback` });
            await this.writeSegment({ ...base, file, format, status: 'recorded' });
            await trace.event('recording-finished', { label, file: `${trace.relativeDirectory}/${file}`, frames: base.frames, gaps: base.gaps.length });
        } catch (error) {
            await this.writeSegment({ ...base, status: 'failed', note: `Recording could not be finalized: ${errorMessage(error)}` });
        } finally {
            if (this.frameDirectory) await rm(this.frameDirectory, { recursive: true, force: true }).catch(() => undefined);
            this.frames = [];
        }
    }

    /** Ends recording for the task (any outcome), states when no video applies, and forgets the association. */
    public async detach(): Promise<void> {
        await this.finish();
        this.trace = undefined;
        this.label = undefined;
        this.used = false;
        this.reported = false;
    }

    /** States once per run, before any result commit, that no video applies to the attached task. */
    private async reportUnused(): Promise<void> {
        if (!this.trace || this.used || this.reported) return;
        this.reported = true;
        await this.trace.event('recording', { state: this.enabled() ? 'not-applicable' : 'disabled', note: this.enabled() ? 'The task did not use the project browser in this run.' : 'traces.recordVideo is false.' });
    }

    /** Stores one frame on disk (bounded). */
    private async store(data: string): Promise<void> {
        if (!this.frameDirectory) return;
        const buffer = Buffer.from(data, 'base64');
        if (this.bytes + buffer.length > MAX_SEGMENT_BYTES) {
            if (!this.gaps.some((gap) => gap.reason.startsWith('size bound'))) this.gaps.push({ at: new Date().toISOString(), reason: `size bound of ${MAX_SEGMENT_BYTES / 1024 / 1024} MB reached; later frames were not recorded` });
            return;
        }
        const file = join(this.frameDirectory, `frame-${String(this.frames.length + 1).padStart(7, '0')}.jpg`);
        try {
            await writeFile(file, buffer);
            this.frames.push({ file, at: Date.now(), bytes: buffer.length });
            this.bytes += buffer.length;
        } catch (error) {
            if (!this.gaps.some((gap) => gap.reason.startsWith('frame storage failed'))) this.gaps.push({ at: new Date().toISOString(), reason: `frame storage failed: ${errorMessage(error)}` });
        }
    }

    /** Appends or replaces a segment in `video.json`. */
    private async writeSegment(segment: RecordingSegment): Promise<void> {
        const trace = this.trace;
        if (!trace) return;
        const path = join(trace.directory, TRACE_FILES.video);
        const current = await readFile(path, 'utf8').then((text) => JSON.parse(text) as RecordingStatus, () => undefined);
        const segments = [...(current?.segments ?? []).filter((item) => item.label !== segment.label), segment];
        const state: RecordingStatus['state'] = segments.every((item) => item.status === 'recorded') ? 'recorded' : segments.some((item) => item.status === 'recorded') ? 'incomplete' : segments.every((item) => item.status === 'empty') ? 'not-applicable' : 'failed';
        await this.writeStatus({ state, segments });
    }

    /** Writes `video.json`. */
    private async writeStatus(status: RecordingStatus): Promise<void> {
        const trace = this.trace;
        if (!trace) return;
        try {
            await mkdir(trace.directory, { recursive: true });
            await writeFile(join(trace.directory, TRACE_FILES.video), `${JSON.stringify(status, null, 2)}\n`);
        } catch {
            // The status is optional evidence; the event log keeps the outcome.
        }
    }
}

/**
 * Removes leftover frame directories of interrupted recordings.
 *
 * @private browser recording
 */
export async function cleanStaleRecordings(project: Project): Promise<void> {
    const directory = join(project.runtime.temporary, 'recordings');
    for (const name of await readdir(directory).catch(() => [] as string[])) await rm(join(directory, name), { recursive: true, force: true }).catch(() => undefined);
}
