import { errorMessage } from '../common/errors.js';
import { clockTime, formatShortTime } from '../common/time.js';
import type { ServiceSnapshot } from '../engine/snapshot.js';
import type { ChatAgentChoice } from '../chats/service.js';
import { runChatClient, type ChatSource } from './chat-client.js';
import { KeyboardSession, type KeyEvent } from './keys.js';
import { FullScreen } from './screen.js';
import { renderQr, renderStatusPretty, type PreparedQr } from './status-view.js';
import { symbols, type TerminalProfile } from './terminal.js';

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
    /** Runtime control. */
    readonly action: (name: 'pause' | 'resume' | 'skip-wait' | 'stop' | 'stop-now' | 'cancel-stop') => Promise<{ outcome: string }>;
    /** Chats (the same committed operations as `ptbk chat`). */
    readonly chats: ChatSource;
    /** Existing (or explicitly renewed) pairing link. */
    readonly pairing: (renew: boolean) => Promise<{ available: boolean; url?: string; remote?: boolean }>;
    /** The invocation owns the service lifetime (foreground start / run). */
    readonly owning: boolean;
};

/**
 * Formats a plain event line.
 */
function plainLine(text: string): string {
    return `${clockTime()} ${text}\n`;
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
        if (previous.service.state !== next.service.state) lines.push(`Service ${next.service.state}`);
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
 * Runs the live terminal dashboard until the user leaves or the service ends.
 *
 * Leaving (Q, Ctrl+C) never stops an attached service; an owning view stops only its own work.
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
    let input: { kind: 'agents'; agents: readonly ChatAgentChoice[]; more: boolean; focus: number } | { kind: 'chats'; focus: number } | undefined;
    let nested = false;
    let qr: PreparedQr | undefined;
    let qrKey = '';
    let pairingUrl: string | undefined;
    let plain = false;
    let stopPressed = false;
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
        }, 4000);
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
        if (input?.kind === 'agents') return '  ↑↓ choose · Enter open a new chat · Esc cancel';
        if (input?.kind === 'chats') return '  ↑↓ choose · Enter open · Esc back';
        const waiting = snapshot.chats.waiting.length;
        const parts = [
            waiting ? 'A answer' : '',
            waiting > 1 ? 'N next' : '',
            'C chat',
            `L chats${snapshot.chats.unread ? ` (${snapshot.chats.unread} unread)` : ''}`,
            snapshot.service.state === 'paused' || snapshot.service.state === 'pausing' ? 'P resume' : 'P pause',
            'S skip wait',
            stopPressed ? 'X again: stop now' : 'X stop service',
            'R renew pairing',
            'O plain',
            '↑↓/End activity',
            source.owning ? 'Q/Ctrl+C stop (recoverable) & quit' : 'Q leave (service keeps running)',
        ].filter(Boolean);
        return `  ${parts.join(' · ')}${feedback ? `   ${marks.arrow} ${feedback}` : ''}`;
    };

    const visibleAgents = (): ChatAgentChoice[] => (input?.kind === 'agents' ? (input.more ? [...input.agents] : input.agents.filter((agent) => agent.group === 'ordinary')) : []);

    const inputLines = (): string[] | undefined => {
        if (!input) return undefined;
        const { style } = terminal;
        const pointer = (focused: boolean): string => (focused ? style.accent(marks.pointer) : ' ');
        if (input.kind === 'agents') {
            const agents = visibleAgents();
            const rows = agents.map((agent, index) => `${pointer(index === input!.focus)} ${agent.name}${agent.group === 'ordinary' ? '' : style.muted(agent.group === 'expert' ? ' (engine-provided)' : ' (hidden/core)')}${agent.description ? style.muted(` · ${agent.description}`) : ''}`);
            if (!input.more) rows.push(`${pointer(input.focus === agents.length)} ${style.muted('More… (hidden/core agents, Expert)')}`);
            return [style.bold('New chat — who do you want to talk to?'), ...rows];
        }
        const chats = snapshot.chats.recent;
        if (!chats.length) return [style.muted('No chats yet; press C to start one.')];
        return [
            style.bold(`All chats (${snapshot.chats.total}${snapshot.chats.total > chats.length ? `, latest ${chats.length}` : ''})`),
            ...chats.map(
                (chat, index) =>
                    `${pointer(index === input!.focus)} ${chat.status === 'waiting-for-user' ? style.warning(`${marks.warn} `) : ''}${chat.name}${chat.unread ? style.accent(` · ${chat.unread} unread`) : ''}${style.muted(` · ${chat.members.join(', ')}${chat.links.length ? ` · ${chat.links.join(', ')}` : ''}`)}`,
            ),
        ];
    };

    const draw = (): void => {
        if (plain || nested) return;
        const lines = renderStatusPretty(snapshot, terminal, {
            qr,
            noQr: options.noQr,
            pairingUrl: qr?.sensitive ? undefined : pairingUrl,
            live: { frame, maxHeight: terminal.rows(), legend: legend(), input: inputLines(), activityOffset, focusRequest, connectionLost },
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

    /** A: the conversation of the most urgent (focused) agent waiting for the user. */
    const openWaiting = (): void => {
        const chat = snapshot.chats.waiting[focusRequest] ?? snapshot.chats.waiting[0];
        if (!chat) {
            notify('No agent is waiting for you.');
            return;
        }
        void openChat({ kind: 'existing', name: chat.name });
    };

    /** C: choose the agent of a new chat. */
    const startNewChat = async (): Promise<void> => {
        try {
            const agents = await source.chats.agents();
            input = { kind: 'agents', agents, more: !agents.some((agent) => agent.group === 'ordinary'), focus: 0 };
            draw();
        } catch (error) {
            notify(`Chats unavailable: ${errorMessage(error)}`);
        }
    };

    const runAction = async (name: Parameters<DashboardSource['action']>[0]): Promise<void> => {
        try {
            notify((await source.action(name)).outcome);
        } catch (error) {
            notify(`Failed: ${errorMessage(error)}`);
        }
    };

    const onKey = (event: KeyEvent): void => {
        if (input) {
            if (event.type === 'key' && event.name === 'escape') {
                input = undefined;
                draw();
                return;
            }
            const count = input.kind === 'agents' ? visibleAgents().length + (input.more ? 0 : 1) : snapshot.chats.recent.length;
            if (event.type === 'key' && event.name === 'up' && count) input.focus = (input.focus - 1 + count) % count;
            else if (event.type === 'key' && event.name === 'down' && count) input.focus = (input.focus + 1) % count;
            else if (event.type === 'key' && event.name === 'enter') {
                if (input.kind === 'agents') {
                    const agent = visibleAgents()[input.focus];
                    if (agent) void openChat({ kind: 'new', agent });
                    else input = { ...input, more: true, focus: visibleAgents().length };
                } else {
                    const chat = snapshot.chats.recent[input.focus];
                    if (chat) void openChat({ kind: 'existing', name: chat.name });
                }
            }
            draw();
            return;
        }
        if (event.type === 'key' && event.name === 'c' && event.ctrl) {
            if (source.owning) void runAction('stop-now');
            leave('left');
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
                if (source.owning) void runAction('stop-now');
                leave('left');
                return;
            case 'p':
                void runAction(snapshot.service.state === 'paused' || snapshot.service.state === 'pausing' ? 'resume' : 'pause');
                return;
            case 's':
                void runAction('skip-wait');
                return;
            case 'x':
                void runAction(stopPressed ? 'stop-now' : 'stop');
                stopPressed = true;
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
            case 'r':
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
                    if (!source.owning) {
                        await new Promise((resolve) => setTimeout(resolve, 1500));
                        leave('ended');
                        return;
                    }
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
    process.stdout.write(`${terminal.style.muted(`Left the dashboard at ${formatShortTime(Date.now())}.`)}${source.owning ? '' : terminal.style.muted(' The service keeps running; `ptbk stop` stops it.')}\n`);
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
