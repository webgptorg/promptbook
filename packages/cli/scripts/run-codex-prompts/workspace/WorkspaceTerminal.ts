import moment from 'moment';
import { emitKeypressEvents } from 'readline';
import type { RunOptions } from '../cli/RunOptions';
import type { CoderRunControlFeedback } from '../common/CoderRunControlFeedback';
import { renderCoderRunUi } from '../ui/renderCoderRunUi';
import type { WorkspaceState } from './WorkspaceState';

/** Applies durable controls identically in plain and rich terminals, without finite-run global state. */
export function applyWorkspaceTerminalKey(
    state: WorkspaceState,
    key: string | undefined,
): CoderRunControlFeedback | undefined {
    if (key === 'p') {
        const isPaused = !state.getControl().isPaused;
        state.updateControl({ isPaused });
        return {
            controlKey: 'P',
            message: isPaused ? 'Paused; current work finishes, new claims wait.' : 'Resumed.',
            tone: isPaused ? 'warning' : 'success',
        };
    }
    if (key === 's') {
        const isRunning = state.listJobs().some((job) => job.status === 'running');
        state.updateControl({ nextJobAt: 0, isWaitingSkipRequested: isRunning });
        return { controlKey: 'S', message: 'Current waiting skipped.', tone: 'success' };
    }
    if (key === 'x') {
        state.updateControl({ isStopping: true });
        return { controlKey: 'X', message: 'Stopping after current work finishes.', tone: 'warning' };
    }
    return undefined;
}

/** Presents real persistent state using the existing Coder renderer and normal/raw output components. */
export function createWorkspaceTerminal(
    state: WorkspaceState,
    options: RunOptions & { readonly serverUrl: string },
    interrupt: () => void,
) {
    if (options.noUi || !process.stdin.isTTY || !process.stdout.isTTY) {
        if (!process.stdin.isTTY || !process.stdout.isTTY) return { ui: undefined, stop: () => undefined };
        emitKeypressEvents(process.stdin);
        const isPreviouslyRaw = process.stdin.isRaw;
        process.stdin.setRawMode(true);
        /** Answers recognized plain-mode keys with one line and no terminal redraw. */
        const onKey = (_character: string, key: { name?: string; ctrl?: boolean }): void => {
            if (key.ctrl && key.name === 'c') {
                interrupt();
                return;
            }
            const feedback = applyWorkspaceTerminalKey(state, key.name);
            if (feedback) console.info(feedback.message);
        };
        process.stdin.on('keypress', onKey);
        return {
            ui: undefined,
            stop: () => {
                process.stdin.off('keypress', onKey);
                process.stdin.setRawMode(isPreviouslyRaw);
                process.stdin.pause();
            },
        };
    }
    const ui = renderCoderRunUi(moment(), {
        controls: {
            snapshot: () => ({
                pauseState: state.getControl().isPaused ? 'PAUSED' : 'RUNNING',
                pauseTargetLabel: 'claiming new automatic jobs',
                isEndAfterCurrentPromptRequested: state.getControl().isStopping,
            }),
            applyKey: (key) => applyWorkspaceTerminalKey(state, key),
            interrupt,
        },
    });
    /** Refreshes status only; the shared round owns prompt, output, attempts and verification events. */
    const refresh = (): void => {
        const control = state.getControl();
        const jobs = state.listJobs();
        const active = jobs.find((job) => job.status === 'running');
        ui.state.setConfig({
            agentName: active?.harness ?? 'automatic selection',
            localAgentName: active?.agentName,
            modelName: active?.model,
            serverUrl: options.serverUrl,
            priorityFilter: options.priorityFilter,
            testCommand: options.testCommand,
        });
        ui.state.updateProgress({
            done: jobs.filter((job) => job.status === 'completed').length,
            forAgent: jobs.filter((job) => ['ready', 'running'].includes(job.status)).length,
            outsidePriorityRange: 0,
            toBeWritten: jobs.filter((job) => ['blocked', 'failed', 'recovery'].includes(job.status)).length,
        });
        if (!active) {
            ui.state.setPhase(control.isPaused ? 'paused' : 'waiting');
            ui.state.setStatusMessage(
                control.isStopping
                    ? 'Stopping'
                    : control.isPaused
                    ? 'Paused; chat remains available'
                    : 'Watching for ready PRDs and Book changes',
            );
        }
        ui.state.setDetailLines([
            `Git: ${control.synchronization}${control.reason ? ` — ${control.reason}` : ''}`,
            ...jobs
                .filter((job) => job.status !== 'completed')
                .slice(0, 8)
                .map(
                    (job) =>
                        `${job.path} [priority ${job.priority}] ${job.agentName ?? 'unresolved'}: ${job.status}${
                            job.reason ? ` — ${job.reason}` : ''
                        }`,
                ),
        ]);
    };
    refresh();
    const interval = setInterval(refresh, 2_000);
    return {
        ui,
        stop: () => {
            clearInterval(interval);
            ui.cleanup();
        },
    };
}

// Note: [🟡] Workspace terminal presentation is only published in `@promptbook/cli`.
// Note: [💞] Terminal policy and presentation share their durable state adapter.
