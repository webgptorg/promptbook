import { errorMessage } from '../common/errors.js';
import { terminalSafe } from './ansi.js';
import { clockTime, formatShortTime } from '../common/time.js';
import { formatBytes, formatMiB, type CachePreview, type SwapPlan } from '../engine/health.js';
import type { ServiceSnapshot } from '../engine/snapshot.js';
import type { ChatAgentChoice } from '../chats/service.js';
import { runChatClient, type ChatSource } from './chat-client.js';
import { singleLineVisual } from './badges.js';
import { KeyboardSession, type KeyEvent } from './keys.js';
import { FullScreen } from './screen.js';
import { renderQr, type PreparedQr } from './status-view.js';
import { lifecycleActions } from './details.js';
import { fitLegend, homeLayout, homeTiles, renderHome, renderPage, tileAttention, type HomeTile } from './dashboard-home.js';
import { keepSelection, pageBody, pageForTile, pageItemKeys, taskOrder, teamOrder, toolsOf, TEAM_SORT_FIELDS, type DashboardPage, type PageContext } from './dashboard-pages.js';
import { addToolForm, modifyToolForm, type ToolForm } from './tool-forms.js';
import type { ToolOperationOutcome, ToolOperationRequest } from '../tools/operations.js';
import { symbols, type TerminalProfile } from './terminal.js';
import { TitleAnimation, type DashboardTitleContext } from './terminal-title.js';
import { matchesFilter, windowAround } from './prompts.js';
import { runBookEditor, type BookDraft, type BookSourceClient } from './book-editor.js';
import { TASK_SORT_FIELDS, type TaskInventoryItem } from '../tasks/views.js';
import { formatAgentReference } from '../book/references.js';

/**
 * Where the dashboard reads state and sends controls (attached daemon or in-process owner).
 *
 * @private terminal dashboard
 */
export type DashboardSource = {
    /** Current snapshot. */
    readonly snapshot: () => Promise<ServiceSnapshot>;
    /** Waits for a newer revision (long poll); an aborted `signal` ends the wait at once. */
    readonly watch: (since: number, signal?: AbortSignal) => Promise<ServiceSnapshot>;
    /** The engine's shared runtime controls (lifecycle, waits, browser recovery). */
    readonly action: (name: string, params?: Readonly<Record<string, unknown>>) => Promise<{ outcome: string; applied?: boolean }>;
    /** Chats (the same committed operations as `ptbk chat`). */
    readonly chats: ChatSource;
    /** Existing (or explicitly renewed) pairing link. */
    readonly pairing: (renew: boolean) => Promise<{ available: boolean; url?: string; remote?: boolean }>;
    /** Saved tool management through the engine's shared operation (committed immediately). */
    readonly tool: (request: ToolOperationRequest) => Promise<ToolOperationOutcome>;
    /** The complete task inventory (every state). */
    readonly inventory: () => Promise<TaskInventoryItem[]>;
    /** Book sources through the engine's shared read/save operations. */
    readonly books: BookSourceClient;
    /** The invocation owns the service lifetime (foreground start / run). */
    readonly owning: boolean;
};

/**
 * Formats a plain event line.
 */
function plainLine(text: string): string {
    return `${clockTime()} ${terminalSafe(text)}\n`;
}

/**
 * Streams plain observation lines (raw dashboard, or the `O` presentation switch).
 *
 * @private terminal dashboard
 */
export function plainDifference(previous: ServiceSnapshot | undefined, next: ServiceSnapshot): string[] {
    const lines: string[] = [];
    if (!previous) {
        lines.push(`ptbk ${next.engine.version} ${next.service.mode} for ${next.project.path}: ${next.service.state}, phase ${next.phase}${next.service.commitMode === 'no-commit' ? ' (NO-COMMIT mode)' : ''}`);
        if (next.connection.local.url) lines.push(`Local dashboard: ${next.connection.local.url} (same computer only)`);
    } else {
        if (previous.service.state !== next.service.state || previous.service.lifecycle?.intent !== next.service.lifecycle?.intent) {
            lines.push(`Service ${next.service.state}${next.service.lifecycle?.intent ? ` (${next.service.lifecycle.intent}${next.service.lifecycle.draining ? ' after the current task' : ''})` : ''}`);
        }
        const previousBrowser = previous.browser;
        const browser = next.browser;
        if (browser && (previousBrowser?.state !== browser.state || previousBrowser?.lastFailure?.at !== browser.lastFailure?.at)) {
            lines.push(`Browser ${browser.state}${browser.lastFailure && browser.lastFailure.at !== previousBrowser?.lastFailure?.at ? `: ${browser.lastFailure.summary}` : ''}${browser.recovery?.state === 'retrying' ? ' (recovering automatically)' : ''}`);
        }
        if (next.execution?.status === 'active' && (previous.execution?.status !== 'active' || previous.execution.task.ref !== next.execution.task.ref)) {
            const own = next.execution.contexts[0];
            if (own) lines.push(`Execution: ${next.execution.agent.name} on ${own.harness.name}, model ${own.model.value ?? own.model.status}, thinking ${own.thinkingLevel.value ?? own.thinkingLevel.status}`);
        }
        if (previous.tools?.waiting?.reason !== next.tools?.waiting?.reason) lines.push(next.tools?.waiting ? `Tools: new work waits — ${next.tools.waiting.reason} (${next.tools.waiting.action})` : 'Tools: usable browser and harness available.');
        const toolStates = (snapshot: ServiceSnapshot | undefined): string => (snapshot?.tools?.items ?? []).map((item) => `${item.name}:${item.state}:${item.isEnabled}`).join(',');
        if (toolStates(previous) !== toolStates(next)) lines.push(`Tools: ${(next.tools?.items ?? []).map((item) => `${item.name} ${item.isEnabled ? item.state : 'disabled'}${item.inUse ? ' (in use)' : ''}`).join(', ') || 'none'}`);
        if (next.sync && (previous.sync?.state !== next.sync.state || previous.sync?.reason !== next.sync.reason)) lines.push(`Synchronization ${next.sync.state}${next.sync.reason ? `: ${next.sync.reason}` : ''}`);
        if (previous.phase !== next.phase) lines.push(`Phase ${next.phase}${next.current ? `: ${next.current.agent.name} on "${next.current.taskTitle}"` : next.wait ? `: ${next.wait.reason}` : ''}`);
        if (previous.connection.remote.url !== next.connection.remote.url && next.connection.remote.url) lines.push(`Remote dashboard: ${next.connection.remote.url}`);
    }
    const seen = new Set(previous?.activity.map((line) => `${line.at}${line.text}`) ?? []);
    for (const line of next.activity) if (!seen.has(`${line.at}${line.text}`) && previous) lines.push(`${line.level === 'info' ? '' : `${line.level.toUpperCase()}: `}${line.text}`);
    const previousWaiting = new Set(previous?.chats.waiting.map((chat) => `${chat.name}\u0000${chat.messages}`) ?? []);
    for (const chat of next.chats.waiting) {
        if (!previousWaiting.has(`${chat.name}\u0000${chat.messages}`)) {
            lines.push(`ATTENTION ${chat.awaiting?.sender ?? chat.agent ?? 'An agent'} waits for you in {${chat.name}}: ${(chat.awaiting?.text ?? '').split('\n')[0]} (answer with: ptbk answer "${chat.name}" "<answer>")`);
        }
    }
    return lines;
}

