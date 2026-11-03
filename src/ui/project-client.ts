import { shortId } from '../common/ids.js';
import type { EffectsReply, EffectsRequest, ProjectClientStatus, ProjectEffect } from '../engine/effects.js';
import { singleLineVisual, type BadgeActivity } from './badges.js';
import { interceptInput } from './keys.js';
import { NativeEffects } from './native-effects.js';
import { refreshProjectFooter, setProjectFooter } from './screen.js';
import { RenderScheduler } from './render-scheduler.js';
import { projectStatusMarker, TitleAnimation } from './terminal-title.js';
import type { TerminalProfile } from './terminal.js';

/**
 * One interactive project invocation, retained through pages, protected forms and embedded chat. Keyboard middleware
 * reserves just Ctrl+N; pasted/text input passes through untouched. Heartbeats collect effects independently of the
 * common render clock. All deliveries are already consumed by the project coordinator before helpers are launched.
 * @private project terminal client
 */
export class ProjectClient {
    public readonly scheduler = new RenderScheduler();
    private readonly id = shortId(20);
    private enabled = false;
    private owner = false;
    private joined = false;
    private closed = false;
    private suspended = false;
    private timer?: NodeJS.Timeout;
    private removeInput?: () => void;
    private removeFooter?: () => void;
    private readonly native: Pick<NativeEffects, 'initialize' | 'notify' | 'sound' | 'close' | 'status' | 'project'>;
    private chain: Promise<void> = Promise.resolve();
    private lastReported = 0;
    private status?: ProjectClientStatus;
    private problem?: string;
    private title?: TitleAnimation;
    /** The local view's last real input, used only to decide if displayed messages were actively viewed. */
    public lastInput = Date.now();

    public constructor(private readonly terminal: TerminalProfile, private readonly source: ((request: EffectsRequest) => Promise<EffectsReply>) | undefined, private readonly options: { readonly project?: string; readonly changed: () => void; readonly activate?: (effect: ProjectEffect) => void; readonly title?: boolean; readonly selection?: () => boolean; readonly native?: Pick<NativeEffects, 'initialize' | 'notify' | 'sound' | 'close' | 'status' | 'project'> }) {
        this.native = options.native ?? new NativeEffects({ project: options.project ?? 'project', write: terminal.write, changed: () => this.changed(), activate: (effect) => {
            if (this.closed || this.suspended || !this.source) return;
            // A click is explicit input, never authorization. Revalidate against this live project's current sources.
            this.chain = this.chain.then(async () => {
                const current = await this.source!({ client: this.id, operation: 'input' });
                if (!this.closed && !this.suspended && current.active?.includes(effect.key)) options.activate?.(effect);
            }).catch(() => undefined);
        } });
    }

    /** Updates the common frame without touching protected input or running domain operations. */
    private changed(): void {
        if (this.closed || this.suspended) return;
        refreshProjectFooter();
        this.options.changed();
    }

    /** Starts participation only in an interactive pretty project UI; raw/init/global views never call it. */
    public start(): void {
        if (!this.terminal.pretty || !this.terminal.interactive) return;
        this.removeFooter = setProjectFooter(() => this.legend());
        this.removeInput = interceptInput((event) => {
            if (this.suspended) return false;
            this.lastInput = Date.now();
            if (event.type === 'key' && event.ctrl && event.name === 'n') { this.request('toggle'); return true; }
            const selecting = this.options.selection?.() && (event.type === 'pointer' || (event.type === 'key' && ['up', 'down', 'left', 'right', 'tab', 'enter', 'escape'].includes(event.name)));
            if (selecting) this.cue('select');
            else if (Date.now() - this.lastReported >= 100) { this.lastReported = Date.now(); this.request('input'); }
            return false;
        });
        this.terminal.write('\x1b[?1004h');
        this.request('join');
        this.timer = setInterval(() => this.request('poll'), 2000);
        this.timer.unref();
        void this.native.initialize().catch(() => { this.problem = 'effect capabilities unavailable; visuals remain active'; this.changed(); });
        if (this.options.title) {
            this.title = new TitleAnimation(this.terminal.title, (frame) => {
                const status = this.status;
                return { kind: 'dashboard', project: status?.project ?? this.options.project, label: status?.project ?? this.options.project ?? 'project', visual: singleLineVisual(status?.agent?.name, (status?.agent?.activity ?? 'working') as BadgeActivity, frame), status: projectStatusMarker(this.problem ? 'unknown' : status?.state ?? 'unknown', status?.attention ?? false, frame, this.terminal.reducedMotion, this.terminal.unicode) };
            }, this.terminal.reducedMotion, this.scheduler);
            this.title.start();
        }
    }

