import type { Workspace } from './domain.js';
import { serviceCommand, readServiceRecord } from './service.js';
import { createTerminal } from './terminal.js';
import { InputError } from './workspace.js';
import { editTaskFromTerminal } from './edit-task-control.js';

/** Client-only presentation options never configure or start the project's service. @private */
export interface AttachedDashboardOptions {
    raw?: boolean;
    interactive?: boolean;
    signal?: AbortSignal;
    input?: NodeJS.ReadStream;
    output?: NodeJS.WriteStream;
    pollIntervalMs?: number;
    command?: typeof serviceCommand;
}

/** Bound a single observed item while making omitted evidence explicit. */
function bounded(value: unknown, limit = 8000): string {
    const text = typeof value === 'string' ? value : JSON.stringify(value) ?? String(value);
    return text.length > limit ? `${text.slice(0, limit - 40)}\n[ptbk] … output truncated …` : text;
}

/** Observe one authenticated service until it ends or this client leaves, without owning execution. @private */
export async function attachDashboard(workspace: Workspace, options: AttachedDashboardOptions = {}): Promise<void> {
    const input = options.input ?? process.stdin;
    const output = options.output ?? process.stdout;
    const command = options.command ?? serviceCommand;
    const interval = options.pollIntervalMs ?? 1000;
    if (!Number.isFinite(interval) || interval < 10 || interval > 60_000) throw new InputError('Dashboard refresh interval must be between 10 and 60000 milliseconds.');
    if (options.signal?.aborted) return;
    const interactive = !options.raw && options.interactive !== false && Boolean(input.isTTY && output.isTTY) && process.env.TERM !== 'dumb';
    let first;
    try { first = await command(workspace, 'inspect'); }
    catch (error) { throw new InputError(`Cannot attach to the selected project service: ${(error as Error).message}\nInspect ptbk status --path ${JSON.stringify(workspace.projectPath)} before reconnecting. No worker was started.`); }
    if (options.signal?.aborted) return;
    if (!first) {
        const record = options.command ? undefined : await readServiceRecord(workspace);
        throw new InputError(`${record?.status === 'stopped' || record?.desired === 'stopped' ? 'The selected project service is stopped.' : 'No reachable service is running for the selected project.'} Start it with ptbk start --path ${JSON.stringify(workspace.projectPath)}, then reopen ptbk dashboard. No worker was started.`);
    }
    if (typeof first.id !== 'string' || typeof first.pid !== 'number' || first.project !== workspace.projectPath) throw new InputError('Dashboard process identity could not be verified for the selected project. Inspect ptbk status before reconnecting.');
    const identity = { id: first.id, pid: first.pid };
    let closed = false;
    let ending = 'Dashboard closed; the service continues independently.';
    let latest = first as Record<string, any>;
    let wake: (() => void) | undefined;
    let activeControl = false;
    let stateSignature = '';
    let eventKeys = new Set<string>();
    /** A client close wakes observation without sending a service-stop command. */
    const leave = () => { closed = true; wake?.(); };
    /** Pin all further reads and mutations to the initially verified process, including after restart. */
    const send = async (action: string, value: Record<string, unknown> = {}): Promise<Record<string, unknown> | undefined> => command(workspace, action, value, identity);
    /** Await the next refresh or a client-only interruption without retaining timers. */
    const wait = (): Promise<void> => new Promise(resolve => {
        const timer = setTimeout(done, interval);
        /** A single cleanup path serves timer, signal, keyboard and terminal disconnect. */
        function done(): void { clearTimeout(timer); wake = undefined; resolve(); }
        wake = done;
        if (closed) done();
    });
    const terminal = createTerminal(interactive, leave, workspace.projectPath, {
        input, output, attached: true,
        async onControl(action) {
            if (activeControl || closed) return;
            activeControl = true;
            try {
                if (action === 'requests') {
                    const requests = (latest.requests || []) as Array<Record<string, any>>;
                    if (!requests.length) { terminal.status('There are no pending human requests.'); return; }
                    const id = await terminal.choose('Choose a pending request to answer:', [...requests.map(request => ({ value: String(request.id), label: String(request.prompt), description: String(request.reason || '') })), { value: '@cancel', label: 'Leave requests pending' }]);
                    const request = requests.find(item => item.id === id);
                    if (!request || closed) return;
                    const response = Array.isArray(request.choices) && request.choices.length
                        ? request.choices[Number(await terminal.choose(request.prompt, request.choices.map((label: string, index: number) => ({ value: String(index), label }))))]
                        : await terminal.question(`${request.prompt}\nAnswer (blank leaves the request pending):`);
                    if (response.trim() && !closed) { await send('answer', { id, response }); terminal.status('Answer accepted by the service.'); }
                } else if (action === 'edit-task') {
                    await editTaskFromTerminal(terminal, latest, send);
                } else if (action === 'settings') {
                    const capabilities = latest.settingsCapabilities || {};
                    const value = await terminal.question(`Temporary runtime settings as JSON (blank to cancel).\nActive: ${bounded(latest.settings || {}, 3000)}\nLive: ${(capabilities.live || []).join(', ')}\nRestart required: ${(capabilities.requiresRestart || []).join(', ')}\n${capabilities.units || ''}`);
                    if (value.trim() && !closed) {
                        const result = await send('settings', { settings: JSON.parse(value) });
                        terminal.status(`Settings outcome: ${bounded(result)}`);
                    }
                } else if (action === 'inventory') {
                    let more = false;
                    while (!closed) {
                        const catalog = await send('harnesses', { more });
                        if (!catalog) throw new Error('Service disconnected while inspecting harnesses.');
                        const entries = (more ? catalog.more : catalog.featured) as Array<Record<string, any>> || [];
                        const picked = await terminal.choose(more ? 'All harnesses:' : 'Featured harnesses:', [...entries.map(item => ({ value: String(item.name || item.id), label: String(item.displayName || item.name || item.id) })),
                            { value: more ? '@featured' : '@more', label: more ? 'Back to featured' : 'More harnesses' }, { value: '@cancel', label: 'Return to dashboard' }]);
                        if (picked === '@cancel') break;
                        if (picked === '@more' || picked === '@featured') { more = picked === '@more'; continue; }
                        const detail = await send('harnesses', { name: picked });
                        await terminal.choose(`Harness details:\n${bounded(detail, 5000)}`, [{ value: '@back', label: 'Back to harnesses' }]);
                    }
                } else {
                    const result = await send(action);
                    if (!result) throw new Error('Service disconnected before the control outcome was received.');
                    terminal.status(`${action}: ${bounded(result)}`);
                }
            } catch (error) {
                if ((error as Error).name !== 'AbortError' && !closed) terminal.status(`Control failed: ${(error as Error).message}`);
            } finally { activeControl = false; }
        },
    });
    /** Present observed state and newly exposed evidence without replaying the retained history. */
    const present = (snapshot: Record<string, any>): void => {
        latest = snapshot;
        terminal.setSnapshot({ ...snapshot, connection: 'live' });
        const tasks = (snapshot.tasks || []) as Array<Record<string, any>>;
        const requests = (snapshot.requests || []) as Array<Record<string, any>>;
        const current = tasks.find(task => task.id === snapshot.currentTask);
        const selection = snapshot.currentSelection || current || {};
        const signature = JSON.stringify([snapshot.status, snapshot.phase, snapshot.paused, snapshot.pausePending, snapshot.waiting, snapshot.currentTask, selection, snapshot.statistics, snapshot.finishAfterTask, tasks.map(task => [task.id, task.status, task.eligibility]), requests.map(request => request.id), snapshot.pendingSettings, snapshot.restartSettings, snapshot.error]);
        if (!interactive && signature !== stateSignature) {
            terminal.status(`Promptbook ${snapshot.engineVersion || 'version unavailable'} · ${workspace.projectPath} · ${snapshot.mode || 'unknown mode'} · live\nState: ${snapshot.status || 'unknown'}${snapshot.pausePending ? ' · pause pending' : snapshot.paused ? ' · paused' : ''}${snapshot.waiting ? ' · pacing/backoff wait' : ''}${snapshot.finishAfterTask ? ' · finish after current task' : ''}\nPhase: ${snapshot.phase || 'not reported'}\nTask: ${current?.title || snapshot.currentTask || 'idle'} · Agent: ${selection.agent || 'none'} · Harness: ${selection.harness || 'none'}${selection.model ? ` · Model: ${selection.model}` : ''}${selection.thinkingLevel ? ` · Effort: ${selection.thinkingLevel}` : ''}\nQueue: ${tasks.length} · Results: ${snapshot.statistics?.completed ?? 0} completed, ${snapshot.statistics?.failed ?? 0} failed\nRequests: ${requests.length}${requests.length ? ` · answer with ptbk answer --path ${JSON.stringify(workspace.projectPath)}` : ''}${snapshot.error ? `\nFailure: ${bounded(snapshot.error)}\nNext: ${snapshot.nextAction || 'Inspect ptbk status and recovery evidence.'}${snapshot.diagnostic ? `\nDiagnostic: ${snapshot.diagnostic}` : ''}` : ''}`);
        }
        stateSignature = signature;
        const events = (snapshot.events || []) as Array<Record<string, any>>;
        const retained = events.slice(-160);
        if (!eventKeys.size && events.length > 160) terminal.status('Earlier activity was truncated; showing the latest 160 exposed events.');
        for (const event of retained) {
            const key = JSON.stringify(event);
            if (!eventKeys.has(key)) {
                const text = bounded(event.message ?? 'No message was reported.');
                if (event.type === 'output') terminal.output(`${text}\n`);
                else terminal.status(`[${event.type || 'activity'}] ${text}`);
            }
        }
        eventKeys = new Set(retained.map(event => JSON.stringify(event)));
    };
    input.once('end', leave); input.once('close', leave); output.once('close', leave);
    options.signal?.addEventListener('abort', leave, { once: true });
    process.once('SIGINT', leave); process.once('SIGTERM', leave);
    try {
        present(first);
        while (!closed) {
            if (['stopped', 'interrupted'].includes(String(latest.status))) { ending = `Service ${latest.status}; dashboard observation ended. Inspect ptbk status before starting again.`; break; }
            await wait();
            if (closed) break;
            let snapshot;
            try { snapshot = await send('inspect'); }
            catch (error) { ending = `Dashboard connection lost: ${(error as Error).message}\nNext: inspect ptbk status --path ${JSON.stringify(workspace.projectPath)} and reconnect. No replacement service was started.`; break; }
            if (closed) break;
            if (!snapshot) {
                const record = options.command ? undefined : await readServiceRecord(workspace).catch(() => undefined);
                ending = record?.status === 'stopped' || record?.desired === 'stopped'
                    ? 'Service stopped; dashboard observation ended.'
                    : `Dashboard connection lost; live activity is no longer available.\nNext: inspect ptbk status --path ${JSON.stringify(workspace.projectPath)} and reconnect. No replacement service was started.`;
                break;
            }
            if (snapshot.id !== identity.id || snapshot.pid !== identity.pid || snapshot.project !== workspace.projectPath) { ending = 'Service identity changed; this dashboard has disconnected. Reopen ptbk dashboard to inspect the replacement process. No controls were sent to it.'; break; }
            present(snapshot);
        }
    } finally {
        closed = true; wake?.(); terminal.close();
        input.removeListener('end', leave); input.removeListener('close', leave); output.removeListener('close', leave);
        options.signal?.removeEventListener('abort', leave);
        process.removeListener('SIGINT', leave); process.removeListener('SIGTERM', leave);
        terminal.status(ending);
    }
}
