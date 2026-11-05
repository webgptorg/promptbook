import { randomBytes, timingSafeEqual } from 'node:crypto';
import { PtbkError, errorMessage } from '../common/errors.js';
import { normalizeOrigin, serviceMatches } from '../wallet/wallet.js';
import { RESERVATION_CACHE_MS, browserAddress, type CdpLink, type ProjectBrowser } from './browser.js';
import { loginFormScript, type LoginScan } from './page-scripts.js';

/**
 * Lifecycle of one user-controlled tab: `opening` (the reservation is made, in-flight work settles), `controlled` (the
 * user has it, also while the viewer is closed), `returned` (explicitly handed back), `ended` (the user ended their
 * use without handing it back, or the engine stopped) or `lost` (the tab or the browser disappeared).
 *
 * @private browser tab control
 */
export type TabControlState = 'opening' | 'controlled' | 'returned' | 'ended' | 'lost';

/**
 * The live viewer of a controlled tab: not attached yet, streaming, or gone (closing or losing it never hands the tab
 * back).
 *
 * @private browser tab control
 */
export type TabViewerState = 'waiting' | 'connected' | 'detached';

/**
 * A user-controlled tab as every client sees it (never a frame, an input, clipboard text or a credential).
 *
 * @private browser tab control
 */
export type TabControlView = {
    readonly id: string;
    readonly browser: string;
    readonly targetId: string;
    /** `wallet`: manual sign-in for a Wallet request; `browse`: ordinary interaction with a selected tab. */
    readonly purpose: 'wallet' | 'browse';
    /** The Wallet request this sign-in serves. */
    readonly request?: string;
    /** The task of this engine that worked in the tab before (it waits until the tab is handed back). */
    readonly task?: string;
    readonly state: TabControlState;
    readonly viewer: TabViewerState;
    /** The actual current address and title of the tab (the user may browse anywhere). */
    readonly url?: string;
    readonly title?: string;
    readonly canGoBack: boolean;
    readonly canGoForward: boolean;
    readonly mode: 'headless' | 'headful';
    /** Paths this boundary cannot hold back (stated before protected control starts). */
    readonly limitations: readonly string[];
    /** Wallet: a sign-in to the requested service was seen in the tab (it does not hand the tab back). */
    readonly signIn?: { readonly detected: boolean; readonly origin?: string };
    /** Wallet's offer to remember the password used for the verified sign-in (nonsecret). */
    readonly offer?: { readonly id: string; readonly kind: 'save' | 'update'; readonly origin: string; readonly account: string };
    /** The latest problem or outcome in the user's words. */
    readonly problem?: string;
    readonly outcome?: string;
    readonly startedAt: string;
    readonly endedAt?: string;
};

/**
 * One input of the viewer, with positions relative to the shown frame (0–1), in the order the user produced them.
 *
 * @private browser tab control
 */
export type TabInput =
    | { readonly type: 'mouse'; readonly action: 'move' | 'down' | 'up' | 'wheel'; readonly x: number; readonly y: number; readonly button?: 'left' | 'right' | 'middle' | 'none'; readonly buttons?: number; readonly clickCount?: number; readonly modifiers?: number; readonly deltaX?: number; readonly deltaY?: number }
    | { readonly type: 'key'; readonly action: 'down' | 'up'; readonly key: string; readonly code: string; readonly keyCode: number; readonly text?: string; readonly modifiers?: number; readonly location?: number; readonly repeat?: boolean; readonly command?: 'selectAll' | 'undo' | 'redo' }
    | { readonly type: 'text'; readonly text: string }
    | { readonly type: 'touch'; readonly action: 'start' | 'move' | 'end' | 'cancel'; readonly points: ReadonlyArray<{ readonly x: number; readonly y: number; readonly id: number }>; readonly modifiers?: number };

/**
 * One streamed frame: a JPEG of the tab's content and the CSS size it shows.
 *
 * @private browser tab control
 */
export type TabFrame = { readonly seq: number; readonly data: string; readonly width: number; readonly height: number };

/**
 * A credential the user submitted on the website itself during manual sign-in, held only in protected memory while
 * its offer is current (never logged, traced or given to an agent).
 *
 * @private browser tab control
 */
export type SignInCandidate = { readonly origin: string; readonly username: string; readonly password: string };

/**
 * What a Wallet-originated control needs from the Wallet.
 *
 * @private browser tab control
 */
export type TabControlWallet = {
    readonly request: string;
    /** The service the request needs. */
    readonly origin: string;
    readonly account?: string;
    /** Whether to offer saving the candidate after its verified sign-in (`none`: the same values are saved already). */
    readonly offer: (candidate: SignInCandidate) => Promise<{ readonly kind: 'none' | 'save' | 'update'; readonly account: string; readonly record?: string; readonly revision?: string }>;
    /** Saves the accepted candidate (ordinary encrypted add/update with duplicate and revision checks). */
    readonly save: (candidate: SignInCandidate, expected: { readonly record?: string; readonly revision?: string }) => Promise<string>;
    /** After the handoff: the original request is satisfied by this verified access (or the reason it is not). */
    readonly satisfy: (access: { readonly origin: string; readonly account?: string; readonly evidence: boolean }) => Promise<{ readonly resolved: boolean; readonly reason: string }>;
};

/**
 * Name of the isolated world holding Wallet's login-form evidence capture (invisible to page scripts).
 */
const EVIDENCE_WORLD = 'ptbk-wallet-evidence';

/**
 * Binding the evidence capture reports through (exposed to the isolated world only).
 */
const EVIDENCE_BINDING = 'ptbkWalletEvidence';

/**
 * How often a Wallet sign-in tab is checked for a completed sign-in.
 */
const SIGN_IN_POLL_MS = 1_500;

/**
 * After a submission, a login form still shown this much later means the site refused the submitted values.
 */
const CANDIDATE_SETTLE_MS = 4_000;

/**
 * A viewer that stopped asking for frames for this long counts as gone (its terminal or window ended).
 */
const VIEWER_LEASE_MS = 25_000;

/**
 * Longest wait for an agent operation in flight on the tab before the user's control starts.
 */
const SETTLE_MS = 5_000;

/**
 * Most queued input events accepted in one batch.
 */
const MAX_INPUT_BATCH = 400;

/**
 * Captures the credential a user submits in a login form of the top-level page: only the password field and its
 * username field, at submission, never keystrokes or other fields (one-time codes, security answers, QR values).
 * A first step that asks only for the username keeps it for the password step of the same site.
 */
