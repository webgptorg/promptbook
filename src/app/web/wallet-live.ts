import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { acceptWebSocket, refuseUpgrade, type ServerWebSocket } from '../../common/websocket.js';
import { api, type ContractResponse, type LiveInput } from '../../vendor/app-platform.js';
import type { TabControlSession } from '../../browser/tab-control.js';
import type { Actor } from './access.js';

/** The wallet item selected by the owner, checked again by the host before reserving the tab. */
export type WalletTarget = { kind: 'request'; id: string; step: number } | { kind: 'record'; id: string };
type Binding = { origin: string; target: WalletTarget; tab: TabControlSession };
type Result = { kind: 'problem'; code: string } | { kind: 'open'; binding: Binding };
type EndReason = 'ended' | 'idle' | 'not-attached' | 'expired' | 'revoked' | 'protocol-error' | 'tab-closed' | 'engine-stopped';
type Entry = {
    id: string;
    owner: string;
    binding: Binding;
    grant: string;
    popupGrant?: string;
    opened: number;
    attachBy: number;
    inputAt: number;
    reason?: EndReason;
    socket?: ServerWebSocket;
    shown?: { origin: string; loader: string };
    popup?: TabControlSession;
    timer?: NodeJS.Timeout;
    finishing?: Promise<void>;
    busy: boolean;
    origin: string | null;
};
const PROVIDERS = new Set([
    'https://accounts.google.com',
    'https://appleid.apple.com',
    'https://account.apple.com',
    'https://login.microsoftonline.com',
    'https://login.live.com',
    'https://github.com',
    'https://www.facebook.com',
]);
const ok = (data: unknown): ContractResponse => ({ kind: 'ok', data });
const problem = (code: string): ContractResponse => ({ kind: 'problem', problem: api.createProblem(code) });
const permitted = (actor: Actor | undefined): actor is Actor =>
    actor?.role === 'owner' &&
    actor.permissions.includes('browser.watch') &&
    actor.permissions.includes('browser.control') &&
    actor.permissions.includes('wallet.manage');
/** The four implemented browser routes. The general browser feature stays independently negotiated. */
export const walletLiveRoutes = new Set(['openBrowserSignIn', 'getBrowserSession', 'endBrowserSession', 'handBackBrowserTab']);

/** One private, bounded sign-in session on the existing project browser, tied to the opening gateway session. */
export class WalletLive {
    private entry?: Entry;
    private opening = false;
    private generation = 0;

    public constructor(
        private readonly bind: (origin: string, target: WalletTarget) => Promise<Result>,
        private readonly ownOrigin: (origin: string) => boolean,
        private readonly additionalProviders: ReadonlySet<string> = new Set(),
    ) {}

    /** Public contract data contains only the currently permitted origin and opaque resource identities. */
    private resource(e: Entry) {
        return {
            id: e.id,
            kind: 'sign-in',
            tabId: e.binding.tab.id,
            browser: e.binding.tab.view().browser,
            mode: 'controlling',
            origin: e.origin,
            status: e.reason ? 'ended' : 'open',
            endReason: e.reason ?? null,
            helpRequestId: null,
            openedAt: new Date(e.opened).toISOString(),
            attachBy: new Date(e.attachBy).toISOString(),
            endsAt: new Date(e.opened + api.MAX_BROWSER_TAB_SESSION_MS).toISOString(),
        };
    }

