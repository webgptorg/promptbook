import { userInfo } from 'node:os';
import { basename } from 'node:path';
import { errorMessage } from '../common/errors.js';
import { isDirectory } from '../common/fs.js';
import { clockTime, formatShortTime } from '../common/time.js';
import { projectAt } from '../project/workspace.js';
import { lookupService, type ControlClient } from '../service/control.js';
import { discoveryDirectory, readRegistry, verifyEngine, type DiscoveredEngine, type EngineSummary } from '../service/discovery.js';
import { applyGlobalAction, summarizeOutcomes, type GlobalAction, type GlobalTarget, type ProjectActionOutcome } from '../service/global-controls.js';
import { knownProjectsDirectory, readKnownProjects, registerKnownProject, type KnownProject } from '../service/known-projects.js';
import { stringWidth, truncate } from './ansi.js';
import { singleLineVisual } from './badges.js';
import { fitLegend } from './dashboard-home.js';
import { KeyboardSession, type KeyEvent } from './keys.js';
import { renderPanel } from './panels.js';
import { FullScreen } from './screen.js';
import { symbols, type TerminalProfile } from './terminal.js';
import { TitleAnimation } from './terminal-title.js';

/**
 * How often the host-wide table refreshes.
 */
const REFRESH_MS = 2000;

/**
 * Widest table rendering.
 */
const MAX_WIDTH = 160;

/**
 * Widest project name in a row (the full path follows on its own line).
 */
const MAX_NAME_WIDTH = 28;

/**
 * At most this many projects are started/stopped at once by a bulk action (each is independent).
 */
const BULK_CONCURRENCY = 4;

/**
 * Verified identity of a project's live (or unverifiable) owner.
 *
 * @private global dashboard
 */
export type EngineIdentity = Required<Pick<GlobalTarget, 'engine'>>['engine'] & { readonly engineVersion: string; readonly installation: string };

/**
 * One row of the global table: one canonical known project.
 *
 * @private global dashboard
 */
export type GlobalRow = {
    /** Canonical project root (stable selection key across engine instances). */
    readonly key: string;
    readonly projectRoot: string;
    readonly projectName: string;
    /** `live`: verified owner; `unreachable`: an owner is recorded but cannot be verified; `stopped`: verified absence; `missing`: the directory is gone. */
    readonly status: 'live' | 'unreachable' | 'stopped' | 'missing';
    readonly engine?: EngineIdentity;
    readonly state?: string;
    readonly work?: string;
    readonly intent?: string;
    readonly waitingChats?: number;
    readonly reason?: string;
    readonly observedAt: string;
    readonly client?: ControlClient;
    /** Durable registration, with the historical last run. */
    readonly known?: KnownProject;
};

/**
 * Observation of the whole host: one row per known project, or why discovery failed.
 *
 * @private global dashboard
 */
export type HostObservation = { readonly rows: readonly GlobalRow[]; readonly problem?: string; readonly observedAt: string };

/**
 * Identity of an owner from its discovery entry or process record.
 */
function identityOf(owner: EngineIdentity): EngineIdentity {
    return { instanceId: owner.instanceId, pid: owner.pid, supervisorPid: owner.supervisorPid, startedAt: owner.startedAt, controlAddress: owner.controlAddress, mode: owner.mode, engineVersion: owner.engineVersion, installation: owner.installation };
}

/**
 * Observes every known project of this OS user together with the verified live engines (also those launched by other
 * clients, installations and versions, which become known projects). Stopped projects stay as `stopped` rows; nothing
 * is started, killed, unlocked or scanned beyond the registries and the projects' own records.
 *
 * @private global dashboard
 */
