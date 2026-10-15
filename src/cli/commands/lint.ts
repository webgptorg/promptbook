import { resolve } from 'node:path';
import { EXIT } from '../../common/errors.js';
import { AgentCatalog, validateAgents } from '../../project/agents.js';
import { loadSettings, setting } from '../../project/config.js';
import { readTaskQueue, findTask } from '../../tasks/sources.js';
import { printJson, selectedProject, tasksOverride } from '../common.js';
import { flag, type CommandContext } from '../context.js';

/**
 * One lint finding.
 */
type Finding = { readonly severity: 'error' | 'warning'; readonly location: string; readonly message: string };

/**
 * `ptbk lint`: validates Books and configuration without model calls (exit 1 on errors).
 *
 * @private command
 */
export default async function lint(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const settings = await loadSettings(project, { env: context.env });
    const findings: Finding[] = settings.diagnostics.map((diagnostic) => ({ severity: diagnostic.severity, location: diagnostic.location, message: diagnostic.message }));
    const catalog = await AgentCatalog.load(project.root, setting<string>(settings, 'paths.agents'));
    for (const diagnostic of await validateAgents(catalog)) {
        findings.push({ severity: diagnostic.severity, location: `${diagnostic.path || 'agents'}${diagnostic.line ? `:${diagnostic.line}` : ''}`, message: diagnostic.message });
    }
    const queue = await readTaskQueue({
        root: project.root,
        tasksDirectory: tasksOverride(context) ?? resolve(project.root, setting<string>(settings, 'paths.tasks')),
        explicit: Boolean(tasksOverride(context)),
        timeZone: setting<string>(settings, 'timezone'),
    });
    for (const problem of queue.problems) findings.push({ severity: 'error', location: 'tasks', message: problem });
    for (const task of queue.tasks) {
        for (const diagnostic of task.diagnostics) findings.push({ severity: diagnostic.severity, location: `${task.source.relativePath}${task.source.section ? `#${task.source.section}` : ''}${diagnostic.line ? `:${diagnostic.line}` : ''}`, message: diagnostic.message });
        for (const reference of task.dependsOn) {
            const found = findTask(queue.tasks, reference);
            if (!found.task) findings.push({ severity: 'error', location: task.source.relativePath, message: found.ambiguous ? `Dependency ${reference} is ambiguous.` : `Dependency ${reference} does not exist.` });
        }
        if (task.routing.agent && task.status !== 'done') {
            const resolution = await catalog.resolve(task.routing.agent);
            if (resolution.kind !== 'agent' && !(resolution.kind === 'non-agent' && resolution.name === 'Expert')) {
                findings.push({ severity: 'error', location: task.source.relativePath, message: `TASK AGENT ${task.routing.agent} does not resolve to a project agent (${resolution.kind}).` });
            }
        }
    }
    const errors = findings.filter((finding) => finding.severity === 'error');
    if (flag(context, 'json')) printJson({ ok: !errors.length, findings });
    else {
        const { terminal } = context;
        const { style } = terminal;
        for (const finding of findings) terminal.write(`${finding.severity === 'error' ? style.error('error') : style.warning('warning')} ${style.muted(finding.location)} ${finding.message}\n`);
        terminal.write(errors.length ? `${style.error(`${errors.length} error(s)`)}, ${findings.length - errors.length} warning(s).\n` : `${style.success('Books and configuration are valid')} (${catalog.all().length} agents, ${queue.tasks.length} tasks${findings.length ? `, ${findings.length} warning(s)` : ''}).\n`);
    }
    return errors.length ? EXIT.failure : EXIT.success;
}
