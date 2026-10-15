import { errorMessage } from '../common/errors.js';
import { clockTime, formatShortTime } from '../common/time.js';
import type { ServiceSnapshot } from '../engine/snapshot.js';
import { fit } from './ansi.js';
import { TextEditor } from './composer.js';
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
    /** Answers a request. */
    readonly answer: (id: string, answer: string, status?: string) => Promise<void>;
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
    const previousRequests = new Set(previous?.requests.map((request) => request.id) ?? []);
    for (const request of next.requests) {
        if (!previousRequests.has(request.id)) lines.push(`ATTENTION ${request.id}: ${request.reason} — ${request.question.split('\n')[0]} (answer with: ptbk answer ${request.id} "<answer>")`);
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
    let input: { kind: 'choice'; requestId: string; choices: readonly string[]; focus: number } | { kind: 'text'; requestId: string; editor: TextEditor } | undefined;
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
        if (input?.kind === 'text') return '  Enter send · Ctrl+J newline · Esc cancel';
        if (input?.kind === 'choice') return '  ↑↓ choose · Enter send · 1-9 pick · Esc cancel';
        const parts = [
            snapshot.requests.length ? 'A answer' : '',
            snapshot.requests.length > 1 ? 'N next request' : '',
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

    const inputLines = (): string[] | undefined => {
        if (!input) return undefined;
        const { style } = terminal;
        const request = snapshot.requests.find((item) => item.id === input!.requestId);
        if (!request) return [style.muted('This request was resolved elsewhere.')];
        if (input.kind === 'choice') {
            const focus = input.focus;
            return [style.bold(`Answer ${request.id}:`), ...input.choices.map((choice, index) => `${index === focus ? style.accent(marks.pointer) : ' '} ${index === focus ? style.accent(marks.radioOn) : style.muted(marks.radioOff)} ${style.accent(`${index + 1}.`)} ${choice}`)];
        }
        const width = Math.min(terminal.columns(), 140) - 8;
        const layout = input.editor.layout(width, 6);
        return [style.bold(`Answer ${request.id} (Enter sends, Ctrl+J newline):`), ...(input.editor.value ? layout.lines : [style.muted('Type your answer…')]).map((line) => `${style.accent('│')} ${fit(line, width)}`)];
    };

    const draw = (): void => {
        if (plain) return;
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

    const startAnswer = (): void => {
        const request = snapshot.requests[focusRequest] ?? snapshot.requests[0];
        if (!request) {
            notify('No pending request.');
            return;
        }
        input = request.choices?.length ? { kind: 'choice', requestId: request.id, choices: request.choices, focus: 0 } : { kind: 'text', requestId: request.id, editor: new TextEditor() };
        draw();
    };

    const submitAnswer = async (requestId: string, answer: string): Promise<void> => {
        input = undefined;
        try {
            await source.answer(requestId, answer);
            notify(`Answer to ${requestId} applied.`);
        } catch (error) {
            notify(`Not applied: ${errorMessage(error)}`);
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
            if (input.kind === 'choice') {
                const current = input;
                if (event.type === 'key' && event.name === 'up') current.focus = (current.focus - 1 + current.choices.length) % current.choices.length;
                else if (event.type === 'key' && event.name === 'down') current.focus = (current.focus + 1) % current.choices.length;
                else if (event.type === 'key' && event.name === 'enter') void submitAnswer(current.requestId, current.choices[current.focus]!);
                else if (event.type === 'text' && /^[1-9]$/.test(event.text) && Number(event.text) <= current.choices.length) current.focus = Number(event.text) - 1;
                draw();
                return;
            }
            const action = input.editor.handle(event);
            if (action === 'submit') {
                if (input.editor.value.trim()) void submitAnswer(input.requestId, input.editor.value);
            } else if (action === 'cancel') input = undefined;
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
            else if (event.name === 'enter' && snapshot.requests.length) startAnswer();
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
                startAnswer();
                return;
            case 'n':
                focusRequest = snapshot.requests.length ? (focusRequest + 1) % snapshot.requests.length : 0;
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
                if (focusRequest >= snapshot.requests.length) focusRequest = 0;
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
 * Plain continuous observation (raw/noninteractive): readable lines, conspicuous request notices, no prompts.
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
