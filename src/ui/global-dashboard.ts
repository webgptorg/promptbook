import { userInfo } from 'node:os';
import { errorMessage } from '../common/errors.js';
import { clockTime, formatShortTime } from '../common/time.js';
import { discoveryDirectory, readRegistry, verifyEngine, type DiscoveredEngine, type DiscoveryEntry } from '../service/discovery.js';
import type { ControlClient } from '../service/control.js';
import { truncate } from './ansi.js';
import { KeyboardSession, type KeyEvent } from './keys.js';
import { renderPanel } from './panels.js';
import { FullScreen } from './screen.js';
import { symbols, type TerminalProfile } from './terminal.js';

/**
 * How often the host-wide table refreshes.
 */
const REFRESH_MS = 2000;

/**
 * How long an ended engine stays visible (labelled ended) before it disappears.
 */
const ENDED_VISIBLE_MS = 8000;

/**
 * Widest table rendering.
 */
const MAX_WIDTH = 160;

/**
 * Widest project name in a row (the full path follows on its own line).
 */
const MAX_NAME_WIDTH = 28;

/**
 * One row of the global table.
 *
 * @private global dashboard
 */
export type GlobalRow = {
    readonly entry: DiscoveryEntry;
    readonly status: DiscoveredEngine['status'];
    readonly state?: string;
    readonly work?: string;
    readonly intent?: string;
    readonly waitingChats?: number;
    readonly reason?: string;
    readonly observedAt: string;
    readonly client?: ControlClient;
    /** When the row was first seen as ended (it disappears shortly after). */
    readonly endedAt?: number;
};

/**
 * Observation of the whole host: rows by instance, or why discovery failed.
 *
 * @private global dashboard
 */
export type HostObservation = { readonly rows: readonly GlobalRow[]; readonly problem?: string; readonly observedAt: string };

/**
 * Observes every registered engine of this OS user, verifying each before it is shown as live. Rows of engines that
 * ended stay briefly labelled `ended` instead of disappearing or being retained as live.
 *
 * @private global dashboard
 */
export async function observeHost(previous: ReadonlyMap<string, GlobalRow>, env: NodeJS.ProcessEnv = process.env): Promise<HostObservation> {
    const registry = await readRegistry(env);
    const observedAt = new Date().toISOString();
    const verified = await Promise.all(registry.entries.map((entry) => verifyEngine(entry, env).catch((error: unknown): DiscoveredEngine => ({ status: 'unreachable', entry, reason: errorMessage(error) }))));
    const rows = new Map<string, GlobalRow>();
    for (const engine of verified) {
        rows.set(engine.entry.instanceId, {
            entry: engine.entry,
            status: engine.status,
            state: engine.status === 'live' ? engine.summary.state : undefined,
            work: engine.status === 'live' ? engine.summary.work : undefined,
            intent: engine.status === 'live' ? engine.summary.intent : undefined,
            waitingChats: engine.status === 'live' ? engine.summary.waitingChats : undefined,
            reason: engine.status === 'live' ? undefined : engine.reason,
            observedAt: engine.status === 'live' ? engine.summary.observedAt : observedAt,
            client: engine.status === 'live' ? engine.client : undefined,
            endedAt: engine.status === 'ended' ? Date.now() : undefined,
        });
    }
    // Engines whose registration vanished (orderly shutdown) are shown as ended for a moment.
    for (const [instance, row] of previous) {
        if (rows.has(instance)) continue;
        const endedAt = row.endedAt ?? Date.now();
        if (Date.now() - endedAt < ENDED_VISIBLE_MS) rows.set(instance, { ...row, status: 'ended', client: undefined, reason: row.reason ?? 'The engine has stopped.', endedAt });
    }
    for (const [instance, row] of rows) if (row.status === 'ended' && row.endedAt && Date.now() - row.endedAt >= ENDED_VISIBLE_MS) rows.delete(instance);
    return { rows: [...rows.values()].sort((a, b) => a.entry.projectRoot.localeCompare(b.entry.projectRoot) || a.entry.startedAt.localeCompare(b.entry.startedAt)), problem: registry.problem, observedAt };
}

/**
 * Plain line describing one row.
 *
 * @private global dashboard
 */
export function plainRow(row: GlobalRow): string {
    const state = row.status === 'live' ? `${row.state}${row.intent ? ` (${row.intent})` : ''}` : row.status;
    return `${row.entry.projectName} [${state}] ptbk ${row.entry.engineVersion} · ${row.entry.mode} · PID ${row.entry.pid} · ${row.entry.projectRoot}${row.work ? ` · ${row.work}` : ''}${row.reason ? ` · ${row.reason}` : ''}`;
}

