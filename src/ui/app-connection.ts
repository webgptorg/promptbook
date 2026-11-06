import { formatShortTime } from '../common/time.js';
import type { AppConnectionView, AppRelayView } from '../engine/snapshot.js';
import { createStyle, wrap, type Style } from './ansi.js';

/**
 * How to link a project, shown wherever the project is not linked yet: where to get the link code and what to run.
 *
 * @private App connection presentation
 */
export function appLinkHint(dashboardUrl: string): string {
    let host = dashboardUrl;
    try {
        host = new URL(dashboardUrl).host;
    } catch {
        // Shown as given.
    }
    return `Get a link code at ${host}, then run \`ptbk connect --link <code>\` in this project.`;
}

/**
 * Plain styles for raw output.
 */
const PLAIN = createStyle(false);

/**
 * The App connection's state as one word with its tone.
 *
 * @private App connection presentation
 */
export function appState(app: AppConnectionView | undefined): { readonly label: string; readonly tone: 'success' | 'muted' | 'warning' | 'error' } {
    switch (app?.state) {
        case 'linked':
            return { label: 'Linked', tone: 'success' };
        case 'connecting':
            return { label: 'Connecting', tone: 'warning' };
        case 'refused':
            return { label: 'Refused', tone: 'error' };
        case 'problem':
            return { label: 'Problem', tone: 'error' };
        case 'unlinked':
            return { label: 'Not linked', tone: 'muted' };
        case 'offline':
            return { label: 'Offline (engine stopped)', tone: 'muted' };
        default:
            return { label: app ? 'Not connected in this run' : 'Not reported by this engine', tone: 'muted' };
    }
}

/**
 * `n of m relays` for a linked project.
 *
 * @private App connection presentation
 */
export function relaySummary(app: AppConnectionView): string {
    const connected = app.relays.filter((relay) => relay.state === 'connected').length;
    return `${connected} of ${app.relays.length} relay${app.relays.length === 1 ? '' : 's'}`;
}

/**
 * Applies a tone.
 */
function toned(style: Style, tone: 'success' | 'muted' | 'warning' | 'error', text: string): string {
    return style[tone](text);
}

/**
 * The compact home tile: state, relays or the next step (never the whole page).
 *
 * @private App connection presentation
 */
export function appTileLines(app: AppConnectionView | undefined, style: Style): string[] {
    const state = appState(app);
    if (!app || app.state === 'disabled') return [style.muted(state.label), style.muted('Enter: App details')];
    if (app.state === 'unlinked') return [style.muted('Not linked to the Promptbook App'), style.muted('ptbk connect --link <code>')];
    if (app.state === 'problem') return [style.error('Problem'), style.muted('Enter: App details')];
    if (app.state === 'offline') return [style.muted(state.label), style.muted('Enter: App details')];
    const replaced = app.relays.some((relay) => relay.refusal === 'replaced');
    return [
        `${toned(style, state.tone, state.label)} ${style.muted(`· ${relaySummary(app)}`)}`,
        ...(replaced ? [style.error('another copy holds the key')] : app.heartbeat?.skewMs !== undefined ? [style.warning('clock skew')] : app.fingerprint ? [style.muted(app.fingerprint)] : []),
        style.muted('Enter: App details'),
    ];
}

/**
 * One relay's detail line.
 */
function relayLine(relay: AppRelayView, style: Style): string {
    const tone = relay.state === 'connected' ? 'success' : relay.refusal ? 'error' : relay.state === 'stopped' ? 'muted' : 'warning';
    const retry = relay.state === 'waiting' && relay.retryAt ? style.muted(` · retry ${formatShortTime(Date.parse(relay.retryAt))}`) : '';
    const streams = relay.streams ? style.muted(` · ${relay.streams} stream${relay.streams === 1 ? '' : 's'}`) : '';
    return `  ${relay.relay} ${toned(style, tone, relay.state)}${streams}${retry}${relay.problem && relay.state !== 'connected' ? `\n    ${style.muted(relay.problem)}` : ''}`;
}

/**
 * Splits a long value into lines of at most `width` characters, indented.
 */
function wrapValue(text: string, width: number, indent: string): string[] {
    const room = Math.max(10, width - indent.length);
    const lines: string[] = [];
    for (let index = 0; index < text.length; index += room) lines.push(`${indent}${text.slice(index, index + room)}`);
    return lines.length ? lines : [indent];
}

