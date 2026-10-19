import { formatShortTime } from '../common/time.js';
import type { BrowserDetailView, ExecutionContextView, ExecutionDetailView, ServiceSnapshot } from '../engine/snapshot.js';
import type { Style } from './ansi.js';

/**
 * One lifecycle action offered for the current service state (terminal key, CLI command and API action).
 *
 * @private service controls view
 */
export type LifecycleActionView = { readonly key: string; readonly label: string; readonly command: string; readonly action: string; readonly confirm?: string };

/**
 * What the current service state means, including a pending intent and whether work is still draining.
 *
 * @private service controls view
 */
export function lifecycleExplanation(snapshot: ServiceSnapshot): string {
    const { state, lifecycle } = snapshot.service;
    const task = snapshot.current ? `"${snapshot.current.taskTitle}"` : 'the current task';
    switch (state) {
        case 'running':
            return snapshot.current ? 'new tasks start when ready' : 'idle is normal; new tasks start when ready';
        case 'pausing':
            return `${task} finishes first, then no task starts until resumed`;
        case 'pause':
            return 'alive and controllable; no task runs or starts';
        case 'stopping':
            if (lifecycle?.intent === 'force-stop') return 'force stop: owned work is being interrupted (recoverable)';
            if (lifecycle?.shutdown) return lifecycle.intent === 'restart' ? 'shutting down for a restart (one replacement starts next)' : 'shutting down';
            return `${task} finishes first, then the service ${lifecycle?.intent === 'restart' ? 'restarts (exactly one replacement)' : 'exits'}`;
        case 'stopped':
            return 'no engine is running (an observation, not a live state)';
        case 'finished':
            return 'the finite run ended';
    }
}

/**
 * Human description of the live service state with its pending intent (never a fifth `stopped` live state).
 *
 * @private service controls view
 */
export function lifecycleSummary(snapshot: ServiceSnapshot): string {
    return `${snapshot.service.state} — ${lifecycleExplanation(snapshot)}`;
}

/**
 * The lifecycle actions applicable in the current state, shared by the terminal panel, browser and one-shot hints.
 *
 * @private service controls view
 */
export function lifecycleActions(snapshot: ServiceSnapshot): LifecycleActionView[] {
    const { state, lifecycle, mode } = snapshot.service;
    if (state === 'stopped' || state === 'finished') return [{ key: '', label: 'start', command: 'ptbk start', action: '' }];
    const actions: LifecycleActionView[] = [];
    const restartable = lifecycle?.restartable ?? mode !== 'run';
    if (state === 'running') actions.push({ key: 'P', label: 'pause', command: 'ptbk pause', action: 'pause' });
    if (state === 'pause') actions.push({ key: 'P', label: 'resume', command: 'ptbk resume', action: 'resume' });
    if (state === 'pausing') actions.push({ key: 'U', label: 'cancel pause', command: 'ptbk resume', action: 'resume' });
    if (state === 'stopping' && lifecycle?.cancellable) {
        actions.push({ key: 'U', label: `cancel ${lifecycle.intent === 'restart' ? 'restart' : 'stop'}`, command: 'ptbk resume', action: 'resume' });
        actions.push({ key: 'P', label: 'pause instead', command: 'ptbk pause', action: 'pause', confirm: `Cancel the pending ${lifecycle.intent === 'restart' ? 'restart' : 'stop'} and pause instead?` });
    }
    if (state !== 'stopping' || (lifecycle?.intent === 'restart' && lifecycle.cancellable)) actions.push({ key: 'X', label: state === 'pausing' ? 'stop instead of pause' : 'stop (graceful)', command: 'ptbk stop', action: 'stop' });
    if (restartable && state !== 'stopping') actions.push({ key: 'R', label: 'restart', command: 'ptbk restart', action: 'restart', confirm: 'Restart the service? The current task finishes first; then exactly one replacement starts with the same configuration.' });
    if (lifecycle?.intent !== 'force-stop') actions.push({ key: 'F', label: 'force stop', command: 'ptbk stop --force', action: 'force-stop', confirm: 'Force stop now? Owned work is interrupted immediately (recoverable, never marked done).' });
    return actions;
}

/**
 * Human label of a model in one execution context.
 *
 * @private execution details view
 */
export function modelLabel(model: ExecutionContextView['model']): string {
    switch (model.status) {
        case 'reported':
            return `${model.value} (reported by the harness)`;
        case 'requested':
            return `${model.value} (requested; not yet confirmed by the harness)`;
        case 'automatic':
            return 'automatic — harness default, concrete model not reported';
        case 'unknown':
            return 'unknown — not reported';
    }
}

/**
 * Human label of a thinking level in one execution context, in the harness's own terminology.
 *
 * @private execution details view
 */
export function thinkingLabel(thinking: ExecutionContextView['thinkingLevel']): string {
    const term = thinking.term ? ` — ${thinking.term}` : '';
    switch (thinking.status) {
        case 'requested':
            return `${thinking.value}${term}`;
        case 'automatic':
            return `automatic (harness default, level not reported)${term}`;
        case 'not-applicable':
            return 'not applicable — this harness has no thinking-level setting';
        case 'unknown':
            return thinking.value ? `${thinking.value} (unverified)` : 'unknown — not reported';
    }
}

/**
 * Compact one-line configuration of the task's own execution context: agent, harness, model and thinking level.
 *
 * @private execution details view
 */