export async function observeHost(env: NodeJS.ProcessEnv = process.env): Promise<HostObservation> {
    const [registry, known] = await Promise.all([readRegistry(env), readKnownProjects(env)]);
    const observedAt = new Date().toISOString();
    const verified = await Promise.all(registry.entries.map((entry) => verifyEngine(entry, env).catch((error: unknown): DiscoveredEngine => ({ status: 'unreachable', entry, reason: errorMessage(error) }))));
    // One row per canonical project: a verified live owner wins over an unverifiable registration.
    const owners = new Map<string, Exclude<DiscoveredEngine, { status: 'ended' }>>();
    for (const engine of verified) {
        if (engine.status === 'ended') continue;
        const current = owners.get(engine.entry.projectRoot);
        if (!current || (current.status !== 'live' && engine.status === 'live')) owners.set(engine.entry.projectRoot, engine);
    }
    const knownByRoot = new Map(known.entries.map((entry) => [entry.projectRoot, entry]));
    for (const [root, engine] of owners) {
        if (engine.status !== 'live' || knownByRoot.has(root)) continue;
        // An engine started by another client or installation is a known project of this host from now on.
        const { entry } = engine;
        const adopted = await registerKnownProject(projectAt(root), { lastRun: { instanceId: entry.instanceId, pid: entry.pid, mode: entry.mode, engineVersion: entry.engineVersion, installation: entry.installation, startedAt: entry.startedAt } }, env).catch(() => undefined);
        if (adopted) knownByRoot.set(root, adopted);
    }
    const roots = [...new Set([...knownByRoot.keys(), ...owners.keys()])];
    const rows = await Promise.all(
        roots.map(async (root): Promise<GlobalRow> => {
            const knownEntry = knownByRoot.get(root);
            const engine = owners.get(root);
            const base = { key: root, projectRoot: root, projectName: engine?.entry.projectName ?? knownEntry?.projectName ?? basename(root), known: knownEntry, observedAt };
            const live = (owner: EngineIdentity, client: ControlClient, summary: EngineSummary): GlobalRow => ({ ...base, status: 'live', engine: identityOf(owner), client, state: summary.state, work: summary.work, intent: summary.intent, waitingChats: summary.waitingChats, observedAt: summary.observedAt });
            if (engine?.status === 'live') return live(engine.entry, engine.client, engine.summary);
            if (engine?.status === 'unreachable') return { ...base, status: 'unreachable', engine: identityOf(engine.entry), reason: engine.reason };
            if (!(await isDirectory(root))) return { ...base, status: 'missing', reason: 'The project directory no longer exists.' };
            // Without a discovery entry the project's own record decides (an engine whose registration failed).
            const lookup = await lookupService(projectAt(root)).catch(() => undefined);
            if (lookup?.state === 'running') {
                const summary = await lookup.client.request<EngineSummary>('summary', {}, 5000).catch(() => undefined);
                if (summary) return live(lookup.record, lookup.client, summary);
                return { ...base, status: 'unreachable', engine: identityOf(lookup.record), reason: 'The engine does not report its state.' };
            }
            if (lookup?.state === 'unreachable') return { ...base, status: 'unreachable', engine: identityOf(lookup.record), reason: lookup.reason };
            return { ...base, status: 'stopped' };
        }),
    );
    rows.sort((a, b) => a.projectName.localeCompare(b.projectName) || a.projectRoot.localeCompare(b.projectRoot));
    return { rows, problem: [registry.problem, known.problem].filter(Boolean).join(' ') || undefined, observedAt };
}

/**
 * Historical description of a project's last run (never presented as live).
 *
 * @private global dashboard
 */
export function lastRunText(known: KnownProject | undefined): string | undefined {
    const run = known?.lastRun;
    if (!run) return undefined;
    const ended = run.endedAt ? `ended ${formatShortTime(Date.parse(run.endedAt))}${run.outcome && run.outcome !== 'ended' ? ` (${run.outcome})` : ''}` : 'ended without cleanup';
    return `last run (historical): ptbk ${run.engineVersion} ${run.mode}, ${ended}`;
}

/**
 * Plain line describing one row.
 *
 * @private global dashboard
 */
