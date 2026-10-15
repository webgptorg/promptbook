import { readFile, writeFile } from 'node:fs/promises';
import { EXIT } from '../../common/errors.js';
import { toProjectRelative } from '../../common/fs.js';
import { loadSettings, setting } from '../../project/config.js';
import { commitPaths, inspectGit, listProjectFiles } from '../../project/git.js';
import { newTaskPath, renderTaskBook } from '../../tasks/authoring.js';
import { readTaskQueue } from '../../tasks/sources.js';
import { printJson, selectedProject, writableTasksDirectory } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';

/**
 * `ptbk find-unwritten`: tasks still containing the `@@@` placeholder (read-only).
 *
 * @private command
 */
export async function findUnwritten(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const settings = await loadSettings(project, { env: context.env });
    const queue = await readTaskQueue({ root: project.root, tasksDirectory: await writableTasksDirectory(context, project, settings), timeZone: setting<string>(settings, 'timezone') });
    const unwritten = queue.tasks.filter((task) => task.placeholder);
    if (flag(context, 'json')) printJson(unwritten.map((task) => ({ ref: task.ref, title: task.title, source: task.source.relativePath })));
    else if (!unwritten.length) context.terminal.write('Every task is written.\n');
    else for (const task of unwritten) context.terminal.write(`${task.ref}  ${task.title}\n`);
    return EXIT.success;
}

/**
 * `ptbk find-refactor-candidates`: large tracked text files, optionally authoring refactoring tasks.
 *
 * @private command
 */
export async function findRefactorCandidates(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const settings = await loadSettings(project, { env: context.env });
    const minimum = option<number>(context, 'min-lines') ?? 400;
    const limit = option<number>(context, 'limit') ?? 10;
    const candidates: Array<{ path: string; lines: number }> = [];
    for (const path of await listProjectFiles(project.root)) {
        if (/\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|lock|map|min\.js|svg|woff2?|ttf|mp4|stl)$/i.test(path) || /(^|[\\/])(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/.test(path)) continue;
        let text: string;
        try {
            text = await readFile(path, 'utf8');
        } catch {
            continue;
        }
        if (text.includes('\0')) continue;
        const lines = text.split('\n').length;
        if (lines >= minimum) candidates.push({ path: toProjectRelative(project.root, path), lines });
    }
    candidates.sort((a, b) => b.lines - a.lines);
    const top = candidates.slice(0, limit);
    if (flag(context, 'create-tasks') && top.length) {
        const tasksDirectory = await writableTasksDirectory(context, project, settings);
        const created: string[] = [];
        for (const candidate of top) {
            const path = await newTaskPath(tasksDirectory, `refactor ${candidate.path}`, Date.now(), setting<string>(settings, 'timezone'));
            await writeFile(
                path,
                renderTaskBook({
                    title: `Refactor ${candidate.path}`,
                    description: `\`${candidate.path}\` has ${candidate.lines} lines. Split it into cohesive, well-named units without changing behavior; keep tests passing.`,
                    commitments: ['TASK PRIORITY 0', 'TASK ORIGIN refactor candidate'],
                }),
                { flag: 'wx' },
            );
            created.push(path);
        }
        const gitInfo = await inspectGit(project.root);
        const commit = flag(context, 'commit') ?? setting<boolean>(settings, 'execution.commit');
        if (commit && gitInfo.state === 'repository') await commitPaths({ projectRoot: project.root, repositoryRoot: gitInfo.root, paths: created, subject: `Add ${created.length} refactoring task(s)`, temporaryDirectory: project.runtime.temporary });
        context.terminal.write(`Created ${created.length} refactoring task(s).\n`);
    }
    if (flag(context, 'json')) printJson(top);
    else if (!top.length) context.terminal.write(`No tracked text file has ${minimum} or more lines.\n`);
    else for (const candidate of top) context.terminal.write(`${String(candidate.lines).padStart(6)}  ${candidate.path}\n`);
    return EXIT.success;
}

/**
 * Curated emoji pool for cross-reference tags.
 */
const EMOJI_POOL = [...'🦊🐙🦉🐝🦋🐢🦕🐳🦜🦩🐌🦔🦦🦥🐞🪲🦀🐡🦑🪼🌵🍄🌻🌊🔥⚓🎈🎯🧩🪁🧭🧲🔭🪐🌋🗿🏮🎐🪴🍉🍋🥝🧊🫧🪸🦚🦢🐉🦖🧿🪬🎲🎻🥁🪘🛶🚲🛸⛺🏔'].filter((emoji) => emoji.trim());

/**
 * `ptbk find-fresh-emoji-tags`: unused `[emoji]` tags for connecting related places.
 *
 * @private command
 */
export async function findFreshEmojiTags(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const used = new Set<string>();
    for (const path of await listProjectFiles(project.root)) {
        let text: string;
        try {
            text = await readFile(path, 'utf8');
        } catch {
            continue;
        }
        for (const match of text.matchAll(/\[([^\]\sA-Za-z0-9]{1,16})\]/gu)) for (const emoji of match[1]!.match(/\p{Extended_Pictographic}/gu) ?? []) used.add(emoji);
    }
    const count = option<number>(context, 'count') ?? 5;
    const fresh = EMOJI_POOL.filter((emoji) => !used.has(emoji)).sort(() => Math.random() - 0.5).slice(0, count);
    if (flag(context, 'json')) printJson({ used: used.size, fresh: fresh.map((emoji) => `[${emoji}]`) });
    else context.terminal.write(`${fresh.map((emoji) => `[${emoji}]`).join('  ')}\n`);
    return EXIT.success;
}
