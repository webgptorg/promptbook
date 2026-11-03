import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { which } from '../common/process.js';
import { shortId } from '../common/ids.js';
import type { ProjectEffect } from '../engine/effects.js';
import { onTerminalReport } from './keys.js';
import { sanitizeTitleText } from './terminal-title.js';

/** Executes only fixed helper programs/scripts; message content travels as arguments or environment data. */
const execute = promisify(execFile);

/** Short quiet PCM cues; no dependency on system alert volume or a remote server's speaker. @private terminal effects */
export function cueWave(kind: ProjectEffect['kind']): Buffer {
    const rate = 22_050;
    const duration = kind === 'attention' ? 0.24 : kind === 'reply' ? 0.10 : 0.055;
    const samples = Math.ceil(rate * duration);
    const wave = Buffer.alloc(44 + samples * 2);
    wave.write('RIFF'); wave.writeUInt32LE(wave.length - 8, 4); wave.write('WAVEfmt ', 8);
    wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22);
    wave.writeUInt32LE(rate, 24); wave.writeUInt32LE(rate * 2, 28); wave.writeUInt16LE(2, 32); wave.writeUInt16LE(16, 34);
    wave.write('data', 36); wave.writeUInt32LE(samples * 2, 40);
    const frequency = kind === 'select' ? 660 : kind === 'send' ? 880 : kind === 'reply' ? 740 : 550;
    for (let index = 0; index < samples; index++) {
        const envelope = Math.sin(Math.PI * index / samples) ** 2;
        wave.writeInt16LE(Math.round(Math.sin(2 * Math.PI * frequency * index / rate) * envelope * 2000), 44 + index * 2);
    }
    return wave;
}

/** Control-safe notification content with URL credentials and query/fragment material removed. @private terminal effects */
export function notificationText(text: string, limit = 400): string {
    return sanitizeTitleText(text.replace(/https?:\/\/[^\s<>]+/gi, (raw) => {
        try { const url = new URL(raw); return `${url.origin}${url.pathname}`; } catch { return '[service]'; }
    }), limit);
}

/** Native notification script. Inputs remain data even when they contain quotes, dollars or newlines. */
const MAC_NOTIFICATION = 'on run argv\n display notification (item 2 of argv) with title (item 1 of argv) sound name "Glass"\nend run';