/**
 * The App page and status region: state and next step, identity, address, relays, heartbeat and browser access.
 *
 * @private App connection presentation
 */
export function appDetailLines(app: AppConnectionView | undefined, style: Style, width = 100): string[] {
    const state = appState(app);
    const lines: string[] = [`${style.bold('App')} ${toned(style, state.tone, state.label)}`];
    if (!app || app.state === 'disabled') {
        lines.push(style.muted(app ? 'This engine run keeps no App connection (maintenance).' : 'This engine does not report an App connection.'));
        return lines;
    }
    if (app.problem) lines.push(...wrap(app.problem, Math.max(10, width - 2)).map((line) => style.error(`  ${line}`)));
    if (app.engineId) {
        lines.push(`${style.muted('Engine ID')}    ${app.engineId}`);
        if (app.fingerprint) lines.push(`${style.muted('Fingerprint')}  ${app.fingerprint} ${style.muted('(compare with the App dashboard)')}`);
    }
    if (app.state === 'unlinked') {
        lines.push(...wrap(appLinkHint(app.dashboardUrl), Math.max(10, width)).map((line) => style.muted(line)));
        return lines;
    }
    if (app.url) {
        if (app.url.length + 13 <= width) lines.push(`${style.muted('Address')}      ${app.url}`);
        else lines.push(style.muted('Address'), ...wrapValue(app.url, width, '  '));
    }
    lines.push(`${style.muted('App')}          ${app.dashboardUrl}${app.linkedAt ? style.muted(` · linked ${formatShortTime(Date.parse(app.linkedAt))}`) : ''}`);
    if (app.relays.length) {
        lines.push(`${style.muted('Relays')}       Connected to ${relaySummary(app)}`);
        for (const relay of app.relays) lines.push(...relayLine(relay, style).split('\n'));
    }
    const beat = app.heartbeat;
    if (beat) {
        const outcome = beat.outcome === 'accepted' ? style.success('accepted') : beat.outcome === 'refused' ? style.error(`refused${beat.status ? ` (HTTP ${beat.status}${beat.code ? `, ${beat.code}` : ''})` : ''}`) : style.warning('not delivered');
        lines.push(`${style.muted('Heartbeat')}    ${formatShortTime(Date.parse(beat.at))} ${outcome}${beat.nextAt ? style.muted(` · next ${formatShortTime(Date.parse(beat.nextAt))}`) : ''}`);
        if (beat.message) lines.push(style.muted(`  ${beat.message}`));
        if (beat.skewMs !== undefined) lines.push(style.warning(`  This computer's clock is ${Math.round(Math.abs(beat.skewMs) / 1000)} s ${beat.skewMs > 0 ? 'ahead of' : 'behind'} the App. Fix the clock (NTP); heartbeats more than 2 minutes off are refused.`));
        if (beat.body) lines.push(style.muted('  Everything the App learns:'), ...wrapValue(beat.body, width, '  ').map((line) => style.muted(line)));
    }
    if (app.state === 'offline') {
        lines.push(...wrap('The engine is stopped, so the App shows this project unavailable. Start it with `ptbk start`.', Math.max(10, width)).map((line) => style.muted(line)));
        return lines;
    }
    lines.push(...wrap(app.browserAccess === 'available' ? 'Opening this project from the App works.' : 'Opening this project from the App is not available yet: the engine does not serve the App UI through its tunnels yet. Use the terminal or the desktop app.', Math.max(10, width)).map((line) => style.muted(line)));
    return lines;
}

/**
 * Raw (undecorated) App lines for status output and logs.
 *
 * @private App connection presentation
 */
export function appPlainLines(app: AppConnectionView | undefined): string[] {
    return appDetailLines(app, PLAIN, Number.MAX_SAFE_INTEGER);
}

/**
 * One compact line for start and init summaries: the linked address or how to link.
 *
 * @private App connection presentation
 */
export function appSummaryLine(app: AppConnectionView | undefined): string | undefined {
    if (!app || app.state === 'disabled') return undefined;
    if (app.state === 'unlinked') return 'App: not linked · ptbk connect --link <code>';
    if (app.state === 'problem') return `App: problem · ${app.problem ?? 'see ptbk connect'}`;
    if (app.state === 'offline') return `App: linked, offline${app.url ? ` · ${app.url}` : ''}`;
    return `App: ${appState(app).label.toLowerCase()}${app.relays.length ? ` (${relaySummary(app)})` : ''}${app.url ? ` · ${app.url}` : ''}`;
}
