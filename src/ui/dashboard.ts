import { errorMessage } from '../common/errors.js';
import { terminalSafe } from './ansi.js';
import { clockTime, formatShortTime } from '../common/time.js';
import type { ServiceSnapshot } from '../engine/snapshot.js';
import type { ChatAgentChoice } from '../chats/service.js';
import { runChatClient, type ChatSource } from './chat-client.js';
import { KeyboardSession, type KeyEvent } from './keys.js';
import { FullScreen } from './screen.js';
import { renderQr, renderStatusPretty, type PreparedQr } from './status-view.js';
import { lifecycleActions, toolDetailLines, toolRow } from './details.js';
import { addToolForm, modifyToolForm, type ToolForm } from './tool-forms.js';
import type { ToolOperationOutcome, ToolOperationRequest } from '../tools/operations.js';
import { symbols, type TerminalProfile } from './terminal.js';
import { matchesFilter, windowAround } from './prompts.js';

/**
 * Where the dashboard reads state and sends controls (attached daemon or in-process owner).
 *
 * @private terminal dashboard
 */
export type DashboardSource = {
    /** Current snapshot. */
    readonly snapshot: () => Promise<ServiceSnapshot>;
    /** Waits for a newer revision (long poll). */
    readonly watch: (since: number) => Promise<ServiceSnapshot>;
    /** The engine's shared runtime controls (lifecycle, waits, browser recovery). */
    readonly action: (name: string, params?: Readonly<Record<string, unknown>>) => Promise<{ outcome: string; applied?: boolean }>;
    /** Chats (the same committed operations as `ptbk chat`). */
    readonly chats: ChatSource;
    /** Existing (or explicitly renewed) pairing link. */
    readonly pairing: (renew: boolean) => Promise<{ available: boolean; url?: string; remote?: boolean }>;
    /** Saved tool management through the engine's shared operation (committed immediately). */
    readonly tool: (request: ToolOperationRequest) => Promise<ToolOperationOutcome>;
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
            lines.push(`ATTENTION ${chat.awaiting?.sender ?? chat.agent ?? 'An agent'} waits for you in {{${chat.name}}}: ${(chat.awaiting?.text ?? '').split('\n')[0]} (answer with: ptbk answer "${chat.name}" "<answer>")`);
        }
    }
    return lines;
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
type Confirmation = { readonly kind: 'confirm'; readonly question: string; readonly run: () => Promise<void> };

/**
 * The tool inventory in management mode (viewer-local focus; mutations go through the shared operation).
 */
type ToolsMode = { readonly kind: 'tools'; focus: number; detail: boolean };

/**
 * A tool change waiting for the shared in-use acknowledgement (save while current work finishes, or force-stop the
 * whole engine and repeat the change afterwards).
 */
type ToolAcknowledgement = { readonly kind: 'tool-in-use'; readonly request: ToolOperationRequest; readonly message: string; readonly lastOfType?: string };

/**
 * Runs the live terminal dashboard until the user leaves or the service ends.
 *
 * Leaving (Q, Ctrl+C) never stops an attached service. An owning view (foreground start, run) instead requests a
 * graceful stop and stays until the engine ends; a second Ctrl+C there is an explicit force stop.
 *
 * @private terminal dashboard
 */
