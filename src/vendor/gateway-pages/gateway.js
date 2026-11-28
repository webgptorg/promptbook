/*
 * Reference gateway pages (MIT, @ptbk/gateway-pages): the one script behind setup.html, sign-in.html, step-up.html and
 * join.html.
 * It only switches between the states the page already holds: no user-visible copy lives here and no HTML is ever
 * written, so it runs unchanged under the engine's CSP and Trusted Types.
 */
import { isSafeNextPath } from './next-path.js';

const SETUP_SECRET = /^[A-Za-z0-9_-]{22}$/;
/** A dashboard access ticket: `<base64url body>.<base64url signature>`, at most 2048 characters. */
const ACCESS_TICKET = /^[A-Za-z0-9_-]{1,1958}\.[A-Za-z0-9_-]{86}$/;
const FINGERPRINT_CELLS = /^[01]{25}$/;
const REQUEST_TIMEOUT_MS = 15_000;
/** The waiting page asks at most this often, so an engine whose status answers at once is not polled in a tight loop. */
const STATUS_MIN_INTERVAL_MS = 3_000;
/** A dropped connection or a busy engine is retried quietly; this many in a row show the problem instead. */
const STATUS_TOLERATED_FAILURES = 3;
const ME_PATH = '/api/v1/me';
/** The engine UI listens here for the popup step-up's answer; same-origin by construction. */
const STEP_UP_CHANNEL = 'ptbk-step-up';
/** The opener's random token for one popup, echoed back so an old or foreign answer is ignored. */
const POPUP_NONCE = /^[A-Za-z0-9_-]{16,64}$/;
const CANCELLED = new Set(['NotAllowedError', 'AbortError']);
const UNSUPPORTED = new Set(['NotSupportedError', 'SecurityError']);

const isObject = (value) => typeof value === 'object' && value !== null;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let currentSection = document.querySelector('section[data-state]:not([hidden])');

function visibleText(element) {
    const language = document.documentElement.lang === 'cs' ? 'cs' : 'en';
    return element.querySelector(`[data-lang="${language}"]`)?.textContent ?? '';
}

function show(state) {
    const next = document.querySelector(`section[data-state="${state}"]`);
    if (next === null || next === currentSection) return;
    const active = document.activeElement;
    const focusWasHere = active === null || active === document.body || currentSection?.contains(active) === true;
    if (currentSection !== null) currentSection.hidden = true;
    next.hidden = false;
    currentSection = next;
    // Copy that several states share, such as sign-in's ways forward, sits once after the sections and names them.
    for (const element of document.querySelectorAll('[data-shown-in]')) {
        element.hidden = !(element.dataset.shownIn ?? '').split(' ').includes(state);
    }
    const heading = next.querySelector('h1');
    if (heading === null) return;
    // Focus left with the hidden section; move it to the new heading so screen readers read it. Otherwise announce.
    if (focusWasHere) heading.focus();
    else {
        const announcer = document.querySelector('[data-announcer]');
        if (announcer !== null) announcer.textContent = visibleText(heading);
    }
}

function drawFingerprints() {
    for (const grid of document.querySelectorAll('[data-fingerprint-cells]')) {
        const cells = grid.dataset.fingerprintCells ?? '';
        if (!FINGERPRINT_CELLS.test(cells)) continue;
        [...grid.children].forEach((cell, index) => cell.classList.toggle('is-filled', cells[index] === '1'));
    }
}

function pointLinksAt(selector, path) {
    for (const link of document.querySelectorAll(selector)) link.href = path;
}

/** `status` 0 is a network failure or timeout; `code` is the problem+json code, read tolerantly. */
async function post(path, body) {
    let response;
    try {
        response = await fetch(path, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            redirect: 'error',
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            body: JSON.stringify(body),
        });
    } catch {
        return { status: 0, code: null, body: null };
    }
    const parsed = await response.json().catch(() => null);
    const code = isObject(parsed) && typeof parsed.code === 'string' ? parsed.code : null;
    return { status: response.status, code, body: response.ok && isObject(parsed) ? parsed : null };
}

