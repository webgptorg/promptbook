import { readFile, rename, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { EXIT, PtbkError } from '../../common/errors.js';
import { ensureDirectory, isPathInside, listDirectory, pathExists, sha256, toProjectRelative } from '../../common/fs.js';
import { convertLegacyBook } from '../../book/convert.js';
import { renderCommitment } from '../../book/write.js';
import { slugify } from '../../common/ids.js';
import { loadSettings, setting } from '../../project/config.js';
import { commitPaths, inspectGit } from '../../project/git.js';
import { lookupService } from '../../service/control.js';
import { readTaskBook } from '../../tasks/book-task.js';
import { BookIndex } from '../../project/books.js';
import { isIgnoredMarkdown, readMarkdownTasks, splitMarkdownSections } from '../../tasks/markdown.js';
import type { Task } from '../../tasks/model.js';
import { PROMPTS_DIRECTORY } from '../../tasks/sources.js';
import { selectedProject, writableTasksDirectory } from '../common.js';
import { flag, type CommandContext } from '../context.js';

/**
 * One planned Book.
 */
type PlannedBook = { readonly path: string; readonly content: string; readonly task: Task };

/**
 * Rewrites relative Markdown links when the converted Book lives in another directory.
 */
function relink(text: string, fromDirectory: string, toDirectory: string): string {
    if (fromDirectory === toDirectory) return text;
    return text.replace(/(\]\()([^)\s]+)(\))/g, (match, open: string, target: string, close: string) => {
        if (/^[a-z]+:|^#|^\//i.test(target)) return match;
        const absolute = resolve(fromDirectory, target);
        return `${open}${relative(toDirectory, absolute).split(sep).join('/')}${close}`;
    });
}

/**
 * Renders a section as an equivalent task Book.
 */
