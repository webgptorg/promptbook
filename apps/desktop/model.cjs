'use strict';
/** Shared, presentation-only validation; engine operations remain in the installed CLI. */
const PAGES = new Set(['harnesses', 'system', 'health', 'tools', 'wallet', 'agents', 'chats', 'tasks', 'usage', 'actions', 'history', 'files', 'app', 'sync']);
/** Actions deliberately exposed by the host overview. */
const ACTIONS = new Set(['start', 'start-paused', 'pause', 'resume', 'stop', 'force-stop', 'remove']);

/** Accepts only an engine's verified loopback HTTP origin; never a remote URL or credentials. */
function localDashboardUrl(value) {
    const url = new URL(value);
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('The engine did not report a local dashboard address.');
    return url.href;
}

/** Restricts PTYs to ordinary CLI entry points, with arguments instead of shell interpolation. */
function terminalArguments(kind, projectRoot, page) {
    if (kind === 'global') return ['dashboard', '--global'];
    if (kind === 'setup') return ['init', '--with-app'];
    if (kind === 'init' && projectRoot === undefined) return ['init', '--no-dashboard'];
    if (typeof projectRoot !== 'string' || !projectRoot || projectRoot.includes('\0')) throw new Error('Select a project first.');
    if (kind === 'init') return ['init', '--path', projectRoot, '--no-dashboard'];
    // The same local administrator approval as the CLI-only installation (it explains the helper, then asks sudo).
    if (kind === 'keep-awake-helper') return ['keep-awake', '--install-helper', '--path', projectRoot];
    if (kind !== 'dashboard') throw new Error('Unknown terminal operation.');
    if (page && !PAGES.has(page)) throw new Error('Unknown dashboard page.');
    return ['dashboard', '--path', projectRoot, ...(page ? ['--view', page] : [])];
}

/** Maps browser page fragments to the primary CLI's page names. */
function dashboardPage(url) {
    const page = new URL(url).hash.replace(/^#\/?/, '').split(/[/?]/)[0];
    return PAGES.has(page) ? page : undefined;
}

/** Bounds terminal dimensions before passing them to a native PTY. */
function terminalSize(cols, rows) {
    return { cols: Math.max(20, Math.min(500, Math.trunc(Number(cols) || 80))), rows: Math.max(10, Math.min(250, Math.trunc(Number(rows) || 24))) };
}

/** Path of a voice intent a desktop window's dashboard hands to its own shell (a popup the shell refuses). */
const VOICE_INTENT_PATH = '/.ptbk-desktop/voice';
/** Voice intents a chat view may hand to its shell: start in this chat, its call controls, and leaving the chat view. */
const VOICE_INTENTS = new Set(['start', 'end', 'leave', 'mute-mic', 'unmute-mic', 'mute-output', 'unmute-output']);

/**
 * Reads a voice intent of the window's own dashboard: the dashboard's origin and path, this view's token, a known
 * action and the chat it is bound to. Anything else is not an intent (and is never acted on).
 */
function voiceIntent(target, origin, token) {
    let url;
    try { url = new URL(target); } catch { return undefined; }
    if (url.origin !== origin || url.pathname !== VOICE_INTENT_PATH || typeof token !== 'string' || token.length < 16) return undefined;
    const action = url.searchParams.get('action');
    const chat = url.searchParams.get('chat');
    if (url.searchParams.get('intent') !== token || !VOICE_INTENTS.has(action) || !chat || chat.length > 4096 || /[\u0000-\u001f]/.test(chat)) return undefined;
    return { action, chat };
}

/** The private scheme serving the workspace editor (Monaco with the Book adapter) to a desktop window's dashboard. */
const EDITOR_ORIGIN = 'ptbk-editor://editor';

/** Content types of the built editor's files (anything else is not served). */
const EDITOR_TYPES = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8' };

/** The built editor file a `ptbk-editor:` request names, or undefined (no traversal, query or other host). */
function editorAsset(target, available) {
    let url;
    try { url = new URL(target); } catch { return undefined; }
    if (`${url.protocol}//${url.host}` !== EDITOR_ORIGIN || url.search || url.hash) return undefined;
    const name = decodeURIComponent(url.pathname.slice(1));
    const extension = /\.[a-z]+$/.exec(name)?.[0];
    if (!/^[\w.-]+$/.test(name) || !available.has(name) || !EDITOR_TYPES[extension]) return undefined;
    return { name, type: EDITOR_TYPES[extension] };
}

/**
 * The dashboard's own Content-Security-Policy for a desktop window, adding only what the workspace editor needs: its
 * script, styles and font from `ptbk-editor:`, Monaco's runtime style elements and its worker from a blob. Scripts of
 * any other origin, inline scripts and connections stay refused.
 */
function desktopPolicy(policy) {
    const directives = new Map(String(policy).split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
        const [name, ...sources] = part.split(/\s+/);
        return [name.toLowerCase(), sources];
    }));
    const add = (name, ...sources) => {
        const current = directives.get(name) || [...(directives.get('default-src') || ["'self'"])];
        directives.set(name, [...current.filter((source) => source !== "'none'"), ...sources.filter((source) => !current.includes(source))]);
    };
    add('script-src', 'ptbk-editor:');
    add('style-src', 'ptbk-editor:', "'unsafe-inline'");
    add('font-src', 'ptbk-editor:');
    add('worker-src', 'blob:');
    return [...directives].map(([name, sources]) => [name, ...sources].join(' ')).join('; ');
}