/** Windows native taskbar notification, with no custom sound layered over its OS sound. */
const WINDOWS_NOTIFICATION = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$notice = New-Object System.Windows.Forms.NotifyIcon
try {
    $notice.Icon = [System.Drawing.SystemIcons]::Information
    $notice.Visible = $true
    $notice.BalloonTipTitle = $env:PTBK_NOTICE_TITLE
    $notice.BalloonTipText = $env:PTBK_NOTICE_BODY
    $notice.ShowBalloonTip(5000)
    $until = [DateTime]::UtcNow.AddSeconds(6)
    while ([DateTime]::UtcNow -lt $until) { [System.Windows.Forms.Application]::DoEvents(); Start-Sleep -Milliseconds 100 }
} finally { $notice.Dispose() }
`;

/**
 * Optional effect delivery of one terminal client. Capability discovery is quiet and helpers are bounded. Kitty is
 * used only after a query response traverses the actual TTY (including SSH); unverified remote paths stay visual.
 * Native submissions cannot prove OS delivery/permissions or focus a particular tab, and report that limitation.
 * @private terminal effects
 */
export class NativeEffects {
    private directory?: Promise<string>;
    private audio?: string;
    private notifier?: string;
    private kitty?: ReadonlyMap<string, string>;
    private readonly query = `ptbk-${shortId(12)}`;
    private readonly notices = new Map<string, ProjectEffect>();
    private unregister?: () => void;
    private stopped = false;
    private lastSound = 0;
    private notifying = false;
    private playing = false;
    private readonly remote: boolean;
    /** Honest capability/submission feedback, shown in the shared frame. */
    public status = 'effects capability not checked';
    /** Actual selected project, filled by the authenticated service after registration. */
    public project?: string;

    public constructor(private readonly options: { readonly project: string; readonly write: (text: string) => void; readonly activate: (effect: ProjectEffect) => void; readonly changed: () => void; readonly env?: NodeJS.ProcessEnv; readonly platform?: NodeJS.Platform }) {
        const env = options.env ?? process.env;
        this.remote = Boolean(env.SSH_CONNECTION || env.SSH_TTY);
    }

    /** Discovers facilities without playing, notifying, taking focus or requesting permissions. */
    public async initialize(): Promise<void> {
        const env = this.options.env ?? process.env;
        const platform = this.options.platform ?? process.platform;
        this.unregister = onTerminalReport((report) => this.report(report));
        // Query only terminals that advertise this protocol family; a positive reply must verify the path.
        if (/kitty|ghostty/.test(`${env.TERM ?? ''} ${env.TERM_PROGRAM ?? ''}`)) this.options.write(`\x1b]99;i=${this.query}:p=?;\x1b\\`);
        if (!this.remote) {
            this.audio = await which(platform === 'darwin' ? 'afplay' : platform === 'win32' ? 'powershell.exe' : 'paplay', env);
            const desktop = platform !== 'linux' || Boolean(env.DISPLAY || env.WAYLAND_DISPLAY);
            if (desktop) this.notifier = await which(platform === 'darwin' ? 'osascript' : platform === 'win32' ? 'powershell.exe' : 'notify-send', env);
        }
        if (this.stopped) return;
        this.status = this.kitty ? 'terminal notifications verified' : this.notifier ? 'native notices: OS delivery/tab activation unverified' : this.remote ? 'SSH: no verified desktop transport; visuals only' : 'desktop notifications unavailable';
        if (!this.audio) this.status += '; custom sounds unavailable';
        this.options.changed();
    }

    /** Accepts only correlated capability/activation reports from this invocation. */
    private report(report: string): void {
        const match = /^99;([^;]*);(.*)$/.exec(report);
        if (!match) return;
        const meta = new Map(match[1]!.split(':').map((part) => part.split('=', 2) as [string, string]));
        if (meta.get('i') === this.query && meta.get('p') === '?') {
            const capabilities = new Map(match[2]!.split(':').map((part) => part.split('=', 2) as [string, string]));
            if (!capabilities.get('p')?.split(',').includes('title')) return;
            this.kitty = capabilities;
            this.status = `terminal notifications verified${capabilities.get('a')?.includes('report') ? '' : '; click navigation unavailable'}`;
            this.options.changed();
        } else if (!meta.has('p')) {
            const effect = this.notices.get(meta.get('i') ?? '');
            this.notices.delete(meta.get('i') ?? '');
            if (effect && !this.stopped) this.options.activate(effect);
        }
    }

    /** Quiet cue, coalesced under rapid input; it never delays keyboard handling or engine work. */
    public sound(kind: ProjectEffect['kind']): void {
        if (this.stopped || !this.audio || this.playing || Date.now() - this.lastSound < 120) return;
        this.lastSound = Date.now();
        this.playing = true;
        void this.play(kind).catch(() => { if (!this.stopped) { this.status = 'sound helper unavailable; visuals remain active'; this.options.changed(); } }).finally(() => { this.playing = false; });
    }

    /** Plays one generated PCM cue through a local, bounded helper. */
    private async play(kind: ProjectEffect['kind']): Promise<void> {
        this.directory ??= mkdtemp(join(tmpdir(), 'ptbk-cues-'));
        const file = join(await this.directory, `${kind}.wav`);
        await writeFile(file, cueWave(kind), { mode: 0o600 });
        if (this.stopped) return;
        const platform = this.options.platform ?? process.platform;
        const args = platform === 'darwin' ? ['-v', '0.35', file] : platform === 'win32' ? ['-NoProfile', '-NonInteractive', '-Command', '$player = New-Object System.Media.SoundPlayer($env:PTBK_CUE_FILE); try { $player.PlaySync() } finally { $player.Dispose() }'] : ['--volume=16000', file];
        await execute(this.audio!, args, { timeout: 3000, windowsHide: true, env: { ...(this.options.env ?? process.env), PTBK_CUE_FILE: file } });
    }

    /** Delivers one native/verified-terminal attention notice; never opens a URL or steals focus on creation. */
    public notify(effect: ProjectEffect): void {
        if (this.stopped) return;
        const title = notificationText(`ptbk · ${this.project ?? this.options.project} · ${effect.title}`, 100);
        const reference = effect.chat ? `ptbk chat --open "${effect.chat}"` : `Open ${effect.domain} in this project's dashboard`;
        const body = notificationText(`${effect.body}\n${reference}`, 400);
        if (this.kitty) {
            const id = `ptbk-${shortId(16)}`;
            this.notices.set(id, effect);
            if (this.notices.size > 50) this.notices.delete(this.notices.keys().next().value!);
            const action = this.kitty.get('a')?.split(',').includes('report') ? 'focus,report' : 'focus';
            const silent = this.kitty.get('s')?.split(',').includes('silent') && this.audio;
            if (silent) this.sound('attention');
            const metadata = `i=${id}:a=${action}:f=cHRiaw==:e=1${silent ? ':s=c2lsZW50' : ''}`;
            this.options.write(`\x1b]99;${metadata}:d=0;${Buffer.from(title).toString('base64')}\x1b\\\x1b]99;${metadata}:p=body;${Buffer.from(body).toString('base64')}\x1b\\`);
            return;
        }
        if (!this.notifier || this.notifying) { if (!this.notifier) this.sound('attention'); return; }
        this.notifying = true;
        const platform = this.options.platform ?? process.platform;
        // Native notification sound is left to the OS; adding custom audio here could double the audible alert.
        const args = platform === 'darwin' ? ['-e', MAC_NOTIFICATION, title, body] : platform === 'win32' ? ['-NoProfile', '-NonInteractive', '-Command', WINDOWS_NOTIFICATION] : ['--app-name=ptbk', '--', title, body];
        void execute(this.notifier, args, { timeout: 8000, windowsHide: true, env: { ...(this.options.env ?? process.env), PTBK_NOTICE_TITLE: title, PTBK_NOTICE_BODY: body } }).then(
            () => { if (!this.stopped) this.status = 'notice submitted; OS delivery/tab activation unverified'; },
            () => { if (!this.stopped) this.status = 'notification helper refused/unavailable; inspect the request here'; },
        ).finally(() => { this.notifying = false; if (!this.stopped) this.options.changed(); });
    }

    /** Releases temporary audio files and activation correlation; late callbacks cannot revive this viewer. */
    public close(): void {
        this.stopped = true;
        this.unregister?.();
        this.notices.clear();
        void this.directory?.then((directory) => rm(directory, { recursive: true, force: true })).catch(() => undefined);
    }
}