function evidenceScript(): string {
    return `(() => {
  if (window.top !== window || window.__ptbkEvidence) return;
  window.__ptbkEvidence = true;
  const report = (value) => { try { ${EVIDENCE_BINDING}(JSON.stringify(value)); } catch {} };
  const textual = (input) => ['text', 'email', 'tel', ''].includes((input.getAttribute('type') || '').toLowerCase());
  const capture = (scope) => {
    const root = scope && scope.querySelectorAll ? scope : document;
    const inputs = [...root.querySelectorAll('input')];
    const password = inputs.find((input) => input.type === 'password' && input.value && !/one-time-code/i.test(input.autocomplete || ''));
    const named = (list) => list.find((input) => /username|email/i.test(input.autocomplete || '')) || list.find((input) => input.type === 'email') || list[list.length - 1];
    if (!password) {
      const user = named(inputs.filter((input) => textual(input) && input.value && !/one-time-code/i.test(input.autocomplete || '')));
      if (user) report({ origin: location.origin, username: user.value });
      return;
    }
    const before = inputs.filter((input) => textual(input) && input.value && (input.compareDocumentPosition(password) & Node.DOCUMENT_POSITION_FOLLOWING));
    const user = named(before);
    report({ origin: location.origin, username: user ? user.value : '', password: password.value });
  };
  document.addEventListener('submit', (event) => capture(event.target), true);
  document.addEventListener('keydown', (event) => { if (event.key === 'Enter' && event.target && event.target.tagName === 'INPUT') capture(event.target.form || document); }, true);
  document.addEventListener('click', (event) => { const button = event.target && event.target.closest && event.target.closest('button, input[type=submit], [role=button]'); if (button) capture(button.form || button.closest('form') || document); }, true);
})()`;
}

/**
 * Clears protected values left in a page (password, one-time code and card fields) and reports what stayed.
 */
function protectInputsScript(): string {
    return `(() => {
  const protectedInput = (input) => (input.type || '').toLowerCase() === 'password' || /one-time-code|current-password|new-password|cc-number|cc-csc/i.test(input.autocomplete || '');
  let cleared = 0;
  for (const input of document.querySelectorAll('input')) {
    if (!protectedInput(input) || !input.value) continue;
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    cleared++;
  }
  const left = [...document.querySelectorAll('input')].filter((input) => protectedInput(input) && input.value).length;
  return { cleared, left };
})()`;
}

/**
 * The selected text of the page or of its focused text field (never a password field).
 */
function selectionScript(): string {
    return `(() => {
  const active = document.activeElement;
  if (active && (active.tagName === 'TEXTAREA' || (active.tagName === 'INPUT' && /^(text|search|url|tel|email|number|)$/i.test(active.type || '')))) {
    const start = active.selectionStart ?? 0, end = active.selectionEnd ?? 0;
    return String(active.value || '').slice(start, end);
  }
  return String(getSelection() || '');
})()`;
}

/**
 * Whether two secrets are equal (constant time).
 */
