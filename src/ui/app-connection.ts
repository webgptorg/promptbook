import { formatShortTime } from '../common/time.js';
import type { AppConnectionView } from '../engine/snapshot.js';
import { createStyle, wrap, type Style } from './ansi.js';

/**
 * Tells the operator where to get a pairing URL and how to link the project.
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
    return `Get a pairing URL at ${host}, then run \`ptbk connect --link <url>\` in this project.`;
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
 * One piece of a detail row: plain text and how to paint it (widths are measured on the plain text).
 */
type Part = readonly [text: string, paint?: (text: string) => string];

/**
 * Width of the label column of detail rows.
 */
const LABEL_WIDTH = 13;

/**
 * Collects detail lines that never exceed one width: a row that does not fit flows onto further lines (long words
 * such as addresses and IDs are broken), so nothing is clipped in a narrow column.
 */
class DetailLines {
    public readonly lines: string[] = [];
    private readonly room: number;

    public constructor(width: number) {
        this.room = Math.max(20, width);
    }

    /** Word-wrapped text, each line painted. */
    public text(value: string, paint: (text: string) => string = (text) => text, indent = ''): void {
        for (const line of wrap(value, this.room - indent.length)) this.lines.push(`${indent}${paint(line)}`);
    }

    /** Parts on one line when they fit, otherwise each part wrapped on its own lines below the first. */
    public flow(indent: string, parts: readonly Part[]): void {
        const plain = parts.map(([text]) => text).join('');
        if (indent.length + plain.length <= this.room) {
            this.lines.push(`${indent}${parts.map(([text, paint]) => (paint ? paint(text) : text)).join('')}`);
            return;
        }
        parts.forEach(([text, paint], index) => {
            const trimmed = text.trim();
            if (trimmed) this.text(trimmed, paint, index === 0 ? indent : `${indent}  `);
        });
    }

    /** A labelled row; the value moves below its label when the row does not fit. */
    public row(label: string, parts: readonly Part[], style: Style): void {
        const plain = parts.map(([text]) => text).join('');
        if (LABEL_WIDTH + plain.length <= this.room) {
            this.lines.push(`${style.muted(label.padEnd(LABEL_WIDTH))}${parts.map(([text, paint]) => (paint ? paint(text) : text)).join('')}`);
            return;
        }
        this.lines.push(style.muted(label));
        this.flow('  ', parts);
    }
}

/**
 * The App page and status region: state and next step, identity, address, relays, heartbeat and browser access, all
 * within `width` columns. `heartbeatBody: false` leaves out the exact heartbeat body (the compact status region; the
 * App page and `ptbk connect` show it).
 *
 * @private App connection presentation
 */