    /** This is called after the contract's body, route permissions, CSRF and passkey step-up checks. */
    public async route(id: string, actor: Actor, params: Readonly<Record<string, unknown>>, data: unknown): Promise<ContractResponse> {
        if (!permitted(actor)) return problem('forbidden');
        if (id === 'openBrowserSignIn') {
            const input = data as { origin: string; browser: string | null; wallet?: WalletTarget };
            if (!actor.stepUpFresh) return problem('step-up-required');
            if (!input.wallet || input.browser !== null || this.ownOrigin(input.origin)) return problem('browser-origin-refused');
            if (this.opening || (this.entry && (!this.entry.reason || this.entry.finishing))) return problem('browser-busy');
            this.opening = true;
            const generation = this.generation;
            try {
                const result = await this.bind(input.origin, input.wallet);
                if (result.kind === 'problem') return problem(result.code);
                if (generation !== this.generation) {
                    await result.binding.tab.endUse();
                    return problem('unavailable');
                }
                const now = Date.now();
                const entry: Entry = {
                    id: randomUUID(),
                    owner: actor.sessionId,
                    binding: result.binding,
                    grant: result.binding.tab.grant,
                    opened: now,
                    attachBy: now + api.LIVE_SESSION_ATTACH_MS,
                    inputAt: now,
                    busy: false,
                    origin: input.origin,
                };
                this.entry = entry;
                entry.timer = setInterval(() => {
                    const now = Date.now();
                    const end =
                        now >= entry.opened + api.MAX_BROWSER_TAB_SESSION_MS
                            ? 'expired'
                            : !entry.socket && now >= entry.attachBy
                              ? 'not-attached'
                              : now - entry.inputAt >= api.BROWSER_IDLE_MS
                                ? 'idle'
                                : entry.binding.tab.over
                                  ? 'tab-closed'
                                  : undefined;
                    if (end) void this.finish(entry, end);
                    else if (!entry.binding.tab.authorized(entry.grant)) void this.finish(entry, 'revoked');
                }, 500);
                entry.timer.unref();
                return ok(this.resource(entry));
            } finally {
                this.opening = false;
            }
        }
        const entry = this.entry;
        if (!entry || entry.owner !== actor.sessionId || entry.id !== params.sessionId) return problem('not-found');
        if (id === 'handBackBrowserTab' && !entry.reason) {
            if (entry.busy) return problem('browser-busy');
            entry.busy = true;
            try {
                if (!entry.binding.tab.authorized(entry.grant)) return problem('browser-session-ended');
                if (entry.popup && !entry.popup.over) return problem('wallet-sign-in-incomplete');
                const view = await entry.binding.tab.handBack(true, !entry.binding.tab.view().task);
                if (view.state !== 'returned') return problem('wallet-sign-in-incomplete');
                await this.finish(entry, 'ended');
            } finally {
                entry.busy = false;
            }
        } else if (id === 'handBackBrowserTab') return problem('browser-session-ended');
        else if (id === 'endBrowserSession') await this.finish(entry, 'ended');
        return ok(this.resource(entry));
    }

    /** Closing or timing out leaves an unresolved Wallet request pending. */
    private async finish(e: Entry, reason: EndReason): Promise<void> {
        if (e.reason) return e.finishing;
        e.reason = reason;
        clearInterval(e.timer);
        e.socket?.sendText(JSON.stringify({ type: 'end', reason }));
        e.socket?.close(reason === 'protocol-error' ? 1008 : 1000);
        e.finishing = Promise.allSettled([
            e.popup && e.popup.authorized(e.popupGrant ?? '') ? e.popup.endUse() : undefined,
            e.binding.tab.over || !e.binding.tab.authorized(e.grant) ? undefined : e.binding.tab.endUse(),
        ]).then(() => undefined);
        await e.finishing;
        e.finishing = undefined;
    }

    /** Engine shutdown closes private tabs and invalidates a concurrent open. */
    public async close(): Promise<void> {
        this.generation++;
        if (this.entry) await this.finish(this.entry, 'engine-stopped');
    }

