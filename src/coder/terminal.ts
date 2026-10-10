import { emitKeypressEvents } from 'node:readline';
import { redactSecrets } from './harness.js';

/** Injectable streams permit deterministic control and resize fixtures. @private */
export interface TerminalSurface { input?: NodeJS.ReadStream; output?: NodeJS.WriteStream }

/** Removes cursor controls from structured output and scrollback previews. @private */
function plain(text: string): string {
    return text.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '');
}

/** Formats complete provider JSON lines without exposing transport fragments. @private */
function normalLine(line: string): string {
    try {
        const event = JSON.parse(line) as Record<string, any>;
        const item = event.item ?? {};
        if (item.type === 'agent_message' && typeof item.text === 'string') return `[agent] ${item.text}\n`;
        if (event.type === 'assistant' && Array.isArray(event.message?.content)) {
            return event.message.content.map((part: Record<string, any>) => part.type === 'text' ? `[agent] ${part.text}\n` : part.type === 'tool_use' ? `[tool] ${part.name}\n` : '').join('');
        }
        if (item.type === 'command_execution') return `[command] ${item.command ?? ''}${item.exit_code === undefined ? '' : ` (exit ${item.exit_code})`}\n${item.aggregated_output ?? ''}\n`;
        if (item.type === 'file_change') return `[files] ${JSON.stringify(item.changes ?? [])}\n`;
        if (item.type === 'mcp_tool_call') return `[tool] ${item.server ?? ''}/${item.tool ?? ''}: ${item.status ?? event.type}\n`;
        if (event.type?.includes('fail') || event.type === 'error' || event.is_error) return `[error] ${event.message ?? event.error?.message ?? line}\n`;
        if (event.type === 'result') return `[result] ${event.result ?? event.subtype ?? 'completed'}\n`;
        return `[provider] ${line}\n`;
    } catch { return `${line}\n`; }
}

/** Bounded Normal/raw renderer; controls never restart or own the task engine.
 * @private Internal terminal presentation.
 */