/**
 * The minimal terminal title of a project dashboard, `PTBK <single-line agent visual> <project>`: the visual of the
 * agent that currently owns execution, otherwise the stable default Promptbook visual (never a stale previous worker).
 * Versions, paths, modes and task titles live inside the dashboard pages.
 *
 * @private terminal dashboard
 */
export function dashboardTitle(snapshot: ServiceSnapshot, frame = 0): DashboardTitleContext {
    const current = snapshot.current;
    return { kind: 'dashboard', label: snapshot.project.name, project: snapshot.project.name, visual: singleLineVisual(current?.agent.name, current?.agent.activity ?? 'working', frame) };
}

/**
 * New-chat entry state: the Chatter-first choice, then (only on request) every valid alternative.
 */
type AgentPicker = { readonly kind: 'agents'; readonly agents: readonly ChatAgentChoice[]; readonly stage: 'entry' | 'all'; focus: number; /** Typed filter of the full list. */ query?: string };

/**
 * Rows of the full agent list shown at once (the list scrolls around the focus).
 */
const AGENT_PICKER_ROWS = 10;

/**
 * A pending yes/no confirmation of a consequential action.
 */
type Confirmation = { readonly kind: 'confirm'; readonly question: string; readonly details?: readonly string[]; readonly run: () => Promise<void> };

/**
 * A tool change waiting for the shared in-use acknowledgement (save while current work finishes, or force-stop the
 * whole engine and repeat the change afterwards).
 */
type ToolAcknowledgement = { readonly kind: 'tool-in-use'; readonly request: ToolOperationRequest; readonly message: string; readonly lastOfType?: string };

/**
 * A modal step drawn as its own page (Esc returns to the page or home screen below it).
 */
type Overlay = AgentPicker | Confirmation | ToolAcknowledgement;

/**
 * Meaningful key presses after a new attention item appeared that show the operator is actively using this viewer;
 * its transient blink then settles into a static warning (never merely because time passed).
 */
const ATTENTION_SETTLE_KEYS = 3;

/**
 * Cadence of the home animation (badge gesture and the blink of new attention).
 */
const HOME_FRAME_MS = 500;

/**
 * How long action feedback stays in the legend.
 */
const FEEDBACK_MS = 6000;

/**
 * How long an observed service exit or lost connection stays visible before the viewer closes.
 */
const ENDED_VISIBLE_MS = 1500;

/**
 * Runs the live terminal dashboard until the user leaves or the service ends.
 *
 * The root is the no-scroll home screen of compact tiles; Enter (or a letter shortcut) opens a domain page that takes
 * over the surface, and Escape returns. Focus is the operator's cursor and is never moved by attention. Leaving (Q,
 * Ctrl+C, root Escape) never stops an attached service. An owning view (foreground start) instead requests a graceful
 * stop and stays until the engine ends; a second Ctrl+C there is an explicit force stop.
 *
 * @private terminal dashboard
 */
