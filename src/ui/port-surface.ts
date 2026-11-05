import { randomBytes } from 'node:crypto';
import { featureDocument, type FeatureSurfaceOptions, type FeatureSurfaceState, type PresentedSurface } from './feature-server.js';

/**
 * What a port surface sends toward its embedded view: a text or binary message for the page, or its own state.
 *
 * @private desktop feature surfaces
 */
export type PortOutgoing = { readonly kind: 'message'; readonly data: string } | { readonly kind: 'binary'; readonly data: Buffer } | { readonly kind: 'state'; readonly state: FeatureSurfaceState; readonly reason?: string };

/**
 * What the embedded view reports: its page's handshake, messages and closure.
 *
 * @private desktop feature surfaces
 */
export type PortIncoming = { readonly kind: 'hello' } | { readonly kind: 'message'; readonly data: string } | { readonly kind: 'binary'; readonly data: Buffer } | { readonly kind: 'closed'; readonly reason?: string };

/**
 * The address the desktop app serves a feature document at (a privileged secure scheme of its own session).
 *
 * @private desktop feature surfaces
 */
export const PORT_SURFACE_URL = 'ptbk-feature://surface/';

/**
 * The transport of a page in the desktop app's embedded feature view: the view's narrow preload (`featureBridge`)
 * carries its messages over the app's private IPC to this surface, so no listener, link or token exists. It defines
 * the same `surface` object as the terminal transport.
 *
 * @private desktop feature surfaces
 */
export function portTransportScript(): string {
    return `(() => {
  const statusLine = document.getElementById('surface-status');
  const bridge = window.featureBridge;
  let opened = false, ended = false;
  const surface = window.surface = {
    onopen: null, onmessage: null, onbinary: null, onclose: null,
    get open() { return opened && !ended; },
    send(message) { if (opened && !ended) bridge.send(JSON.stringify(message)); },
    sendBinary(data) { if (opened && !ended) bridge.sendBinary(data); },
    status(text, tone) { statusLine.textContent = text || ''; statusLine.className = tone || ''; statusLine.hidden = !text; },
  };
  const end = (reason) => {
    if (ended) return;
    ended = true;
    surface.status(reason, 'warning');
    if (surface.onclose) surface.onclose(reason);
  };
  if (!bridge) { end('This view is not connected to Promptbook.'); return; }
  bridge.onMessage((text) => {
    let message;
    try { message = JSON.parse(text); } catch { return; }
    if (message.type === 'welcome') {
      opened = true;
      surface.status('');
      if (surface.onopen) surface.onopen({ recovered: false });
    } else if (message.type === 'ended') end(message.reason || 'This view is closed.');
    else if (opened && surface.onmessage) surface.onmessage(message);
  });
  bridge.onBinary((data) => { if (opened && !ended && surface.onbinary) surface.onbinary(data); });
  bridge.hello();
})();`;
}

/**
 * A feature surface presented in the desktop app's own embedded view instead of a terminal's temporary server: the
 * app loads {@link document} into a sandboxed view of the owning window and relays its messages here. The page attaches
 * by its handshake over that private channel; closing the view detaches it. It needs no port, link or invitation.
 *
 * @private desktop feature surfaces
 */
export class PortSurface implements PresentedSurface {
    public readonly url = PORT_SURFACE_URL;
    private currentState: FeatureSurfaceState = 'waiting';
    private readonly nonce = randomBytes(16).toString('base64');
    private closedSurface = false;

    private constructor(
        private readonly options: FeatureSurfaceOptions,
        private readonly post: (outgoing: PortOutgoing) => void,
    ) {}

    /** Creates the surface; `post` delivers to the embedded view (in order). */
    public static create(options: FeatureSurfaceOptions, post: (outgoing: PortOutgoing) => void): PortSurface {
        return new PortSurface(options, post);
    }

    /** A factory for relays, posting through `post`; `created` receives the surface (to deliver the view's input). */
    public static factory(post: (outgoing: PortOutgoing) => void, created: (surface: PortSurface) => void): (options: FeatureSurfaceOptions) => Promise<PortSurface> {
        return async (options) => {
            const surface = PortSurface.create(options, post);
            created(surface);
            return surface;
        };
    }

    /** The complete document of the view, with its content security policy. */
    public document(): string {
        return featureDocument(this.options.page, this.nonce, portTransportScript(), this.policy);
    }

    /** The content security policy of the document (also sent as a header by the app). */
    public get policy(): string {
        return `default-src 'none'; script-src 'nonce-${this.nonce}'; style-src 'nonce-${this.nonce}'; img-src blob: data:; media-src blob: mediastream:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;
    }

    /** The `Permissions-Policy` the app applies to the view. */
    public get permissions(): string {
        return this.options.permissions ?? 'microphone=(), camera=(), geolocation=()';
    }

    /** The current state. */
    public get state(): FeatureSurfaceState {
        return this.currentState;
    }

    /** Whether the view's page is attached. */
    public get attached(): boolean {
        return this.currentState === 'attached';
    }

    /** The app's IPC buffers internally; nothing waits here. */
    public get backlog(): number {
        return 0;
    }

    /** An embedded view needs no invitation; a closed view is reopened by the app. */
    public retry(): void {
        if (this.closedSurface) throw new Error('This surface is closed.');
    }

    /** Input from the embedded view (validated by the app as coming from this feature's own view). */
    public deliver(incoming: PortIncoming): void {
        if (this.closedSurface) return;
        if (incoming.kind === 'hello') {
            if (this.attached) return;
            // The page learns it is attached before the relay starts sending to it.
            this.currentState = 'attached';
            this.post({ kind: 'message', data: JSON.stringify({ type: 'welcome' }) });
            this.setState('attached', {});
            return;
        }
        if (incoming.kind === 'closed') {
            if (this.currentState === 'attached' || this.currentState === 'waiting') this.setState('detached', { reason: incoming.reason ?? 'The view was closed.' });
            return;
        }
        if (!this.attached) return;
        const limit = this.options.maxMessageBytes ?? 1024 * 1024;
        if (incoming.kind === 'binary') {
            if (incoming.data.length <= limit) this.options.onBinary?.(incoming.data);
            return;
        }
        if (incoming.data.length > limit) return;
        let message: unknown;
        try {
            message = JSON.parse(incoming.data);
        } catch {
            return;
        }
        if (message && typeof message === 'object' && !Array.isArray(message)) this.options.onMessage(message as Record<string, unknown>);
    }

    /** Sends a message to the attached page. */
    public send(message: Readonly<Record<string, unknown>>): void {
        if (this.attached) this.post({ kind: 'message', data: JSON.stringify(message) });
    }

    /** Sends binary data to the attached page. */
    public sendBinary(data: Buffer): void {
        if (this.attached) this.post({ kind: 'binary', data });
    }

    /** Closes the surface: the page is told why and nothing more is exchanged (the app removes the view). */
    public async close(reason = 'This view was closed.'): Promise<void> {
        if (this.closedSurface) return;
        if (this.attached) this.post({ kind: 'message', data: JSON.stringify({ type: 'ended', reason }) });
        this.closedSurface = true;
        this.setState('closed', { reason });
    }

    /** Publishes a state change to the relay and the app. */
    private setState(state: FeatureSurfaceState, detail: { readonly reason?: string }): void {
        this.currentState = state;
        this.post({ kind: 'state', state, ...(detail.reason ? { reason: detail.reason } : {}) });
        this.options.onState(state, detail);
    }
}
