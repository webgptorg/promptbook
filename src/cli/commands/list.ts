import { formatModelContent } from '../../book/model.js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { EXIT, PtbkError } from '../../common/errors.js';
import { listDirectory, pathExists } from '../../common/fs.js';
import { formatShortTime } from '../../common/time.js';
import { loadSettings } from '../../project/config.js';
import { commitsOfTask, inspectGit } from '../../project/git.js';
import type { Project } from '../../project/workspace.js';
import { previewQueue } from '../../engine/preview.js';
import { lookupService } from '../../service/control.js';
import type { RecordingStatus } from '../../browser/recording.js';
import { findTask } from '../../tasks/sources.js';
import { legacyTraceDirectoryOf, traceBasenameOf, traceDirectoryOf } from '../../tasks/identity.js';
import type { Task } from '../../tasks/model.js';
import { describePriority } from '../../tasks/priority.js';
import type { TaskInventoryItem } from '../../tasks/views.js';
import { fit, stringWidth, truncate } from '../../ui/ansi.js';
import { renderPanel } from '../../ui/panels.js';
import { selectedProject, printJson, tasksOverride } from '../common.js';
import { flag, type CommandContext } from '../context.js';

/**
 * Read-only inspection of one task: identity, audit trail, recording status and commits (resolved from Git).
 */
async function inspectTask(context: CommandContext, project: Project, task: Task, readiness: { kind: string; reason: string }): Promise<number> {
    // Evidence lives under the literal source filename; an older engine's name-derived directory stays historical.
    const trace = traceDirectoryOf(task.source.relativePath);
    const files = (await listDirectory(join(project.root, trace))).filter((entry) => entry.isFile).map((entry) => `${trace}/${entry.name}`);
    const legacy = legacyTraceDirectoryOf(task.title);
    const historical = legacy !== trace && (await pathExists(join(project.root, legacy))) ? `${legacy}/` : undefined;
    const video = (await pathExists(join(project.root, trace, 'video.json'))) ? (JSON.parse(await readFile(join(project.root, trace, 'video.json'), 'utf8')) as RecordingStatus) : undefined;
    const gitInfo = await inspectGit(project.root);
    const commits = gitInfo.state === 'repository' ? await commitsOfTask(gitInfo.root, task.title, task.legacyId) : [];
    const details = {
        ref: task.ref,
        name: task.title,
        key: task.key,
        legacyId: task.legacyId ?? null,
        shadowedBy: task.shadowedBy ?? null,
        title: task.title,
        source: task.source.relativePath,
        section: task.source.section,
        status: task.status,
        readiness: readiness.kind,
        reason: readiness.reason,
        trace: `${trace}/`,
        traceFiles: files,
        historicalTrace: historical ?? null,
        video: video ?? null,
        commits,
    };
    if (flag(context, 'json')) {
        printJson(details);
        return EXIT.success;
    }
    const lines = [
        `Task: ${task.title} (${task.ref})`,
        ...(task.legacyId ? [`Legacy ID: ${task.legacyId} (historical metadata only)`] : []),
        ...(task.shadowedBy ? [`Shadowed by: ${task.shadowedBy} (same normalized name; this copy is not addressable)`] : []),
        `Source: ${task.source.relativePath}${task.source.section ? ` (section ${task.source.section})` : ''}`,
        `Readiness: ${readiness.kind} — ${readiness.reason}`,
        `Trace: ${trace}/${files.length ? ` (${files.map((file) => file.slice(trace.length + 1)).join(', ')})` : ' (no evidence yet)'}`,
        ...(historical ? [`Historical trace: ${historical} (name-derived evidence of an older engine)`] : []),
        `Video: ${video ? `${video.state}${video.segments.length ? ` · ${video.segments.map((segment) => (segment.file ? `${trace}/${segment.file}` : `${segment.label}: ${segment.status}`)).join(', ')}` : ''}` : 'none recorded'}`,
        `Commits: ${commits.length ? '' : 'none yet'}`,
        ...commits.map((commit) => `  ${commit.sha.slice(0, 10)} ${commit.date.slice(0, 16)} ${commit.subject}${commit.role === 'task' ? '' : ` (${commit.role === 'created' ? 'created here' : 'related'})`}`),
    ];
    context.terminal.write(`${lines.join('\n')}\n`);
    return EXIT.success;
}

/**
 * Engine-defined system tasks (e.g. the self-update) from the running engine's task inventory: they have no project
 * Book, so only the engine that defines them knows them. None when no compatible engine answers; never starts one.
 */
async function liveSystemTasks(project: Project): Promise<TaskInventoryItem[]> {
    const lookup = await lookupService(project).catch(() => undefined);
    if (lookup?.state !== 'running' || !lookup.engine.compatible) return [];
    const inventory = await lookup.client.request<TaskInventoryItem[]>('task-inventory', {}, 10_000).catch(() => []);
    return inventory.filter((item) => item.kind === 'system');
}

/**
 * Read-only inspection of one system task: kind, actual executor, definition, retry and recent runs. It has no
 * source, no trace directory and no task commits; its evidence is its own run history.
 */