export async function runDashboard(terminal: TerminalProfile, source: DashboardSource, options: { noQr: boolean }): Promise<'left' | 'ended'> {
    if (!terminal.pretty || !terminal.interactive) return await runPlainDashboard(terminal, source);
    const screen = new FullScreen();
    const marks = symbols(terminal.unicode);
    const { style } = terminal;
    let snapshot = await source.snapshot();
    let frame = 0;
    let focusRequest = 0;
    let feedback = '';
    let feedbackTimer: NodeJS.Timeout | undefined;
    // Viewer-local navigation: the home focus, the open page stack, a modal step, the task inventory and Book drafts.
    let focus: HomeTile = 'work';
    const pages: DashboardPage[] = [];
    let overlay: Overlay | undefined;
    let inventory: TaskInventoryItem[] | undefined;
    let inventoryRevision = -1;
    const drafts = new Map<string, BookDraft>();
    let nested = false;
    let qr: PreparedQr | undefined;
    let qrKey = '';
    let pairingUrl: string | undefined;
    let plain = false;
    let ownerStopRequested = false;
    let connectionLost: string | undefined;
    // Viewer-local attention: a changed key is a new item; it blinks until the operator is clearly active here.
    const attention = new Map<HomeTile, { key: string; since: number; seen: boolean }>();
    let keyCount = 0;
    /** Cancels the pending long poll when the viewer leaves, so closing never waits for the service's next update. */
    const watching = new AbortController();
    let finished: ((reason: 'left' | 'ended') => void) | undefined;
    const done = new Promise<'left' | 'ended'>((resolve) => {
        finished = resolve;
    });

    const notify = (text: string): void => {
        feedback = text;
        clearTimeout(feedbackTimer);
        feedbackTimer = setTimeout(() => {
            feedback = '';
            draw();
        }, FEEDBACK_MS);
        draw();
    };

    /** Re-derives attention from the snapshot (new or changed items start unseen; resolved ones disappear). */
    const updateAttention = (): void => {
        const tiles = homeTiles(snapshot);
        for (const tile of [...attention.keys()]) if (!tiles.includes(tile)) attention.delete(tile);
        for (const tile of tiles) {
            const item = tileAttention(snapshot, tile);
            const previous = attention.get(tile);
            if (!item) attention.delete(tile);
            else if (!previous || previous.key !== item.key) attention.set(tile, { key: item.key, since: keyCount, seen: false });
        }
    };

    /** A meaningful key press: new attention settles once the operator is clearly active in this viewer. */
    const countKey = (): void => {
        keyCount++;
        for (const item of attention.values()) if (!item.seen && keyCount - item.since >= ATTENTION_SETTLE_KEYS) item.seen = true;
    };

    const attentionView = (): Map<HomeTile, 'new' | 'seen'> => new Map([...attention].map(([tile, item]) => [tile, item.seen ? 'seen' : 'new']));

    const refreshQr = async (): Promise<void> => {
        if (options.noQr) return;
        const remote = snapshot.connection.remote;
        const pairingAvailable = snapshot.connection.pairing?.available;
        const key = `${remote.state}|${remote.url}|${String(pairingAvailable)}`;
        if (key === qrKey) return;
        qrKey = key;
        try {
            const pairing = pairingAvailable ? await source.pairing(false) : { available: false };
            if (pairing.available && pairing.url && pairing.remote) {
                pairingUrl = pairing.url;
                qr = { url: pairing.url, lines: await renderQr(pairing.url), label: 'Scan to pair a phone (protected remote access):', sensitive: true };
            } else if (remote.state === 'ready' && remote.url) {
                pairingUrl = pairing.url;
                qr = { url: remote.url, lines: await renderQr(remote.url), label: 'Remote dashboard (pairing required):', sensitive: false };
            } else {
                pairingUrl = pairing.available ? pairing.url : undefined;
                qr = undefined;
            }
        } catch {
            qr = undefined;
        }
        draw();
    };

    /** Reloads the complete task inventory when the service state changed (bounded: once per revision). */
    const refreshInventory = async (): Promise<void> => {
        if (inventoryRevision === snapshot.revision) return;
        inventoryRevision = snapshot.revision;
        try {
            inventory = await source.inventory();
            draw();
        } catch {
            // An engine of another version may not offer the inventory: the Tasks page reports it as loading.
        }
    };

    /** Home keys in priority order; as many as fit the width are shown. */
    const homeLegend = (): string => {
        const pause = lifecycleActions(snapshot).find((action) => action.key === 'P');
        const leaving = source.owning ? (ownerStopRequested ? 'Ctrl+C force stop' : 'Q stop & quit') : 'Q leave';
        return fitLegend(
            [
                '←↑↓→ Enter open',
                ...(snapshot.chats.waiting.length ? ['A answer'] : []),
                leaving,
                'C chat',
                ...(pause ? [`P ${pause.label}`] : []),
                'I system',
                'H health',
                'T tools',
                'L chats',
                'O plain',
                ...(source.owning ? [] : ['(leaving never stops the engine; X stops it)']),
            ],
            Math.max(20, terminal.columns()),
        );
    };

    /** Agents listed by the picker's current stage. */
    const pickerChoices = (picker: AgentPicker): Array<{ label: string; agent?: ChatAgentChoice; others?: true }> => {
        const chatter = picker.agents.find((agent) => agent.group === 'chatter');
        if (picker.stage === 'entry' && chatter) return [{ label: `Chat with ${chatter.name}`, agent: chatter }, { label: 'Choose another agent', others: true }];
        const query = picker.query ?? '';
        return picker.agents.filter((agent) => agent.group !== 'chatter' && (!query || matchesFilter(`${agent.name} ${agent.description ?? ''}`, query))).map((agent) => ({ label: agent.name, agent }));
    };

    /** The modal step as a page body. */
    const overlayBody = (step: Overlay): { title: string; context: string; body: string[]; anchor?: number; legend: string } => {
        const pointer = (focused: boolean): string => (focused ? style.accent(marks.pointer) : ' ');
        if (step.kind === 'confirm') return { title: 'Confirm', context: 'A consequential action needs your confirmation', body: [style.bold(step.question), ...(step.details ?? [])], legend: ' Y confirm · N/Esc keep things as they are' };
        if (step.kind === 'tool-in-use') {
            return {
                title: 'Tool in use',
                context: 'Current work holds this tool',
                body: [
                    style.bold(step.message),
                    `${style.accent('1')} Save the change now — the work that already acquired the tool finishes with its original configuration (not a kill)`,
                    `${style.accent('2')} Force-stop the whole engine (ptbk stop --force); after it stopped, repeat this change`,
                    ...(step.lastOfType ? [style.warning(step.lastOfType)] : []),
                ],
                legend: ' 1 save now · 2 force-stop the whole engine · Esc keep things as they are',
            };
        }
        const choices = pickerChoices(step);
        const chatter = step.agents.some((agent) => agent.group === 'chatter');
        const { start, end } = windowAround(choices.length, step.focus, AGENT_PICKER_ROWS);
        const rows = choices
            .slice(start, end)
            .map(
                (choice, offset) =>
                    `${pointer(start + offset === step.focus)} ${choice.label}${choice.agent && step.stage === 'all' ? style.muted(choice.agent.group === 'expert' ? ' (engine-provided)' : choice.agent.group === 'hidden' ? ' (hidden/core)' : '') : ''}${choice.agent?.description && step.stage === 'all' ? style.muted(` · ${choice.agent.description}`) : ''}${choice.others ? style.muted(' · project, hidden/core agents and Expert') : ''}`,
            );
        return {
            title: 'New chat',
            context: step.stage === 'entry' ? 'Who do you want to talk to?' : 'Every agent you can talk to',
            body: [
                ...(chatter ? [] : [style.warning('Chatter (agents/.core/chatter.book) is missing or invalid; run `ptbk init` or `ptbk start` to restore it. Choose another agent explicitly:')]),
                ...(step.stage === 'all' ? [step.query ? `${style.accent('Filter:')} ${step.query}${style.muted(` · ${choices.length} match${choices.length === 1 ? '' : 'es'} · Esc clears`)}` : style.muted('Type to filter · Esc goes back')] : []),
                ...(start > 0 ? [style.muted(`  ↑ ${start} more`)] : []),
                ...(choices.length ? rows : [style.muted('  No agent matches the filter.')]),
                ...(end < choices.length ? [style.muted(`  ↓ ${choices.length - end} more`)] : []),
            ],
            legend: step.stage === 'entry' ? ' ↑↓ choose · Enter confirm (Chatter is the default) · Esc cancel' : ' ↑↓ choose · Enter open a new chat · Esc back',
        };
    };

    const pageContext = (): PageContext => ({ snapshot, terminal, frame, inventory, qr, pairingUrl: qr?.sensitive ? undefined : pairingUrl, noQr: options.noQr, owning: source.owning });

    const draw = (): void => {
        if (plain || nested) return;
        const attentionCount = attention.size;
        if (overlay) {
            screen.draw(renderPage(snapshot, terminal, { ...overlayBody(overlay), scroll: 0, feedback, connectionLost, attention: attentionCount }).lines);
            return;
        }
        const page = pages[pages.length - 1];
        if (page) {
            keepSelection(page, pageContext());
            const built = pageBody(page, pageContext());
            const rendered = renderPage(snapshot, terminal, { ...built, legend: ` ${built.legend}`, scroll: page.scroll, feedback, connectionLost, attention: attentionCount });
            page.scroll = rendered.scroll;
            screen.draw(rendered.lines);
            return;
        }
        const controlNote = source.owning && ownerStopRequested && snapshot.service.state === 'stopping' ? 'This view closes when the engine has stopped.' : undefined;
        screen.draw(renderHome(snapshot, terminal, { focus, attention: attentionView(), frame, legend: homeLegend(), feedback, connectionLost, controlNote }));
    };

    const leave = (reason: 'left' | 'ended'): void => {
        watching.abort();
        keyboard.stop();
        screen.leave();
        clearInterval(animation);
        title.stop();
        clearTimeout(feedbackTimer);
        process.stdout.off('resize', onResize);
        finished?.(reason);
    };

    /** Opens a page (from home or as a nested page); viewing never mutates the engine. */
    const openPage = (page: DashboardPage, tile?: HomeTile): void => {
        overlay = undefined;
        if (tile) {
            focus = tile;
            const item = attention.get(tile);
            if (item) item.seen = true;
        }
        pages.push(page);
        if (page.kind === 'tasks' || page.kind === 'agents') {
            inventoryRevision = -1;
            void refreshInventory();
        }
        draw();
    };

    /** Opens the page of a home tile, replacing any open page stack. */
    const openTile = (tile: HomeTile): void => {
        pages.length = 0;
        openPage(pageForTile(tile), tile);
    };

    /** Opens a chat in the full-screen chat client; Esc returns to the dashboard (the chat stays). */
    const openChat = async (target: Parameters<typeof runChatClient>[2]): Promise<void> => {
        overlay = undefined;
        nested = true;
        keyboard.stop();
        try {
            await runChatClient(terminal, source.chats, target, { embedded: true, screen });
        } catch (error) {
            feedback = `Chat failed: ${errorMessage(error)}`;
        } finally {
            nested = false;
            keyboard.start();
            screen.invalidate();
            title.refresh(true);
            draw();
        }
    };

    /** Opens a real Book source in the shared editor (Enter newline, Ctrl+S save); Esc returns here, drafts kept. */
    const openBook = async (target: { readonly reference?: string; readonly path?: string }): Promise<void> => {
        nested = true;
        keyboard.stop();
        try {
            await runBookEditor(terminal, source.books, target, { screen, drafts, embedded: true });
            if (drafts.size) feedback = `${drafts.size} unsaved Book draft(s) kept; reopen to continue.`;
        } catch (error) {
            feedback = `Editor failed: ${errorMessage(error)}`;
        } finally {
            nested = false;
            keyboard.start();
            screen.invalidate();
            title.refresh(true);
            inventoryRevision = -1;
            void refreshInventory();
            draw();
        }
    };

    /** A new chat with a named agent (Tasker for task authoring, or an agent of the team view). */
    const chatWith = async (name: string): Promise<void> => {
        try {
            const agent = (await source.chats.agents()).find((choice) => choice.name.toLowerCase() === name.toLowerCase());
            if (!agent) {
                notify(`${name} is not available for chats.`);
                return;
            }
            await openChat({ kind: 'new', agent });
        } catch (error) {
            notify(`Chats unavailable: ${errorMessage(error)}`);
        }
    };

    /** Arrow keys on the home screen: spatial focus between tiles (highlighted, never enlarged). */
    const moveFocus = (direction: 'up' | 'down' | 'left' | 'right'): void => {
        const rows = homeLayout(homeTiles(snapshot), Math.max(20, terminal.columns()), Math.max(5, terminal.rows())).rows;
        let row = Math.max(0, rows.findIndex((candidates) => candidates.includes(focus)));
        let column = Math.max(0, rows[row]!.indexOf(focus));
        if (direction === 'up' || direction === 'down') {
            const next = Math.max(0, Math.min(rows.length - 1, row + (direction === 'up' ? -1 : 1)));
            column = Math.min(column, rows[next]!.length - 1);
            row = next;
        } else if (rows.length === 1 || rows.every((candidates) => candidates.length === 1)) {
            // A single column or row: left/right move through the tiles in order.
            const order = rows.flat();
            focus = order[Math.max(0, Math.min(order.length - 1, order.indexOf(focus) + (direction === 'left' ? -1 : 1)))]!;
            draw();
            return;
        } else column = Math.max(0, Math.min(rows[row]!.length - 1, column + (direction === 'left' ? -1 : 1)));
        focus = rows[row]![column]!;
        draw();
    };

    /** A: the conversation of the most urgent (focused) agent waiting for the user, with its real author. */
    const openWaiting = (): void => {
        const chat = snapshot.chats.waiting[focusRequest] ?? snapshot.chats.waiting[0];
        if (!chat) {
            notify('No agent is waiting for you.');
            return;
        }
        const item = attention.get('chats');
        if (item) item.seen = true;
        void openChat({ kind: 'existing', name: chat.name });
    };

    /** C: a new chat — Chat with Chatter (default) or Choose another agent. */
    const startNewChat = async (): Promise<void> => {
        try {
            const agents = await source.chats.agents();
            overlay = { kind: 'agents', agents, stage: agents.some((agent) => agent.group === 'chatter') ? 'entry' : 'all', focus: 0 };
            draw();
        } catch (error) {
            notify(`Chats unavailable: ${errorMessage(error)}`);
        }
    };

    const runAction = async (name: string, params?: Readonly<Record<string, unknown>>): Promise<{ outcome: string; applied?: boolean; data?: unknown } | undefined> => {
        try {
            const result = (await source.action(name, params)) as { outcome: string; applied?: boolean; data?: unknown };
            notify(result.outcome);
            return result;
        } catch (error) {
            notify(`Failed: ${errorMessage(error)}`);
            return undefined;
        }
    };

    /**
     * Applies a saved tool change through the shared operation and handles its protections: an in-use tool offers the
     * two shared alternatives; the last enabled tool of a type needs its own confirmation.
     */
    const runTool = async (request: ToolOperationRequest): Promise<void> => {
        try {
            const outcome = await source.tool({ ...request, via: 'dashboard' });
            if (outcome.status !== 'needs-acknowledgement') {
                notify(`${outcome.summary}${outcome.status === 'applied' && outcome.commit ? ` (committed ${outcome.commit.slice(0, 8)})` : ''}`);
                return;
            }
            const inUse = outcome.requirements.find((requirement) => requirement.kind === 'in-use');
            const lastOfType = outcome.requirements.find((requirement) => requirement.kind === 'last-of-type');
            if (inUse) {
                overlay = { kind: 'tool-in-use', request, message: inUse.message, lastOfType: lastOfType?.message };
                draw();
                return;
            }
            if (lastOfType) confirmThen(`${lastOfType.message} Continue?`, () => runTool({ ...request, acknowledgements: { ...request.acknowledgements, confirmLastOfType: true } }));
        } catch (error) {
            notify(`Not changed: ${errorMessage(error)}`);
        }
    };

    /** Runs a form outside the live view (the dashboard returns afterwards; nothing changes when it is cancelled). */
    const openForm = async (form: () => Promise<ToolForm | undefined>): Promise<void> => {
        nested = true;
        keyboard.stop();
        screen.leave();
        let result: ToolForm | undefined;
        try {
            result = await form();
        } catch (error) {
            feedback = `Form failed: ${errorMessage(error)}`;
        } finally {
            screen.enter();
            screen.invalidate();
            keyboard.start();
            nested = false;
            title.refresh(true);
            draw();
        }
        if (result) await runTool({ operation: result.operation, secret: result.secret });
    };

    /** Asks for confirmation before a consequential action. */
    const confirmThen = (question: string, run: () => Promise<void>, details?: readonly string[]): void => {
        overlay = { kind: 'confirm', question, run, details };
        draw();
    };

    /** Runs a lifecycle action offered for the current state (same operations as the CLI commands). */
    const lifecycle = (key: string): void => {
        const action = lifecycleActions(snapshot).find((candidate) => candidate.key === key);
        if (!action?.action) {
            notify(key === 'P' ? `Pause/resume does not apply while the service is ${snapshot.service.state}.` : 'That control does not apply now.');
            return;
        }
        const revision = snapshot.service.lifecycle?.revision;
        // Stop-to-pause replacement is confirmed against the decision the user saw (stale confirmations are rejected).
        const params = action.action === 'pause' && snapshot.service.state === 'stopping' ? { replaceStop: true, revision } : undefined;
        if (action.confirm) confirmThen(action.confirm, async () => void (await runAction(action.action, params)));
        else void runAction(action.action, params);
    };

    /** Owning view: request a graceful stop and stay until the engine ends; a repeated Ctrl+C forces. */
    const ownerQuit = (force: boolean): void => {
        if (force && ownerStopRequested) {
            void runAction('force-stop');
            return;
        }
        ownerStopRequested = true;
        void runAction('stop');
    };

    /** Lifecycle keys available on the home screen and the System page. */
    const lifecycleKey = (key: string): boolean => {
        switch (key) {
            case 'p':
                lifecycle('P');
                return true;
            case 'u':
                lifecycle('U');
                return true;
            case 'x':
                // Graceful stop; repeating it never escalates to force (F is the explicit force stop).
                lifecycle('X');
                return true;
            case 'r':
                lifecycle('R');
                return true;
            case 'f':
                lifecycle('F');
                return true;
            case 's':
                void runAction('skip-wait');
                return true;
            default:
                return false;
        }
    };

    /** The health operations of the Health page (the Health sub-engine owns them; the page only calls them). */
    const healthKey = (page: Extract<DashboardPage, { kind: 'health' }>, key: string): void => {
        const incidents = snapshot.health?.incidents ?? [];
        if (key === 'o') {
            const soft = [...incidents].reverse().find((incident) => incident.severity === 'soft' && incident.pauses);
            const hard = incidents.find((incident) => incident.severity === 'hard');
            if (!soft) {
                notify(hard ? 'A hard health pause cannot be overridden; it clears once the condition is gone.' : 'No soft health incident pauses the engine.');
                return;
            }
            confirmThen(`Continue below the recommended limit? ${soft.summary}.`, async () => void (await runAction('health-override', { incident: soft.id })), [
                style.warning('New background work will start although this resource is below its configured preventive limit (ptbk.json limit.disk/limit.memory).'),
                style.muted('The override applies only to this incident and does not change ptbk.json; after recovery a new drop pauses again.'),
            ]);
        } else if (key === 'k') {
            void runAction('health-clean-cache').then((result) => {
                const preview = result?.data as CachePreview | undefined;
                if (!preview) return;
                page.cache = preview;
                const removable = preview.entries.filter((entry) => !entry.kept);
                if (!removable.length) {
                    notify('The project cache has nothing to clean.');
                    draw();
                    return;
                }
                confirmThen(`Remove ${removable.length} entr${removable.length === 1 ? 'y' : 'ies'} (${formatBytes(preview.removableBytes)}) from ${preview.path}/?`, async () => {
                    const cleaned = await runAction('health-clean-cache', { confirm: true });
                    if (cleaned?.applied) page.cache = undefined;
                }, removable.slice(0, 8).map((entry) => style.muted(`  ${entry.name} · ${formatBytes(entry.bytes)}`)));
            });
        } else if (key === 'w') {
            void runAction('health-swap').then((result) => {
                const plan = result?.data as SwapPlan | undefined;
                if (!plan) return;
                page.swap = plan;
                draw();
                if (!plan.proposal) return;
                if (plan.proposal.privilege === 'missing') {
                    notify('Creating swap needs an administrator; the commands are listed on this page.');
                    return;
                }
                confirmThen(`Create and enable a ${formatMiB(plan.proposal.sizeMiB)} swap file at ${plan.proposal.path} (as ${plan.proposal.privilege})?`, async () => void (await runAction('health-swap', { apply: true })), plan.proposal.commands.map((command) => style.muted(`  ${command}`)));
            });
        } else if (key === 'm') void runAction('health-recheck');
    };

    /** Keys of the open page (its own arrows, Enter and letters; Escape returns one level). */
    const pageKey = (page: DashboardPage, event: KeyEvent): void => {
        const context = pageContext();
        keepSelection(page, context);
        const keys = pageItemKeys(page, context);
        const count = keys.length;
        const list = ['tools', 'agents', 'chats', 'tasks'].includes(page.kind);
        const room = Math.max(1, terminal.rows() - 5);
        if (event.type === 'key') {
            if (event.name === 'escape') {
                pages.pop();
                draw();
                return;
            }
            if (list && 'focus' in page && (event.name === 'up' || event.name === 'down')) {
                if (count) page.focus = (page.focus + (event.name === 'up' ? -1 : 1) + count) % count;
                page.selected = keys[page.focus];
            } else if (event.name === 'up' || event.name === 'down' || event.name === 'pageup' || event.name === 'pagedown') {
                const step = event.name === 'pageup' || event.name === 'pagedown' ? room : 1;
                page.scroll = Math.max(0, page.scroll + (event.name === 'up' || event.name === 'pageup' ? -step : step));
                if (page.kind === 'results') page.follow = false;
            } else if (event.name === 'home') page.scroll = 0;
            else if (event.name === 'end') {
                page.scroll = Number.MAX_SAFE_INTEGER;
                if (page.kind === 'results') page.follow = true;
            } else if (event.name === 'enter') {
                if (page.kind === 'tools') {
                    const tool = toolsOf(snapshot)[page.focus];
                    if (tool) openPage({ kind: 'tool', scroll: 0, name: tool.name });
                    return;
                }
                if (page.kind === 'chats') {
                    const chat = snapshot.chats.recent[page.focus];
                    if (chat) void openChat({ kind: 'existing', name: chat.name });
                    return;
                }
                if (page.kind === 'agents' || page.kind === 'tasks') page.detail = !page.detail;
            }
            draw();
            return;
        }
        if (event.type !== 'text') return;
        const text = event.text;
        const key = text.toLowerCase();
        switch (page.kind) {
            case 'system':
                lifecycleKey(key);
                return;
            case 'work':
                if (key === 's') void runAction('skip-wait');
                else if (key === 't') openPage({ kind: 'tools', scroll: 0, focus: 0 });
                return;
            case 'health':
                healthKey(page, key);
                return;
            case 'sync':
                if (key === 'g') {
                    notify('Synchronizing…');
                    void runAction('sync-now');
                }
                return;
            case 'connection':
                if (key === 'v') renewPairing();
                return;
            case 'chats':
                if (key === 'n') void startNewChat();
                else if (key === 'a') openWaiting();
                return;
            case 'agents': {
                const agent = teamOrder(snapshot, page.sort, inventory)[page.focus];
                if (key === 'c' && agent) void chatWith(agent.name);
                else if (key === 'e' && agent) void openBook({ reference: formatAgentReference(agent.name) });
                else if (key === 's') page.sort = TEAM_SORT_FIELDS[(TEAM_SORT_FIELDS.indexOf(page.sort) + 1) % TEAM_SORT_FIELDS.length]!;
                draw();
                return;
            }
            case 'tasks': {
                const task = taskOrder(context, page)[page.focus];
                if (key === 's') page.sort = TASK_SORT_FIELDS[(TASK_SORT_FIELDS.indexOf(page.sort) + 1) % TASK_SORT_FIELDS.length]!;
                else if (key === 'd') page.descending = !page.descending;
                else if (key === 't') void chatWith('Tasker');
                else if (key === 'e' && task) void openBook({ path: task.source });
                draw();
                return;
            }
            case 'tools':
            case 'tool': {
                const items = toolsOf(snapshot);
                const focused = page.kind === 'tool' ? items.find((item) => item.name === page.name) : items[page.focus];
                if (text === ' ' && focused) void runTool({ operation: { kind: focused.isEnabled ? 'disable' : 'enable', name: focused.name } });
                else if (page.kind === 'tools' && (text === '[' || text === ']') && focused) {
                    const neighbour = items[page.focus + (text === '[' ? -1 : 1)];
                    if (!neighbour) notify('It is already at that end of the list.');
                    else {
                        void runTool({ operation: { kind: 'move', name: focused.name, ...(text === '[' ? { before: neighbour.name } : { after: neighbour.name }) } });
                    }
                } else if (key === 'n' && page.kind === 'tools') void openForm(() => addToolForm(terminal));
                else if (key === 'm' && focused) void openForm(() => modifyToolForm(terminal, focused));
                else if (key === 'd' && focused) confirmThen(`Permanently remove the configuration of "${focused.name}"? (Disable keeps it; profiles, native logins and .env history are never deleted.)`, () => runTool({ operation: { kind: 'remove', name: focused.name } }));
                else if (['1', '2', '3'].includes(text) && focused) {
                    if (focused.type !== 'BROWSER') notify('Browser recovery applies to browser tools.');
                    else void runAction(text === '1' ? 'browser-recheck' : text === '2' ? 'browser-retry' : 'browser-restart', { name: focused.name });
                }
                draw();
                return;
            }
            default:
                return;
        }
    };

    /** Keys of a modal step. */
    const overlayKey = (step: Overlay, event: KeyEvent): void => {
        if (step.kind === 'tool-in-use') {
            if (event.type === 'key' && event.name === 'escape') {
                overlay = undefined;
                notify('Nothing changed.');
            } else if (event.type === 'text' && event.text === '1') {
                overlay = undefined;
                const forced = { ...step.request, acknowledgements: { ...step.request.acknowledgements, force: true } };
                if (step.lastOfType) confirmThen(`${step.lastOfType} Continue?`, () => runTool({ ...forced, acknowledgements: { ...forced.acknowledgements, confirmLastOfType: true } }));
                else void runTool(forced);
            } else if (event.type === 'text' && event.text === '2') {
                overlay = undefined;
                confirmThen('Force-stop the whole engine now? Owned work is interrupted (recoverable). The tool change is not applied: repeat it after the engine has stopped.', async () => void (await runAction('force-stop')));
            }
            draw();
            return;
        }
        if (step.kind === 'confirm') {
            if (event.type === 'text' && event.text.toLowerCase() === 'y') {
                overlay = undefined;
                void step.run();
            } else if ((event.type === 'text' && event.text.toLowerCase() === 'n') || (event.type === 'key' && event.name === 'escape')) {
                overlay = undefined;
                notify('Nothing changed.');
            }
            draw();
            return;
        }
        // The new-chat picker: typing narrows the full agent list; Backspace edits and Esc clears the filter first.
        const picker = step;
        if (picker.stage === 'all') {
            const edit = (query: string): void => {
                picker.query = query;
                picker.focus = 0;
                draw();
            };
            if (event.type === 'text' || event.type === 'paste') return edit(`${picker.query ?? ''}${event.text.replace(/[\r\n\t]+/g, ' ')}`);
            if (event.type === 'key' && event.name === 'backspace') return edit((picker.query ?? '').slice(0, -1));
            if (event.type === 'key' && event.name === 'escape' && picker.query) return edit('');
        }
        if (event.type === 'key' && event.name === 'escape') {
            // Choose another agent → back to the two-choice entry; otherwise cancel.
            overlay = picker.stage === 'all' && picker.agents.some((agent) => agent.group === 'chatter') ? { ...picker, stage: 'entry', focus: 1, query: undefined } : undefined;
            draw();
            return;
        }
        const count = pickerChoices(picker).length;
        if (event.type === 'key' && event.name === 'up' && count) picker.focus = (picker.focus - 1 + count) % count;
        else if (event.type === 'key' && event.name === 'down' && count) picker.focus = (picker.focus + 1) % count;
        else if (event.type === 'key' && event.name === 'enter') {
            const choice = pickerChoices(picker)[picker.focus];
            if (choice?.agent) void openChat({ kind: 'new', agent: choice.agent });
            else if (choice?.others) overlay = { ...picker, stage: 'all', focus: 0, query: undefined };
        }
        draw();
    };

    const renewPairing = (): void => {
        void source.pairing(true).then(
            () => {
                qrKey = '';
                notify('Pairing renewed; the previous link is invalid.');
                void refreshQr();
            },
            (error: unknown) => notify(`Pairing not renewed: ${errorMessage(error)}`),
        );
    };

    /** Keys of the home screen: tiles, letter shortcuts to the same pages/operations, and leaving. */
    const homeKey = (event: KeyEvent): void => {
        if (event.type === 'key') {
            if (event.name === 'up' || event.name === 'down' || event.name === 'left' || event.name === 'right') {
                moveFocus(event.name);
                return;
            }
            if (event.name === 'escape') {
                // Escape at the home screen closes only this viewer (an owning view stops its engine gracefully).
                if (source.owning) ownerQuit(false);
                else leave('left');
                return;
            }
            if (event.name === 'enter') openTile(focus);
            return;
        }
        if (event.type !== 'text') return;
        const key = event.text.toLowerCase();
        if (lifecycleKey(key)) return;
        switch (key) {
            case 'q':
                if (source.owning) ownerQuit(false);
                else leave('left');
                return;
            case 'a':
                openWaiting();
                return;
            case 'n':
                focusRequest = snapshot.chats.waiting.length ? (focusRequest + 1) % snapshot.chats.waiting.length : 0;
                notify(snapshot.chats.waiting.length ? `A opens {${snapshot.chats.waiting[focusRequest]!.name}}.` : 'No agent is waiting for you.');
                return;
            case 'c':
                void startNewChat();
                return;
            case 'l':
                openTile('chats');
                return;
            case 'e':
                openTile('work');
                return;
            case 'i':
                openTile('system');
                return;
            case 'h':
                openTile('health');
                return;
            case 't':
                openTile('tools');
                return;
            case 'b': {
                // The browser detail is the nested tool page of the browser serving (or next serving) work.
                const browser = snapshot.browser?.name ?? toolsOf(snapshot).find((item) => item.type === 'BROWSER')?.name;
                openTile('tools');
                if (browser) openPage({ kind: 'tool', scroll: 0, name: browser });
                return;
            }
            case 'y':
                if (!snapshot.sync) notify('Automatic synchronization is off (isAutoSync false).');
                else openTile('sync');
                return;
            case 'g':
                if (!snapshot.sync) {
                    notify('Automatic synchronization is off (isAutoSync false).');
                    return;
                }
                notify('Synchronizing…');
                void runAction('sync-now');
                return;
            case 'v':
                renewPairing();
                return;
            case 'o':
                plain = !plain;
                if (plain) {
                    screen.leave();
                    process.stdout.write(plainDifference(undefined, snapshot).map(plainLine).join(''));
                    process.stdout.write(plainLine('Plain presentation; press O for the dashboard.'));
                } else {
                    screen.enter();
                    screen.invalidate();
                    draw();
                }
                return;
            default:
                return;
        }
    };

    const onKey = (event: KeyEvent): void => {
        // Shortcuts typed faster than one read arrive as one text chunk: each character is its own key here (the
        // picker's filter takes typed text whole).
        if (event.type === 'text' && [...event.text].length > 1 && overlay?.kind !== 'agents') {
            for (const character of event.text) onKey({ type: 'text', text: character });
            return;
        }
        countKey();
        if (plain) {
            if (event.type === 'text' && event.text.toLowerCase() === 'o') homeKey(event);
            else if (event.type === 'key' && event.name === 'c' && event.ctrl) leave('left');
            return;
        }
        if (overlay) return overlayKey(overlay, event);
        if (event.type === 'key' && event.name === 'c' && event.ctrl) {
            if (source.owning) ownerQuit(true);
            else leave('left');
            return;
        }
        const page = pages[pages.length - 1];
        if (page) return pageKey(page, event);
        homeKey(event);
    };

    const keyboard = new KeyboardSession(onKey);
    const onResize = (): void => {
        screen.invalidate();
        // A different geometry keeps the focused tile; it only rearranges the grid.
        draw();
    };
    screen.enter();
    keyboard.start();
    process.stdout.on('resize', onResize);
    // The PTBK title animates the current worker's visual and is reasserted while this viewer is open.
    const title = new TitleAnimation(terminal.title, (titleFrame) => dashboardTitle(snapshot, titleFrame), terminal.reducedMotion);
    title.start();
    updateAttention();
    // Attention present on entry is new to this viewer, but settles as soon as the operator works here.
    const animation = setInterval(() => {
        const unseen = [...attention.values()].some((item) => !item.seen);
        const working = snapshot.current?.agent.activity === 'working' || snapshot.agents.some((agent) => agent.activity === 'working');
        if (plain || nested) return;
        if ((unseen && !pages.length && !overlay) || (working && !terminal.reducedMotion)) {
            frame++;
            draw();
        }
    }, HOME_FRAME_MS);
    draw();
    void refreshQr();
    void refreshInventory();

    void (async () => {
        let previous: ServiceSnapshot | undefined = snapshot;
        while (finished) {
            try {
                const next = await source.watch(snapshot.revision, watching.signal);
                connectionLost = undefined;
                if (plain) process.stdout.write(plainDifference(previous, next).map(plainLine).join(''));
                previous = next;
                snapshot = next;
                if (focusRequest >= snapshot.chats.waiting.length) focusRequest = 0;
                if (!homeTiles(snapshot).includes(focus)) focus = 'work';
                // A page of a domain that disappeared (autosync turned off) returns to the home screen.
                if (pages.some((page) => page.kind === 'sync') && !snapshot.sync) pages.length = 0;
                updateAttention();
                // A changed worker switches the title's visual at once.
                title.refresh();
                draw();
                void refreshQr();
                if (pages.some((page) => page.kind === 'tasks' || page.kind === 'agents')) void refreshInventory();
                if (['stopped', 'finished'].includes(snapshot.service.state)) {
                    // The engine ended (observed): show it briefly, never start a replacement.
                    await new Promise((resolve) => setTimeout(resolve, ENDED_VISIBLE_MS));
                    leave('ended');
                    return;
                }
            } catch (error) {
                if (watching.signal.aborted) return;
                connectionLost = errorMessage(error);
                draw();
                if (!source.owning) {
                    await new Promise((resolve) => setTimeout(resolve, ENDED_VISIBLE_MS));
                    leave('ended');
                    return;
                }
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
    })();
    const reason = await done;
    finished = undefined;
    process.stdout.write(`${style.muted(`Left the dashboard at ${formatShortTime(Date.now())}.`)}${source.owning ? '' : style.muted(reason === 'ended' ? ' The service is no longer running.' : ' The service keeps running; `ptbk stop` stops it.')}\n`);
    return reason;
}

/**
 * Plain continuous observation (raw/noninteractive): readable lines, conspicuous waiting-chat notices, no prompts.
 */
async function runPlainDashboard(terminal: TerminalProfile, source: DashboardSource): Promise<'left' | 'ended'> {
    let previous: ServiceSnapshot | undefined;
    let snapshot = await source.snapshot();
    let stop = false;
    const watching = new AbortController();
    const onSignal = (): void => {
        stop = true;
        watching.abort();
    };
    process.once('SIGINT', onSignal);
    try {
        for (;;) {
            terminal.write(plainDifference(previous, snapshot).map(plainLine).join(''));
            previous = snapshot;
            if (['stopped', 'finished'].includes(snapshot.service.state) && !source.owning) return 'ended';
            if (stop) return 'left';
            try {
                snapshot = await source.watch(snapshot.revision, watching.signal);
            } catch (error) {
                if (stop) return 'left';
                terminal.write(plainLine(`Connection lost: ${errorMessage(error)}`));
                return 'ended';
            }
        }
    } finally {
        process.off('SIGINT', onSignal);
    }
}