/**
 * Plain events between two observations: started, changed and ended engines.
 *
 * @private global dashboard
 */
export function plainHostDifference(previous: HostObservation | undefined, next: HostObservation): string[] {
    const lines: string[] = [];
    if (!previous) {
        lines.push(`Watching running Promptbook engines of this OS user (${next.rows.filter((row) => row.status !== 'ended').length} found; registry ${discoveryDirectoryLabel()}).`);
        if (next.problem) lines.push(`DISCOVERY PROBLEM: ${next.problem}`);
        for (const row of next.rows) lines.push(`  ${plainRow(row)}`);
        if (!next.rows.length) lines.push('  No running engines; still watching for new ones.');
        return lines;
    }
    const before = new Map(previous.rows.map((row) => [row.entry.instanceId, row]));
    for (const row of next.rows) {
        const old = before.get(row.entry.instanceId);
        if (!old) lines.push(`+ ${plainRow(row)}`);
        else if (old.status !== row.status || old.state !== row.state || old.intent !== row.intent) lines.push(`${row.status === 'ended' ? '-' : '~'} ${plainRow(row)}`);
    }
    if (next.problem && next.problem !== previous.problem) lines.push(`DISCOVERY PROBLEM: ${next.problem}`);
    return lines;
}

/**
 * The registry location shown to the user.
 */
function discoveryDirectoryLabel(): string {
    return discoveryDirectory();
}

/**
 * Runs `ptbk dashboard --global`: a continuously refreshed, keyboard-navigable table of running project engines of
 * this OS user, from any directory and across installations/versions. It stays open with zero entries, attaches to a
 * selected project's ordinary dashboard without `cd`, a new worker or a lock, and returns to the table afterwards.
 * Leaving closes only this viewer.
 *
 * @private global dashboard
 */