function sameSecret(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Clamps a relative position to the frame.
 */
function unit(value: number): number {
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/**
 * Live control of one real tab of a project browser by the user: the tab is reserved at the shared browser-control
 * boundary first (every engine of the profile then keeps its automation, inspection and recording away from it), in-
 * flight work settles, and only then the tab is streamed to one viewer whose inputs reach it in order. The user keeps
 * it as long as they need; only an explicit handoff returns it, after protected values are cleared from it. Closing the
 * viewer detaches it without a handoff; a lost tab or browser ends the control without assuming authorization.
 *
 * @private browser tab control
 */
export class TabControlSession {
    public readonly id = `tab-${randomBytes(4).toString('hex')}`;
    /** The viewer's scoped grant (rotated when control is reopened with fresh access). */
    private grantValue = randomBytes(18).toString('base64url');
    private stateValue: TabControlState = 'opening';
    private viewer: TabViewerState = 'waiting';
    private viewerSeenAt = Date.now();
    private url?: string;
    private title?: string;
    private canGoBack = false;
    private canGoForward = false;
    private limitations: string[] = [];
    private problem?: string;
    private outcome?: string;
    private readonly startedAt = new Date().toISOString();
    private endedAt?: string;
    private generation = '';
    private sessionId?: string;
    private readonly children = new Set<string>();
    private readonly unsubscribe: Array<() => void> = [];
    private frame?: TabFrame;
    private frameSeq = 0;
    private version = 0;
    private readonly waiters = new Set<() => void>();
    private screencasting = false;
    private viewport = { width: 1280, height: 800, scale: 1 };
    private metricsOverridden = false;
    private touchEmulated = false;
    private drag?: Record<string, unknown>;
    private lastPoint = { x: 0, y: 0 };
    private queue: Promise<void> = Promise.resolve();
    private timer?: NodeJS.Timeout;
    private evidenceScriptId?: string;
    private candidate?: SignInCandidate;
    private candidateAt = 0;
    private signedInAs?: string;
    private pendingUsername?: { readonly origin: string; readonly username: string };
    private sawLoginForm = false;
    private signIn?: { detected: boolean; origin?: string };
    private offer?: { readonly id: string; readonly kind: 'save' | 'update'; readonly origin: string; readonly account: string; readonly candidate: SignInCandidate; readonly record?: string; readonly revision?: string };
    private scanning = false;
    private lastScan = 0;
    private claimed = false;

    private constructor(
        private readonly browser: ProjectBrowser,
        private readonly link: CdpLink,
        public readonly targetId: string,
        public readonly purpose: 'wallet' | 'browse',
        private readonly task: string | undefined,
        private readonly wallet: TabControlWallet | undefined,
        private readonly host: { readonly onChange: () => void; readonly log: (text: string) => void },
    ) {}

    /**
     * Takes control of a tab for the user: an existing tab (`target`), or a new tab of the same profile at `url`.
     * The reservation is made before anything is shown; a tab another user surface controls is refused.
     */
    public static async open(input: {
        readonly browser: ProjectBrowser;
        readonly target?: string;
        readonly url?: string;
        readonly purpose: 'wallet' | 'browse';
        readonly wallet?: TabControlWallet;
        readonly host: { readonly onChange: () => void; readonly log: (text: string) => void };
    }): Promise<TabControlSession> {
        const link = await input.browser.link();
        const profile = input.browser.profile;
        if (!profile) throw new PtbkError(`The browser "${input.browser.name}" is not connected.`, { kind: 'technical' });
        let targetId = input.target;
        let created = false;
        if (!targetId) {
            targetId = String((await link.send('Target.createTarget', { url: input.url ? browserAddress(input.url) : 'about:blank' })).targetId);
            created = true;
        }
        const pages = await input.browser.pages();
        if (!pages.some((page) => page.targetId === targetId)) throw new PtbkError('That tab is no longer open.', { kind: 'not-found' });
        const owner = input.browser.ownerOf(targetId)?.scope;
        const session = new TabControlSession(input.browser, link, targetId, input.purpose, owner, input.wallet, input.host);
        try {
            session.generation = randomBytes(9).toString('hex');
            await input.browser.reservations.reserve(profile, { targetId, generation: session.generation, instanceId: input.browser.instanceId, project: input.browser.projectRoot, purpose: input.purpose });
        } catch (error) {
            if (created) await link.send('Target.closeTarget', { targetId }).catch(() => undefined);
            throw error;
        }
        input.browser.invalidateReservations();
        try {
            await session.start(profile);
        } catch (error) {
            await session.release(`Control could not start: ${errorMessage(error)}`, 'lost');
            throw error;
        }
        return session;
    }

    /** The viewer's grant (given only to the client presenting the viewer). */
    public get grant(): string {
        return this.grantValue;
    }

    /** The lifecycle state. */
    public get state(): TabControlState {
        return this.stateValue;
    }

    /** Whether the control is over (returned, ended or lost). */
    public get over(): boolean {
        return this.stateValue === 'returned' || this.stateValue === 'ended' || this.stateValue === 'lost';
    }

    /** Whether a presented viewer grant is the current one. */
    public authorized(grant: string): boolean {
        return !this.over && sameSecret(grant, this.grantValue);
    }

    /** The shared view. */
    public view(): TabControlView {
        return {
            id: this.id,
            browser: this.browser.name,
            targetId: this.targetId,
            purpose: this.purpose,
            ...(this.wallet ? { request: this.wallet.request } : {}),
            ...(this.task ? { task: this.task } : {}),
            state: this.stateValue,
            viewer: this.viewer,
            ...(this.url ? { url: this.url } : {}),
            ...(this.title ? { title: this.title } : {}),
            canGoBack: this.canGoBack,
            canGoForward: this.canGoForward,
            mode: this.browser.headful ? 'headful' : 'headless',
            limitations: [...this.limitations],
            ...(this.signIn ? { signIn: { ...this.signIn } } : {}),
            ...(this.offer ? { offer: { id: this.offer.id, kind: this.offer.kind, origin: this.offer.origin, account: this.offer.account } } : {}),
            ...(this.problem ? { problem: this.problem } : {}),
            ...(this.outcome ? { outcome: this.outcome } : {}),
            startedAt: this.startedAt,
            ...(this.endedAt ? { endedAt: this.endedAt } : {}),
        };
    }

    /** Publishes a change to pollers and every client. */
    private changed(): void {
        this.version++;
        for (const wake of [...this.waiters]) wake();
        this.host.onChange();
    }

    /**
     * Starts control: limitations are stated, in-flight work of every engine settles at a safe boundary (each engine
     * sees the reservation within its cache bound), then the tab is attached with its own DevTools session.
     */
    private async start(profile: string): Promise<void> {
        const raw = await this.browser.reservations.rawEndpoints(profile).catch(() => []);
        if (raw.length) this.limitations.push(`${raw.length === 1 ? 'An agent task has' : `${raw.length} agent tasks have`} the browser's raw DevTools endpoint; Promptbook cannot hold scripts using it back from this tab.`);
        const settleUntil = Date.now() + SETTLE_MS;
        await new Promise((resolve) => setTimeout(resolve, RESERVATION_CACHE_MS + 100));
        while (this.browser.busyOn(this.targetId) && Date.now() < settleUntil) await new Promise((resolve) => setTimeout(resolve, 100));
        if (this.browser.busyOn(this.targetId)) this.limitations.push('An agent operation was still running in this tab when you took it; it may finish its last step.');
        // This engine's task working in the tab gives it up now (its recording pauses with a labelled gap).
        await this.browser.yieldToUser(this.targetId);
        const attached = await this.link.send('Target.attachToTarget', { targetId: this.targetId, flatten: true });
        this.sessionId = String(attached.sessionId);
        const sessionId = this.sessionId;
        this.unsubscribe.push(
            this.link.on((message) => this.event(message)),
            this.link.onClose(() => void this.release('The browser closed or restarted, so your control of the tab ended. Nothing was handed back to the agent.', 'lost')),
        );
        await this.link.send('Page.enable', {}, sessionId);
        await this.link.send('Runtime.enable', {}, sessionId);
        // Frames of other sites in this tab, for clearing protected values at handoff.
        await this.link.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true }, sessionId).catch(() => undefined);
        await this.link.send('Input.setInterceptDrags', { enabled: true }, sessionId).catch(() => undefined);
        // A tab in the background paints no frames: the controlled tab behaves as focused whichever tab is active (a
        // visible window also brings it to the front, where the user may look at it directly).
        await this.link.send('Emulation.setFocusEmulationEnabled', { enabled: true }, sessionId).catch(() => undefined);
        if (this.browser.headful) await this.link.send('Page.bringToFront', {}, sessionId).catch(() => undefined);
        if (this.wallet) await this.installEvidence(sessionId);
        await this.refreshLocation();
        this.stateValue = 'controlled';
        this.timer = setInterval(() => void this.tick(), 1_000);
        this.timer.unref();
        this.host.log(`Browser "${this.browser.name}": the user took control of a tab${this.wallet ? ` to sign in to ${this.wallet.origin}` : ''}.`);
        this.changed();
    }

    /** Wallet's narrowly scoped evidence of a submitted login form, in an isolated world of the tab. */
    private async installEvidence(sessionId: string): Promise<void> {
        await this.link.send('Runtime.addBinding', { name: EVIDENCE_BINDING, executionContextName: EVIDENCE_WORLD }, sessionId).catch(() => undefined);
        const added = await this.link.send('Page.addScriptToEvaluateOnNewDocument', { source: evidenceScript(), worldName: EVIDENCE_WORLD }, sessionId).catch(() => undefined);
        this.evidenceScriptId = added?.identifier ? String(added.identifier) : undefined;
        const tree = (await this.link.send('Page.getFrameTree', {}, sessionId).catch(() => undefined)) as { frameTree?: { frame?: { id?: string } } } | undefined;
        const frameId = tree?.frameTree?.frame?.id;
        if (!frameId) return;
        const world = await this.link.send('Page.createIsolatedWorld', { frameId, worldName: EVIDENCE_WORLD }, sessionId).catch(() => undefined);
        if (world?.executionContextId) await this.link.send('Runtime.evaluate', { expression: evidenceScript(), contextId: world.executionContextId }, sessionId).catch(() => undefined);
    }

    /** Protocol events of the controlled tab. */
    private event(message: Record<string, unknown>): void {
        const params = (message.params ?? {}) as Record<string, unknown>;
        if (message.method === 'Target.detachedFromTarget' && params.sessionId === this.sessionId && !this.over && this.stateValue !== 'opening') {
            void this.release('The tab was closed, so your control of it ended. Nothing was handed back to the agent.', 'lost');
            return;
        }
        if (message.method === 'Target.attachedToTarget' && message.sessionId === this.sessionId) {
            const child = String(params.sessionId ?? '');
            if (child) this.children.add(child);
            return;
        }
        if (message.method === 'Target.detachedFromTarget' && message.sessionId === this.sessionId) {
            this.children.delete(String(params.sessionId ?? ''));
            return;
        }
        if (message.sessionId !== this.sessionId) return;
        switch (message.method) {
            case 'Page.screencastFrame': {
                // Acknowledged at once: under backpressure only the newest frame is kept, stale ones are dropped.
                void this.link.send('Page.screencastFrameAck', { sessionId: params.sessionId }, this.sessionId).catch(() => undefined);
                const metadata = (params.metadata ?? {}) as { deviceWidth?: number; deviceHeight?: number };
                this.frame = { seq: ++this.frameSeq, data: String(params.data ?? ''), width: Number(metadata.deviceWidth) || this.viewport.width, height: Number(metadata.deviceHeight) || this.viewport.height };
                this.version++;
                for (const wake of [...this.waiters]) wake();
                break;
            }
            case 'Page.frameNavigated': {
                const frame = params.frame as { parentId?: string; url?: string } | undefined;
                if (frame && !frame.parentId) void this.refreshLocation();
                break;
            }
            case 'Page.navigatedWithinDocument':
            case 'Page.loadEventFired':
                void this.refreshLocation();
                break;
            case 'Input.dragIntercepted':
                this.drag = (params.data ?? {}) as Record<string, unknown>;
                void this.link.send('Input.dispatchDragEvent', { type: 'dragEnter', x: this.lastPoint.x, y: this.lastPoint.y, data: this.drag }, this.sessionId).catch(() => undefined);
                break;
            case 'Runtime.bindingCalled':
                if (params.name === EVIDENCE_BINDING) this.evidence(String(params.payload ?? ''));
                break;
        }
    }

    /** The actual address, title and history position of the tab. */
    private async refreshLocation(): Promise<void> {
        if (!this.sessionId || this.over) return;
        const history = (await this.link.send('Page.getNavigationHistory', {}, this.sessionId).catch(() => undefined)) as { currentIndex?: number; entries?: Array<{ url?: string; title?: string }> } | undefined;
        if (!history?.entries?.length) return;
        const index = Math.min(history.entries.length - 1, Math.max(0, history.currentIndex ?? 0));
        const entry = history.entries[index]!;
        const next = { url: entry.url ?? this.url, title: entry.title ?? this.title, back: index > 0, forward: index < history.entries.length - 1 };
        if (next.url === this.url && next.title === this.title && next.back === this.canGoBack && next.forward === this.canGoForward) return;
        this.url = next.url;
        this.title = next.title;
        this.canGoBack = next.back;
        this.canGoForward = next.forward;
        this.changed();
    }

    /** A credential submitted on the website (kept only while it can become an offer). */
    private evidence(payload: string): void {
        let value: { origin?: string; username?: string; password?: string };
        try {
            value = JSON.parse(payload) as typeof value;
        } catch {
            return;
        }
        if (typeof value.origin !== 'string' || !/^https?:/.test(value.origin)) return;
        if (typeof value.password !== 'string' || !value.password) {
            if (typeof value.username === 'string' && value.username) this.pendingUsername = { origin: value.origin, username: value.username.slice(0, 320) };
            return;
        }
        const username = value.username || (this.pendingUsername && serviceMatches(this.pendingUsername.origin, value.origin) ? this.pendingUsername.username : '');
        // A newer submission replaces the previous candidate; an offer for the earlier one becomes obsolete.
        this.candidate = { origin: value.origin, username: String(username).slice(0, 320), password: value.password.slice(0, 1024) };
        this.candidateAt = Date.now();
        if (this.offer) {
            this.offer = undefined;
            this.changed();
        }
    }

    /** Periodic duties: the viewer lease and Wallet's sign-in detection. */
    private async tick(): Promise<void> {
        if (this.over) return;
        if (this.viewer === 'connected' && Date.now() - this.viewerSeenAt > VIEWER_LEASE_MS) this.viewerDetached();
        if (this.wallet && !this.scanning && this.stateValue === 'controlled' && Date.now() - this.lastScan >= SIGN_IN_POLL_MS) {
            this.scanning = true;
            this.lastScan = Date.now();
            try {
                await this.detectSignIn();
            } finally {
                this.scanning = false;
            }
        }
    }

    /** The login state of the tab's page, read in an isolated world (undefined when it cannot be read). */
    private async scan(): Promise<LoginScan | undefined> {
        if (!this.sessionId) return undefined;
        const tree = (await this.link.send('Page.getFrameTree', {}, this.sessionId).catch(() => undefined)) as { frameTree?: { frame?: { id?: string } } } | undefined;
        const frameId = tree?.frameTree?.frame?.id;
        if (!frameId) return undefined;
        const world = await this.link.send('Page.createIsolatedWorld', { frameId, worldName: 'ptbk-wallet-scan' }, this.sessionId).catch(() => undefined);
        if (!world?.executionContextId) return undefined;
        const result = await this.link.send('Runtime.evaluate', { expression: loginFormScript(), contextId: world.executionContextId, returnByValue: true }, this.sessionId).catch(() => undefined);
        return (result?.result as { value?: LoginScan } | undefined)?.value;
    }

    /** Wallet: notices a completed sign-in to the requested service and prepares the save offer for its credential. */
    private async detectSignIn(): Promise<void> {
        const wallet = this.wallet!;
        const scan = await this.scan();
        if (!scan?.origin || !/^https?:/.test(scan.origin)) return;
        const related = (() => {
            try {
                return serviceMatches(normalizeOrigin(scan.origin), wallet.origin);
            } catch {
                return false;
            }
        })();
        const form = scan.password || scan.username || scan.otp || scan.captcha || scan.approval;
        if (form) {
            if (related) this.sawLoginForm = true;
            // The password form came back well after the submission: the site refused those values, so they are no
            // credential to offer (a further step such as a one-time code keeps the candidate).
            if (scan.password && this.candidate && serviceMatches(this.candidate.origin, scan.origin) && Date.now() - this.candidateAt > CANDIDATE_SETTLE_MS) this.candidate = undefined;
            return;
        }
        const candidate = this.candidate;
        const signedIn = related && (this.sawLoginForm || Boolean(candidate));
        // The account the submitted credential signed in (its username, nonsecret, kept in memory for revalidation).
        if (signedIn && candidate?.username && serviceMatches(candidate.origin, scan.origin)) this.signedInAs = candidate.username;
        if (signedIn && !this.signIn?.detected) {
            this.signIn = { detected: true, origin: normalizeOrigin(scan.origin) };
            this.changed();
        }
        // The offer appears only once the submitted credential is associated with a sign-in to its own service.
        if (!candidate || this.offer || !candidate.username || !serviceMatches(candidate.origin, scan.origin)) return;
        const decision = await wallet.offer(candidate).catch(() => undefined);
        if (this.candidate !== candidate || this.over) return;
        if (!decision || decision.kind === 'none') {
            // The same values are saved already: no prompt, and nothing is kept.
            this.candidate = undefined;
            return;
        }
        this.offer = { id: randomBytes(4).toString('hex'), kind: decision.kind, origin: normalizeOrigin(candidate.origin), account: decision.account, candidate, ...(decision.record ? { record: decision.record } : {}), ...(decision.revision ? { revision: decision.revision } : {}) };
        this.changed();
    }

    /**
     * Answers Wallet's save offer for this occurrence: Yes saves through the ordinary encrypted add/update, No discards
     * the candidate. Either way the current sign-in stays and the tab stays with the user. A stale answer saves nothing.
     */
    public async answerOffer(offerId: string, answer: 'yes' | 'no'): Promise<string> {
        const offer = this.offer;
        if (!offer || offer.id !== offerId || !this.wallet) throw new PtbkError('This save offer is no longer current; nothing was saved.', { kind: 'conflict' });
        this.offer = undefined;
        this.candidate = undefined;
        let outcome: string;
        if (answer === 'yes') {
            try {
                outcome = await this.wallet.save(offer.candidate, { record: offer.record, revision: offer.revision });
            } catch (error) {
                outcome = `The password was not saved: ${errorMessage(error)} You stay signed in.`;
            }
        } else outcome = 'Not saved to the Wallet. You stay signed in, and the existing Wallet record (if any) is unchanged.';
        this.outcome = outcome;
        this.changed();
        return outcome;
    }

    /**
     * Frames and state for the viewer after what it has (a bounded long poll): returns at once when something is
     * newer, otherwise on the next change. Only the newest frame is ever sent.
     */
    public async poll(grant: string, after: { readonly version: number; readonly frame: number }, waitMs: number): Promise<{ readonly version: number; readonly view: TabControlView; readonly frame?: TabFrame }> {
        if (!sameSecret(grant, this.grantValue)) throw new PtbkError('This viewer is no longer authorized for the tab.', { kind: 'not-found' });
        this.viewerSeenAt = Date.now();
        if (this.version <= after.version && !this.over && waitMs > 0) {
            await new Promise<void>((resolve) => {
                const timer = setTimeout(done, Math.min(waitMs, 20_000));
                const waiters = this.waiters;
                function done(): void {
                    clearTimeout(timer);
                    waiters.delete(done);
                    resolve();
                }
                waiters.add(done);
            });
        }
        this.viewerSeenAt = Date.now();
        const frame = this.frame && this.frame.seq > after.frame && this.viewer === 'connected' ? this.frame : undefined;
        return { version: this.version, view: this.view(), ...(frame ? { frame } : {}) };
    }

    /** The viewer attached (or came back): streaming starts. */
    public async viewerAttached(grant: string): Promise<TabControlView> {
        this.require(grant);
        this.viewer = 'connected';
        this.viewerSeenAt = Date.now();
        await this.startScreencast();
        this.changed();
        return this.view();
    }

    /**
     * The viewer went away (closed or lost): streaming ends and an unaccepted credential candidate is discarded. It is
     * no handoff: the tab stays with the user, outside agent control.
     */
    public viewerDetached(grant?: string): TabControlView {
        if (grant !== undefined) this.require(grant);
        if (this.over) return this.view();
        this.viewer = 'detached';
        this.candidate = undefined;
        this.offer = undefined;
        void this.stopScreencast();
        this.changed();
        return this.view();
    }

    /**
     * Access for the client presenting the viewer: the first claim gets the initial grant, a later one fresh access
     * (the earlier viewer stops working). A viewer streaming elsewhere is never taken over silently.
     */
    public claim(): string {
        if (!this.claimed) {
            this.claimed = true;
            return this.grantValue;
        }
        if (this.viewer === 'connected') throw new PtbkError('This tab is shown in another viewer now. Close that viewer (or wait until it is detached), then open control again.', { kind: 'conflict' });
        return this.reopen();
    }

    /** Fresh access for reopening control after the viewer was closed (the previous grant stops working). */
    public reopen(): string {
        if (this.over) throw new PtbkError('This tab control has ended.', { kind: 'conflict' });
        this.grantValue = randomBytes(18).toString('base64url');
        this.viewer = 'waiting';
        void this.stopScreencast();
        this.changed();
        return this.grantValue;
    }

    /** Refuses a viewer operation without the current grant. */
    private require(grant: string): void {
        if (!this.authorized(grant)) throw new PtbkError('This viewer is no longer authorized for the tab.', { kind: 'not-found' });
    }

    /** Starts the stream at the viewer's size. */
    private async startScreencast(): Promise<void> {
        if (!this.sessionId || this.screencasting) return;
        this.screencasting = true;
        const scale = Math.min(2, Math.max(1, this.viewport.scale));
        await this.link
            .send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: Math.min(2560, Math.round(this.viewport.width * scale)), maxHeight: Math.min(1600, Math.round(this.viewport.height * scale)), everyNthFrame: 1 }, this.sessionId)
            .catch(() => {
                this.screencasting = false;
            });
    }

    /** Stops the stream (the viewer's frames are dropped). */
    private async stopScreencast(): Promise<void> {
        this.frame = undefined;
        if (!this.sessionId || !this.screencasting) return;
        this.screencasting = false;
        await this.link.send('Page.stopScreencast', {}, this.sessionId).catch(() => undefined);
    }

    /**
     * The viewer's size: a headless tab follows it (a visible window keeps its own size; the viewer scales the frame).
     */
    public async resize(grant: string, size: { readonly width: number; readonly height: number; readonly scale: number }): Promise<void> {
        this.require(grant);
        const width = Math.round(Math.min(3840, Math.max(320, size.width)));
        const height = Math.round(Math.min(2400, Math.max(240, size.height)));
        const scale = Math.min(3, Math.max(1, Number(size.scale) || 1));
        this.viewport = { width, height, scale };
        if (!this.sessionId) return;
        if (!this.browser.headful) {
            await this.link.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false }, this.sessionId).catch(() => undefined);
            this.metricsOverridden = true;
        }
        if (this.screencasting) {
            await this.stopScreencast();
            await this.startScreencast();
        }
    }

    /** Maps a relative position of the shown frame to the tab's CSS pixels. */
    private point(x: number, y: number): { x: number; y: number } {
        const width = this.frame?.width ?? this.viewport.width;
        const height = this.frame?.height ?? this.viewport.height;
        this.lastPoint = { x: unit(x) * width, y: unit(y) * height };
        return this.lastPoint;
    }

    /** Delivers the viewer's inputs to the tab in their order (one batch at a time). */
    public async input(grant: string, events: readonly TabInput[]): Promise<void> {
        this.require(grant);
        if (this.stateValue !== 'controlled' || this.viewer !== 'connected') return;
        const batch = events.slice(0, MAX_INPUT_BATCH);
        const run = this.queue.then(async () => {
            for (const event of batch) {
                if (this.over || this.viewer !== 'connected') return;
                await this.dispatch(event).catch(() => undefined);
            }
        });
        this.queue = run.catch(() => undefined);
        await run;
    }

    /** Dispatches one input through trusted DevTools input. */
    private async dispatch(event: TabInput): Promise<void> {
        const sessionId = this.sessionId!;
        const send = (method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> => this.link.send(method, params, sessionId);
        if (event.type === 'mouse') {
            const { x, y } = this.point(event.x, event.y);
            const modifiers = Number(event.modifiers) || 0;
            if (event.action === 'wheel') return void (await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: Number(event.deltaX) || 0, deltaY: Number(event.deltaY) || 0, modifiers, pointerType: 'mouse' }));
            if (this.drag && (event.action === 'move' || event.action === 'up')) {
                // An HTML drag inside the page: its data goes with the pointer and drops where it is released.
                await send('Input.dispatchDragEvent', { type: event.action === 'up' ? 'drop' : 'dragOver', x, y, data: this.drag, modifiers });
                if (event.action === 'up') {
                    this.drag = undefined;
                    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: event.button ?? 'left', buttons: 0, clickCount: 1, modifiers, pointerType: 'mouse' });
                }
                return;
            }
            const type = event.action === 'move' ? 'mouseMoved' : event.action === 'down' ? 'mousePressed' : 'mouseReleased';
            await send('Input.dispatchMouseEvent', { type, x, y, button: event.button ?? (event.action === 'move' ? 'none' : 'left'), buttons: Number(event.buttons) || 0, clickCount: Math.min(3, Math.max(0, Number(event.clickCount) || (event.action === 'move' ? 0 : 1))), modifiers, pointerType: 'mouse' });
            return;
        }
        if (event.type === 'key') {
            const modifiers = Number(event.modifiers) || 0;
            const printable = event.action === 'down' && typeof event.text === 'string' && event.text.length > 0 && !(modifiers & 2) && !(modifiers & 4);
            await send('Input.dispatchKeyEvent', {
                type: event.action === 'up' ? 'keyUp' : printable ? 'keyDown' : 'rawKeyDown',
                key: String(event.key ?? '').slice(0, 32),
                code: String(event.code ?? '').slice(0, 32),
                windowsVirtualKeyCode: Number(event.keyCode) || 0,
                nativeVirtualKeyCode: Number(event.keyCode) || 0,
                modifiers,
                ...(printable ? { text: event.text!.slice(0, 8), unmodifiedText: event.text!.slice(0, 8) } : {}),
                ...(event.location ? { location: Number(event.location) } : {}),
                ...(event.repeat ? { autoRepeat: true } : {}),
                ...(event.command && event.action === 'down' ? { commands: [event.command] } : {}),
            });
            return;
        }
        if (event.type === 'text') {
            if (event.text) await send('Input.insertText', { text: String(event.text).slice(0, 100_000) });
            return;
        }
        if (event.type === 'touch') {
            if (!this.touchEmulated) {
                await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }).catch(() => undefined);
                this.touchEmulated = true;
            }
            const points = event.points.slice(0, 5).map((touch) => ({ ...this.point(touch.x, touch.y), id: Number(touch.id) || 0 }));
            const type = event.action === 'start' ? 'touchStart' : event.action === 'move' ? 'touchMove' : event.action === 'end' ? 'touchEnd' : 'touchCancel';
            await send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : points, modifiers: Number(event.modifiers) || 0 });
        }
    }

    /** The trusted toolbar: an address, Back, Forward or Reload. A new address never changes a Wallet request's service. */
    public async navigate(grant: string, action: 'go' | 'back' | 'forward' | 'reload', url?: string): Promise<TabControlView> {
        this.require(grant);
        // Inputs delivered before the toolbar action take effect first.
        await this.queue;
        const sessionId = this.sessionId;
        if (!sessionId || this.stateValue !== 'controlled') return this.view();
        // The toolbar shows where the tab went once the navigation commits (bounded; a slow site keeps streaming).
        const committed = this.link.waitFor(['Page.frameNavigated', 'Page.navigatedWithinDocument'], 10_000, sessionId).catch(() => undefined);
        if (action === 'go') {
            const result = await this.link.send('Page.navigate', { url: browserAddress(url ?? '') }, sessionId);
            if (typeof result.errorText === 'string' && result.errorText) this.problem = `The address could not be opened: ${result.errorText}.`;
            if (result.loaderId) await committed;
        } else if (action === 'reload') {
            await this.link.send('Page.reload', {}, sessionId);
            await committed;
        } else {
            const history = (await this.link.send('Page.getNavigationHistory', {}, sessionId)) as { currentIndex: number; entries: Array<{ id: number }> };
            const entry = history.entries[history.currentIndex + (action === 'back' ? -1 : 1)];
            if (entry) {
                await this.link.send('Page.navigateToHistoryEntry', { entryId: entry.id }, sessionId);
                await committed;
            }
        }
        await this.refreshLocation();
        return this.view();
    }

    /**
     * Copies the page's selected text for an explicit copy of the user (returned only to their viewer, never logged),
     * or pastes text the user explicitly pasted into the focused field.
     */
    public async clipboard(grant: string, action: 'copy' | 'cut' | 'paste', text?: string): Promise<{ readonly text?: string }> {
        this.require(grant);
        // A copy reads the selection the inputs before it made.
        await this.queue;
        const sessionId = this.sessionId;
        if (!sessionId || this.stateValue !== 'controlled') return {};
        if (action === 'paste') {
            if (text) await this.link.send('Input.insertText', { text: text.slice(0, 100_000) }, sessionId);
            return {};
        }
        const result = await this.link.send('Runtime.evaluate', { expression: selectionScript(), returnByValue: true }, sessionId).catch(() => undefined);
        const selected = String((result?.result as { value?: unknown } | undefined)?.value ?? '');
        if (action === 'cut' && selected) await this.link.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 }, sessionId).then(() => this.link.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 }, sessionId)).catch(() => undefined);
        return { text: selected };
    }

    /**
     * Clears protected values left in every frame of the tab; the number that stayed (or could not be checked).
     */
    private async protectInputs(): Promise<number> {
        if (!this.sessionId) return 0;
        let remaining = 0;
        const tree = (await this.link.send('Page.getFrameTree', {}, this.sessionId).catch(() => undefined)) as { frameTree?: FrameNode } | undefined;
        type FrameNode = { frame?: { id?: string }; childFrames?: FrameNode[] };
        const frames: string[] = [];
        const walk = (node?: FrameNode): void => {
            if (!node) return;
            if (node.frame?.id) frames.push(node.frame.id);
            for (const child of node.childFrames ?? []) walk(child);
        };
        walk(tree?.frameTree);
        const evaluate = async (sessionId: string, contextId?: number): Promise<void> => {
            const result = await this.link.send('Runtime.evaluate', { expression: protectInputsScript(), returnByValue: true, ...(contextId ? { contextId } : {}) }, sessionId).catch(() => undefined);
            const value = (result?.result as { value?: { left?: number } } | undefined)?.value;
            if (!value) remaining++;
            else remaining += Number(value.left) || 0;
        };
        for (const frameId of frames) {
            const world = await this.link.send('Page.createIsolatedWorld', { frameId, worldName: 'ptbk-protect' }, this.sessionId).catch(() => undefined);
            if (world?.executionContextId) await evaluate(this.sessionId, Number(world.executionContextId));
            else remaining++;
        }
        // Frames of other sites run in their own processes.
        for (const child of this.children) await evaluate(child);
        return remaining;
    }

    /**
     * Returns the tab to the agent on the user's explicit choice: input stops, the stream ends, protected values are
     * cleared (an unsafe tab stays protected with the reason), the viewer's buffers are discarded and the reservation is
     * released by its own generation. A Wallet request is satisfied only by revalidated access to its original service
     * and account; tasks that gave the tab up are told to revalidate it.
     */
    public async handBack(): Promise<TabControlView> {
        if (this.over) return this.view();
        if (this.stateValue !== 'controlled') throw new PtbkError('The tab is not under your control yet.', { kind: 'conflict' });
        const viewerWas = this.viewer;
        this.viewer = 'detached';
        await this.queue;
        await this.stopScreencast();
        const left = await this.protectInputs();
        if (left) {
            this.viewer = viewerWas === 'connected' ? 'detached' : viewerWas;
            this.problem = `The tab still shows ${left === 1 ? 'a protected field' : `${left} protected fields`} that could not be cleared, so it stays with you. Clear or leave that page (or end your use of the tab), then return control again.`;
            this.changed();
            return this.view();
        }
        const access = this.wallet ? await this.revalidate() : undefined;
        const evidence = Boolean(this.signedInAs);
        this.candidate = undefined;
        this.signedInAs = undefined;
        this.pendingUsername = undefined;
        this.offer = undefined;
        await this.release('', 'returned');
        this.browser.handedBack(this.targetId, this.url);
        let outcome = 'You handed the tab back; the agent may use it again.';
        if (this.wallet && access) {
            const satisfied = await this.wallet.satisfy({ origin: access.origin, ...(access.account ? { account: access.account } : {}), evidence }).catch((error: unknown) => ({ resolved: false, reason: errorMessage(error) }));
            outcome = satisfied.resolved ? `You handed the tab back. ${satisfied.reason}` : `You handed the tab back, but the original sign-in request still waits: ${satisfied.reason}`;
        } else if (this.wallet) outcome = `You handed the tab back, but the original sign-in request still waits: ${this.problem ?? 'no sign-in to the requested service was found in the tab.'}`;
        this.outcome = outcome;
        this.host.log(`Browser "${this.browser.name}": the user handed a tab back to the agent.`);
        this.changed();
        return this.view();
    }

    /** The access the returned tab gives for the Wallet request: its service (and account evidence), or none. */
    private async revalidate(): Promise<{ readonly origin: string; readonly account?: string } | undefined> {
        const wallet = this.wallet!;
        const scan = await this.scan();
        if (!scan?.origin || !/^https?:/.test(scan.origin)) {
            this.problem = 'the tab does not show the requested service.';
            return undefined;
        }
        let origin: string;
        try {
            origin = normalizeOrigin(scan.origin);
        } catch {
            this.problem = 'the tab does not show a website.';
            return undefined;
        }
        if (!serviceMatches(origin, wallet.origin)) {
            this.problem = `the tab is on ${origin}, not on ${wallet.origin}; an unrelated sign-in does not satisfy the request.`;
            return undefined;
        }
        if (scan.password || scan.username || scan.otp || scan.captcha || scan.approval) {
            this.problem = `${origin} still shows a sign-in step.`;
            return undefined;
        }
        const account = this.signedInAs || this.candidate?.username || this.pendingUsername?.username;
        if (wallet.account && !(account && account.toLowerCase() === wallet.account.toLowerCase())) {
            // The request names an account: the signed-in page must show it when no submitted username proves it.
            const text = await this.link.send('Runtime.evaluate', { expression: 'document.body ? document.body.innerText.slice(0, 200000) : ""', returnByValue: true }, this.sessionId).catch(() => undefined);
            const shown = String((text?.result as { value?: unknown } | undefined)?.value ?? '').toLowerCase().includes(wallet.account.toLowerCase());
            if (!shown) {
                this.problem = `Wallet could not confirm that ${origin} is signed in as ${wallet.account}; a different account does not satisfy the request.`;
                return undefined;
            }
            return { origin, account: wallet.account };
        }
        return { origin, ...(account ? { account } : {}) };
    }

    /**
     * Ends the user's use of the tab without handing it back: the tab closes (its work is not resumed and no agent
     * takes it), the profile's cookies stay, and a Wallet request keeps waiting.
     */
    public async endUse(): Promise<TabControlView> {
        if (this.over) return this.view();
        this.viewer = 'detached';
        await this.stopScreencast();
        this.candidate = undefined;
        this.offer = undefined;
        await this.link.send('Target.closeTarget', { targetId: this.targetId }).catch(() => undefined);
        await this.release('You ended your use of the tab; it was closed and not handed back to the agent.', 'ended');
        return this.view();
    }

    /** Ends control at engine stop: the controlled tab closes, so no other engine's automation can take it over. */
    public async close(reason: string): Promise<void> {
        if (this.over) return;
        await this.stopScreencast();
        await this.link.send('Target.closeTarget', { targetId: this.targetId }).catch(() => undefined);
        await this.release(reason, 'ended');
    }

    /**
     * Releases everything the control holds (idempotent): stream, input, protocol hooks and session, temporary viewer
     * state and the reservation (by its own generation).
     */
    private async release(reason: string, state: 'returned' | 'ended' | 'lost'): Promise<void> {
        if (this.over) return;
        this.stateValue = state;
        this.viewer = 'detached';
        if (reason) this.outcome = reason;
        this.endedAt = new Date().toISOString();
        clearInterval(this.timer);
        this.frame = undefined;
        this.candidate = undefined;
        this.pendingUsername = undefined;
        this.signedInAs = undefined;
        this.offer = undefined;
        for (const unsubscribe of this.unsubscribe.splice(0)) unsubscribe();
        const sessionId = this.sessionId;
        this.sessionId = undefined;
        if (sessionId && state !== 'lost') {
            await this.link.send('Page.stopScreencast', {}, sessionId).catch(() => undefined);
            await this.link.send('Input.setInterceptDrags', { enabled: false }, sessionId).catch(() => undefined);
            if (this.touchEmulated) await this.link.send('Emulation.setTouchEmulationEnabled', { enabled: false }, sessionId).catch(() => undefined);
            if (this.metricsOverridden) await this.link.send('Emulation.clearDeviceMetricsOverride', {}, sessionId).catch(() => undefined);
            await this.link.send('Emulation.setFocusEmulationEnabled', { enabled: false }, sessionId).catch(() => undefined);
            if (this.evidenceScriptId) await this.link.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: this.evidenceScriptId }, sessionId).catch(() => undefined);
            await this.link.send('Runtime.removeBinding', { name: EVIDENCE_BINDING }, sessionId).catch(() => undefined);
            await this.link.send('Target.detachFromTarget', { sessionId }).catch(() => undefined);
        }
        const profile = this.browser.profile;
        if (profile && this.generation) await this.browser.reservations.release(profile, this.targetId, this.generation).catch(() => undefined);
        this.browser.invalidateReservations();
        if (state === 'lost') this.problem = reason;
        if (reason) this.host.log(`Browser "${this.browser.name}": ${reason}`);
        this.changed();
    }
}