export function createTerminal(enabled: boolean, cancel: () => void, projectPath: string, surface: TerminalSurface = {}): {
    isPaused(): boolean; shouldStop(): boolean; skipWait(): boolean; setWaiting(waiting: boolean): void;
    output(chunk: string): void; status(text: string): void; close(): void;
} {
    const input = surface.input ?? process.stdin;
    const output = surface.output ?? process.stdout;
    const interactive = Boolean(enabled && input.isTTY && output.isTTY);
    const originalRaw = input.isRaw;
    let isPaused = false;
    let isStopping = false;
    let isWaiting = false;
    let isSkipRequested = false;
    let isRaw = false;
    let scroll = 0;
    let viewingHistory = false;
    let rawSize = 0;
    let normalCarry = '';
    let closed = false;
    const rawChunks: string[] = [];
    const normalItems: string[] = [];
    /** Prints at most one screen, independent of total retained history. */
    const renderHistory = () => {
        if (!interactive || !viewingHistory) return;
        const entries = isRaw ? rawChunks : normalItems;
        const height = Math.max(1, (output.rows || 24) - 2);
        const width = Math.max(10, output.columns || 80);
        const rows: string[] = [];
        for (let index = entries.length - 1 - scroll; index >= 0 && rows.length < height; index--) {
            const lines = plain(entries[index]!).split('\n');
            if (lines.at(-1) === '') lines.pop();
            for (let line = lines.length - 1; line >= 0 && rows.length < height; line--) rows.unshift(lines[line]!.slice(0, width));
        }
        const heading = `[ptbk] ${isRaw ? 'Raw' : 'Normal'} history · End to follow live`.slice(0, width);
        output.write(`\u001b[H\u001b[2J${heading}\n${rows.join('\n')}\n`);
    };
    /** Records bounded normal items and visibly marks oversized content. */
    const rememberNormal = (text: string) => {
        const bounded = text.length > 8000 ? `${text.slice(0, 7960)}\n[ptbk] … output truncated …\n` : text;
        normalItems.push(bounded);
        if (normalItems.length > 160) normalItems.shift();
        return bounded;
    };
    /** Separates coder messages from provider output. */
    const status = (text: string) => {
        const safe = rememberNormal(`[ptbk] ${plain(redactSecrets(text, projectPath))}\n`);
        if (viewingHistory) renderHistory(); else output.write(safe);
    };
    /** Buffers partial lines so Normal mode does not print split JSON. */
    const consumeNormal = (flush = false) => {
        let boundary: number;
        while ((boundary = normalCarry.indexOf('\n')) >= 0) {
            const line = normalCarry.slice(0, boundary);
            normalCarry = normalCarry.slice(boundary + 1);
            if (!line) continue;
            const formatted = rememberNormal(plain(normalLine(line)));
            if (!isRaw && !viewingHistory) output.write(formatted);
        }
        if (normalCarry.length > 8000 || flush && normalCarry) {
            const formatted = rememberNormal(plain(normalLine(normalCarry)));
            normalCarry = '';
            if (!isRaw && !viewingHistory) output.write(formatted);
        }
    };
    /** Controls state only; the engine applies requests at safe boundaries. */
    const keypress = (_text: string, key: { name?: string; ctrl?: boolean }) => {
        if (key.ctrl && key.name === 'c') { cancel(); return; }
        if (key.name === 'p') { isPaused = !isPaused; status(isPaused ? 'Pause requested; current phase will finish safely.' : 'Resumed.'); }
        else if (key.name === 'x') { isStopping = !isStopping; status(isStopping ? 'Will exit after the current task.' : 'Exit request cancelled.'); }
        else if (key.name === 's') {
            isSkipRequested = isWaiting;
            status(isWaiting ? 'Skipping the current pacing/backoff wait; scheduled eligibility still applies.' : 'There is no pacing/backoff wait to skip now.');
        } else if (key.name === 'o') { isRaw = !isRaw; status(`${isRaw ? 'Raw' : 'Normal'} output selected.`); }
        else if (key.name === 'up' || key.name === 'down' || key.name === 'end') {
            const entries = isRaw ? rawChunks : normalItems;
            scroll = key.name === 'end' ? 0 : Math.max(0, Math.min(entries.length - 1, scroll + (key.name === 'up' ? 1 : -1)));
            if (scroll && !viewingHistory) { viewingHistory = true; output.write('\u001b[?1049h'); }
            if (!scroll) {
                if (viewingHistory) { viewingHistory = false; output.write('\u001b[?1049l'); }
                status('Following live output.');
            } else renderHistory();
        }
    };
    if (interactive) {
        emitKeypressEvents(input);
        input.setRawMode(true);
        input.resume();
        input.on('keypress', keypress);
        output.on('resize', renderHistory);
        status('Controls: P pause, S skip wait, X finish and exit, O normal/raw, arrows scroll, End live.');
    }
    return {
        isPaused: () => isPaused, shouldStop: () => isStopping,
        setWaiting(waiting) { isWaiting = waiting; if (!waiting) isSkipRequested = false; },
        skipWait: () => { const skip = isWaiting && isSkipRequested; isSkipRequested = false; return skip; },
        status,
        output(chunk) {
            const safe = redactSecrets(chunk, projectPath);
            if (!interactive) { output.write(safe); return; }
            const bounded = safe.length > 8000 ? `… output truncated …\n${safe.slice(-7960)}` : safe;
            rawChunks.push(bounded); rawSize += bounded.length;
            while (rawSize > 256000 || rawChunks.length > 2048) rawSize -= rawChunks.shift()!.length;
            normalCarry += safe;
            consumeNormal();
            if (isRaw && !viewingHistory) output.write(safe);
        },
        close() {
            if (closed) return;
            closed = true;
            if (interactive) {
                consumeNormal(true);
                input.removeListener('keypress', keypress);
                output.removeListener('resize', renderHistory);
                if (viewingHistory) output.write('\u001b[?1049l');
                input.setRawMode(Boolean(originalRaw)); input.pause();
            }
        },
    };
}
