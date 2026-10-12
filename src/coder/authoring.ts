import { mkdir, readFile, readdir, writeFile, rename, unlink, stat, link } from 'node:fs/promises';
import { join, dirname, relative, resolve, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { promptText } from './interactive.js';
import type { Workspace, TaskDefinition } from './domain.js';
import { serializeTaskBook, discoverTasks, checksum, parseBook } from './sources.js';
import { scheduleRevision } from './schedule.js';
import { confinePath, InputError, requireGit } from './workspace.js';
import { discoverAgents, ensureCoreAgents, normalizeAgentName } from './agents.js';
import { ensureProjectConfiguration, readProjectConfiguration } from './configuration.js';

/** Minimal locally resolvable roles supplied by project initialization. */
const DEFAULT_BOOKS: Record<string, string> = {
    'agents/developer.book': 'Developer\n\nFROM {./.core/adam.book}\nGOAL Implement the task with maintainable code.\nRULE Read project instructions and verify changes.\nTEAM Consult {./lawyer.book} for legal questions.\nTEAM Consult {./copywriter.book} for user-facing text.\nTEAM Ask @User about missing project intent and @Expert about Promptbook operation.\n',
    'agents/planner.book': 'Planner\n\nFROM {./.core/adam.book}\nGOAL Propose clear, reviewable tasks without changing application code.\nTEAM Consult {./lawyer.book} for legal questions.\nTEAM Consult {./copywriter.book} for user-facing text.\nTEAM Ask @User about missing project intent and @Expert about Promptbook operation.\n',
    'agents/lawyer.book': 'Lawyer\n\nGOAL Explain legal constraints and uncertainty.\n',
    'agents/copywriter.book': 'Copywriter\n\nGOAL Write clear user-facing text.\n',
};

/** Exact generated callers that can be migrated without interpreting user shell code. */
const GENERATED_SCRIPTS: Record<string, string> = {
    'coder:run': 'ptbk run --harness openai-codex --thinking-level max',
    'coder:list': 'ptbk list',
    'coder:fix': 'ptbk fix --harness openai-codex --thinking-level max',
    'coder:plan': 'ptbk plan --harness openai-codex --thinking-level max',
};

/** Preserve custom callers while explaining the removed historical command group. */
function diagnoseLegacyCaller(location: string, content: string): void {
    if (/\bptbk\s+coder\b/.test(content)) process.stderr.write(`Historical ptbk coder invocation in ${location}. Update it to ptbk <command>; preserved custom content.\n`);
}

/** Inspect custom workflows without rewriting YAML or following external symlinks. */
async function diagnoseWorkflows(workspace: Workspace): Promise<void> {
    const directory = await confinePath(workspace.projectPath, join(workspace.projectPath, '.github', 'workflows'));
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
        if (!entry.isFile() || !/\.ya?ml$/.test(entry.name)) continue;
        const file = await confinePath(workspace.projectPath, join(directory, entry.name));
        diagnoseLegacyCaller(relative(workspace.projectPath, file), await readFile(file, 'utf8'));
    }
}

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

/** Initializes a Book-based project while preserving edited files and scripts.
 * @private Internal authoring command.
 */