/**
 * The tabs users control in this engine's browsers.
 *
 * @private browser tab control
 */
export class TabControls {
    private readonly sessions = new Map<string, TabControlSession>();

    public constructor(private readonly host: { readonly onChange: () => void; readonly log: (text: string) => void }) {}

    /**
     * Takes control of a tab (or of a new tab at `url`) of a project browser for the user. One live control per tab;
     * a Wallet request has at most one live manual sign-in.
     */
    public async open(input: { readonly browser: ProjectBrowser; readonly target?: string; readonly url?: string; readonly purpose: 'wallet' | 'browse'; readonly wallet?: TabControlWallet }): Promise<TabControlSession> {
        if (input.wallet) {
            const existing = [...this.sessions.values()].find((session) => !session.over && session.view().request === input.wallet!.request);
            if (existing) return existing;
        }
        if (input.target) {
            const existing = [...this.sessions.values()].find((session) => !session.over && session.targetId === input.target);
            if (existing) return existing;
        }
        input.browser.beforeDisconnect ??= async () => await this.closeBrowser(input.browser.name, 'The engine disconnected from the browser, so the tab you controlled was closed.');
        const session = await TabControlSession.open({ ...input, host: this.host });
        this.sessions.set(session.id, session);
        // Ended controls stay visible briefly with their outcome.
        for (const [id, candidate] of this.sessions) if (candidate.over && Date.parse(candidate.view().endedAt ?? '') < Date.now() - 10 * 60_000) this.sessions.delete(id);
        return session;
    }

    /** A control by id. */
    public get(id: string): TabControlSession {
        const session = this.sessions.get(id);
        if (!session) throw new PtbkError('No such tab control.', { kind: 'not-found' });
        return session;
    }

    /** Every control (live first). */
    public views(): TabControlView[] {
        return [...this.sessions.values()].map((session) => session.view()).sort((a, b) => Number(a.state === 'returned' || a.state === 'ended' || a.state === 'lost') - Number(b.state === 'returned' || b.state === 'ended' || b.state === 'lost'));
    }

    /** Ends the controls of one browser (it disconnects). */
    private async closeBrowser(name: string, reason: string): Promise<void> {
        await Promise.all([...this.sessions.values()].filter((session) => !session.over && session.view().browser === name).map(async (session) => await session.close(reason)));
    }

    /** Ends every control (engine stop). */
    public async closeAll(reason: string): Promise<void> {
        await Promise.all([...this.sessions.values()].filter((session) => !session.over).map(async (session) => await session.close(reason)));
    }
}