export function appDetailLines(app: AppConnectionView | undefined, style: Style, width = 100, options: { readonly heartbeatBody?: boolean } = {}): string[] {
    const state = appState(app);
    const out = new DetailLines(width);
    out.flow('', [['App ', style.bold], [state.label, (text) => toned(style, state.tone, text)]]);
    const muted = (text: string): string => style.muted(text);
    if (!app || app.state === 'disabled') {
        out.text(app ? 'This engine run keeps no App connection (maintenance).' : 'This engine does not report an App connection.', muted);
        return out.lines;
    }
    if (app.problem) out.text(app.problem, (text) => style.error(text), '  ');
    if (app.engineId) out.row('Engine ID', [[app.engineId]], style);
    if (app.fingerprint) out.row('Fingerprint', [[app.fingerprint], [' (compare with the App dashboard)', muted]], style);
    if (app.state === 'unlinked') {
        out.text(appLinkHint(app.dashboardUrl), muted);
        return out.lines;
    }
    if (app.url) out.row('Address', [[app.url]], style);
    out.row('App', [[app.dashboardUrl], ...(app.linkedAt ? ([[` · linked ${formatShortTime(Date.parse(app.linkedAt))}`, muted]] as const) : [])], style);
    if (app.relays.length) {
        out.row('Relays', [[`Connected to ${relaySummary(app)}`]], style);
        for (const relay of app.relays) {
            const tone = relay.state === 'connected' ? 'success' : relay.refusal ? 'error' : relay.state === 'stopped' ? 'muted' : 'warning';
            out.flow('  ', [
                [`${relay.relay} `],
                [relay.state, (text) => toned(style, tone, text)],
                ...(relay.streams ? ([[` · ${relay.streams} stream${relay.streams === 1 ? '' : 's'}`, muted]] as const) : []),
                ...(relay.state === 'waiting' && relay.retryAt ? ([[` · retry ${formatShortTime(Date.parse(relay.retryAt))}`, muted]] as const) : []),
            ]);
            if (relay.problem && relay.state !== 'connected') out.text(relay.problem, muted, '    ');
        }
    }
    const beat = app.heartbeat;
    if (beat) {
        const outcome: Part =
            beat.outcome === 'accepted'
                ? ['accepted', (text) => style.success(text)]
                : beat.outcome === 'refused'
                  ? [`refused${beat.status ? ` (HTTP ${beat.status}${beat.code ? `, ${beat.code}` : ''})` : ''}`, (text) => style.error(text)]
                  : ['not delivered', (text) => style.warning(text)];
        out.row('Heartbeat', [[`${formatShortTime(Date.parse(beat.at))} `], outcome, ...(beat.nextAt ? ([[` · next ${formatShortTime(Date.parse(beat.nextAt))}`, muted]] as const) : [])], style);
        if (beat.message) out.text(beat.message, muted, '  ');
        if (beat.skewMs !== undefined) out.text(`This computer's clock is ${Math.round(Math.abs(beat.skewMs) / 1000)} s ${beat.skewMs > 0 ? 'ahead of' : 'behind'} the App. Fix the clock (NTP); heartbeats more than 2 minutes off are refused.`, (text) => style.warning(text), '  ');
        if (beat.body && options.heartbeatBody !== false) {
            out.text('Everything the App learns:', muted, '  ');
            out.text(beat.body, muted, '  ');
        }
    }
    if (app.state === 'offline') {
        out.text('The engine is stopped, so the App shows this project unavailable. Start it with `ptbk start`.', muted);
        return out.lines;
    }
    out.text(appBrowserAccessText(app), app.browserAccess === 'available' && app.owner === 'none' ? (text) => style.warning(text) : muted);
    return out.lines;
}

/**
 * Whether the project opens from the App now, and what it still waits for: a connected relay, the engine's own
 * certificate, or an owner who set up a passkey with the setup link.
 *
 * @private App connection presentation
 */
export function appBrowserAccessText(app: AppConnectionView): string {
    if (app.browserAccess === 'available') {
        return app.owner === 'none' ? 'Opening this project from the App works, but nobody can sign in yet: run `ptbk connect --setup-link` here to set up your passkey.' : 'Opening this project from the App works: sign in there with your passkey.';
    }
    if (!app.relays.some((relay) => relay.state === 'connected')) return 'Opening this project from the App waits for a connected relay.';
    const certificate = app.certificate;
    if (certificate?.state === 'failed') return `Opening this project from the App waits for the engine's own certificate: ${certificate.problem ?? 'issuing it failed'}${certificate.retryAt ? ` (retry ${formatShortTime(Date.parse(certificate.retryAt))})` : ''}.`;
    return "Opening this project from the App waits for the engine's own certificate, which it is getting through the relay.";
}

/**
 * Raw (undecorated) App lines for status output and logs.
 *
 * @private App connection presentation
 */
export function appPlainLines(app: AppConnectionView | undefined, options: { readonly heartbeatBody?: boolean } = {}): string[] {
    return appDetailLines(app, PLAIN, Number.MAX_SAFE_INTEGER, options);
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
