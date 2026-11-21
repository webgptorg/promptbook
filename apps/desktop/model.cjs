'use strict';
/** Shared, presentation-only validation; engine operations remain in the installed CLI. */
const PAGES = new Set(['harnesses', 'system', 'health', 'tools', 'wallet', 'agents', 'chats', 'tasks', 'usage', 'actions', 'history', 'files', 'app', 'sync']);
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

/** Bounds terminal dimensions before passing them to a native PTY. */
function terminalSize(cols, rows) {
    return { cols: Math.max(20, Math.min(500, Math.trunc(Number(cols) || 80))), rows: Math.max(10, Math.min(250, Math.trunc(Number(rows) || 24))) };
}

module.exports = { PAGES, terminalArguments, terminalSize };