export function executionOneLine(execution: ExecutionDetailView): string {
    const own = execution.contexts.find((context) => context.role === 'task') ?? execution.contexts[0];
    if (!own) return `Agent ${execution.agent.name}`;
    const model = own.model.value ? `${own.model.value}${own.model.status === 'reported' ? '' : ` (${own.model.status})`}` : own.model.status === 'automatic' ? 'automatic model' : 'model unknown';
    const thinking = own.thinkingLevel.status === 'requested' ? `${own.thinkingLevel.term?.split(' (')[0] ?? 'thinking'} ${own.thinkingLevel.value}` : own.thinkingLevel.status === 'not-applicable' ? 'thinking n/a' : `thinking ${own.thinkingLevel.status}`;
    return `${execution.status === 'historical' ? 'Last run: ' : ''}Agent ${execution.agent.name} · Harness ${own.harness.name}${own.harness.version ? ` ${own.harness.version}` : ''} · Model ${model} · ${thinking}`;
}

/**
 * Lines of the expandable execution detail panel (also the raw EXECUTION section).
 *
 * @private execution details view
 */
export function executionDetailLines(execution: ExecutionDetailView | undefined, style?: Style): string[] {
    const muted = style?.muted ?? ((text: string) => text);
    const bold = style?.bold ?? ((text: string) => text);
    if (!execution) return [muted('No execution yet in this service (nothing is running and no previous run is recorded).')];
    const lines: string[] = [];
    lines.push(
        execution.status === 'active'
            ? `${bold('Current execution')} ${muted(`· ${execution.task.kind} · phase ${execution.phase ?? 'unknown'}${execution.attempt ? ` · attempt ${execution.attempt}/${execution.attemptBudget ?? '?'}` : ''}`)}`
            : `${bold('Last finished execution (historical, not running now)')} ${muted(`· ${execution.outcome ?? ''}${execution.endedAt ? ` at ${formatShortTime(Date.parse(execution.endedAt))}` : ''}`)}`,
    );
    lines.push(`Task     ${execution.task.title}${muted(` (${execution.task.ref})`)}`);
    if (execution.task.source) lines.push(`Source   ${execution.task.source}${execution.task.trace ? muted(` · trace ${execution.task.trace}`) : ''}`);
    lines.push(`Agent    ${execution.agent.name}${execution.agent.source ? muted(` · ${execution.agent.source}`) : ''}`);
    for (const context of execution.contexts) {
        if (context.role === 'consultation') lines.push(bold(`Consultation · ${context.by ?? '?'} asks ${context.agent} (${context.state})`));
        lines.push(`${context.role === 'consultation' ? '  ' : ''}Harness  ${context.harness.name}${context.harness.version ? ` ${context.harness.version}` : ''}${muted(` (${context.harness.id})`)}`);
        lines.push(`${context.role === 'consultation' ? '  ' : ''}Model    ${modelLabel(context.model)}${context.model.source ? muted(` · ${context.model.source}`) : ''}`);
        lines.push(`${context.role === 'consultation' ? '  ' : ''}Thinking ${thinkingLabel(context.thinkingLevel)}${context.thinkingLevel.source ? muted(` · ${context.thinkingLevel.source}`) : ''}`);
    }
    return lines;
}

/**
 * Lines of the expandable browser detail panel (also the raw BROWSER section). Never includes profile contents.
 *
 * @private browser details view
 */
export function browserDetailLines(browser: BrowserDetailView | undefined, style?: Style, options: { readonly keys?: boolean } = {}): string[] {
    const muted = style?.muted ?? ((text: string) => text);
    const warn = style?.warning ?? ((text: string) => text);
    if (!browser) return [muted('Browser information is not available from this service.')];
    const lines = [
        `Profile  ${browser.sourceLabel}${muted(` (${browser.source})`)}`,
        `Path     ${browser.profilePath}`,
        `Mode     ${browser.mode.requested}${browser.mode.actual && browser.mode.actual !== browser.mode.requested ? ` (actually ${browser.mode.actual})` : ''}${browser.mode.note ? muted(` · ${browser.mode.note}`) : ''}`,
        `State    ${browser.state}${browser.pid ? muted(` · PID ${browser.pid}`) : ''}${browser.executable ? muted(` · ${browser.executable}`) : ''}`,
        `Owner    ${browser.ownership.state}${browser.ownership.holder ? ` — ${browser.ownership.holder}` : ''}`,
    ];
    if (browser.savedProfile) lines.push(muted(`Saved    ${browser.savedProfile}`));
    if (browser.pending) lines.push(warn(`Pending  ${browser.pending}`));
    if (browser.lastFailure) lines.push(warn(`Failure  ${formatShortTime(Date.parse(browser.lastFailure.at))} ${browser.lastFailure.summary}`), ...(browser.lastFailure.evidence ? [muted(`         ${browser.lastFailure.evidence}`)] : []));
    if (browser.recovery && (browser.recovery.state !== 'idle' || browser.recovery.attempts)) {
        lines.push(`Recovery ${browser.recovery.state}${browser.recovery.attempts ? ` · ${browser.recovery.attempts} attempt(s)` : ''}${browser.recovery.nextRetryAt ? ` · next retry ${formatShortTime(Date.parse(browser.recovery.nextRetryAt))}` : ''}${browser.recovery.blocker ? ` · ${browser.recovery.blocker}` : ''}`);
    }
    if (browser.lastAction) lines.push(`Action   ${browser.lastAction.action}: ${browser.lastAction.state} — ${browser.lastAction.outcome}`);
    if (browser.checkedAt) lines.push(muted(`Checked  ${formatShortTime(Date.parse(browser.checkedAt))}`));
    if (options.keys) lines.push(muted('1 recheck diagnostics · 2 retry startup · 3 restart this project’s browser (not the engine)'));
    return lines;
}