export async function runDashboard(terminal: TerminalProfile, source: DashboardSource, options: { noQr: boolean }): Promise<'left' | 'ended'> {
    if (!terminal.pretty || !terminal.interactive) return await runPlainDashboard(terminal, source);
    const screen = new FullScreen();
    const marks = symbols(terminal.unicode);
    let snapshot = await source.snapshot();
    let frame = 0;
    let focusRequest = 0;
    let activityOffset = 0;
    let feedback = '';
    let feedbackTimer: NodeJS.Timeout | undefined;
    let input: AgentPicker | { kind: 'chats'; focus: number } | Confirmation | ToolsMode | ToolAcknowledgement | undefined;
    let nested = false;
    let qr: PreparedQr | undefined;
    let qrKey = '';
    let pairingUrl: string | undefined;
    let plain = false;
    let ownerStopRequested = false;
    // Viewer-local presentation state: detail panels start collapsed and never change the engine.
    const details = { execution: false, browser: false, sync: false };
    let connectionLost: string | undefined;
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
        }, 5000);
        draw();
    };

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

    const legend = (): string => {
        if (input?.kind === 'agents') return input.stage === 'entry' ? '  ↑↓ choose · Enter confirm (Chatter is the default) · Esc cancel' : '  ↑↓ choose · Enter open a new chat · Esc back';
        if (input?.kind === 'chats') return '  ↑↓ choose · Enter open · Esc back';
        if (input?.kind === 'confirm') return '  Y confirm · N/Esc keep things as they are';
        if (input?.kind === 'tool-in-use') return '  1 save now (current work finishes with the tool it acquired) · 2 force-stop the whole engine · Esc keep things as they are';
        if (input?.kind === 'tools') return `  ↑↓ choose · Space enable/disable · Enter ${input.detail ? 'hide' : 'show'} details · [ ] move · N add · M modify · D remove · 1/2/3 browser recheck/retry/restart · Esc back${feedback ? `   ${marks.arrow} ${feedback}` : ''}`;
        const waiting = snapshot.chats.waiting.length;
        const parts = [
            waiting ? 'A answer' : '',
            waiting > 1 ? 'N next' : '',
            'C new chat',
            `L chats${snapshot.chats.unread ? ` (${snapshot.chats.unread} unread)` : ''}`,
            'S skip wait',
            `E ${details.execution ? 'hide' : 'show'} execution`,
            `B ${details.browser ? 'hide' : 'show'} browser`,
            'T tools',
            ...(snapshot.sync ? [`Y ${details.sync ? 'hide' : 'show'} sync`, 'G sync now'] : []),
            'V renew pairing',
            'O plain',
            '↑↓/End activity',
            source.owning ? (ownerStopRequested ? 'Ctrl+C force stop' : 'Q/Ctrl+C stop gracefully & quit') : 'Q leave (service keeps running)',
        ].filter(Boolean);
        return `  ${parts.join(' · ')}${feedback ? `   ${marks.arrow} ${feedback}` : ''}`;
    };

    /** Agents listed by the picker's current stage. */
    const pickerChoices = (picker: AgentPicker): Array<{ label: string; agent?: ChatAgentChoice; others?: true }> => {
        const chatter = picker.agents.find((agent) => agent.group === 'chatter');
        if (picker.stage === 'entry' && chatter) return [{ label: `Chat with ${chatter.name}`, agent: chatter }, { label: 'Choose another agent', others: true }];
        const query = picker.query ?? '';
        return picker.agents
            .filter((agent) => agent.group !== 'chatter' && (!query || matchesFilter(`${agent.name} ${agent.description ?? ''}`, query)))
            .map((agent) => ({ label: agent.name, agent }));
    };

    const inputLines = (): string[] | undefined => {
        if (!input) return undefined;
        const { style } = terminal;
        const pointer = (focused: boolean): string => (focused ? style.accent(marks.pointer) : ' ');
        if (input.kind === 'confirm') return [style.bold(input.question), style.muted('Press Y to confirm or N/Esc to cancel.')];
        if (input.kind === 'tool-in-use') {
            return [
                style.bold(input.message),
                `${style.accent('1')} Save the change now — the work that already acquired the tool finishes with its original configuration (not a kill)`,
                `${style.accent('2')} Force-stop the whole engine (ptbk stop --force); after it stopped, repeat this change`,
                ...(input.lastOfType ? [style.warning(input.lastOfType)] : []),
                style.muted('Esc keeps everything as it is.'),
            ];
        }
        if (input.kind === 'tools') {
            const mode = input;
            const items = snapshot.tools?.items ?? [];
            const rows = items.map((item, index) => `${pointer(index === mode.focus)} ${toolRow(item, style)}`);
            const focused = items[mode.focus];
            return [
                style.bold(`Tools (${items.length}) — saved changes are committed immediately`),
                ...(items.length ? rows : [style.muted('No tools are configured; press N to add one.')]),
                ...(snapshot.tools?.waiting ? [style.warning(`New work waits for tools: ${snapshot.tools.waiting.reason}`)] : []),
                ...(focused && mode.detail ? ['', ...toolDetailLines(focused, style)] : []),
            ];
        }
        if (input.kind === 'agents') {
            const picker = input;
            const chatter = picker.agents.some((agent) => agent.group === 'chatter');
            const choices = pickerChoices(picker);
            // The full list scrolls around the focus and narrows as the user types (bounded, never pushing controls away).
            const { start, end } = windowAround(choices.length, picker.focus, AGENT_PICKER_ROWS);
            const rows = choices.slice(start, end).map(
                (choice, offset) =>
                    `${pointer(start + offset === picker.focus)} ${choice.label}${choice.agent && picker.stage === 'all' ? style.muted(choice.agent.group === 'expert' ? ' (engine-provided)' : choice.agent.group === 'hidden' ? ' (hidden/core)' : '') : ''}${choice.agent?.description && picker.stage === 'all' ? style.muted(` · ${choice.agent.description}`) : ''}${choice.others ? style.muted(' · project, hidden/core agents and Expert') : ''}`,
            );
            const problem = chatter ? [] : [style.warning('Chatter (agents/.core/chatter.book) is missing or invalid; run `ptbk init` or `ptbk start` to restore it. Choose another agent explicitly:')];
            const filter = picker.stage === 'all' ? [picker.query ? `${style.accent('Filter:')} ${picker.query}${style.muted(` · ${choices.length} match${choices.length === 1 ? '' : 'es'} · Esc clears`)}` : style.muted('Type to filter · Esc goes back')] : [];
            return [
                style.bold(picker.stage === 'entry' ? 'New chat — who do you want to talk to?' : 'New chat — every agent you can talk to'),
                ...problem,
                ...filter,
                ...(start > 0 ? [style.muted(`  ↑ ${start} more`)] : []),
                ...(choices.length ? rows : [style.muted('  No agent matches the filter.')]),
                ...(end < choices.length ? [style.muted(`  ↓ ${choices.length - end} more`)] : []),
            ];
        }
        const chats = snapshot.chats.recent;
        if (!chats.length) return [style.muted('No chats yet; press C to start one.')];
        const list = input;
        return [
            style.bold(`All chats (${snapshot.chats.total}${snapshot.chats.total > chats.length ? `, latest ${chats.length}` : ''})`),
            ...chats.map(
                (chat, index) =>
                    `${pointer(index === list.focus)} ${chat.status === 'waiting-for-user' ? style.warning(`${marks.warn} `) : ''}${chat.name}${chat.unread ? style.accent(` · ${chat.unread} unread`) : ''}${style.muted(` · ${chat.members.join(', ')}${chat.links.length ? ` · ${chat.links.join(', ')}` : ''}`)}`,
            ),
        ];
    };

    const draw = (): void => {
        if (plain || nested) return;
        const lines = renderStatusPretty(snapshot, terminal, {
            qr,
            noQr: options.noQr,
            pairingUrl: qr?.sensitive ? undefined : pairingUrl,
            live: {
                frame,
                maxHeight: terminal.rows(),
                legend: legend(),
                input: inputLines(),
                activityOffset,
                focusRequest,
                connectionLost,
                details,
                controlNote: source.owning && ownerStopRequested && snapshot.service.state === 'stopping' ? 'This view closes when the engine has stopped.' : undefined,
            },
        });
        screen.draw(lines);
    };

    const leave = (reason: 'left' | 'ended'): void => {
        keyboard.stop();
        screen.leave();
        clearInterval(animation);
        clearTimeout(feedbackTimer);
        process.stdout.off('resize', onResize);
        finished?.(reason);
    };

    /** Opens a chat in the full-screen chat client; Esc returns to the dashboard (the chat stays). */
    const openChat = async (target: Parameters<typeof runChatClient>[2]): Promise<void> => {
        input = undefined;
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
            draw();
        }
    };

    /** A: the conversation of the most urgent (focused) agent waiting for the user, with its real author. */
    const openWaiting = (): void => {
        const chat = snapshot.chats.waiting[focusRequest] ?? snapshot.chats.waiting[0];
        if (!chat) {
            notify('No agent is waiting for you.');
            return;
        }
        void openChat({ kind: 'existing', name: chat.name });
    };

    /** C: a new chat — Chat with Chatter (default) or Choose another agent. */
    const startNewChat = async (): Promise<void> => {
        try {
            const agents = await source.chats.agents();
            input = { kind: 'agents', agents, stage: agents.some((agent) => agent.group === 'chatter') ? 'entry' : 'all', focus: 0 };
            draw();
        } catch (error) {
            notify(`Chats unavailable: ${errorMessage(error)}`);
        }
    };

    const runAction = async (name: string, params?: Readonly<Record<string, unknown>>): Promise<void> => {
        try {
            notify((await source.action(name, params)).outcome);
        } catch (error) {
            notify(`Failed: ${errorMessage(error)}`);
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
                input = { kind: 'tool-in-use', request, message: inUse.message, lastOfType: lastOfType?.message };
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
            draw();
        }
        if (result) await runTool({ operation: result.operation, secret: result.secret });
    };

    /** Keys of the tools management mode. */
    const toolsKey = (mode: ToolsMode, event: KeyEvent): void => {
        const items = snapshot.tools?.items ?? [];
        const focused = items[mode.focus];
        if (event.type === 'key') {
            if (event.name === 'escape') input = undefined;
            else if (event.name === 'up' && items.length) mode.focus = (mode.focus - 1 + items.length) % items.length;
            else if (event.name === 'down' && items.length) mode.focus = (mode.focus + 1) % items.length;
            else if (event.name === 'enter') mode.detail = !mode.detail;
            draw();
            return;
        }
        if (event.type !== 'text') return;
        const key = event.text;
        if (key === ' ' && focused) void runTool({ operation: { kind: focused.isEnabled ? 'disable' : 'enable', name: focused.name } });
        else if ((key === '[' || key === ']') && focused) {
            const neighbour = items[mode.focus + (key === '[' ? -1 : 1)];
            if (!neighbour) notify('It is already at that end of the list.');
            else {
                mode.focus += key === '[' ? -1 : 1;
                void runTool({ operation: { kind: 'move', name: focused.name, ...(key === '[' ? { before: neighbour.name } : { after: neighbour.name }) } });
            }
        } else if (key.toLowerCase() === 'n') void openForm(() => addToolForm(terminal));
        else if (key.toLowerCase() === 'm' && focused) void openForm(() => modifyToolForm(terminal, focused));
        else if (key.toLowerCase() === 'd' && focused) confirmThen(`Permanently remove the configuration of "${focused.name}"? (Disable keeps it; profiles, native logins and .env history are never deleted.)`, () => runTool({ operation: { kind: 'remove', name: focused.name } }));
        else if (['1', '2', '3'].includes(key) && focused) {
            if (focused.type !== 'BROWSER') notify('Browser recovery applies to browser tools.');
            else void runAction(key === '1' ? 'browser-recheck' : key === '2' ? 'browser-retry' : 'browser-restart', { name: focused.name });
        }
        draw();
    };

    /** Asks for confirmation before a consequential action. */
    const confirmThen = (question: string, run: () => Promise<void>): void => {
        input = { kind: 'confirm', question, run };
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
        if (action.confirm) confirmThen(action.confirm, () => runAction(action.action, params));
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

    const onKey = (event: KeyEvent): void => {
        if (input?.kind === 'tools') {
            toolsKey(input, event);
            return;
        }
        if (input?.kind === 'tool-in-use') {
            const pending = input;
            if (event.type === 'key' && event.name === 'escape') {
                input = undefined;
                notify('Nothing changed.');
            } else if (event.type === 'text' && event.text === '1') {
                input = undefined;
                const forced = { ...pending.request, acknowledgements: { ...pending.request.acknowledgements, force: true } };
                if (pending.lastOfType) confirmThen(`${pending.lastOfType} Continue?`, () => runTool({ ...forced, acknowledgements: { ...forced.acknowledgements, confirmLastOfType: true } }));
                else void runTool(forced);
            } else if (event.type === 'text' && event.text === '2') {
                input = undefined;
                confirmThen('Force-stop the whole engine now? Owned work is interrupted (recoverable). The tool change is not applied: repeat it after the engine has stopped.', () => runAction('force-stop'));
            }
            draw();
            return;
        }
        if (input?.kind === 'confirm') {
            const pending = input;
            if (event.type === 'text' && event.text.toLowerCase() === 'y') {
                input = undefined;
                void pending.run();
            } else if ((event.type === 'text' && event.text.toLowerCase() === 'n') || (event.type === 'key' && event.name === 'escape')) {
                input = undefined;
                notify('Nothing changed.');
            }
            draw();
            return;
        }
        if (input) {
            if (input.kind === 'agents' && input.stage === 'all') {
                // Typing narrows the full agent list; Backspace edits and Esc clears the filter before going back.
                const picker = input;
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
                input = input.kind === 'agents' && input.stage === 'all' && input.agents.some((agent) => agent.group === 'chatter') ? { ...input, stage: 'entry', focus: 1, query: undefined } : undefined;
                draw();
                return;
            }
            const count = input.kind === 'agents' ? pickerChoices(input).length : snapshot.chats.recent.length;
            if (event.type === 'key' && event.name === 'up' && count) input.focus = (input.focus - 1 + count) % count;
            else if (event.type === 'key' && event.name === 'down' && count) input.focus = (input.focus + 1) % count;
            else if (event.type === 'key' && event.name === 'enter') {
                if (input.kind === 'agents') {
                    const choice = pickerChoices(input)[input.focus];
                    if (choice?.agent) void openChat({ kind: 'new', agent: choice.agent });
                    else if (choice?.others) input = { ...input, stage: 'all', focus: 0, query: undefined };
                } else {
                    const chat = snapshot.chats.recent[input.focus];
                    if (chat) void openChat({ kind: 'existing', name: chat.name });
                }
            }
            draw();
            return;
        }
        if (event.type === 'key' && event.name === 'c' && event.ctrl) {
            if (source.owning) ownerQuit(true);
            else leave('left');
            return;
        }
        if (event.type === 'key') {
            if (event.name === 'up') activityOffset = Math.min(activityOffset + 1, Math.max(0, snapshot.activity.length - 3));
            else if (event.name === 'down') activityOffset = Math.max(0, activityOffset - 1);
            else if (event.name === 'end') activityOffset = 0;
            else if (event.name === 'enter' && snapshot.chats.waiting.length) openWaiting();
            draw();
            return;
        }
        if (event.type !== 'text') return;
        switch (event.text.toLowerCase()) {
            case 'q':
                if (source.owning) ownerQuit(false);
                else leave('left');
                return;
            case 'p':
                lifecycle('P');
                return;
            case 'u':
                lifecycle('U');
                return;
            case 'x':
                // Graceful stop; repeating it never escalates to force (F is the explicit force stop).
                lifecycle('X');
                return;
            case 'r':
                lifecycle('R');
                return;
            case 'f':
                lifecycle('F');
                return;
            case 's':
                void runAction('skip-wait');
                return;
            case 'e':
                details.execution = !details.execution;
                draw();
                return;
            case 'b':
                details.browser = !details.browser;
                draw();
                return;
            case 't':
                input = { kind: 'tools', focus: 0, detail: false };
                draw();
                return;
            case 'y':
                if (!snapshot.sync) {
                    notify('Automatic synchronization is off (isAutoSync false).');
                    return;
                }
                details.sync = !details.sync;
                draw();
                return;
            case 'g':
                if (!snapshot.sync) {
                    notify('Automatic synchronization is off (isAutoSync false).');
                    return;
                }
                notify('Synchronizing…');
                void runAction('sync-now');
                return;
            case '1':
            case '2':
            case '3':
                if (!details.browser) {
                    notify('Open the browser details (B) to use browser recovery.');
                    return;
                }
                void runAction(event.text === '1' ? 'browser-recheck' : event.text === '2' ? 'browser-retry' : 'browser-restart');
                return;
            case 'a':
                openWaiting();
                return;
            case 'c':
                void startNewChat();
                return;
            case 'l':
                input = { kind: 'chats', focus: 0 };
                draw();
                return;
            case 'n':
                focusRequest = snapshot.chats.waiting.length ? (focusRequest + 1) % snapshot.chats.waiting.length : 0;
                draw();
                return;
            case 'v':
                void source.pairing(true).then(
                    () => {
                        qrKey = '';
                        notify('Pairing renewed; the previous link is invalid.');
                        void refreshQr();
                    },
                    (error: unknown) => notify(`Pairing not renewed: ${errorMessage(error)}`),
                );
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

    const keyboard = new KeyboardSession(onKey);
    const onResize = (): void => {
        screen.invalidate();
        draw();
    };
    screen.enter();
    keyboard.start();
    process.stdout.on('resize', onResize);
    const animation = setInterval(() => {
        if (snapshot.current?.agent.activity === 'working' && !terminal.reducedMotion && !plain) {
            frame++;
            draw();
        }
    }, 700);
    draw();
    void refreshQr();

    void (async () => {
        let previous: ServiceSnapshot | undefined = snapshot;
        while (finished) {
            try {
                const next = await source.watch(snapshot.revision);
                connectionLost = undefined;
                if (plain) process.stdout.write(plainDifference(previous, next).map(plainLine).join(''));
                previous = next;
                snapshot = next;
                if (focusRequest >= snapshot.chats.waiting.length) focusRequest = 0;
                draw();
                void refreshQr();
                if (['stopped', 'finished'].includes(snapshot.service.state)) {
                    // The engine ended (observed): show it briefly, never start a replacement.
                    await new Promise((resolve) => setTimeout(resolve, 1500));
                    leave('ended');
                    return;
                }
            } catch (error) {
                connectionLost = errorMessage(error);
                draw();
                if (!source.owning) {
                    await new Promise((resolve) => setTimeout(resolve, 1500));
                    leave('ended');
                    return;
                }
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
    })();
    const reason = await done;
    finished = undefined;
    process.stdout.write(`${terminal.style.muted(`Left the dashboard at ${formatShortTime(Date.now())}.`)}${source.owning ? '' : terminal.style.muted(reason === 'ended' ? ' The service is no longer running.' : ' The service keeps running; `ptbk stop` stops it.')}\n`);
    return reason;
}

/**
 * Plain continuous observation (raw/noninteractive): readable lines, conspicuous waiting-chat notices, no prompts.
 */
async function runPlainDashboard(terminal: TerminalProfile, source: DashboardSource): Promise<'left' | 'ended'> {
    let previous: ServiceSnapshot | undefined;
    let snapshot = await source.snapshot();
    let stop = false;
    const onSignal = (): void => {
        stop = true;
    };
    process.once('SIGINT', onSignal);
    try {
        for (;;) {
            terminal.write(plainDifference(previous, snapshot).map(plainLine).join(''));
            previous = snapshot;
            if (['stopped', 'finished'].includes(snapshot.service.state) && !source.owning) return 'ended';
            if (stop) return 'left';
            try {
                snapshot = await source.watch(snapshot.revision);
            } catch (error) {
                terminal.write(plainLine(`Connection lost: ${errorMessage(error)}`));
                return 'ended';
            }
        }
    } finally {
        process.off('SIGINT', onSignal);
    }
}
