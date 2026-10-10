import { mkdir, readFile, writeFile, rename, unlink, stat, link } from 'node:fs/promises';
import { join, dirname, relative, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import type { Workspace, TaskDefinition } from './domain.js';
import { serializeTaskBook, discoverTasks, checksum, parseBook } from './sources.js';
import { scheduleRevision } from './schedule.js';
import { confinePath, InputError, requireGit } from './workspace.js';

/** Minimal locally resolvable roles supplied by project initialization. */
const DEFAULT_BOOKS: Record<string, string> = {
    'agents/.core/adam.book': 'Adam\n\nRULE Be accurate and protect the user’s work.\n',
    'agents/developer.book': 'Developer\n\nFROM {./.core/adam.book}\nGOAL Implement the task with maintainable code.\nRULE Read project instructions and verify changes.\nTEAM Consult {./lawyer.book} for legal questions.\nTEAM Consult {./copywriter.book} for user-facing text.\n',
    'agents/planner.book': 'Planner\n\nFROM {./.core/adam.book}\nGOAL Propose clear, reviewable tasks without changing application code.\nTEAM Consult {./lawyer.book} for legal questions.\nTEAM Consult {./copywriter.book} for user-facing text.\n',
    'agents/lawyer.book': 'Lawyer\n\nGOAL Explain legal constraints and uncertainty.\n',
    'agents/copywriter.book': 'Copywriter\n\nGOAL Write clear user-facing text.\n',
};

/** Writes a new file exclusively, preserving existing user content. */
async function writeMissing(workspace: Workspace, path: string, content: string, changed: string[]): Promise<void> {
    path = await confinePath(workspace.projectPath, path);
    await mkdir(dirname(path), { recursive: true });
    await confinePath(workspace.projectPath, path);
    try { await writeFile(path, content, { flag: 'wx' }); changed.push(path); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
}

/** Replace an owned configuration snapshot without overwriting a concurrent edit. */
async function replaceSnapshot(workspace: Workspace, file: string, previous: string, updated: string): Promise<void> {
    const target = await confinePath(workspace.projectPath, file);
    const current = await readFile(target, 'utf8');
    if (current !== previous) throw new InputError(`File changed concurrently: ${file}; retained the editor's version.`);
    const temporary = `${target}.${randomUUID()}.tmp`;
    try {
        await writeFile(temporary, updated, { flag: 'wx', mode: (await stat(target)).mode });
        await confinePath(workspace.projectPath, target);
        if (await readFile(target, 'utf8') !== previous) throw new InputError(`File changed concurrently: ${file}; retained the editor's version.`);
        await rename(temporary, target);
    } finally { await unlink(temporary).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; }); }
}