function inspectSystemTask(context: CommandContext, item: TaskInventoryItem): number {
    if (flag(context, 'json')) {
        printJson(item);
        return EXIT.success;
    }
    const lines = [
        `Task: ${item.title} (${item.ref})`,
        `Kind: system task (engine-defined, no project Book) · executor ${item.executor ?? 'the engine'}`,
        ...(item.definition ? [`Definition: ${item.definition}${item.origin ? ` (origin ${item.origin})` : ''}`] : []),
        `Priority: ${item.priorityText ?? item.priority}`,
        `Readiness: ${item.readiness} — ${item.reason}`,
        ...(item.until ? [`Next attempt: ${formatShortTime(Date.parse(item.until))}`] : []),
        ...(item.retry ? [`Retry: ${item.retry} after failed runs`] : []),
        `Runs: ${item.runs?.length ? '' : 'none finished yet'}`,
        ...(item.runs ?? []).map((run) => `  ${formatShortTime(Date.parse(run.at))} ${run.outcome} ${run.title} — ${run.detail}`),
    ];
    context.terminal.write(`${lines.join('\n')}\n`);
    return EXIT.success;
}

/**
 * `ptbk list`: read-only queue with the same readiness explanations as execution, including the running engine's
 * system tasks.
 *
 * @private command
 */
export default async function list(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const settings = await loadSettings(project, { env: context.env });
    const preview = await previewQueue(project, { settings, tasksDirectory: tasksOverride(context), env: context.env });
    const [reference] = context.positionals;
    if (reference) {
        const found = findTask(preview.evaluated.map((item) => item.task), reference);
        if (!found.task) {
            const system = (await liveSystemTasks(project)).find((item) => item.ref.toLowerCase() === reference.trim().toLowerCase());
            if (system) return inspectSystemTask(context, system);
            throw new PtbkError(`No task matches "${reference}".`, { kind: 'not-found', next: ['Run `ptbk list --all` to see task references.'] });
        }
        const readiness = preview.evaluated.find((item) => item.task === found.task)!.readiness;
        return await inspectTask(context, project, found.task, readiness);
    }
    const all = flag(context, 'all') === true;
    const readyOnly = flag(context, 'ready') === true;
    const shown = (kind: string): boolean => (all || !['done', 'retired'].includes(kind)) && (!readyOnly || kind === 'ready' || kind === 'needs-assignment');
    const items = preview.evaluated.filter((item) => shown(item.readiness.kind));
    // The same inventory as the dashboards: system tasks follow ordinary work (they have the lowest priority).
    const systemItems = (await liveSystemTasks(project)).filter((item) => shown(item.readiness));
    if (flag(context, 'json')) {
        printJson({
            project: project.root,
            problems: preview.problems,
            configuration: settings.diagnostics,
            tasks: items.map(({ task, readiness }) => {
                const route = preview.routes.get(task.ref);
                return {
                    ref: task.ref,
                    name: task.title,
                    title: task.title,
                    source: task.source.relativePath,
                    section: task.source.section,
                    trace: traceBasenameOf(task.source.relativePath) ? `${traceDirectoryOf(task.source.relativePath)}/` : null,
                    status: task.status,
                    readiness: readiness.kind,
                    reason: readiness.reason,
                    until: readiness.kind === 'waiting-until' ? new Date(readiness.until).toISOString() : undefined,
                    priority: task.priority.value,
                    priorityText: task.priority.raw,
                    agent: route?.kind === 'routable' ? route.selection.agent : task.routing.agent,
                    harness: route?.kind === 'routable' ? route.selection.harness : undefined,
                    model: route?.kind === 'routable' ? route.selection.model : undefined,
                    modelRequirement: task.routing.model.explicit ? formatModelContent(task.routing.model) : undefined,
                    origin: task.origin,
                    kind: 'ordinary',
                    done: task.doneStamps,
                };
            }),
            systemTasks: systemItems,
        });
        return EXIT.success;
    }
    const { terminal } = context;
    const { style } = terminal;
    if (!terminal.pretty) {
        const lines = [`Tasks in ${project.root} (${items.length + systemItems.length})`];
        for (const { task, readiness } of items) lines.push(`[${readiness.kind}] ${task.title} (${task.ref}) priority ${describePriority(task.priority)} — ${readiness.reason}`);
        for (const item of systemItems) lines.push(`[${item.readiness}] [system] ${item.title} (${item.ref}) priority ${item.priorityText ?? item.priority} — ${item.reason}`);
        for (const problem of preview.problems) lines.push(`Problem: ${problem}`);
        terminal.write(`${lines.join('\n')}\n`);
        return EXIT.success;
    }
    const width = Math.min(terminal.columns(), 140);
    const kindWidth = 17;
    const lines: string[] = [];
    if (!items.length && !systemItems.length) lines.push(style.muted(readyOnly ? 'No task can start now.' : 'No unfinished tasks. Add one with `ptbk add`.'));
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
    for (const item of systemItems) {
        const tone = item.readiness === 'active' ? style.success : item.readiness === 'failed' ? style.error : item.readiness === 'done' ? style.muted : style.warning;
        lines.push(`${tone(fit(item.readiness, kindWidth))} ${style.accent('[system]')} ${style.bold(truncate(item.title, width - kindWidth - 19))}`);
        const when = item.until ? ` · ${formatShortTime(Date.parse(item.until))}` : '';
        lines.push(style.muted(`${' '.repeat(kindWidth + 1)}${item.ref} · ${item.executor ?? 'the engine'}${item.retry ? ` · retry ${item.retry}` : ''}${when}`));
        lines.push(`${' '.repeat(kindWidth + 1)}${truncate(item.reason, width - kindWidth - 6)}`);
    }
    for (const problem of preview.problems) lines.push(style.error(`Problem: ${problem}`));
    const ready = items.filter((item) => item.readiness.kind === 'ready').length;
    terminal.write(`${renderPanel({ title: `Tasks (${items.length + systemItems.length})`, titleRight: `${ready} ready`, lines, width: Math.max(width, stringWidth('Tasks') + 20), unicode: terminal.unicode, style }).join('\n')}\n`);
    return EXIT.success;
}