    /** Accept an authenticated same-origin upgrade, then recheck access while sending frames or dispatching input. */
    public upgrade(id: string, request: IncomingMessage, socket: Duplex, authenticate: () => Actor | undefined): void {
        const actor = authenticate(),
            e = this.entry;
        if (!actor) return refuseUpgrade(socket, 401, 'Unauthorized');
        if (!permitted(actor)) return refuseUpgrade(socket, 403, 'Forbidden');
        if (!e || e.id !== id || e.owner !== actor.sessionId) return refuseUpgrade(socket, 404, 'Not Found');
        if (e.socket || e.reason || !e.binding.tab.authorized(e.grant)) return refuseUpgrade(socket, 409, 'Conflict');
        if (Date.now() >= e.attachBy || request.headers['sec-websocket-protocol'] !== api.LIVE_CHANNEL_SUBPROTOCOL)
            return refuseUpgrade(socket, 403, 'Forbidden');
        let hello = false,
            visible = false,
            seq = 0,
            width = 1280,
            height = 800,
            inputCount = 0,
            windowAt = Date.now(),
            frames = false;
        let pending = 0,
            queue = Promise.resolve(),
            channel: ServerWebSocket | undefined,
            pump: NodeJS.Timeout | undefined;
        let lastOrigin: string | null | undefined,
            lastViewport = '';
        const credits = new Set<number>();
        const active = () => !e.reason && channel && !channel.closed && e.socket === channel;
        const send = (message: unknown) => {
            if (active()) channel!.sendText(JSON.stringify(message));
        };
        const allowed = (origin: string) =>
            !this.ownOrigin(origin) && (origin === e.binding.origin || PROVIDERS.has(origin) || this.additionalProviders.has(origin));
        const authorized = () => {
            const current = authenticate();
            if (permitted(current) && current.sessionId === e.owner) return true;
            void this.finish(e, 'revoked');
            return false;
        };
        const frame = async (): Promise<void> => {
            if (!active() || !authorized() || !hello || !visible || frames || e.busy || credits.size >= api.MAX_UNACKED_FRAMES) return;
            if (channel!.pending > api.MAX_LIVE_SEND_BUFFER_BYTES) {
                await this.finish(e, 'protocol-error');
                return;
            }
            frames = true;
            try {
                const root = e.binding.tab;
                if (e.popup?.over) {
                    e.popup = undefined;
                    e.shown = undefined;
                }
                if (!e.popup) {
                    const [popup] = await root.signInPopups();
                    if (popup) {
                        e.shown = undefined;
                        const child = await root.openSignInPopup(popup.targetId);
                        if (!active() || e.busy) {
                            await child.endUse();
                            return;
                        }
                        e.popup = child;
                        e.popupGrant = child.claim();
                        child.remoteAttached(e.popupGrant);
                    }
                }
                const tab = e.popup ?? root;
                const snap = await tab.remoteFrame(e.popup ? e.popupGrant! : e.grant, allowed, true);
                if (!active() || e.busy || !authorized() || !visible) return;
                e.origin = snap.origin ?? null;
                if (lastOrigin !== e.origin) {
                    send(e.origin ? { type: 'navigated', origin: e.origin } : { type: 'blocked', origin: null, reason: 'origin-not-allowed' });
                    lastOrigin = e.origin;
                }
                e.shown = undefined;
                if (!snap.jpeg || !snap.origin || !snap.loader || !snap.width || !snap.height) return;
                width = snap.width;
                height = snap.height;
                if (lastViewport !== width + 'x' + height) {
                    lastViewport = width + 'x' + height;
                    send({ type: 'state', mode: 'controlling', agent: 'none', others: 1, viewport: { width, height } });
                }
                const encoded = api.encodeLiveMedia({ kind: 'tab-frame-jpeg', seq: ++seq, timestamp: Date.now(), payload: snap.jpeg });
                if (encoded.kind === 'ok') {
                    e.shown = { origin: snap.origin, loader: snap.loader };
                    credits.add(seq);
                    channel!.sendBinary(Buffer.from(encoded.bytes));
                }
            } catch {
                e.shown = undefined;
                if (active()) {
                    lastOrigin = null;
                    e.origin = null;
                    send({ type: 'blocked', origin: null, reason: 'browser-page' });
                }
            } finally {
                frames = false;
            }
        };
        const receive = async (text: string): Promise<void> => {
            if (!active() || !authorized()) return;
            const parsed = api.parseLiveClientMessage(text);
            if (parsed.kind !== 'ok') return this.finish(e, 'protocol-error');
            const m = parsed.message;
            if (!hello) {
                if (m.type !== 'hello' || !m.versions.includes(1)) return this.finish(e, 'protocol-error');
                hello = true;
                send({ type: 'hello', version: 1 });
                send({ type: 'state', mode: 'controlling', agent: 'none', others: 1, viewport: { width, height } });
                return;
            }
            switch (m.type) {
                case 'hello':
                    return this.finish(e, 'protocol-error');
                case 'end':
                    return this.finish(e, 'ended');
                case 'frame-ack':
                    credits.delete(m.seq);
                    return;
                case 'view':
                    visible = m.visible;
                    if (!visible) {
                        e.shown = undefined;
                        return;
                    }
                    await (e.popup ?? e.binding.tab).resize(e.popup ? e.popupGrant! : e.grant, { width: m.width, height: m.height, scale: 1 });
                    void frame();
                    return;
                case 'input': {
                    if (Date.now() - windowAt >= 1000) {
                        windowAt = Date.now();
                        inputCount = 0;
                    }
                    if (++inputCount > api.MAX_LIVE_INPUT_PER_S) return this.finish(e, 'protocol-error');
                    const tab = e.popup ?? e.binding.tab;
                    if (!visible || e.busy || !e.shown) {
                        send({ type: 'input-refused', reason: 'blocked' });
                        return;
                    }
                    if (m.event.kind !== 'key' && (m.event.x >= width || m.event.y >= height)) {
                        send({ type: 'input-refused', reason: 'outside-viewport' });
                        return;
                    }
                    const input = remoteInput(m.event);
                    if (
                        await tab.remoteInput(
                            e.popup ? e.popupGrant! : e.grant,
                            e.shown,
                            input.method,
                            input.params,
                            () => Boolean(active()) && !e.busy && authorized(),
                        )
                    )
                        e.inputAt = Date.now();
                    else send({ type: 'input-refused', reason: 'blocked' });
                }
            }
        };
        channel = acceptWebSocket(
            request,
            socket,
            {
                onText: (text) => {
                    if (++pending > api.MAX_LIVE_INPUT_PER_S * 2) {
                        void this.finish(e, 'protocol-error');
                        return;
                    }
                    queue = queue
                        .then(() => receive(text))
                        .catch(() => this.finish(e, 'protocol-error'))
                        .finally(() => {
                            pending--;
                        });
                },
                onBinary: () => {
                    void this.finish(e, 'protocol-error');
                },
                onClose: () => {
                    clearInterval(pump);
                    if (e.socket === channel) {
                        e.socket = undefined;
                        if (e.binding.tab.authorized(e.grant)) e.binding.tab.viewerDetached(e.grant);
                        e.shown = undefined;
                        e.attachBy = Date.now() + api.LIVE_SESSION_ATTACH_MS;
                    }
                },
            },
            api.MAX_LIVE_CONTROL_MESSAGE_BYTES,
            api.LIVE_CHANNEL_SUBPROTOCOL,
        );
        if (!channel) return;
        e.socket = channel;
        e.binding.tab.remoteAttached(e.grant);
        pump = setInterval(() => {
            if (!hello && Date.now() >= e.attachBy) void this.finish(e, 'not-attached');
            else void frame();
        }, 220);
        pump.unref();
    }
}

