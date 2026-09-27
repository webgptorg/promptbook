import { PassThrough } from 'stream';
import moment from 'moment';
import { printLiveScriptChunk } from '../common/runGoScript/printLiveScriptChunk';
import { getEndAfterCurrentPromptState, getPauseState, resetCoderRunControls } from '../common/waitForPause';
import { listenForCoderRunControls } from '../common/listenForCoderRunControls';
import { CoderRunUiState } from './CoderRunUiState';
import { renderCoderRunUi, type CoderRunUiHandle } from './renderCoderRunUi';
import { stripAnsi, visibleLength } from './coderRunUiText';
import { buildCoderRunUiFrame } from './buildCoderRunUiFrame';
import { Terminal } from '@xterm/xterm';

/** In-memory TTY exercising Node's real readline key parser with no paid calls. */
class FixtureTerminal extends PassThrough {
    public isTTY = true;
    public columns = 80;
    public rows = 28;
    public setRawMode = jest.fn();
}

describe('renderCoderRunUi terminal contract', () => {
    let input: FixtureTerminal;
    let output: FixtureTerminal;
    let writes: string[];
    let handle: CoderRunUiHandle | undefined;
    const ORIGINAL_INPUT = Object.getOwnPropertyDescriptor(process, 'stdin')!;
    const ORIGINAL_OUTPUT = Object.getOwnPropertyDescriptor(process, 'stdout')!;

    beforeEach(() => {
        jest.useFakeTimers();
        resetCoderRunControls();
        input = new FixtureTerminal();
        output = new FixtureTerminal();
        writes = [];
        output.on('data', (chunk) => writes.push(chunk.toString()));
        Object.defineProperty(process, 'stdin', { configurable: true, value: input });
        Object.defineProperty(process, 'stdout', { configurable: true, value: output });
    });
    afterEach(() => {
        handle?.cleanup();
        handle = undefined;
        input.destroy();
        output.destroy();
        Object.defineProperty(process, 'stdin', ORIGINAL_INPUT);
        Object.defineProperty(process, 'stdout', ORIGINAL_OUTPUT);
        resetCoderRunControls();
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    /** Sends bytes through readline and lets the deferred render complete. */
    function press(text: string): void {
        input.write(text);
        jest.advanceTimersByTime(1);
    }

    it('toggles mid-fragment, across tasks, and while waiting for Enter without triggering controls', async () => {
        handle = renderCoderRunUi(moment());
        handle.state.setConfig({ agentName: 'claude-code' });
        handle.state.setCurrentPrompt('Selected task');
        handle.startCapturingAgentOutput();
        printLiveScriptChunk(
            '{"type":"assistant","message":{"id":"one","content":[{"type":"text","text":"Hel',
            'stdout',
            true,
        );
        const onEnter = jest.fn();
        const pending = handle.waitForEnter('Confirm').then(onEnter);
        press('o');
        expect(handle.state.outputMode).toBe('raw');
        printLiveScriptChunk('lo"}]}}\n', 'stdout', true);
        press('o');
        expect(handle.state.output.events.filter((event) => event.text === 'Hello')).toHaveLength(1);
        expect(getPauseState()).toBe('RUNNING');
        expect(getEndAfterCurrentPromptState()).toBe(false);
        expect(onEnter).not.toHaveBeenCalled();
        press('o');
        handle.state.setCurrentPrompt('Next task');
        expect(handle.state.outputMode).toBe('raw');
        press('\r');
        await pending;
        expect(onEnter).toHaveBeenCalledTimes(1);
        expect(stripAnsi(writes.join(''))).toContain('[o] Show normal output');
    });

    it('preserves pause/stop and handles resize, output scroll and dashboard scroll separately', () => {
        handle = renderCoderRunUi(moment());
        handle.startCapturingAgentOutput();
        handle.state.setPhase('running');
        for (let index = 0; index < 50; index++) printLiveScriptChunk(`line ${index}\n`, 'stdout', true);
        jest.advanceTimersByTime(1);
        press('\u001b[A');
        expect(handle.state.outputScrollOffset).toBeGreaterThan(0);
        press('\u001b[F');
        expect(handle.state.outputScrollOffset).toBe(0);
        press('p');
        expect(getPauseState()).toBe('PAUSING');
        press('o');
        press('\u001b[5~');
        expect(getPauseState()).toBe('PAUSING');
        press('x');
        expect(getEndAfterCurrentPromptState()).toBe(true);
        for (const columns of [100, 32, 19, 80]) {
            output.columns = columns;
            output.emit('resize');
            jest.advanceTimersByTime(1);
        }
        press('p');
        press('x');
        expect(getPauseState()).toBe('RUNNING');
        expect(getEndAfterCurrentPromptState()).toBe(false);
        expect(writes.join('')).toContain('Dashboard');
        expect(writes.join('')).toContain('[o]');
    });

    it('restores capture, console and keyboard listeners after cleanup', () => {
        const originalInfo = console.info;
        handle = renderCoderRunUi(moment());
        handle.startCapturingAgentOutput();
        handle.cleanup();
        expect(console.info).toBe(originalInfo);
        expect(input.listenerCount('keypress')).toBe(0);
        expect(output.listenerCount('resize')).toBe(0);
        expect(input.setRawMode.mock.calls.map(([isRaw]) => isRaw)).toEqual([true, false]);
        const info = jest.spyOn(console, 'info').mockImplementation(() => {});
        printLiveScriptChunk('after cleanup', 'stdout', true);
        expect(info).toHaveBeenCalledWith('after cleanup');
    });

    it('starts a new dashboard in normal mode even when a state object is reused', () => {
        const state = new CoderRunUiState(moment());
        state.toggleOutputMode();
        handle = renderCoderRunUi(moment(), { state });
        expect(state.outputMode).toBe('normal');
        press('\u000f'); // Ctrl+O is not the dashboard's O control.
        expect(state.outputMode).toBe('normal');
        press('O');
        expect(state.outputMode).toBe('raw');
    });

    it('does not install the output toggle in the shared agent-message dashboard', () => {
        handle = renderCoderRunUi(moment(), { buildFrameLines: () => ['Agent message dashboard'] });
        press('o');
        expect(handle.state.outputMode).toBe('normal');
        expect(stripAnsi(writes.join(''))).not.toContain('Raw output');
    });

    it('replays redraw bytes in a terminal emulator through resize and view/scroll changes', async () => {
        jest.runAllTicks();
        jest.useRealTimers();
        const emulator = new Terminal({ cols: output.columns, rows: output.rows, allowProposedApi: true });
        /** Runs deferred dashboard rendering and then drains the terminal parser. */
        async function draw(): Promise<string[]> {
            await new Promise<void>((resolve) => setImmediate(resolve));
            const payload = writes.splice(0).join('');
            if (payload) await new Promise<void>((resolve) => emulator.write(payload, resolve));
            return Array.from(
                { length: output.rows },
                (_, index) =>
                    emulator.buffer.active.getLine(emulator.buffer.active.viewportY + index)?.translateToString(true) ||
                    '',
            );
        }
        try {
            handle = renderCoderRunUi(moment());
            handle.state.setConfig({ agentName: 'OpenAI Codex' });
            handle.state.setCurrentPrompt('Selected task');
            handle.startCapturingAgentOutput();
            printLiveScriptChunk(
                'codex\nA message with enough words to wrap across several terminal columns.\n',
                'stdout',
                true,
            );
            let screen = await draw();
            expect(screen.join('\n')).toContain('Normal output');
            expect(screen.join('\n')).toContain('Selected task');
            handle.state.addError('Command failed\nsecond diagnostic line\u001b[2J');
            for (const [columns, rows] of [
                [32, 24],
                [96, 45],
                [19, 28],
                [55, 30],
            ]) {
                output.columns = columns!;
                output.rows = rows!;
                emulator.resize(output.columns, output.rows);
                output.emit('resize');
                input.write('o');
                input.write('\u001b[A');
                screen = await draw();
                expect(screen.join('\n')).toContain('[o]');
                expect(screen.join('\n')).toContain('Controls');
                expect(screen.filter((line) => line.startsWith('┌ Controls'))).toHaveLength(1);
                expect(screen.every((line) => visibleLength(line) < output.columns)).toBe(true);
            }
            for (let index = 0; index < 40; index++) input.write('\u001b[5~');
            screen = await draw();
            expect(screen.join('\n')).toContain('Session');
            for (let index = 0; index < 10; index++) input.write('\u001b[6~');
            screen = await draw();
            expect(screen.join('\n')).toContain('Normal output');
        } finally {
            emulator.dispose();
        }
    }, 15_000);

    it.each(['redirected', 'no-ui'])('preserves plain stdout/stderr and has no output toggle in %s mode', (mode) => {
        output.isTTY = mode === 'no-ui';
        input.isTTY = mode === 'no-ui';
        const info = jest.spyOn(console, 'info').mockImplementation(() => {});
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        if (mode === 'redirected') {
            handle = renderCoderRunUi(moment());
            handle.startCapturingAgentOutput();
        } else listenForCoderRunControls();
        printLiveScriptChunk('original stdout\n', 'stdout', true);
        printLiveScriptChunk('original stderr\n', 'stderr', true);
        press('o');
        expect(info.mock.calls).toEqual([['original stdout\n']]);
        expect(warn.mock.calls).toEqual([['original stderr\n']]);
        expect(writes).toEqual([]);
    });

    it('preserves stdin pause/stop controls silently when stdout is a pipe', () => {
        output.isTTY = false;
        const log = jest.spyOn(console, 'log').mockImplementation(() => {});
        listenForCoderRunControls();
        press('p');
        press('x');
        expect(getPauseState()).toBe('PAUSING');
        expect(getEndAfterCurrentPromptState()).toBe(true);
        expect(log).not.toHaveBeenCalled();
        expect(writes).toEqual([]);
    });

    it('fits all frame rows to narrow terminals with long Unicode output', () => {
        const state = new CoderRunUiState(moment());
        state.addScriptOutput(`Hello 世界 👩‍💻 ${'x'.repeat(300)}\n`, 'stdout');
        for (const terminalWidth of [1, 4, 6, 20, 32, 55, 80, 96]) {
            const lines = buildCoderRunUiFrame({
                terminalWidth,
                animationFrame: 0,
                animationTimeMs: 0,
                spinner: '*',
                pauseState: 'RUNNING',
                pauseTargetLabel: 'next task',
                isEndAfterCurrentPromptRequested: false,
                config: state.config,
                phase: 'running',
                currentPromptLabel: 'Selected task',
                currentAttempt: 1,
                maxAttempts: 3,
                statusMessage: 'Running',
                detailLines: [],
                agentOutputLines: [],
                errors: [],
                progress: state.getProgress(),
                output: state.output,
                agentVisualLines: ['avatar'.repeat(30)],
            });
            expect(lines.every((line) => visibleLength(line) < terminalWidth)).toBe(true);
            if (terminalWidth >= 20) expect(lines.join('\n')).toContain('[o]');
        }
    });
});
