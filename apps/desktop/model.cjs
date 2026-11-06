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
    if (kind === 'onboarding' && typeof projectRoot === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(projectRoot)) return ['onboarding', projectRoot];
    if (kind === 'init' && projectRoot === undefined) return ['init', '--no-dashboard'];
    if (typeof projectRoot !== 'string' || !projectRoot || projectRoot.includes('\0')) throw new Error('Select a project first.');
    if (kind === 'init') return ['init', '--path', projectRoot, '--no-dashboard'];
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

module.exports = { PAGES, ACTIONS, localDashboardUrl, terminalArguments, dashboardPage, terminalSize };