export function plainRow(row: GlobalRow): string {
    if (row.status === 'live' && row.engine) {
        return `${row.projectName} [${row.state}${row.intent ? ` (${row.intent})` : ''}] ptbk ${row.engine.engineVersion} · ${row.engine.mode} · PID ${row.engine.pid} · ${row.projectRoot}${row.work ? ` · ${row.work}` : ''}`;
    }
    if (row.status === 'unreachable') return `${row.projectName} [unknown] PID ${row.engine?.pid ?? '?'} · ${row.projectRoot}${row.reason ? ` · ${row.reason}` : ''}`;
    const history = lastRunText(row.known);
    return `${row.projectName} [${row.status}] · ${row.projectRoot}${row.reason ? ` · ${row.reason}` : ''}${history ? ` · ${history}` : ''}`;
}

/**
 * Live engines of an observation.
 */
function activeCount(observation: HostObservation): number {
    return observation.rows.filter((row) => row.status === 'live' || row.status === 'unreachable').length;
}

/**
 * The comparable state of a row (changes are reported as events).
 */
function rowState(row: GlobalRow): string {
    return `${row.status}|${row.state ?? ''}|${row.intent ?? ''}|${row.engine?.instanceId ?? ''}`;
}

/**
 * Plain events between two observations: new, changed (including engines that ended and became stopped) and
 * forgotten projects.
 *
 * @private global dashboard
 */
export function plainHostDifference(previous: HostObservation | undefined, next: HostObservation): string[] {
    const lines: string[] = [];
    if (!previous) {
        lines.push(`Watching the Promptbook projects of this OS user: ${next.rows.length} known, ${activeCount(next)} active engine${activeCount(next) === 1 ? '' : 's'} (registries ${knownProjectsDirectory()} and ${discoveryDirectory()}).`);
        if (next.problem) lines.push(`DISCOVERY PROBLEM: ${next.problem}`);
        for (const row of next.rows) lines.push(`  ${plainRow(row)}`);
        if (!next.rows.length) lines.push('  No known projects yet; still watching (`ptbk init` or `ptbk start` registers one).');
        return lines;
    }
    const before = new Map(previous.rows.map((row) => [row.key, row]));
    const after = new Set(next.rows.map((row) => row.key));
    for (const row of next.rows) {
        const old = before.get(row.key);
        if (!old) lines.push(`+ ${plainRow(row)}`);
        else if (rowState(old) !== rowState(row)) lines.push(`~ ${plainRow(row)}`);
    }
    for (const row of previous.rows) if (!after.has(row.key)) lines.push(`- ${row.projectName} [forgotten] · ${row.projectRoot}`);
    if (next.problem && next.problem !== previous.problem) lines.push(`DISCOVERY PROBLEM: ${next.problem}`);
    return lines;
}

/**
 * Whether an action applies to a row (bulk actions skip the others; individual ones explain why).
 *
 * @private global dashboard
 */
export function actionApplies(action: GlobalAction, row: GlobalRow): boolean {
    switch (action) {
        case 'start':
            return row.status === 'stopped';
        case 'force-stop':
            return row.status === 'live' || row.status === 'unreachable';
        case 'remove':
            return row.status === 'stopped' || row.status === 'missing';
        default:
            return row.status === 'live';
    }
}

/**
 * Why an individual action does not apply to a row.
 */
function notApplicable(action: GlobalAction, row: GlobalRow): string {
    const state = row.status === 'live' ? (row.state ?? 'running') : row.status === 'unreachable' ? 'not verifiable' : row.status;
    if (action === 'start') return `${row.projectName} is ${state}; Start only starts a stopped project (it never resumes or replaces an engine).`;
    if (action === 'remove') return `${row.projectName} is ${state}; only a stopped project can be removed. Stop it first (X, or F to force).`;
    if (action === 'force-stop') return `${row.projectName} has no engine to force-stop.`;
    return `${row.projectName} has no running engine; ${action === 'resume' ? 'Resume never starts a project (S starts it).' : 'nothing was changed.'}`;
}

/**
 * Labels of actions.
 */
const ACTION_LABELS: Readonly<Record<GlobalAction, string>> = { start: 'Start', stop: 'Stop', 'force-stop': 'Force stop', pause: 'Pause', resume: 'Resume', remove: 'Remove' };

