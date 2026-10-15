import { EXIT } from '../../common/errors.js';
import { formatShortTime } from '../../common/time.js';
import { loadSettings } from '../../project/config.js';
import { previewQueue } from '../../engine/preview.js';
import { describePriority } from '../../tasks/priority.js';
import { fit, stringWidth, truncate } from '../../ui/ansi.js';
import { renderPanel } from '../../ui/panels.js';
import { selectedProject, printJson, tasksOverride } from '../common.js';
import { flag, type CommandContext } from '../context.js';

/**
 * `ptbk list`: read-only queue with the same readiness explanations as execution.
 *
 * @private command
 */
export default async function list(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const settings = await loadSettings(project, { env: context.env });
    const preview = await previewQueue(project, { settings, mode: 'start', tasksDirectory: tasksOverride(context), env: context.env });
    const all = flag(context, 'all') === true;
    const readyOnly = flag(context, 'ready') === true;
    const items = preview.evaluated.filter((item) => (all || !['done', 'retired'].includes(item.readiness.kind)) && (!readyOnly || item.readiness.kind === 'ready' || item.readiness.kind === 'needs-assignment'));
    if (flag(context, 'json')) {
        printJson({
            project: project.root,
            problems: preview.problems,
            configuration: settings.diagnostics,
            tasks: items.map(({ task, readiness }) => {
                const route = preview.routes.get(task.ref);
                return {
                    ref: task.ref,
                    id: task.id,
                    title: task.title,
                    source: task.source.relativePath,
                    section: task.source.section,
                    status: task.status,
                    readiness: readiness.kind,
                    reason: readiness.reason,
                    until: readiness.kind === 'waiting-until' ? new Date(readiness.until).toISOString() : undefined,
                    priority: task.priority.value,
                    priorityText: task.priority.raw,
                    agent: route?.kind === 'routable' ? route.selection.agent : task.routing.agent,
                    harness: route?.kind === 'routable' ? route.selection.harness : task.routing.harness,
                    model: route?.kind === 'routable' ? route.selection.model : task.routing.model,
                    origin: task.origin,
                    done: task.doneStamps,
                };
            }),
        });
        return EXIT.success;
    }
    const { terminal } = context;
    const { style } = terminal;
    if (!terminal.pretty) {
        const lines = [`Tasks in ${project.root} (${items.length})`];
        for (const { task, readiness } of items) lines.push(`[${readiness.kind}] ${task.title} (${task.ref}) priority ${describePriority(task.priority)} — ${readiness.reason}`);
        for (const problem of preview.problems) lines.push(`Problem: ${problem}`);
        terminal.write(`${lines.join('\n')}\n`);
        return EXIT.success;
    }
    const width = Math.min(terminal.columns(), 140);
    const kindWidth = 17;
    const lines: string[] = [];
    if (!items.length) lines.push(style.muted(readyOnly ? 'No task can start now.' : 'No unfinished tasks. Add one with `ptbk add`.'));
    for (const { task, readiness } of items) {
        const tone = readiness.kind === 'ready' ? style.success : ['blocked', 'failed', 'needs-recovery'].includes(readiness.kind) ? style.error : ['done', 'retired', 'placeholder', 'not-ready'].includes(readiness.kind) ? style.muted : style.warning;
        const priority = task.priority.value ? style.accent(`P${task.priority.value} `) : '';
        lines.push(`${tone(fit(readiness.kind, kindWidth))} ${priority}${style.bold(truncate(task.title, width - kindWidth - 10))}`);
        const route = preview.routes.get(task.ref);
        const routing = route?.kind === 'routable' ? ` · ${route.selection.agent} on ${route.selection.harness}${route.selection.model ? ` ${route.selection.model}` : ''}` : '';
        const when = readiness.kind === 'waiting-until' ? ` · ${formatShortTime(readiness.until)}` : '';
        lines.push(style.muted(`${' '.repeat(kindWidth + 1)}${task.ref}${routing}${when}`));
        lines.push(`${' '.repeat(kindWidth + 1)}${truncate(readiness.reason, width - kindWidth - 6)}`);
    }
    for (const problem of preview.problems) lines.push(style.error(`Problem: ${problem}`));
    const ready = items.filter((item) => item.readiness.kind === 'ready').length;
    terminal.write(`${renderPanel({ title: `Tasks (${items.length})`, titleRight: `${ready} ready`, lines, width: Math.max(width, stringWidth('Tasks') + 20), unicode: terminal.unicode, style }).join('\n')}\n`);
    return EXIT.success;
}