/** Document kinds of workspace tabs. */
const DOCUMENT_KINDS = new Set(['page', 'file', 'book']);

/** A bounded plain string, or undefined. */
function text(value, limit) {
    return typeof value === 'string' && value.length <= limit && !value.includes('\0') ? value : undefined;
}

/** A workspace tab of a dashboard (regular or pinned; a temporary preview is never kept). */
function workspaceTab(value) {
    if (!value || typeof value !== 'object' || !DOCUMENT_KINDS.has(value.kind)) return undefined;
    const key = text(value.key, 4096);
    const mode = value.mode === 'pinned' ? 'pinned' : value.mode === 'regular' ? 'regular' : undefined;
    if (!key || !mode) return undefined;
    const tab = { kind: value.kind, key, mode, title: text(value.title, 300) || key };
    if (value.kind === 'page') {
        if (!PAGES.has(value.page)) return undefined;
        tab.page = value.page;
    } else {
        tab.path = text(value.path, 4096);
        if (!tab.path) return undefined;
    }
    return tab;
}

/** Drafts kept by the client for a restart: at most this many characters in all. */
const DRAFT_LIMIT = 16 * 1024 * 1024;

/**
 * The persisted part of one dashboard's workspace: its regular and pinned tabs in order, the active one, unsaved drafts
 * with the revision they were based on, and editor view states. Anything else (previews, recovery words, live sessions)
 * is dropped.
 */
function workspaceState(value) {
    const tabs = [];
    for (const item of Array.isArray(value?.tabs) ? value.tabs.slice(0, 200) : []) {
        const tab = workspaceTab(item);
        if (tab && !tabs.some((other) => other.key === tab.key)) tabs.push(tab);
    }
    const documents = {};
    let budget = DRAFT_LIMIT;
    for (const tab of tabs) {
        const document = value?.documents?.[tab.key];
        if (!document || typeof document !== 'object') continue;
        const kept = {};
        const draft = document.draft;
        if (draft && typeof draft.text === 'string' && draft.text.length <= budget && text(draft.revision, 200)) {
            kept.draft = { text: draft.text, revision: draft.revision };
            budget -= draft.text.length;
        }
        try {
            if (document.viewState && typeof document.viewState === 'object' && JSON.stringify(document.viewState).length <= 64 * 1024) kept.viewState = JSON.parse(JSON.stringify(document.viewState));
        } catch {}
        if (Object.keys(kept).length) documents[tab.key] = kept;
    }
    const active = tabs.some((tab) => tab.key === value?.active) ? value.active : null;
    return { tabs, active, documents };
}

/** A document moved between windows: its tab and editor state (at most 48 MiB as JSON), or undefined. */
function movedDocument(value) {
    const tab = workspaceTab({ ...value?.tab, mode: value?.tab?.mode === 'pinned' ? 'pinned' : 'regular' });
    if (!tab || tab.kind === 'page' && value?.document) return undefined;
    let document;
    try {
        if (value.document !== undefined) {
            const json = JSON.stringify(value.document);
            if (json.length > 48 * 1024 * 1024) return undefined;
            document = JSON.parse(json);
        }
    } catch { return undefined; }
    return { tab, ...(document ? { document } : {}) };
}

module.exports = { PAGES, ACTIONS, VOICE_INTENT_PATH, EDITOR_ORIGIN, localDashboardUrl, terminalArguments, dashboardPage, terminalSize, voiceIntent, editorAsset, desktopPolicy, workspaceState, movedDocument };
