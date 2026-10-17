import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { EXIT, PtbkError } from '../../common/errors.js';
import { parseInterval } from '../../common/duration.js';
import { ensureDirectory, listDirectory, pathExists, toProjectRelative } from '../../common/fs.js';
import { parseDateTime } from '../../common/time.js';
import { matchCommitmentKeyword } from '../../book/commitments.js';
import { parseBook } from '../../book/parse.js';
import { loadSettings, setting } from '../../project/config.js';
import { commitPaths, inspectGit } from '../../project/git.js';
import { newTaskPath, renderTaskBook, splitTitle } from '../../tasks/authoring.js';
import { nameReference } from '../../tasks/model.js';
import { lookupService } from '../../service/control.js';
import { acquireProjectLock } from '../../service/records.js';
import { shortId } from '../../common/ids.js';
import { CANCELLED, composeText, confirm, selectOne } from '../../ui/prompts.js';
import { distinctTaskName, readStdin, selectedProject, writableTasksDirectory } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';

/**
 * Builds the commitment lines requested through flags.
 */
function controlLines(context: CommandContext, timeZone: string): string[] {
    const lines: string[] = [];
    const agent = option<string>(context, 'agent');
    if (agent) lines.push(`TASK AGENT ${agent.startsWith('@') || agent.startsWith('{') ? agent : /\s/.test(agent) ? `{${agent}}` : `@${agent}`}`);
    if (option<string>(context, 'harness')) lines.push(`TASK HARNESS ${option<string>(context, 'harness')}`);
    if (option<string>(context, 'model')) lines.push(`TASK MODEL ${option<string>(context, 'model')}`);
    if (option<string>(context, 'thinking-level')) lines.push(`TASK THINKING LEVEL ${option<string>(context, 'thinking-level')}`);
    if (option<string>(context, 'priority')) lines.push(`TASK PRIORITY ${option<string>(context, 'priority')}`);
    const after = option<string>(context, 'after');
    if (after) {
        const parsed = parseDateTime(after, timeZone);
        if (!parsed.ok) throw new PtbkError(`--after: ${parsed.reason}`, { kind: 'usage' });
        lines.push(`TASK AFTER ${after}`);
    }
    const repeat = option<string>(context, 'repeat');
    if (repeat) {
        const parsed = parseInterval(repeat);
        if (!parsed.ok) throw new PtbkError(`--repeat: ${parsed.reason}`, { kind: 'usage' });
        lines.push(`TASK REPEAT ${repeat}`);
    }
    return lines;
}

/**
 * `ptbk add`: create and commit a task (no model call, never executes it).
 *
 * @private command
 */
