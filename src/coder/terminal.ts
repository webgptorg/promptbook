import { emitKeypressEvents } from 'node:readline';
import { redactSecrets } from './harness.js';
import { promptText } from './interactive.js';
import { promptChoice, promptChoices } from './choices.js';

/** Injectable streams permit deterministic control and resize fixtures. @private */
export interface TerminalSurface {
    input?: NodeJS.ReadStream; output?: NodeJS.WriteStream;
    onControl?: (action: 'pause' | 'resume' | 'finish' | 'skip-wait' | 'requests' | 'settings', value?: boolean) => void | Promise<void>;
}

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
    setPaused(paused: boolean): void; setStopping(stopping: boolean): void; question(prompt: string): Promise<string>;
    choose(prompt: string, choices: Parameters<typeof promptChoice>[1], initial?: string): Promise<string>;
    chooseMany(prompt: string, choices: Parameters<typeof promptChoices>[1], initial?: string[]): Promise<string[]>;
    setSnapshot(snapshot: Record<string, unknown>): void;
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
    let closed = false; let questioning = false;
    let snapshot: Record<string, any> | undefined; let dashboardActive = false;
    let viewingDetails = false;
    let activeQuestion: AbortController | undefined;
    const rawChunks: string[] = [];
    const normalItems: string[] = [];
    /** Fit text to visible cells while preserving all remaining detail in activity history. */
    const fit = (text: string, width: number): string[] => {
        const rows: string[] = [];
        for (const line of plain(text).split('\n')) {
            const glyphs = [...line];
            if (!glyphs.length) rows.push('');
            else for (let index = 0; index < glyphs.length; index += width) rows.push(glyphs.slice(index, index + width).join(''));
        }
        return rows;
    };
    /** Render stable live regions from the shared runtime snapshot, without imagined progress. */
    const renderDashboard = () => {
        if (!interactive || !snapshot || isRaw || questioning || closed) return;
        if (!dashboardActive) { dashboardActive = true; output.write('\u001b[?1049h\u001b[?25l'); }
        const width = Math.max(8, output.columns || 80); const height = Math.max(4, output.rows || 24);
        const tasks = (snapshot.tasks || []) as Array<Record<string, any>>;
        const current = tasks.find(task => task.id === snapshot!.currentTask);
        const selection = snapshot.currentSelection || current || snapshot.settings || {};
        const stats = snapshot.statistics || {};
        const requests = (snapshot.requests || []) as Array<Record<string, any>>;
        const state = `${snapshot.status || 'starting'}${snapshot.pausePending ? ' · pause pending' : snapshot.paused || isPaused ? ' · paused' : ''}${isStopping ? ' · finish after task' : ''}`;
        const taskLimit = Math.max(1, Math.min(5, Math.floor(height / 4)));
        const sections = [
            `Promptbook ${snapshot.engineVersion || 'version unavailable'} · ${snapshot.mode || 'interactive'}`,
            `Project: ${snapshot.project || projectPath}`,
            `State: ${state}${snapshot.phase ? ` · phase: ${snapshot.phase}` : ''}${snapshot.waiting || isWaiting ? ' · pacing/backoff wait' : ''}`,
            `Agent: ${selection.agent || 'none'} · Harness: ${selection.harness || 'none'}${selection.model ? ` · Model: ${selection.model}` : ''}${selection.thinkingLevel ? ` · Effort: ${selection.thinkingLevel}` : ''}`,
            `Task: ${current?.title || snapshot.currentTask || 'idle'} · ${stats.completed ?? 0} completed · ${stats.failed ?? 0} failed`,
            `Queue (${tasks.length}): ${tasks.length ? '' : 'No queued work.'}`,
            ...tasks.slice(0, viewingDetails ? 200 : taskLimit).map(task => `${task.id === snapshot!.currentTask ? '> ' : '  '}${task.title} · ${task.status}${task.eligibility?.kind ? ` · ${task.eligibility.kind}${viewingDetails ? `: ${task.eligibility.reason}` : ''}` : ''}`),
            ...(tasks.length > (viewingDetails ? 200 : taskLimit) ? [`  … ${tasks.length - (viewingDetails ? 200 : taskLimit)} more; inspect task details with ptbk show or the page.`] : []),
            `Requests (${requests.length}): ${requests[0]?.prompt || 'none'}${requests.length > 1 ? ` · ${requests.length - 1} more` : ''}`,
            ...(snapshot.error ? [`Failure: ${snapshot.error}`, `Next: ${snapshot.nextAction || 'inspect ptbk recover and the task diagnostics before resuming.'}`, ...(snapshot.diagnostic ? [`Diagnostic: ${snapshot.diagnostic}`] : [])] : []),
        ].flatMap(line => fit(line, width));
        const controls = width >= 80 ? 'P pause · S skip · X exit/cancel · O raw · ↑↓ scroll · End follow · D details · Q requests · C settings'
            : width >= 48 ? 'P pause S skip X exit O raw D details Q answer C settings'
            : 'P S X O D Q C · ↑↓ End';
        if (viewingDetails) {
            const detail = [...sections, ...requests.map(request => `Request ${request.id}: ${request.prompt}`)].flatMap(line => fit(line, width));
            scroll = Math.min(Math.max(0, detail.length - Math.max(1, height - 2)), scroll);
            output.write(`\u001b[H\u001b[2J${[`Promptbook ${snapshot.engineVersion || 'version unavailable'} · Details`.slice(0, width), ...detail.slice(scroll, scroll + Math.max(1, height - 2)), controls.slice(0, width)].join('\r\n')}`);
            return;
        }
        const content = sections.slice(0, Math.max(1, height - 4));
        const remaining = Math.max(0, height - content.length - 2);
        const activity = normalItems.flatMap(item => fit(item.trimEnd(), width));
        const end = Math.max(0, activity.length - scroll);
        const visible = activity.slice(Math.max(0, end - Math.max(0, remaining - 1)), end);
        output.write(`\u001b[H\u001b[2J${[...content, `${scroll ? 'Activity history' : 'Activity'}${scroll ? ' · End to follow live' : ''}:`, ...visible, controls.slice(0, width)].slice(0, height).join('\r\n')}`);
    };
    /** Prints at most one screen, independent of total retained history. */
    const renderHistory = () => {
        if (questioning || closed) return;
        if (snapshot && !isRaw) { renderDashboard(); return; }
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
        if (questioning) return;
        if (interactive && snapshot && !isRaw) renderDashboard(); else if (viewingHistory) renderHistory(); else output.write(safe);
    };
    /** Buffers partial lines so Normal mode does not print split JSON. */
    const consumeNormal = (flush = false) => {
        let boundary: number;
        while ((boundary = normalCarry.indexOf('\n')) >= 0) {
            const line = normalCarry.slice(0, boundary);
            normalCarry = normalCarry.slice(boundary + 1);
            if (!line) continue;
            const formatted = rememberNormal(plain(normalLine(line)));
            if (!isRaw && !viewingHistory && !questioning && !snapshot) output.write(formatted);
            else if (snapshot && !questioning) renderDashboard();
        }
        if (normalCarry.length > 8000 || flush && normalCarry) {
            const formatted = rememberNormal(plain(normalLine(normalCarry)));
            normalCarry = '';
            if (!isRaw && !viewingHistory && !questioning && !snapshot) output.write(formatted);
            else if (snapshot && !questioning) renderDashboard();
        }
    };
    /** Forward a shortcut into shared process controls while retaining finite local controls. */
    const control = (action: Parameters<NonNullable<TerminalSurface['onControl']>>[0], value?: boolean) => {
        if (!surface.onControl) return;
        void Promise.resolve().then(() => surface.onControl!(action, value)).catch(error => status(`Control failed: ${(error as Error).message}`));
    };
    /** Suspend runtime shortcuts and output for an editor or picker, then restore the live view. */
    const interact = async <T>(entry: (signal: AbortSignal) => Promise<T>): Promise<T> => {
        if (!interactive || closed) throw new Error('Terminal questions require an active interactive terminal.');
        if (questioning) throw new Error('A terminal question is already active.');
        questioning = true; activeQuestion = new AbortController();
        input.removeListener('keypress', keypress);
        if (dashboardActive) { dashboardActive = false; output.write('\u001b[?25h\u001b[?1049l'); }
        else if (viewingHistory) output.write('\u001b[?1049l');
        try { return await entry(activeQuestion.signal); }
        finally {
            activeQuestion = undefined; questioning = false;
            if (!closed) {
                input.setRawMode(true); input.resume(); input.on('keypress', keypress);
                if (viewingHistory) { output.write('\u001b[?1049h'); renderHistory(); } else renderDashboard();
            } else { input.setRawMode(Boolean(originalRaw)); input.pause(); }
        }
    };
    /** Keep provider-controlled labels and descriptions safe while preserving opaque option values. */
    const safeChoices = (choices: Parameters<typeof promptChoice>[1]): Parameters<typeof promptChoice>[1] => choices.map(choice => ({
        ...choice,
        label: plain(redactSecrets(choice.label, projectPath)),
        ...(choice.description ? { description: plain(redactSecrets(choice.description, projectPath)) } : {}),
    }));
    /** Give every freeform request the shared multiline composer while isolating runtime output. */
    const question = (prompt: string): Promise<string> => interact(signal => promptText(plain(redactSecrets(prompt, projectPath)), { input, output, signal, onInterrupt: cancel }));
    /** Present a labeled finite decision without requiring the user to transcribe its value. */
    const choose = (prompt: string, choices: Parameters<typeof promptChoice>[1], initial?: string): Promise<string> => interact(signal => promptChoice(plain(redactSecrets(prompt, projectPath)), safeChoices(choices), { input, output, signal, initial, onInterrupt: cancel }));
    /** Present independent predefined selections through the same suspended terminal session. */
    const chooseMany = (prompt: string, choices: Parameters<typeof promptChoices>[1], initial?: string[]): Promise<string[]> => interact(signal => promptChoices(plain(redactSecrets(prompt, projectPath)), safeChoices(choices), { input, output, signal, initial, onInterrupt: cancel }));
    /** Controls state only; the engine applies requests at safe boundaries. */
    const keypress = (_text: string, key: { name?: string; ctrl?: boolean }) => {
        if (questioning || closed) return;
        if (key.ctrl && key.name === 'c') { cancel(); return; }
        if (key.name === 'p') { isPaused = !isPaused; control(isPaused ? 'pause' : 'resume', isPaused); status(isPaused ? 'Pause requested; current phase will finish safely.' : 'Resumed.'); }
        else if (key.name === 'x') { isStopping = !isStopping; control('finish', isStopping); status(isStopping ? 'Will exit after the current task.' : 'Exit request cancelled.'); }
        else if (key.name === 's') {
            isSkipRequested = isWaiting; if (isWaiting) control('skip-wait', true);
            status(isWaiting ? 'Skipping the current pacing/backoff wait; scheduled eligibility still applies.' : 'There is no pacing/backoff wait to skip now.');
        } else if (key.name === 'q' && surface.onControl) { control('requests'); }
        else if (key.name === 'c' && surface.onControl) { control('settings'); }
        else if (key.name === 'o') {
            isRaw = !isRaw;
            if (isRaw && dashboardActive) { dashboardActive = false; output.write('\u001b[?25h\u001b[?1049l'); }
            status(`${isRaw ? 'Raw' : snapshot ? 'Dashboard' : 'Normal'} output selected.`);
        }
        else if (key.name === 'd' && snapshot && !isRaw) { viewingDetails = !viewingDetails; scroll = 0; renderDashboard(); }
        else if (key.name === 'up' || key.name === 'down' || key.name === 'end') {
            const entries = isRaw ? rawChunks : normalItems;
            const maximum = snapshot && !isRaw ? viewingDetails ? 10000 : normalItems.flatMap(item => fit(item.trimEnd(), Math.max(8, output.columns || 80))).length - 1 : entries.length - 1;
            const direction = viewingDetails ? key.name === 'down' ? 1 : -1 : key.name === 'up' ? 1 : -1;
            scroll = key.name === 'end' ? 0 : Math.max(0, Math.min(maximum, scroll + direction));
            if (snapshot && !isRaw) { renderDashboard(); return; }
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
        status(`Controls: P pause, S skip wait, X finish and exit, O normal/raw, arrows scroll, End live.${surface.onControl ? ' Q requests, C settings.' : ''}`);
    }
    return {
        isPaused: () => isPaused, shouldStop: () => isStopping, question, choose, chooseMany,
        setSnapshot(value) { snapshot = value; renderDashboard(); },
        setPaused(value) { isPaused = value; renderDashboard(); }, setStopping(value) { isStopping = value; renderDashboard(); },
        setWaiting(waiting) { isWaiting = waiting; if (!waiting) isSkipRequested = false; renderDashboard(); },
        skipWait: () => { const skip = isWaiting && isSkipRequested; isSkipRequested = false; return skip; },
        status,
        output(chunk) {
            const safe = redactSecrets(chunk, projectPath);
            if (!interactive) { output.write(plain(safe)); return; }
            const bounded = safe.length > 8000 ? `… output truncated …\n${safe.slice(-7960)}` : safe;
            rawChunks.push(bounded); rawSize += bounded.length;
            while (rawSize > 256000 || rawChunks.length > 2048) rawSize -= rawChunks.shift()!.length;
            normalCarry += safe;
            consumeNormal();
            if (isRaw && !viewingHistory && !questioning) output.write(safe);
        },
        close() {
            if (closed) return;
            closed = true; activeQuestion?.abort();
            if (interactive) {
                consumeNormal(true);
                input.removeListener('keypress', keypress);
                output.removeListener('resize', renderHistory);
                if (dashboardActive) output.write('\u001b[?25h\u001b[?1049l');
                if (viewingHistory) output.write('\u001b[?1049l');
                input.setRawMode(Boolean(originalRaw)); input.pause();
            }
        },
    };
}
