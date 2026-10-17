import { readFile, rename, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { EXIT, PtbkError } from '../../common/errors.js';
import { ensureDirectory, pathExists, toProjectRelative } from '../../common/fs.js';
import { loadSettings, setting } from '../../project/config.js';
import { commitPaths, inspectGit } from '../../project/git.js';
import { StateStore } from '../../engine/state.js';
import { newTaskPath, renderTaskBook, splitTitle } from '../../tasks/authoring.js';
import { splitMarkdownSections } from '../../tasks/markdown.js';
import { isRecurring, type Task } from '../../tasks/model.js';
import { readTaskQueue } from '../../tasks/sources.js';
import { CANCELLED, composeText, selectOne } from '../../ui/prompts.js';
import { distinctTaskName, selectedProject, writableTasksDirectory } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';

/**
 * `ptbk verify`: human review of completed results — archive, follow up or skip (not a check run).
 *
 * @private command
 */
export default async function verify(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const settings = await loadSettings(project, { env: context.env });
    const tasksDirectory = await writableTasksDirectory(context, project, settings);
    const timeZone = setting<string>(settings, 'timezone');
    const queue = await readTaskQueue({ root: project.root, tasksDirectory, timeZone });
    const ignore = option<string[]>(context, 'ignore') ?? [];
    const archivable = async (task: Task): Promise<boolean> => {
        if (task.source.kind === 'book') return true;
        const sections = splitMarkdownSections(await readFile(task.source.path, 'utf8'));
        return sections.every((section) => !section.title || ['x', 'X'].includes(section.marker ?? ''));
    };
    let done = queue.tasks.filter((task) => task.status === 'done' && !isRecurring(task) && !ignore.some((pattern) => task.title.includes(pattern) || task.source.relativePath.includes(pattern)));
    const stamp = (task: Task): string => task.doneStamps[task.doneStamps.length - 1] ?? '';
    done = done.sort((a, b) => stamp(a).localeCompare(stamp(b)));
    if (option<string>(context, 'order') === 'newest') done.reverse();
    const { terminal } = context;
    if (!done.length) {
        terminal.write('No completed tasks wait for review.\n');
        return EXIT.success;
    }
    const results = await new StateStore(project.runtime.state).recentResults(500).catch(() => []);
    const gitInfo = await inspectGit(project.root);
    const commit = flag(context, 'commit') ?? setting<boolean>(settings, 'execution.commit');
    if (commit && gitInfo.state !== 'repository') throw new PtbkError('Not a Git working tree.', { kind: 'setup', next: ['Run `ptbk init` or use --no-commit.'] });
    const archived = new Set<string>();
    const archive = async (task: Task): Promise<void> => {
        if (archived.has(task.source.path) || !(await archivable(task))) return;
        const target = join(tasksDirectory, 'archive', basename(task.source.path));
        if (await pathExists(target)) throw new PtbkError(`${toProjectRelative(project.root, target)} already exists; not overwriting.`, { kind: 'conflict' });
        await ensureDirectory(join(tasksDirectory, 'archive'));
        await rename(task.source.path, target);
        archived.add(task.source.path);
        if (commit && gitInfo.state === 'repository') await commitPaths({ projectRoot: project.root, repositoryRoot: gitInfo.root, paths: [task.source.path, target], subject: `Archive verified task - ${task.title}`, temporaryDirectory: project.runtime.temporary });
        terminal.write(`Archived ${task.title} → ${toProjectRelative(project.root, target)}\n`);
    };
    if (!terminal.interactive) {
        if (flag(context, 'archive-all')) {
            for (const task of done) await archive(task);
            return EXIT.success;
        }
        for (const task of done) terminal.write(`${task.title} (${task.ref}) done ${stamp(task)}\n`);
        terminal.write('Use an interactive terminal to review, or --archive-all to archive everything listed.\n');
        return EXIT.success;
    }
    for (const task of done) {
        const result = results.find((item) => item.taskRef === task.ref && item.outcome.startsWith('completed'));
        terminal.write(`\n${terminal.style.bold(task.title)} ${terminal.style.muted(`(${task.ref}, done ${stamp(task)})`)}\n${result ? `${result.summary}${result.commit ? terminal.style.muted(` · ${result.commit.slice(0, 8)}`) : ''}\n` : ''}`);
        const choice = await selectOne(terminal, {
            frame: { title: 'ptbk verify', step: `Review ${done.indexOf(task) + 1} of ${done.length}` },
            question: 'Your review:',
            choices: [
                { value: 'archive', label: 'Accept and archive', disabled: !(await archivable(task)), description: (await archivable(task)) ? undefined : 'the Markdown file still has open sections' },
                { value: 'follow-up', label: 'Create a follow-up task' },
                { value: 'skip', label: 'Skip' },
                { value: 'stop', label: 'Stop reviewing' },
            ],
            defaultValue: 'skip',
        });
        if (choice === CANCELLED || choice === 'stop') break;
        if (choice === 'archive') await archive(task);
        if (choice === 'follow-up') {
            const text = await composeText(terminal, { frame: { title: 'ptbk verify', step: 'Follow-up task' }, question: `What should follow "${task.title}"?`, required: true });
            if (text === CANCELLED) continue;
            const split = splitTitle(text);
            const title = await distinctTaskName(project, settings, split.title);
            const description = split.description;
            const path = await newTaskPath(tasksDirectory, title, Date.now(), timeZone);
            await writeFile(path, renderTaskBook({ title, description, commitments: [`TASK PARENT ${task.ref}`, `TASK ORIGIN review of ${task.ref}`] }), { flag: 'wx' });
            if (commit && gitInfo.state === 'repository') {
                await commitPaths({ projectRoot: project.root, repositoryRoot: gitInfo.root, paths: [path], subject: `Add task - ${title}`, trailers: { 'Task-Name': title, 'Related-Task-Name': task.title }, temporaryDirectory: project.runtime.temporary, env: context.env });
            }
            terminal.write(`Added follow-up ${toProjectRelative(project.root, path)}\n`);
        }
    }
    return EXIT.success;
}