export async function initializeProject(workspace: Workspace): Promise<string[]> {
    await readProjectConfiguration(workspace.projectPath);
    const packagePath = await confinePath(workspace.projectPath, join(workspace.projectPath, 'package.json'));
    try {
        const metadata: unknown = JSON.parse(await readFile(packagePath, 'utf8'));
        if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new InputError(`${packagePath}: package metadata must be an object.`);
        const scripts = (metadata as { scripts?: unknown }).scripts;
        if (scripts !== undefined && (!scripts || typeof scripts !== 'object' || Array.isArray(scripts) || Object.values(scripts).some(command => typeof command !== 'string'))) throw new InputError(`${packagePath}.scripts: expected an object of command strings.`);
    } catch (error) {
        if (error instanceof SyntaxError) throw new InputError(`${packagePath}: invalid package JSON: ${error.message}`);
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    await requireGit(workspace, true);
    const changed: string[] = [];
    changed.push(...await ensureCoreAgents(workspace.projectPath));
    const agents = await discoverAgents(workspace.projectPath);
    for (const [path, content] of Object.entries(DEFAULT_BOOKS)) {
        const identity = normalizeAgentName(content.split('\n')[0]!);
        if (!agents.some((agent) => agent.normalizedName === identity)) await writeMissing(workspace, join(workspace.projectPath, path), content, changed);
    }
    await writeMissing(workspace, join(workspace.projectPath, 'AGENTS.md'), '# Project instructions\n\nDescribe coding conventions and required checks here.\n', changed);
    await writeMissing(workspace, join(workspace.tasksPath, 'README.md'), '<!--ptbk-coder-ignore-->\n# Tasks\n\nAdd work with `ptbk add "Describe the task"`. Only top-level task Books are executable.\n', changed);
    await writeMissing(workspace, join(workspace.tasksPath, 'templates', 'task.book'), 'TASK @@@ Task template\n\nTASK STATUS not-ready\nTASK PRIORITY 0\n\n@@@ Describe the task and acceptance criteria.\n', changed);
    await writeMissing(workspace, join(workspace.projectPath, '.env.example'), '# Select an installed coding harness, for example:\n# PTBK_HARNESS=openai-codex\n# PTBK_THINKING_LEVEL=max\n', changed);
    await appendMissing(workspace, join(workspace.projectPath, '.gitignore'), ['.ptbk/', '.env', 'node_modules/'], changed);
    await appendMissing(workspace, join(workspace.projectPath, '.gitattributes'), ['* text=auto'], changed);
    changed.push(...await ensureProjectConfiguration(workspace));
    await writeMissing(workspace, packagePath, `${JSON.stringify({ name: basename(workspace.projectPath).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[._]+/, '').slice(0, 214) || 'promptbook-project', private: true, scripts: {} }, null, 4)}\n`, changed);
    try {
        const original = await readFile(packagePath, 'utf8');
        const configuration = JSON.parse(original) as { scripts?: Record<string, string> };
        const scripts = configuration.scripts ||= {};
        if (scripts.check === undefined) {
            const checks = ['typecheck', 'lint', 'test', 'build'].filter(name => scripts[name] && !/\b(?:ptbk|coder|npm (?:run )?check)\b/.test(scripts[name]));
            scripts.check = checks.length ? checks.map(name => `npm run ${name}`).join(' && ') : 'node -e "console.error(\'Configure a real project check script before running ptbk checks.\'); process.exit(1)"';
            process.stdout.write(`Initialized check scope: ${checks.join(', ') || 'setup placeholder (fails until configured)'}.\n`);
        }
        for (const [name, command] of Object.entries({ 'ptbk:start': 'ptbk start', 'ptbk:run': 'ptbk run', 'ptbk:list': 'ptbk list', ...GENERATED_SCRIPTS })) {
            if (scripts[name] === undefined || scripts[name] === command.replace('ptbk ', 'ptbk coder ')) scripts[name] = command;
        }
        for (const [name, command] of Object.entries(scripts)) diagnoseLegacyCaller(`scripts.${name}`, command);
        const updated = `${JSON.stringify(configuration, null, 4)}\n`;
        if (JSON.stringify(JSON.parse(original)) !== JSON.stringify(configuration)) { await replaceSnapshot(workspace, packagePath, original, updated); changed.push(packagePath); }
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    await diagnoseWorkflows(workspace);
    return [...new Set(changed)];
}

/** Creates one reviewed authoring task without calling a model.
 * @private Internal add command.
 */
export async function addTask(workspace: Workspace, description: string, options: { priority?: number; template?: string; status?: TaskDefinition['status']; agent?: string; origin?: string; parent?: string; dependencies?: string[] } = {}): Promise<string> {
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
    const task: TaskDefinition = { id, title, payload, rules: [], status: options.status ?? (payload.includes('@@@') ? 'not-ready' : 'todo'), priority: options.priority ?? 0, ...(options.agent ? { agent: options.agent } : {}), ...(options.origin ? { origin: options.origin } : {}), ...(options.parent ? { parent: options.parent } : {}), ...(options.dependencies ? { dependencies: options.dependencies } : {}), runners: [], scheduleRevision: scheduleRevision(), diagnostics: [], source: { format: 'book', path, relativePath: relative(workspace.projectPath, path), projectPath: workspace.projectPath, sectionIndex: 0, revision: '' } };
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
    const question = options.ask ?? ((prompt: string) => promptText(prompt));
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
    } finally { reviewed.clear(); }
    return changed;
}