    /** Shared control text, visible even in a protected form without consuming its content keys. */
    private legend(): string {
        return `Ctrl+N · Sounds & notifications (experimental): ${this.enabled ? 'On' : 'Off'}${this.problem ? ` · ${this.problem}` : this.enabled ? ` · ${this.owner ? 'this client' : 'another client'} · ${this.native.status}` : ''}`;
    }

    /** One bounded interaction cue (never a token, repaint or typing sound). */
    public cue(kind: 'select' | 'send'): void {
        if (kind === 'select' && Date.now() - this.lastReported < 120) return;
        this.lastReported = Date.now();
        this.request('cue', kind);
    }

    /** Raw presentation leaves effects participation; restoring the UI establishes a fresh silent baseline. */
    public suspend(suspended: boolean): void {
        if (this.suspended === suspended || this.closed) return;
        this.suspended = suspended;
        if (suspended) {
            this.removeFooter?.();
            this.removeFooter = undefined;
            this.joined = false;
            this.enabled = false;
            this.chain = this.chain.then(async () => { await this.source?.({ client: this.id, operation: 'leave' }); }).catch(() => undefined);
        } else {
            this.removeFooter = setProjectFooter(() => this.legend());
            this.lastInput = Date.now();
            this.request('join');
        }
    }

    /** Exchanges are serialized, including toggles and close; failed deliveries are not retried. */
    private request(operation: EffectsRequest['operation'], cue?: 'select' | 'send'): void {
        if (this.closed || this.suspended) return;
        if (!this.source) { this.problem = 'effects unavailable with this engine'; return; }
        this.chain = this.chain.then(async () => {
            if (this.closed || this.suspended) return;
            const wasJoined = this.joined;
            let reply = await this.source!({ client: this.id, operation: wasJoined ? operation : 'join', ...(cue ? { cue } : {}) });
            if (!wasJoined && operation === 'toggle') reply = await this.source!({ client: this.id, operation: 'toggle' });
            if (this.closed || this.suspended) return;
            const baseline = !this.joined;
            this.joined = true;
            this.problem = undefined;
            this.enabled = reply.enabled;
            this.owner = reply.owner;
            this.status = reply.status;
            this.native.project = reply.status?.project;
            this.title?.refresh();
            if (!baseline && reply.owner && reply.enabled) {
                const attention = reply.effects.find((effect) => effect.kind === 'attention');
                if (attention) this.native.notify(attention);
                else for (const effect of reply.effects) this.native.sound(effect.kind);
            }
            this.changed();
        }).catch(() => {
            this.joined = false;
            this.enabled = false;
            this.owner = false;
            this.problem = 'effects connection unavailable; reconnect starts silently';
            this.title?.refresh();
            this.changed();
        });
    }

    /** Leaving removes participation; a lost leave is covered by the bounded project lease. */
    public close(): void {
        if (this.closed) return;
        this.closed = true;
        clearInterval(this.timer);
        this.removeInput?.();
        this.removeFooter?.();
        this.native.close();
        this.title?.stop();
        this.terminal.write('\x1b[?1004l');
        void this.chain.then(async () => { await this.source?.({ client: this.id, operation: 'leave' }); }).catch(() => undefined);
    }
}