/** Whether this browser already holds a session: a same-origin request carries the `SameSite=Strict` cookie. */
async function hasSession() {
    try {
        const response = await fetch(ME_PATH, {
            credentials: 'same-origin',
            cache: 'no-store',
            redirect: 'error',
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        return response.status === 200;
    } catch {
        return false;
    }
}

function ceremonyState(error) {
    const names = [error?.name, error?.cause?.name];
    if (error?.code === 'ERROR_CEREMONY_ABORTED' || names.some((name) => CANCELLED.has(name))) return 'cancelled';
    if (names.some((name) => UNSUPPORTED.has(name))) return 'unsupported';
    return 'failed';
}

// Without the vendored library (blocked, or refused by its integrity hash) no passkey ceremony can run either.
const supportsPasskeys = (webauthn) =>
    typeof webauthn?.browserSupportsWebAuthn === 'function' && webauthn.browserSupportsWebAuthn() === true;

const nextFrom = (body) => (typeof body?.next === 'string' && isSafeNextPath(body.next) ? body.next : '/');

function setupProblem({ status, code }) {
    if (status === 0) return 'offline';
    if (status === 403) return 'expired';
    if (status === 409) return 'owner-exists';
    if (status === 429) return 'rate-limited';
    if (code === 'passkey-not-verified') return 'not-verified';
    return 'error';
}

/** A retry replaces only the browser prompt. Once its answer goes to the engine, verification runs exactly once. */
function passkeyFlow(webauthn, { base, optionsBody, ready, problem, ask, verify }) {
    const reopenButton = document.querySelector('button[data-action="reopen"]');
    let options = null;
    let pendingPrompt = null;

    async function prepare(start = 'ready') {
        show('loading');
        const result = await post(`${base}/options`, optionsBody);
        if (result.status !== 200 || !isObject(result.body?.options)) {
            show(problem(result, 'options'));
            return;
        }
        options = result.body.options;
        if (start === 'ready') show(ready);
        else await confirm(start === 'automatic');
    }

    async function confirm(automatic = false) {
        if (options === null) return;
        if (!supportsPasskeys(webauthn)) {
            show('unsupported');
            return;
        }
        const optionsJSON = options;
        options = null;
        pendingPrompt = optionsJSON;
        reopenButton.hidden = false;
        show('prompt');
        let response;
        try {
            response = await ask({ optionsJSON });
        } catch (error) {
            if (pendingPrompt !== optionsJSON) return;
            pendingPrompt = null;
            const state = ceremonyState(error);
            // A popup opened by the project can need a first click in its own window.
            if (automatic && state === 'cancelled') await prepare();
            else show(state);
            return;
        }
        if (pendingPrompt !== optionsJSON) return;
        pendingPrompt = null;
        reopenButton.hidden = true;
        await verify(response);
    }

    function reopen() {
        if (pendingPrompt === null) return;
        // Some providers report cancellation late. Disown their answer before aborting the native dialog.
        pendingPrompt = null;
        webauthn.WebAuthnAbortService.cancelCeremony();
        return prepare('prompt');
    }

    const retry = () => prepare(currentSection?.dataset.state === 'cancelled' ? 'prompt' : 'ready');
    return { prepare, confirm, reopen, retry };
}

function setupPage(webauthn) {
    const fragment = location.hash.slice(1);
    // Before anything else, so the secret is never left in the address bar, the history or a bookmark.
    if (location.hash !== '') history.replaceState(null, '', location.pathname + location.search);
    if (document.body.dataset.owner === 'set') {
        show('owner-exists');
        return {};
    }
    if (!SETUP_SECRET.test(fragment)) {
        show('missing');
        return {};
    }
    const secret = fragment;
    async function verify(response) {
        const result = await post('/setup/verify', { secret, response });
        if (result.status === 200) {
            pointLinksAt('[data-next-link]', nextFrom(result.body));
            show('done');
        } else show(setupProblem(result));
    }

    const flow = passkeyFlow(webauthn, {
        base: '/setup',
        optionsBody: { secret },
        ready: 'valid',
        problem: setupProblem,
        ask: (options) => webauthn.startRegistration(options),
        verify,
    });
    void flow.prepare();
    return { create: flow.confirm, reopen: flow.reopen, retry: flow.retry };
}

function joinProblem({ status, code }) {
    if (status === 0) return 'offline';
    if (status === 429) return 'rate-limited';
    if (code === 'ticket-invalid') return 'invalid';
    if (code === 'ticket-expired') return 'expired';
    if (code === 'ticket-used') return 'used';
    if (code === 'already-member') return 'already-member';
    if (code === 'too-many-requests') return 'full';
    if (code === 'passkey-not-verified') return 'not-verified';
    return 'error';
}

function joinPage(webauthn) {
    const fragment = location.hash.slice(1);
    // Before anything else, so the ticket is never left in the address bar, the history or a bookmark.
    if (location.hash !== '') history.replaceState(null, '', location.pathname + location.search);
    let waitingFor = null;

    /*
     * A gateway may hold each status request until something changes; one that answers at once is still asked only
     * every few seconds. Approval sets the session cookie on that answer, so the page goes straight into the engine.
     * Passing failures are retried after a longer pause; a run of them stops on the problem, whose retry picks the
     * waiting up again without a second passkey.
     */
    async function wait() {
        show('waiting');
        let failures = 0;
        for (;;) {
            const startedAt = Date.now();
            const result = await post('/auth/join/status', { request: waitingFor });
            if (result.status === 200 && result.body?.state === 'approved') {
                const target = nextFrom(result.body);
                pointLinksAt('[data-next-link]', target);
                show('done');
                location.assign(target);
                return;
            }
            if ((result.status === 200 && result.body?.state === 'declined') || result.status === 404) {
                show('declined');
                return;
            }
            if (result.status === 200) failures = 0;
            else {
                const passing = result.status === 0 || result.status === 429 || result.status >= 500;
                failures += 1;
                if (!passing || failures >= STATUS_TOLERATED_FAILURES) {
                    show(joinProblem(result));
                    return;
                }
            }
            await sleep(startedAt + STATUS_MIN_INTERVAL_MS * (failures + 1) - Date.now());
        }
    }

    if (!ACCESS_TICKET.test(fragment)) {
        show('missing');
        return {};
    }
    const ticket = fragment;

    async function verify(response) {
        const result = await post('/auth/join/verify', { ticket, response });
        if (result.status === 201 && typeof result.body?.request === 'string' && /^\d{6}$/.test(result.body.code)) {
            waitingFor = result.body.request;
            const { code } = result.body;
            for (const element of document.querySelectorAll('[data-join-code]')) {
                element.textContent = `${code.slice(0, 3)} ${code.slice(3)}`;
            }
            await wait();
        } else show(joinProblem(result));
    }

    const flow = passkeyFlow(webauthn, {
        base: '/auth/join',
        optionsBody: { ticket },
        ready: 'valid',
        problem: joinProblem,
        ask: (options) => webauthn.startRegistration(options),
        verify,
    });
    void flow.prepare();
    return { create: flow.confirm, reopen: flow.reopen, retry: () => (waitingFor === null ? flow.retry() : wait()) };
}

/** `?mode=popup&nonce=…`: the engine UI opened this page in a small window and waits for its answer. */
function popupNonce() {
    const query = new URLSearchParams(location.search);
    const nonce = query.get('nonce');
    return query.get('mode') === 'popup' && nonce !== null && POPUP_NONCE.test(nonce) ? nonce : null;
}

/** Tells the opener the assertion verified, on the channel and to the opener itself, then closes the window. */
function answerOpener(nonce) {
    const message = { type: 'step-up-confirmed', nonce };
    if (typeof BroadcastChannel === 'function') {
        const channel = new BroadcastChannel(STEP_UP_CHANNEL);
        channel.postMessage(message);
        channel.close();
    }
    // Same origin only: the target origin keeps the message from any other page the opener may have become.
    window.opener?.postMessage(message, location.origin);
    show('confirmed');
    window.close();
}

function assertionPage(webauthn, { base, nextParameter, problem, resumeSession = false, popup = null }) {
    const requested = new URLSearchParams(location.search).get(nextParameter);
    const next = requested !== null && isSafeNextPath(requested) ? requested : null;
    if (next !== null) {
        pointLinksAt('[data-next-link]', next);
        pointLinksAt('[data-sign-in-link]', `/auth/sign-in?${new URLSearchParams({ next }).toString()}`);
    }
    async function verify(response) {
        const result = await post(`${base}/verify`, next === null ? { response } : { response, next });
        if (result.status !== 200) {
            show(problem(result, 'verify'));
            return;
        }
        if (popup !== null) {
            answerOpener(popup);
            return;
        }
        const target = nextFrom(result.body);
        pointLinksAt('[data-next-link]', target);
        show('done');
        location.assign(target);
    }

    const flow = passkeyFlow(webauthn, {
        base,
        optionsBody: {},
        ready: 'ready',
        problem,
        ask: (options) => webauthn.startAuthentication(options),
        verify,
    });

    /*
     * A cross-site link, such as the dashboard's "Open engine", arrives without the Strict cookie, so the gateway sends
     * a signed-in member here. The page's own request carries it: with a session, go on without a passkey prompt.
     * `replace`, so Back does not return to this page and bounce forward again.
     */
    async function resume() {
        show('checking');
        if (!(await hasSession())) {
            await flow.prepare();
            return;
        }
        const target = next ?? '/';
        pointLinksAt('[data-next-link]', target);
        show('done');
        location.replace(target);
    }

    void (resumeSession ? resume() : flow.prepare(popup === null ? 'ready' : 'automatic'));
    return {
        confirm: flow.confirm,
        reopen: flow.reopen,
        retry: flow.retry,
        ...(popup === null ? {} : { close: async () => window.close() }),
    };
}

function signInProblem({ status }) {
    if (status === 0) return 'offline';
    if (status === 400 || status === 401) return 'not-recognised';
    if (status === 429) return 'rate-limited';
    return 'error';
}

function stepUpProblem({ status, code }, phase) {
    if (status === 0) return 'offline';
    if (status === 401 && (phase === 'options' || code === 'unauthenticated')) return 'signed-out';
    if (status === 400 || status === 401) return 'not-recognised';
    if (status === 429) return 'rate-limited';
    return 'error';
}

function start() {
    drawFingerprints();
    const webauthn = globalThis.SimpleWebAuthnBrowser;
    const page = document.body.dataset.page;
    let actions = {};
    if (page === 'setup') actions = setupPage(webauthn);
    else if (page === 'join') actions = joinPage(webauthn);
    else if (page === 'sign-in') {
        if (document.body.dataset.owner === 'none') show('no-owner');
        else
            actions = assertionPage(webauthn, {
                base: '/auth/sign-in',
                nextParameter: 'next',
                problem: signInProblem,
                resumeSession: true,
            });
    } else if (page === 'step-up-confirmed') {
        // A gateway that confirmed the step-up some other way (the mock engine's dev login) answers the opener alike.
        const popup = popupNonce();
        if (popup !== null) answerOpener(popup);
    } else if (page === 'step-up') {
        // The engine UI sends members here with `returnTo` (STEP_UP_PATH), and to sign-in with `next`.
        const popup = popupNonce();
        if (popup !== null) {
            for (const element of document.querySelectorAll('[data-if-popup]')) element.hidden = false;
            for (const element of document.querySelectorAll('[data-unless-popup]')) element.hidden = true;
        }
        actions = assertionPage(webauthn, {
            base: '/auth/step-up',
            nextParameter: 'returnTo',
            problem: stepUpProblem,
            popup,
        });
    }

    document.body.addEventListener('click', (event) => {
        const button = event.target instanceof Element ? event.target.closest('button[data-action]') : null;
        const name = button?.dataset.action;
        if (name === undefined || !currentSection?.contains(button) || button.hidden || !Object.hasOwn(actions, name))
            return;
        void actions[name]();
    });
}

start();