export default async function add(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const settings = await loadSettings(project, { env: context.env });
    const timeZone = setting<string>(settings, 'timezone');
    const tasksDirectory = await writableTasksDirectory(context, project, settings);
    const { terminal } = context;
    const commit = flag(context, 'commit') ?? setting<boolean>(settings, 'execution.commit');
    let text = context.positionals.join(' ').trim();
    if (flag(context, 'stdin')) text = (await readStdin()).trim();
    let content: string;
    const templateName = option<string>(context, 'template');
    let templateSource: string | undefined;
    if (templateName) {
        const templatePath = join(tasksDirectory, 'templates', templateName.endsWith('.book') ? templateName : `${templateName}.book`);
        if (!(await pathExists(templatePath))) {
            const available = (await listDirectory(join(tasksDirectory, 'templates'))).filter((entry) => entry.name.endsWith('.book')).map((entry) => entry.name.replace(/\.book$/, ''));
            throw new PtbkError(`Template "${templateName}" does not exist.`, { kind: 'usage', next: [available.length ? `Available templates: ${available.join(', ')}.` : 'Create templates in tasks/templates/.'] });
        }
        templateSource = await readFile(templatePath, 'utf8');
    }
    if (!text && terminal.interactive) {
        const initial = templateSource ? parseBook(templateSource).intro : '';
        const value = await composeText(terminal, {
            frame: { title: 'ptbk add', step: 'Describe the task', summary: templateName ? [`Template: ${templateName}`] : [] },
            question: 'What should be done? (first line becomes the title)',
            initial: templateSource ? `${parseBook(templateSource).name.replace(/^@@@\s*/, '')}\n\n${initial}`.trim() : undefined,
            placeholder: 'Improve CSV export\n\nPreserve column names and quote cells containing commas.',
            required: true,
        });
        if (value === CANCELLED) {
            terminal.write('Cancelled; no task was created.\n');
            return EXIT.incomplete;
        }
        text = value.trim();
        if (option<string>(context, 'priority') === undefined) {
            const priority = await selectOne(terminal, {
                frame: { title: 'ptbk add', step: 'Priority' },
                question: 'Priority:',
                choices: [
                    { value: '', label: 'Ordinary (0)' },
                    { value: '2', label: 'High (2)' },
                    { value: '5', label: 'Urgent (5)' },
                    { value: 'not-ready', label: 'Draft — not ready to run yet' },
                ],
                defaultValue: '',
            });
            if (priority === CANCELLED) {
                terminal.write('Cancelled; no task was created.\n');
                return EXIT.incomplete;
            }
            if (priority === 'not-ready') (context.options as Record<string, unknown>).__notReady = true;
            else if (priority) (context.options as Record<string, unknown>).priority = priority;
        }
    }
    if (!text) throw new PtbkError('A task description is required.', { kind: 'usage', next: ['Pass it as an argument, use --stdin, or run interactively.'] });
    const split = splitTitle(text);
    // A readable name distinct from every other Book: the name is the task's identity.
    const title = await distinctTaskName(project, settings, option<string>(context, 'title') ?? split.title);
    const description = option<string>(context, 'title') ? text : split.description;
    const controls = controlLines(context, timeZone);
    if ((context.options as Record<string, unknown>).__notReady) controls.push('TASK STATUS not-ready');
    if (templateSource) {
        const keywordOf = (line: string): string | undefined => matchCommitmentKeyword(line)?.definition.keyword;
        // A template is copied as new work: it never passes on legacy identity metadata.
        const fromTemplate = parseBook(templateSource)
            .commitments.filter((commitment) => (commitment.keyword.startsWith('TASK ') && commitment.keyword !== 'TASK ID') || commitment.keyword === 'RULE')
            .map((commitment) => `${commitment.written} ${commitment.body}`.trim());
        const merged = [...controls, ...fromTemplate.filter((line) => keywordOf(line) === 'RULE' || !controls.some((control) => keywordOf(control) === keywordOf(line)))];
        content = renderTaskBook({ title, description: description || undefined, commitments: merged });
    } else content = renderTaskBook({ title, description: description || undefined, commitments: controls });
    const parsed = parseBook(content);
    if (parsed.kind !== 'task') throw new PtbkError('The task could not be rendered as a task Book.', { kind: 'internal' });
    if (terminal.interactive && flag(context, 'yes') !== true && !context.positionals.length && !flag(context, 'stdin')) {
        terminal.write(`\n${terminal.style.muted('─── preview ───')}\n${content}${terminal.style.muted('───────────────')}\n`);
        const ok = await confirm(terminal, { frame: { title: 'ptbk add', step: 'Confirm' }, question: `Save "${title}"${commit ? ' and commit it' : ' (uncommitted)'}?`, defaultYes: true });
        if (ok !== true) {
            terminal.write('Cancelled; no task was created.\n');
            return EXIT.incomplete;
        }
    }
    await ensureDirectory(tasksDirectory);
    const path = await newTaskPath(tasksDirectory, title, Date.now(), timeZone);
    const summary = `Add task - ${title}`;
    const lookup = await lookupService(project);
    if (lookup.state === 'running') {
        // The running service writes and commits at a safe boundary, never folding it into an active task.
        const result = await lookup.client.request<{ path: string; commit?: string }>('add-task', { path, content, summary, commit, taskNames: [title] });
        report(context, project.root, result.path, result.commit, commit, title);
        return EXIT.success;
    }
    const gitInfo = await inspectGit(project.root);
    if (commit && gitInfo.state !== 'repository') throw new PtbkError('The project is not in a Git working tree, so the task cannot be committed.', { kind: 'setup', next: ['Run `ptbk init`, or use --no-commit.'] });
    const release = await acquireProjectLock(project, `add-${shortId()}`, 'authoring');
    try {
        await writeFile(path, content, { flag: 'wx' });
        let sha: string | undefined;
        if (commit && gitInfo.state === 'repository') {
            try {
                const outcome = await commitPaths({ projectRoot: project.root, repositoryRoot: gitInfo.root, paths: [path], subject: summary, trailers: { 'Task-Name': title }, temporaryDirectory: project.runtime.temporary, env: context.env });
                sha = outcome.committed ? outcome.sha : undefined;
            } catch (error) {
                throw new PtbkError('The task was written, but committing it failed.', {
                    kind: 'persistence',
                    project: project.root,
                    reason: (error as PtbkError).details?.reason ?? String(error),
                    preserved: `${toProjectRelative(project.root, path)} was kept (not duplicated on retry).`,
                    next: ['Fix the commit problem and commit the file, then start the agenda.'],
                });
            }
        }
        if (!commit) {
            const { StateStore } = await import('../../engine/state.js');
            const { hashFileIfExists } = await import('../../common/fs.js');
            await new StateStore(project.runtime.state).addOwnedUncommitted({ [toProjectRelative(project.root, path)]: (await hashFileIfExists(path)) ?? null });
        }
        report(context, project.root, path, sha, commit, title);
        return EXIT.success;
    } catch (error) {
        if (!(error instanceof PtbkError) && (await pathExists(path))) await rm(path, { force: true });
        throw error;
    } finally {
        await release();
    }
}

/**
 * Reports the created task, its reference and commit.
 */
function report(context: CommandContext, root: string, path: string, commit: string | undefined, commitMode: boolean, title: string): void {
    const relativePath = toProjectRelative(root, path);
    const { terminal } = context;
    const committed = commit ? `committed ${commit.slice(0, 8)} (PTBK: Add task - ${title})` : commitMode ? 'nothing to commit' : 'NOT committed (--no-commit): a default `ptbk start` treats it as an uncommitted source until you commit it';
    terminal.write(
        terminal.pretty
            ? `${terminal.style.success('✔')} Added ${terminal.style.bold(title)}\n  ${terminal.style.muted(`${relativePath} · ${nameReference(title)}`)} · ${committed}\n`
            : `Added task "${title}" (${nameReference(title)}) at ${relativePath}; ${committed}\n`,
    );
}
