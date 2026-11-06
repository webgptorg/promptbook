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
const ME_PATH = '/api/v1/me';
const CANCELLED = new Set(['NotAllowedError', 'AbortError']);
const UNSUPPORTED = new Set(['NotSupportedError', 'SecurityError']);

const isObject = (value) => typeof value === 'object' && value !== null;

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
    let options = null;

    async function prepare() {
        show('loading');
        const result = await post('/setup/options', { secret });
        if (result.status === 200 && isObject(result.body?.options)) {
            options = result.body.options;
            show('valid');
        } else show(setupProblem(result));
    }

    async function create() {
        if (options === null) return;
        if (!supportsPasskeys(webauthn)) {
            show('unsupported');
            return;
        }
        const optionsJSON = options;
        // A challenge works once; any retry fetches a fresh one.
        options = null;
        show('prompt');
        let response;
        try {
            response = await webauthn.startRegistration({ optionsJSON });
        } catch (error) {
            show(ceremonyState(error));
            return;
        }
        const result = await post('/setup/verify', { secret, response });
        if (result.status === 200) {
            pointLinksAt('[data-next-link]', nextFrom(result.body));
            show('done');
        } else show(setupProblem(result));
    }

    void prepare();
    return { create, retry: prepare };
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
    let options = null;
    let waitingFor = null;

    /*
     * The gateway holds each status request until something changes or a few seconds pass, so this loop needs no
     * timer. A network failure stops it on the offline state, whose retry picks the waiting up again.
     */
    async function wait() {
        show('waiting');
        for (;;) {
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
            if (result.status !== 200) {
                show(joinProblem(result));
                return;
            }
        }
    }

    if (!ACCESS_TICKET.test(fragment)) {
        show('missing');
        return {};
    }
    const ticket = fragment;

    async function prepare() {
        show('loading');
        const result = await post('/auth/join/options', { ticket });
        if (result.status === 200 && isObject(result.body?.options)) {
            options = result.body.options;
            show('valid');
        } else show(joinProblem(result));
    }

    async function create() {
        if (options === null) return;
        if (!supportsPasskeys(webauthn)) {
            show('unsupported');
            return;
        }
        const optionsJSON = options;
        options = null;
        show('prompt');
        let response;
        try {
            response = await webauthn.startRegistration({ optionsJSON });
        } catch (error) {
            show(ceremonyState(error));
            return;
        }
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

    void prepare();
    return { create, retry: () => (waitingFor === null ? prepare() : wait()) };
}

function assertionPage(webauthn, { base, nextParameter, problem, resumeSession = false }) {
    const requested = new URLSearchParams(location.search).get(nextParameter);
    const next = requested !== null && isSafeNextPath(requested) ? requested : null;
    if (next !== null) {
        pointLinksAt('[data-next-link]', next);
        pointLinksAt('[data-sign-in-link]', `/auth/sign-in?${new URLSearchParams({ next }).toString()}`);
    }
    let options = null;

    async function prepare() {
        show('loading');
        const result = await post(`${base}/options`, {});
        if (result.status === 200 && isObject(result.body?.options)) {
            options = result.body.options;
            show('ready');
        } else show(problem(result, 'options'));
    }

    async function confirm() {
        if (options === null) return;
        if (!supportsPasskeys(webauthn)) {
            show('unsupported');
            return;
        }
        const optionsJSON = options;
        options = null;
        show('prompt');
        let response;
        try {
            response = await webauthn.startAuthentication({ optionsJSON });
        } catch (error) {
            show(ceremonyState(error));
            return;
        }
        const result = await post(`${base}/verify`, next === null ? { response } : { response, next });
        if (result.status !== 200) {
            show(problem(result, 'verify'));
            return;
        }
        const target = nextFrom(result.body);
        pointLinksAt('[data-next-link]', target);
        show('done');
        location.assign(target);
    }

    /*
     * A cross-site link, such as the dashboard's "Open engine", arrives without the Strict cookie, so the gateway sends
     * a signed-in member here. The page's own request carries it: with a session, go on without a passkey prompt.
     * `replace`, so Back does not return to this page and bounce forward again.
     */
    async function resume() {
        show('checking');
        if (!(await hasSession())) {
            await prepare();
            return;
        }
        const target = next ?? '/';
        pointLinksAt('[data-next-link]', target);
        show('done');
        location.replace(target);
    }

    void (resumeSession ? resume() : prepare());
    return { confirm, retry: prepare };
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
    } else if (page === 'step-up') {
        // The engine UI sends members here with `returnTo` (STEP_UP_PATH), and to sign-in with `next`.
        actions = assertionPage(webauthn, { base: '/auth/step-up', nextParameter: 'returnTo', problem: stepUpProblem });
    }

    let busy = false;
    document.body.addEventListener('click', (event) => {
        const button = event.target instanceof Element ? event.target.closest('button[data-action]') : null;
        const name = button?.dataset.action;
        if (name === undefined || !Object.hasOwn(actions, name) || busy) return;
        const action = actions[name];
        busy = true;
        void action().finally(() => {
            busy = false;
        });
    });
}

start();