/** Adds only absent literal lines to a configuration file. */
async function appendMissing(workspace: Workspace, path: string, lines: string[], changed: string[]): Promise<void> {
    path = await confinePath(workspace.projectPath, path);
    let previous = '';
    let exists = true;
    try { previous = await readFile(path, 'utf8'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; exists = false; }
    const missing = lines.filter(line => !previous.split(/\r?\n/).includes(line));
    if (missing.length) {
        const updated = `${previous}${previous && !previous.endsWith('\n') ? '\n' : ''}${missing.join('\n')}\n`;
        if (exists) await replaceSnapshot(workspace, path, previous, updated);
        else await writeFile(path, updated, { flag: 'wx' });
        changed.push(path);
    }
}

/** Inspect only local inheritance and advisor declarations; init never fetches Books. */
async function localAdvisors(workspace: Workspace, file: string, stack = new Set<string>()): Promise<Set<string>> {
    const target = await confinePath(workspace.projectPath, file);
    if (stack.has(target)) throw new InputError(`Cyclic local Book inheritance at ${file}.`);
    stack.add(target);
    const text = await readFile(target, 'utf8');
    const first = text.split(/\r?\n/).find((line) => line.trim());
    if (!first || /^TASK\b/m.test(text)) throw new InputError(`Invalid agent Book: ${file}.`);
    const result = new Set<string>();
    let fence: string | undefined;
    const declarations: Array<{ kind: string; value: string }> = [];
    let current: { kind: string; value: string } | undefined;
    for (const line of text.split(/\r?\n/)) {
        const marker = /^\s*(`{3,}|~{3,})/.exec(line);
        if (marker) {
            if (!fence) fence = marker[1];
            else if (marker[1]![0] === fence[0] && marker[1]!.length >= fence.length) fence = undefined;
            continue;
        }
        if (fence) continue;
        const declaration = /^(TEAM|FROM|IMPORTS?)(?:[ \t]+(.*))?$/.exec(line);
        if (declaration) {
            declarations.push(current = { kind: declaration[1]!, value: declaration[2] ?? '' });
        } else if (/^[A-Z][A-Z0-9_-]*(?:[ \t]|$)/.test(line)) current = undefined;
        else if (current) current.value += `\n${line}`;
    }
    for (const declaration of declarations) {
        if (declaration.value.trim() === 'VOID') continue;
        const references = [...declaration.value.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1]!);
        if (!references.length) references.push(declaration.value.trim());
        if (!declaration.value.trim() || (declaration.value.includes('{') && !/\{[^{}]+\}/.test(declaration.value))) throw new InputError(`Malformed Book reference in ${file}.`);
        for (const reference of references) {
            if (/^https?:/.test(reference)) throw new InputError(`Remote inheritance/advisor cannot be inspected during local init: ${file}.`);
            if (declaration.kind === 'TEAM' && ['Lawyer', 'Copywriter'].includes(reference)) { result.add(reference.toLowerCase()); continue; }
            const dependency = await confinePath(workspace.projectPath, resolve(dirname(target), reference));
            if (declaration.kind === 'TEAM') {
                const advisor = await readFile(dependency, 'utf8');
                const name = advisor.split(/\r?\n/).find((part) => part.trim())?.trim().toLowerCase();
                if (name === 'lawyer' || name === 'copywriter') result.add(name);
            } else {
                for (const name of await localAdvisors(workspace, dependency, stack)) result.add(name);
            }
        }
    }
    stack.delete(target);
    return result;
}

/** Initializes a Book-based project while preserving edited files and scripts.
 * @private Internal authoring command.
 */
export async function initializeProject(workspace: Workspace): Promise<string[]> {
    await requireGit(workspace, true);
    const changed: string[] = [];
    for (const [path, content] of Object.entries(DEFAULT_BOOKS)) {
        await writeMissing(workspace, join(workspace.projectPath, path), content, changed);
    }
    for (const role of ['developer', 'planner']) {
        const path = await confinePath(workspace.projectPath, join(workspace.projectPath, 'agents', `${role}.book`));
        const book = await readFile(path, 'utf8');
        let existing: Set<string>;
        try { existing = await localAdvisors(workspace, path); }
        catch (error) { process.stderr.write(`${(error as Error).message} Preserved this Book without adding TEAM declarations.\n`); continue; }
        const advisors = ['lawyer', 'copywriter'].filter(name => !existing.has(name));
        if (advisors.length) {
            const declarations = advisors.map(name => `TEAM Consult {./${name}.book} when this expertise is useful.`).join('\n');
            const updated = /^CLOSED\s*$/m.test(book) ? book.replace(/^CLOSED\s*$/m, `${declarations}\n\nCLOSED`) : `${book}\n${declarations}\n`;
            await replaceSnapshot(workspace, path, book, updated);
            if (!changed.includes(path)) changed.push(path);
        }
    }
    await writeMissing(workspace, join(workspace.projectPath, 'AGENTS.md'), '# Project instructions\n\nDescribe coding conventions and required checks here.\n', changed);
    await writeMissing(workspace, join(workspace.tasksPath, 'README.md'), '<!--ptbk-coder-ignore-->\n# Tasks\n\nAdd work with `ptbk coder add "Describe the task"`. Only top-level task Books are executable.\n', changed);
    await writeMissing(workspace, join(workspace.tasksPath, 'templates', 'task.book'), 'Task template\n\nTASK\nMETA ID @@@\nSTATUS not-ready\nPRIORITY 0\n\nPROMPT\n@@@ Describe the task and acceptance criteria.\n', changed);
    await writeMissing(workspace, join(workspace.projectPath, '.env.example'), '# Select an installed coding harness, for example:\n# PTBK_HARNESS=openai-codex\n# PTBK_THINKING_LEVEL=max\n', changed);
    await appendMissing(workspace, join(workspace.projectPath, '.gitignore'), ['.promptbook/', '.env', 'node_modules/'], changed);
    await appendMissing(workspace, join(workspace.projectPath, '.gitattributes'), ['* text=auto'], changed);
    const packagePath = await confinePath(workspace.projectPath, join(workspace.projectPath, 'package.json'));
    try {
        const original = await readFile(packagePath, 'utf8');
        const configuration = JSON.parse(original) as { scripts?: Record<string, string> };
        const scripts = configuration.scripts ||= {};
        if (scripts.check === undefined) {
            const checks = ['typecheck', 'lint', 'test', 'build'].filter(name => scripts[name] && !/\b(?:ptbk|coder|npm (?:run )?check)\b/.test(scripts[name]));
            scripts.check = checks.length ? checks.map(name => `npm run ${name}`).join(' && ') : 'node -e "console.error(\'Configure a real project check script before running coder checks.\'); process.exit(1)"';
            process.stdout.write(`Initialized check scope: ${checks.join(', ') || 'setup placeholder (fails until configured)'}.\n`);
        }
        scripts['coder:run'] ??= 'ptbk coder run --harness openai-codex --thinking-level max';
        scripts['coder:list'] ??= 'ptbk coder list';
        const updated = `${JSON.stringify(configuration, null, 4)}\n`;
        if (JSON.stringify(JSON.parse(original)) !== JSON.stringify(configuration)) { await replaceSnapshot(workspace, packagePath, original, updated); changed.push(packagePath); }
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    return changed;
}

/** Creates one reviewed authoring task without calling a model.
 * @private Internal add command.
 */
export async function addTask(workspace: Workspace, description: string, options: { priority?: number; template?: string; status?: TaskDefinition['status'] } = {}): Promise<string> {
    await requireGit(workspace);
    if (!description.trim()) throw new InputError('A non-empty task description is required.');
    if (!Number.isSafeInteger(options.priority ?? 0) || (options.priority ?? 0) < 0) throw new InputError('Priority must be a nonnegative safe integer.');
    let payload = description;
    if (options.template) {
        const path = await confinePath(workspace.projectPath, resolve(workspace.projectPath, options.template));
        const template = await readFile(path, 'utf8');
        const parsed = parseBook(template, path, workspace.timezone);
        const templatePayload = parsed ? parsed.payload : template;
        payload = templatePayload.includes('{{description}}') ? templatePayload.replaceAll('{{description}}', description) : `${templatePayload}\n\n${description}`;
    }
    const id = randomUUID();
    const title = description.split(/\r?\n/).find(line => line.trim())!.trim();
    const slug = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64) || 'task';
    const path = await confinePath(workspace.projectPath, join(workspace.tasksPath, `${new Date().toISOString().slice(0, 10)}-${slug}-${id.slice(0, 8)}.book`));
    const task: TaskDefinition = { id, title, payload, rules: [], status: options.status ?? (payload.includes('@@@') ? 'not-ready' : 'todo'), priority: options.priority ?? 0, runners: [], scheduleRevision: scheduleRevision(), diagnostics: [], source: { format: 'book', path, relativePath: relative(workspace.projectPath, path), projectPath: workspace.projectPath, sectionIndex: 0, revision: '' } };
    const content = serializeTaskBook(task);
    const parsed = parseBook(content, path, workspace.timezone);
    if (!parsed || parsed.diagnostics.length) throw new InputError(`Invalid authored task: ${parsed?.diagnostics.join('; ')}`);
    await confinePath(workspace.projectPath, workspace.tasksPath);
    await mkdir(workspace.tasksPath, { recursive: true });
    await confinePath(workspace.projectPath, path);
    await writeFile(path, content, { flag: 'wx' });
    return path;
}

/** Creates unfinished task templates that cannot run automatically.
 * @private Internal boilerplate command.
 */
export async function generateBoilerplates(workspace: Workspace, count: string): Promise<string[]> {
    if (!/^\d+(?:\*\d+)?$/.test(count)) throw new InputError('--count must be N or N*M.');
    const factors = count.split('*').map(Number);
    const total = factors.reduce((product, factor) => product * factor, 1);
    if (!Number.isSafeInteger(total) || total < 1 || total > 1000) throw new InputError('--count must produce 1 to 1000 templates.');
    const paths = [];
    for (let index = 0; index < total; index++) paths.push(await addTask(workspace, `@@@ Task ${index + 1}\n\n@@@ Define acceptance criteria.`, { status: 'not-ready' }));
    return paths;
}

/** Performs human review without running checks or a harness.
 * @private Internal verify command.
 */
export async function verifyTasks(workspace: Workspace, options: { noQuestions?: boolean; ignore?: string[]; ask?: (question: string) => Promise<string> }): Promise<string[]> {
    if (options.noQuestions || (!options.ask && !process.stdin.isTTY)) throw new InputError('verify requires interactive human review. Run it in a terminal without --no-questions.');
    const tasks = (await discoverTasks(workspace)).filter(task => task.status === 'done' && !task.repeat && !(options.ignore || []).some(filter => task.source.relativePath.includes(filter)));
    const changed: string[] = [];
    const terminal = options.ask ? undefined : createInterface({ input: process.stdin, output: process.stdout });
    const question = options.ask ?? ((prompt: string) => terminal!.question(prompt));
    const reviewed = new Map<string, Set<number>>();
    try {
        for (const task of tasks) {
            process.stdout.write(`\n${task.title}\n${task.source.relativePath}\n${task.payload}\n`);
            const answer = (await question('Review [a]rchive, [f]ollow-up, [s]kip, [q]uit: ')).trim().toLowerCase();
            if (answer === 'q') break;
            if (answer === 'f') {
                const description = await question('Follow-up task: ');
                if (checksum(await readFile(await confinePath(workspace.projectPath, task.source.path))) !== task.source.revision) throw new InputError(`Task changed during review: ${task.source.path}; review the new version first.`);
                changed.push(await addTask(workspace, description));
            } else if (answer === 'a') {
                const source = await confinePath(workspace.projectPath, task.source.path);
                if (checksum(await readFile(source)) !== task.source.revision) throw new InputError(`Task changed during review: ${task.source.path}; current contents are preserved.`);
                const accepted = reviewed.get(source) ?? new Set<number>();
                accepted.add(task.source.sectionIndex);
                reviewed.set(source, accepted);
                if (task.source.format === 'markdown') {
                    const sections = (await discoverTasks(workspace)).filter(other => other.source.path === task.source.path);
                    if (sections.some(other => other.status !== 'done') || sections.some(other => !accepted.has(other.source.sectionIndex))) {
                        process.stdout.write('This Markdown file will be archived only after every completed section is reviewed and every unfinished section is resolved.\n');
                        continue;
                    }
                }
                const target = await confinePath(workspace.projectPath, join(dirname(task.source.path), 'done', task.source.path.split(/[\\/]/).pop()!));
                await mkdir(dirname(target), { recursive: true });
                await confinePath(workspace.projectPath, source);
                await confinePath(workspace.projectPath, target);
                try { await link(source, target); }
                catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new InputError(`Archive already exists: ${target}`); throw error; }
                if (checksum(await readFile(source)) !== task.source.revision) {
                    await unlink(target);
                    throw new InputError(`Task changed before archival: ${task.source.path}; current contents are preserved.`);
                }
                await unlink(source);
                changed.push(task.source.path, target);
            }
        }
    } finally { terminal?.close(); }
    return changed;
}