export async function runGlobalDashboard(terminal: TerminalProfile, attach: (row: GlobalRow) => Promise<string | undefined>, env: NodeJS.ProcessEnv = process.env): Promise<void> {
    if (!terminal.pretty || !terminal.interactive) {
        await runPlainGlobalDashboard(terminal, env);
        return;
    }
    const screen = new FullScreen();
    const marks = symbols(terminal.unicode);
    const { style } = terminal;
    let observation: HostObservation = { rows: [], observedAt: new Date().toISOString() };
    let selected: string | undefined;
    /** The first engine is preselected once; after that the selection only changes by the user. */
    let autoSelect = true;
    let feedback = '';
    let attached = false;
    let closed = false;
    let finish: (() => void) | undefined;
    const done = new Promise<void>((resolve) => {
        finish = resolve;
    });
    const user = (() => {
        try {
            return userInfo().username;
        } catch {
            return 'this user';
        }
    })();

    const visible = (): readonly GlobalRow[] => observation.rows;

    const draw = (): void => {
        if (closed || attached) return;
        const width = Math.min(terminal.columns(), MAX_WIDTH);
        const rows = visible();
        const live = rows.filter((row) => row.status === 'live').length;
        const lines: string[] = [];
        lines.push(
            ...renderPanel({
                title: `${marks.bullet} Promptbook · all running engines`,
                titleRight: `updated ${formatShortTime(Date.parse(observation.observedAt))}`,
                lines: [`${style.bold(String(live))} live engine${live === 1 ? '' : 's'} on this computer${rows.length !== live ? style.muted(` · ${rows.length - live} other row(s)`) : ''}`, style.muted(`Engines of ${user} only (other OS users are not visible) · registry ${discoveryDirectoryLabel()}`)],
                width,
                tone: 'accent',
                unicode: terminal.unicode,
                style,
            }),
        );
        if (observation.problem) lines.push(...renderPanel({ title: 'Discovery problem', lines: [style.error(observation.problem), style.muted('The list below may be incomplete; this is not an empty system.')], width, tone: 'error', unicode: terminal.unicode, style }));
        const table: string[] = [];
        if (!rows.length) table.push(style.muted('No running Promptbook engines. Still watching — a project started later (ptbk start) appears here.'));
        for (const row of rows) {
            const focused = row.entry.instanceId === selected;
            const stateText = row.status === 'live' ? `${row.state ?? '?'}${row.intent ? ` → ${row.intent}` : ''}` : row.status;
            const tone = row.status !== 'live' ? style.muted : row.state === 'running' ? style.success : row.state === 'stopping' ? style.error : style.warning;
            table.push(
                `${focused ? style.accent(marks.pointer) : ' '} ${style.bold(truncate(row.entry.projectName, MAX_NAME_WIDTH))}  ${tone(stateText)}  ${style.muted(`${row.entry.mode} · PID ${row.entry.pid} · ptbk ${row.entry.engineVersion}`)}${row.waitingChats ? style.warning(`  ${marks.warn} ${row.waitingChats} waiting for you`) : ''}`,
            );
            table.push(style.muted(`    ${truncate(row.entry.projectRoot, width - 8)}`));
            const detail = row.status === 'live' ? row.work : row.reason;
            if (detail) table.push(`    ${truncate(detail, width - 8)}`);
        }
        lines.push(...renderPanel({ title: 'Engines', titleRight: 'Enter opens the project dashboard', lines: table, width, unicode: terminal.unicode, style }));
        lines.push(style.muted(`  ↑↓ select · Enter attach (returns here when you leave) · Q/Ctrl+C close this viewer (engines keep running)${feedback ? `   ${marks.arrow} ${feedback}` : ''}`));
        screen.draw(lines);
    };

    const move = (delta: number): void => {
        const rows = visible();
        autoSelect = false;
        if (!rows.length) return;
        const index = Math.max(0, rows.findIndex((row) => row.entry.instanceId === selected));
        selected = rows[(index + delta + rows.length) % rows.length]!.entry.instanceId;
        draw();
    };

    const close = (): void => {
        closed = true;
        keyboard.stop();
        screen.leave();
        process.stdout.off('resize', onResize);
        finish?.();
    };

    const open = async (): Promise<void> => {
        const row = visible().find((candidate) => candidate.entry.instanceId === selected);
        if (!row) {
            feedback = 'Select an engine first.';
            draw();
            return;
        }
        if (row.status !== 'live') {
            feedback = `${row.entry.projectName} cannot be opened: ${row.reason ?? row.status}.`;
            draw();
            return;
        }
        attached = true;
        keyboard.stop();
        screen.leave();
        let outcome: string | undefined;
        try {
            outcome = await attach(row);
        } catch (error) {
            outcome = `Could not attach: ${errorMessage(error)}`;
        }
        attached = false;
        if (closed) return;
        feedback = outcome ?? `Back from ${row.entry.projectName}; it keeps running.`;
        screen.enter();
        screen.invalidate();
        keyboard.start();
        draw();
    };

    const onKey = (event: KeyEvent): void => {
        if (attached) return;
        if (event.type === 'key') {
            if (event.name === 'c' && event.ctrl) close();
            else if (event.name === 'up') move(-1);
            else if (event.name === 'down') move(1);
            else if (event.name === 'enter') void open();
            return;
        }
        if (event.type === 'text' && event.text.toLowerCase() === 'q') close();
    };

    const keyboard = new KeyboardSession(onKey);
    const onResize = (): void => {
        screen.invalidate();
        draw();
    };
    screen.enter();
    keyboard.start();
    process.stdout.on('resize', onResize);
    draw();
    void (async () => {
        let rows = new Map<string, GlobalRow>();
        while (!closed) {
            try {
                observation = await observeHost(rows, env);
                rows = new Map(observation.rows.map((row) => [row.entry.instanceId, row]));
                // Keep the selected service selected; an ended target is never silently replaced by another row.
                if (selected && !rows.has(selected)) {
                    selected = undefined;
                    autoSelect = false;
                    feedback = 'The selected engine has ended; choose another with ↑↓.';
                } else if (!selected && autoSelect && observation.rows[0]) {
                    selected = observation.rows[0].entry.instanceId;
                    autoSelect = false;
                }
            } catch (error) {
                observation = { ...observation, problem: errorMessage(error), observedAt: new Date().toISOString() };
            }
            draw();
            await new Promise((resolve) => setTimeout(resolve, REFRESH_MS));
        }
    })();
    await done;
    process.stdout.write(`${style.muted(`Closed the global dashboard at ${clockTime()}; every engine keeps running.`)}\n`);
}

/**
 * Continuous plain observation of the host (raw/noninteractive): readable events, no prompts or cursor control.
 */
async function runPlainGlobalDashboard(terminal: TerminalProfile, env: NodeJS.ProcessEnv): Promise<void> {
    let stop = false;
    const onSignal = (): void => {
        stop = true;
    };
    process.once('SIGINT', onSignal);
    process.once('SIGTERM', onSignal);
    let previous: HostObservation | undefined;
    let rows = new Map<string, GlobalRow>();
    try {
        while (!stop) {
            const next = await observeHost(rows, env);
            rows = new Map(next.rows.map((row) => [row.entry.instanceId, row]));
            for (const line of plainHostDifference(previous, next)) terminal.write(`${clockTime()} ${line}\n`);
            previous = next;
            for (let waited = 0; waited < REFRESH_MS && !stop; waited += 200) await new Promise((resolve) => setTimeout(resolve, 200));
        }
    } finally {
        process.off('SIGINT', onSignal);
        process.off('SIGTERM', onSignal);
    }
}