function sectionBook(task: Task, controlLine: string | undefined, origin: string): string {
    // `TASK <existing name>` declares the task (its identity; no opaque ID, no new date); the payload goes under GOAL.
    const lines = [`TASK ${task.title}`];
    if (task.description) lines.push(...renderCommitment('GOAL', task.description));
    const commitments: string[] = [];
    if (task.status === 'not-ready') commitments.push('TASK STATUS not-ready');
    if (task.status === 'failed') commitments.push('TASK STATUS failed');
    if (task.status === 'done') commitments.push(`TASK DONE ${task.doneStamps[0] && task.doneStamps[0] !== 'unknown' ? task.doneStamps[0] : 'unknown'}`);
    if (task.priority.value) commitments.push(`TASK PRIORITY ${task.priority.value}`);
    if (task.afterRaw) commitments.push(`TASK AFTER ${task.afterRaw}`);
    if (task.routing.runners.length) commitments.push(`TASK RUNNER ${task.routing.runners.map((runner) => `\`${runner}\``).join(' ')}`);
    commitments.push(`TASK ORIGIN migrated from ${origin}`);
    if (controlLine) commitments.push(`TASK NOTE Original control line: ${controlLine}`);
    if (task.legacyId) commitments.push(`TASK NOTE Historical ID before migration: ${task.legacyId}`);
    return `${[...lines, ...commitments].join('\n')}\n`;
}

/**
 * A planned conversion of an existing Book written in former syntax.
 */
type PlannedConversion = { readonly path: string; readonly hash: string; readonly content: string; readonly name: string; readonly notes: readonly string[] };

/**
 * `ptbk migrate`: explicit, lossless conversion of Markdown task sections into task Books and of Books in former
 * syntax (plain name line, `ENTITY`, introduction text) into canonical `AGENT|TASK|CHAT <name>` Books (no model call).
 *
 * @private command
 */
export default async function migrate(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const settings = await loadSettings(project, { env: context.env });
    const timeZone = setting<string>(settings, 'timezone');
    const tasksDirectory = await writableTasksDirectory(context, project, settings);
    const { terminal } = context;
    const dryRun = flag(context, 'dry-run') === true;
    const explicit = context.positionals.map((file) => resolve(context.cwd, file));
    let files = explicit.filter((file) => !file.toLowerCase().endsWith('.book'));
    if (!explicit.length) {
        for (const directory of [tasksDirectory, resolve(project.root, PROMPTS_DIRECTORY)]) {
            for (const entry of await listDirectory(directory)) {
                if (entry.isFile && entry.name.toLowerCase().endsWith('.md') && !isIgnoredMarkdown(entry.name, await readFile(join(directory, entry.name), 'utf8'))) files.push(join(directory, entry.name));
            }
        }
    }
    files = [...new Set(files)];
    if (!dryRun && (await lookupService(project)).state === 'running') {
        throw new PtbkError('A running service owns this project; migration refuses live tasks.', { kind: 'conflict', next: ['Stop the service first (`ptbk stop`).'] });
    }
    const index = await BookIndex.load(project.root, { agents: setting<string>(settings, 'paths.agents'), tasks: setting<string>(settings, 'paths.tasks') });
    const planned: PlannedBook[] = [];
    const archives: Array<{ from: string; to: string }> = [];
    const blocked: string[] = [];
    for (const file of files) {
        const source = await readFile(file, 'utf8');
        const relativePath = toProjectRelative(project.root, file);
        const tasks = readMarkdownTasks({ source, path: file, relativePath, order: 0, timeZone });
        const sections = splitMarkdownSections(source);
        const problems: string[] = [];
        const books: PlannedBook[] = [];
        for (const task of tasks) {
            if (task.status === 'needs-recovery') problems.push(`section ${task.source.section} needs recovery ([^]); resolve it before migrating`);
            if (task.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) problems.push(`section ${task.source.section}: ${task.diagnostics.map((diagnostic) => diagnostic.message).join(' ')}`);
            const section = sections[task.source.section! - 1]!;
            const controlLine = section.controlLine !== undefined ? section.lines[section.controlLine]!.trim() : undefined;
            const relinked = { ...task, description: relink(task.description, dirname(file), tasksDirectory) };
            const content = sectionBook(relinked, controlLine, `${relativePath}#${task.source.section}`);
            // Same normalized name as another Book would make one of them unaddressable: resolve it first.
            const twin = index.all().find((entry) => entry.normalized === task.key && entry.tier !== 4 && entry.path !== file);
            if (twin) problems.push(`section ${task.source.section} "${task.title}" has the same normalized name as ${twin.relativePath}; rename one of them first`);
            if ([...planned, ...books].some((item) => item.task.key === task.key)) problems.push(`section ${task.source.section} "${task.title}" has the same normalized name as another migrated section; rename one of them first`);
            const path = join(tasksDirectory, `${basename(file, '.md')}-${String(task.source.section).padStart(2, '0')}-${slugify(task.title, 40)}.book`);
            if ((await pathExists(path)) || planned.some((item) => item.path === path) || books.some((item) => item.path === path)) problems.push(`${toProjectRelative(project.root, path)} already exists`);
            const reread = readTaskBook({ source: content, path, relativePath: toProjectRelative(project.root, path), order: 0, timeZone });
            const equivalent =
                reread &&
                reread.title === task.title &&
                reread.description === relinked.description.trim() &&
                (reread.status === task.status || (task.status === 'done' && reread.status === 'done')) &&
                reread.priority.value === task.priority.value &&
                reread.after === task.after &&
                reread.key === task.key &&
                JSON.stringify(reread.routing.runners) === JSON.stringify(task.routing.runners);
            if (!equivalent) problems.push(`section ${task.source.section} cannot be converted with equivalent meaning`);
            books.push({ path, content, task });
        }
        if (problems.length) {
            blocked.push(`${relativePath}: ${problems.join('; ')}`);
            continue;
        }
        planned.push(...books);
        const archive = join(tasksDirectory, 'archive', basename(file));
        if (await pathExists(archive)) {
            blocked.push(`${relativePath}: ${toProjectRelative(project.root, archive)} already exists`);
            planned.splice(planned.length - books.length, books.length);
            continue;
        }
        archives.push({ from: file, to: archive });
    }
    // Books in former syntax: every indexed project Book (not dependencies) and the task templates.
    const conversions: PlannedConversion[] = [];
    const books = explicit.length
        ? explicit.filter((file) => file.toLowerCase().endsWith('.book'))
        : [
              ...index
                  .all()
                  .filter((entry) => entry.tier !== 4)
                  .map((entry) => entry.path),
              ...(await listDirectory(join(tasksDirectory, 'templates'))).filter((entry) => entry.isFile && entry.name.endsWith('.book')).map((entry) => join(tasksDirectory, 'templates', entry.name)),
          ];
    for (const path of [...new Set(books)]) {
        const source = await readFile(path, 'utf8').catch(() => undefined);
        if (source === undefined) continue;
        const relativePath = toProjectRelative(project.root, path);
        const location = (['agents', 'tasks', 'chats'] as const).find((root) => isPathInside(index.rootPath(root), path));
        const conversion = convertLegacyBook(source, location);
        if (conversion.kind === 'blocked') blocked.push(`${relativePath}: ${conversion.reason}`);
        if (conversion.kind !== 'converted') continue;
        conversions.push({ path, hash: sha256(source), content: conversion.content, name: conversion.name, notes: conversion.notes });
    }
    if (!planned.length && !conversions.length && !blocked.length) {
        terminal.write('Nothing to migrate: no Markdown task files and no Books in former syntax.\n');
        return EXIT.success;
    }
    for (const book of planned) terminal.write(`${dryRun ? 'Would create' : 'Create'} ${toProjectRelative(project.root, book.path)} (${book.task.status}, {{${book.task.title}}}) ← ${book.task.ref}\n`);
    for (const item of conversions) terminal.write(`${dryRun ? 'Would convert' : 'Convert'} ${toProjectRelative(project.root, item.path)} → ${item.content.split('\n')[0]}${item.notes.length ? ` (${item.notes.join('; ')})` : ''}\n`);
    for (const item of archives) terminal.write(`${dryRun ? 'Would archive' : 'Archive'} ${toProjectRelative(project.root, item.from)} → ${toProjectRelative(project.root, item.to)}\n`);
    for (const problem of blocked) terminal.write(`Not converted: ${problem}\n`);
    if (dryRun || (!planned.length && !conversions.length)) return blocked.length ? EXIT.incomplete : EXIT.success;
    for (const item of conversions) {
        // A source changed since planning is never overwritten.
        if (sha256(await readFile(item.path, 'utf8')) !== item.hash) throw new PtbkError(`${toProjectRelative(project.root, item.path)} changed during migration; nothing more was written.`, { kind: 'conflict', next: ['Run `ptbk migrate` again.'] });
    }
    for (const book of planned) await writeFile(book.path, book.content, { flag: 'wx' });
    for (const item of conversions) await writeFile(item.path, item.content);
    for (const item of archives) {
        await ensureDirectory(dirname(item.to));
        await rename(item.from, item.to);
    }
    const commit = flag(context, 'commit') ?? setting<boolean>(settings, 'execution.commit');
    const subject = planned.length && conversions.length ? 'Migrate Markdown tasks and former Book syntax' : planned.length ? 'Migrate Markdown tasks to Books' : 'Convert Books to canonical syntax';
    const gitInfo = await inspectGit(project.root);
    if (commit && gitInfo.state === 'repository') {
        const outcome = await commitPaths({
            projectRoot: project.root,
            repositoryRoot: gitInfo.root,
            paths: [...planned.map((book) => book.path), ...archives.flatMap((item) => [item.from, item.to]), ...conversions.map((item) => item.path)],
            subject: subject,
            trailers: { 'Task-Name': planned.map((book) => book.task.title) },
            temporaryDirectory: project.runtime.temporary,
            env: context.env,
        });
        if (outcome.committed) terminal.write(`Committed ${outcome.sha.slice(0, 8)} (PTBK: ${subject}).\n`);
    } else if (!commit) terminal.write('Not committed (--no-commit).\n');
    return blocked.length ? EXIT.incomplete : EXIT.success;
}