/**
 * Labels of bulk actions.
 */
const BULK_LABELS: Readonly<Record<GlobalAction, string>> = { start: 'Start all', stop: 'Stop all', 'force-stop': 'Force stop all', pause: 'Pause all', resume: 'Resume all', remove: 'Remove all stopped' };

/**
 * Keys of the actions (lowercase; with A first they apply to every applicable project).
 */
const ACTION_KEYS: Readonly<Record<string, GlobalAction>> = { s: 'start', x: 'stop', f: 'force-stop', p: 'pause', r: 'resume', d: 'remove' };

/**
 * Actions confirmed before they run (individually and in bulk), and bulk-only confirmations.
 */
const CONFIRMED = new Set<GlobalAction>(['force-stop', 'remove']);
const CONFIRMED_BULK = new Set<GlobalAction>(['force-stop', 'remove', 'stop']);

/**
 * Shortens a long path from the left, so the distinguishing project folder stays visible.
 *
 * @private global dashboard
 */
export function shortenPath(path: string, width: number): string {
    if (stringWidth(path) <= width) return path;
    let tail = path;
    while (tail && stringWidth(tail) > width - 1) tail = tail.slice(1);
    return `…${tail}`;
}

/**
 * Runs tasks with bounded concurrency, keeping their order.
 */
async function mapBounded<T, R>(items: readonly T[], limit: number, run: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array<R>(items.length);
    let next = 0;
    await Promise.all(
        Array.from({ length: Math.min(limit, items.length) }, async () => {
            while (next < items.length) {
                const index = next++;
                results[index] = await run(items[index]!);
            }
        }),
    );
    return results;
}