/** Map strictly validated live input to page input. Only Shift and the contract's named or printable keys are available. */
function remoteInput(event: LiveInput): { method: string; params: Record<string, unknown> } {
    if (event.kind === 'wheel')
        return {
            method: 'Input.dispatchMouseEvent',
            params: { type: 'mouseWheel', x: event.x, y: event.y, deltaX: event.deltaX, deltaY: event.deltaY },
        };
    if (event.kind === 'pointer')
        return {
            method: 'Input.dispatchMouseEvent',
            params: {
                type: { down: 'mousePressed', up: 'mouseReleased', move: 'mouseMoved' }[event.action],
                button: event.button,
                x: event.x,
                y: event.y,
                clickCount: event.clicks,
            },
        };
    const printable = [...event.key].length === 1;
    const keys: Record<string, number> = {
        Enter: 13,
        Tab: 9,
        Backspace: 8,
        Delete: 46,
        Escape: 27,
        ArrowLeft: 37,
        ArrowUp: 38,
        ArrowRight: 39,
        ArrowDown: 40,
        Home: 36,
        End: 35,
        PageUp: 33,
        PageDown: 34,
    };
    return {
        method: 'Input.dispatchKeyEvent',
        params: {
            type: event.action === 'up' ? 'keyUp' : printable ? 'keyDown' : 'rawKeyDown',
            key: event.key,
            windowsVirtualKeyCode: keys[event.key] ?? 0,
            modifiers: event.shift ? 8 : 0,
            ...(event.action === 'down' && printable ? { text: event.key } : {}),
        },
    };
}