/**
 * Runs `ptbk dashboard --global`: a continuously refreshed, keyboard-navigable table of every known project of this OS
 * user, including stopped ones, across installations and versions, from any directory. It stays open with zero
 * projects, attaches to a live project's ordinary dashboard without `cd`, a new worker or a lock and returns to the
 * table, and offers individual and bulk Start/Stop/Force stop/Pause/Resume and stopped-entry removal through the shared
 * operations (never a viewer per project). Leaving closes only this viewer.
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
    let observed = false;
    let selected: string | undefined;
    /** The first project is preselected once; after that the selection only changes by the user. */
    let autoSelect = true;
    let feedback = '';
    /** `bulk`: the next action key applies to every applicable project; `confirm`: Y runs the pending action. */
    let modal: { readonly kind: 'bulk' } | { readonly kind: 'confirm'; readonly prompt: string; readonly run: () => void } | undefined;
    /** Latest per-project outcome, shown under its row. */
    const outcomes = new Map<string, ProjectActionOutcome>();
    /** Projects with an action in progress (no second action is started for them meanwhile). */
    const busy = new Set<string>();
    let attached = false;
    let closed = false;
    let wake: (() => void) | undefined;
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

    const rowLines = (row: GlobalRow, width: number): string[] => {
        const focused = row.key === selected;
        const live = row.status === 'live';
        const stateText = busy.has(row.key) ? `${live ? row.state : row.status} ${marks.ellipsis}` : live ? `${row.state ?? '?'}${row.intent ? ` → ${row.intent}` : ''}` : row.status === 'unreachable' ? 'unknown' : row.status;
        const tone = !live ? (row.status === 'stopped' ? style.muted : style.error) : row.state === 'running' ? style.success : row.state === 'stopping' ? style.error : style.warning;
        const details = live && row.engine ? style.muted(`${row.engine.mode} · PID ${row.engine.pid} · ptbk ${row.engine.engineVersion}`) : row.status === 'unreachable' && row.engine ? style.muted(`PID ${row.engine.pid} · ptbk ${row.engine.engineVersion}`) : style.muted(lastRunText(row.known) ?? 'never started on this host');
        const lines = [`${focused ? style.accent(marks.pointer) : ' '} ${style.bold(truncate(row.projectName, MAX_NAME_WIDTH))}  ${tone(stateText)}  ${details}${row.waitingChats ? style.warning(`  ${marks.warn} ${row.waitingChats} waiting for you`) : ''}`, style.muted(`    ${shortenPath(row.projectRoot, width - 8)}`)];
        const detail = live ? row.work : row.reason;
        if (detail) lines.push(`    ${truncate(detail, width - 8)}`);
        const result = outcomes.get(row.key);
        if (result) lines.push(`    ${(result.status === 'failed' || result.status === 'unconfirmed' ? style.error : result.status === 'completed' ? style.success : style.warning)(truncate(`${ACTION_LABELS[result.action]} ${result.status.replace('-', ' ')}: ${result.message}`, width - 8))}`);
        return lines;
    };

    const draw = (): void => {
        if (closed || attached) return;
        const width = Math.min(terminal.columns(), MAX_WIDTH);
        const height = Math.max(8, terminal.rows());
        const rows = visible();
        const active = activeCount(observation);
        const lines: string[] = [];
        const known = `${style.bold(String(rows.length))} known project${rows.length === 1 ? '' : 's'} · ${style.bold(String(active))} active engine${active === 1 ? '' : 's'}`;
        lines.push(
            ...renderPanel({
                title: `${marks.bullet} Promptbook ${marks.dot} PTBK ${marks.dot} all projects on this computer`,
                titleRight: `updated ${formatShortTime(Date.parse(observation.observedAt))}`,
                lines: [known, style.muted(`Projects of ${user} only (other OS users are not visible) · registry ${knownProjectsDirectory(env)}`)],
                width,
                tone: 'accent',
                unicode: terminal.unicode,
                style,
            }),
        );
        if (observation.problem) lines.push(...renderPanel({ title: 'Discovery problem', lines: [style.error(observation.problem), style.muted('The list below may be incomplete; this is not an empty system.')], width, tone: 'error', unicode: terminal.unicode, style }));
        const table: string[] = [];
        let anchor = 0;
        if (!observed) table.push(style.muted('Looking for projects…'));
        else if (!rows.length) table.push(style.muted('No known projects yet. Still watching — a project initialized or started later (ptbk init, ptbk start) appears here.'));
        else if (!active) table.push(style.muted('No active engines. Stopped projects stay listed; S starts the selected one.'));
        for (const row of rows) {
            if (row.key === selected) anchor = table.length;
            table.push(...rowLines(row, width));
        }
        // A bounded table: the window follows the selected project.
        const room = Math.max(3, height - lines.length - 3);
        let start = 0;
        if (table.length > room) {
            start = Math.max(0, Math.min(anchor - 1, table.length - room));
            const above = start;
            const window = table.slice(start, start + room);
            const below = table.length - start - window.length;
            if (above) window[0] = style.muted(`  ↑ ${above} more line${above === 1 ? '' : 's'}`);
            if (below) window[window.length - 1] = style.muted(`  ↓ ${below} more line${below === 1 ? '' : 's'}`);
            table.length = 0;
            table.push(...window);
        }
        lines.push(...renderPanel({ title: 'Projects', titleRight: 'Enter opens a running project', lines: table, width, unicode: terminal.unicode, style }));
        const legend =
            modal?.kind === 'bulk'
                ? style.accent(fitLegend(['All projects:', 'S start stopped', 'X stop', 'F force stop', 'P pause', 'R resume', 'D remove stopped', 'Esc cancel'], width, '  '))
                : modal?.kind === 'confirm'
                  ? style.warning(` ${truncate(modal.prompt, width - 2)}`)
                  : style.muted(fitLegend(['↑↓ select', 'Enter attach', 'S start', 'X stop', 'F force stop', 'P pause', 'R resume', 'D remove', 'A all projects…', 'Q close (engines keep running)'], width));
        lines.push(legend);
        if (feedback && !modal) lines.push(` ${style.accent(marks.arrow)} ${truncate(feedback, width - 4)}`);
        screen.draw(lines);
    };

    const refreshSoon = (): void => wake?.();

    const run = (label: string, action: GlobalAction, targets: readonly GlobalRow[]): void => {
        const ready = targets.filter((row) => !busy.has(row.key));
        if (!ready.length) {
            feedback = `${label}: ${targets.length ? 'already in progress' : 'no applicable projects'}.`;
            draw();
            return;
        }
        for (const row of ready) busy.add(row.key);
        feedback = `${label}: ${ready.length} project${ready.length === 1 ? '' : 's'}${marks.ellipsis}`;
        draw();
        void (async () => {
            const results = await mapBounded(ready, BULK_CONCURRENCY, async (row) => {
                const result = await applyGlobalAction(action, { projectRoot: row.projectRoot, projectName: row.projectName, known: row.known, engine: row.engine, client: row.client }, env);
                busy.delete(row.key);
                outcomes.set(row.key, result);
                draw();
                return result;
            });
            // A removed selected project hands the selection to its neighbour (no other row is ever picked silently).
            const removed = new Set(results.filter((result) => result.action === 'remove' && result.status === 'completed').map((result) => result.projectRoot));
            if (selected && removed.has(selected)) {
                const rows = visible();
                const index = rows.findIndex((row) => row.key === selected);
                selected = [...rows.slice(index + 1), ...rows.slice(0, index).reverse()].find((row) => !removed.has(row.key))?.key;
                observation = { ...observation, rows: rows.filter((row) => !removed.has(row.key)) };
            }
            feedback = ready.length === 1 ? `${results[0]!.projectName}: ${ACTION_LABELS[action]} ${results[0]!.status.replace('-', ' ')}. ${results[0]!.message}` : summarizeOutcomes(label, results);
            refreshSoon();
            draw();
        })();
    };

    const individual = (action: GlobalAction): void => {
        const row = visible().find((candidate) => candidate.key === selected);
        if (!row) {
            feedback = 'Select a project first.';
            draw();
            return;
        }
        if (!actionApplies(action, row)) {
            feedback = notApplicable(action, row);
            draw();
            return;
        }
        const go = (): void => run(`${ACTION_LABELS[action]} ${row.projectName}`, action, [row]);
        if (CONFIRMED.has(action)) {
            modal = {
                kind: 'confirm',
                prompt: action === 'force-stop' ? `Force-stop ${row.projectName} now? Owned work is interrupted (recoverable). Y confirm · any other key cancels` : `Remove ${row.projectName} from this host's list? Its files stay untouched. Y confirm · any other key cancels`,
                run: go,
            };
            draw();
            return;
        }
        go();
    };

    const bulk = (action: GlobalAction): void => {
        const targets = visible().filter((row) => actionApplies(action, row));
        const go = (): void => run(BULK_LABELS[action], action, targets);
        if (targets.length && CONFIRMED_BULK.has(action)) {
            modal = { kind: 'confirm', prompt: `${BULK_LABELS[action]}: ${targets.length} project${targets.length === 1 ? '' : 's'} (${targets.map((row) => row.projectName).join(', ')})? Y confirm · any other key cancels`, run: go };
            draw();
            return;
        }
        go();
    };

    const move = (delta: number): void => {
        const rows = visible();
        autoSelect = false;
        if (!rows.length) return;
        const index = Math.max(0, rows.findIndex((row) => row.key === selected));
        selected = rows[(index + delta + rows.length) % rows.length]!.key;
        draw();
    };

    const close = (): void => {
        closed = true;
        title.stop();
        keyboard.stop();
        screen.leave();
        process.stdout.off('resize', onResize);
        wake?.();
        finish?.();
    };

    const open = async (): Promise<void> => {
        const row = visible().find((candidate) => candidate.key === selected);
        if (!row) {
            feedback = 'Select a project first.';
            draw();
            return;
        }
        if (row.status !== 'live') {
            // Inspecting or selecting a stopped project never starts it.
            feedback = row.status === 'stopped' ? `${row.projectName} is stopped; S starts it explicitly.` : `${row.projectName} cannot be opened: ${row.reason ?? row.status}.`;
            draw();
            return;
        }
        attached = true;
        // The attached project dashboard shows its own PTBK title meanwhile.
        title.stop();
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
        // An engine of another version renders its own view (and title) in a child process.
        terminal.title.invalidate();
        title.start();
        feedback = outcome ?? `Back from ${row.projectName}; its engine was left as it was.`;
        screen.enter();
        screen.invalidate();
        keyboard.start();
        refreshSoon();
        draw();
    };

    const onKey = (event: KeyEvent): void => {
        if (attached) return;
        if (event.type === 'key' && event.name === 'c' && event.ctrl) {
            close();
            return;
        }
        if (modal?.kind === 'confirm') {
            const confirmed = event.type === 'text' && event.text.toLowerCase() === 'y';
            const pending = modal;
            modal = undefined;
            if (confirmed) pending.run();
            else {
                feedback = 'Cancelled; nothing was changed.';
                draw();
            }
            return;
        }
        if (modal?.kind === 'bulk') {
            modal = undefined;
            const action = event.type === 'text' ? ACTION_KEYS[event.text.toLowerCase()] : undefined;
            if (action) bulk(action);
            else {
                feedback = 'Cancelled; nothing was changed.';
                draw();
            }
            return;
        }
        if (event.type === 'key') {
            if (event.name === 'up') move(-1);
            else if (event.name === 'down') move(1);
            else if (event.name === 'enter') void open();
            else if (event.name === 'delete') individual('remove');
            else if (event.name === 'escape') close();
            return;
        }
        if (event.type !== 'text') return;
        const key = event.text.toLowerCase();
        if (key === 'q') close();
        else if (key === 'a') {
            modal = { kind: 'bulk' };
            draw();
        } else if (ACTION_KEYS[key]) individual(ACTION_KEYS[key]);
    };

    const keyboard = new KeyboardSession(onKey);
    const onResize = (): void => {
        screen.invalidate();
        draw();
    };
    // `PTBK <animated default visual> Global`: it represents several engines, never one current agent.
    const title = new TitleAnimation(terminal.title, (frame) => ({ kind: 'dashboard', label: 'Global', visual: singleLineVisual(undefined, 'working', frame) }), terminal.reducedMotion);
    screen.enter();
    keyboard.start();
    process.stdout.on('resize', onResize);
    title.start();
    draw();
    void (async () => {
        while (!closed) {
            try {
                observation = await observeHost(env);
                observed = true;
                const keys = new Set(observation.rows.map((row) => row.key));
                // The selected project stays selected through exits and starts; a forgotten one is never replaced silently.
                if (selected && !keys.has(selected)) {
                    selected = undefined;
                    autoSelect = false;
                    feedback = 'The selected project is no longer listed; choose another with ↑↓.';
                } else if (!selected && autoSelect && observation.rows[0]) {
                    selected = observation.rows[0].key;
                    autoSelect = false;
                }
                for (const key of outcomes.keys()) if (!keys.has(key)) outcomes.delete(key);
            } catch (error) {
                observation = { ...observation, problem: errorMessage(error), observedAt: new Date().toISOString() };
            }
            draw();
            await new Promise<void>((resolve) => {
                const timer = setTimeout(resolve, REFRESH_MS);
                wake = () => {
                    clearTimeout(timer);
                    resolve();
                };
            });
            wake = undefined;
        }
    })();
    await done;
    process.stdout.write(`${style.muted(`Closed the global dashboard at ${clockTime()}; every engine was left as it was.`)}\n`);
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
    try {
        while (!stop) {
            const next = await observeHost(env);
            for (const line of plainHostDifference(previous, next)) terminal.write(`${clockTime()} ${line}\n`);
            previous = next;
            for (let waited = 0; waited < REFRESH_MS && !stop; waited += 200) await new Promise((resolve) => setTimeout(resolve, 200));
        }
    } finally {
        process.off('SIGINT', onSignal);
        process.off('SIGTERM', onSignal);
    }
}
