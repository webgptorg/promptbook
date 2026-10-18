import { writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { ensureDirectory, listDirectory, pathExists, readTextIfExists } from '../common/fs.js';
import { nameKey } from '../tasks/model.js';
import { readTaskQueue } from '../tasks/sources.js';
import { AgentCatalog } from './agents.js';
import { CORE_AGENTS, DEFAULT_ROLES, FIRST_TASK_NAMES, LEGACY_STARTER_TASK_ID, RUNTIME_IGNORE_LINE, TASK_TEMPLATES, projectInstructions } from './defaults.js';
import { git, gitOrThrow, inspectGit } from './git.js';

/**
 * Writes a new file only when it does not exist yet; returns whether it was created.
 */
async function createIfMissing(path: string, content: string): Promise<boolean> {
    if (await pathExists(path)) return false;
    await ensureDirectory(dirname(path));
    await writeFile(path, content, { flag: 'wx' });
    return true;
}

/**
 * Reuses the enclosing repository or initializes a new one in the project directory.
 *
 * @private project setup
 */
export async function ensureGitRepository(root: string): Promise<{ created: boolean; repositoryRoot: string }> {
    await ensureDirectory(root);
    const info = await inspectGit(root);
    if (info.state === 'repository') return { created: false, repositoryRoot: info.root };
    if (info.state === 'missing-git') throw new PtbkError('Git is required but not available.', { kind: 'setup', reason: info.reason, next: ['Install Git and retry `ptbk init`.'] });
    if (info.state === 'bare') throw new PtbkError('The destination is inside a bare Git repository.', { kind: 'setup', reason: info.gitDir, next: ['Choose a directory in a working tree.'] });
    if (info.state === 'damaged') throw new PtbkError('The Git repository is damaged.', { kind: 'setup', reason: info.reason, next: ['Repair the repository (e.g. `git status`) and retry.'] });
    await ensureDirectory(root);
    await gitOrThrow(root, ['init', '--quiet'], { phase: 'git init' });
    return { created: true, repositoryRoot: resolve(root) };
}

/**
 * Ensures `.ptbk/` is ignored through the project's `.gitignore`.
 *
 * @private project setup
 */
export async function ensureRuntimeIgnore(root: string, extraLines: readonly string[] = []): Promise<string | undefined> {
    const path = join(root, '.gitignore');
    const content = (await readTextIfExists(path)) ?? '';
    const lines = content.split(/\r?\n/).map((line) => line.trim());
    const missing = [RUNTIME_IGNORE_LINE, ...extraLines].filter((line) => !lines.includes(line) && !lines.includes(line.replace(/\/$/, '')) && !lines.includes(`/${line}`));
    if (!missing.length) return undefined;
    const prefix = content && !content.endsWith('\n') ? '\n' : '';
    await writeFile(path, `${content}${prefix}${content ? '\n' : ''}# Promptbook runtime state\n${missing.join('\n')}\n`);
    return path;
}

/**
 * Trace policy deciding which evidence Git versions.
 *
 * @private project setup
 */
export type TraceGitPolicy = { readonly commit: boolean; readonly ignoreVideos: boolean };

/**
 * First line of the managed trace block in `.gitignore`.
 */
const TRACE_BLOCK_START = '# >>> ptbk traces (managed from ptbk.json "traces"; change those settings instead)';

/**
 * Last line of the managed trace block in `.gitignore`.
 */
const TRACE_BLOCK_END = '# <<< ptbk traces';

/**
 * Ignore lines implementing a trace policy.
 *
 * Without trace commits the whole root-level tree is ignored (its videos too); with them, videos can still be
 * excluded, and events appended after a result commit (`local/`) never dirty the tree again.
 *
 * @private project setup
 */
export function traceIgnoreLines(policy: TraceGitPolicy): string[] {
    if (!policy.commit) return ['/traces/'];
    return [...(policy.ignoreVideos ? ['/traces/*/video/'] : []), '/traces/*/local/'];
}

/**
 * Brings the managed trace block of `.gitignore` in line with the policy, preserving every other entry.
 *
 * Returns the changed path, or `undefined` when the rules already match. Already tracked files stay tracked.
 *
 * @private project setup
 */
export async function ensureTraceIgnoreRules(root: string, policy: TraceGitPolicy): Promise<string | undefined> {
    const path = join(root, '.gitignore');
    const content = (await readTextIfExists(path)) ?? '';
    const newline = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(/\r?\n/);
    const block = [TRACE_BLOCK_START, ...traceIgnoreLines(policy), TRACE_BLOCK_END];
    const start = lines.indexOf(TRACE_BLOCK_START);
    const end = start >= 0 ? lines.indexOf(TRACE_BLOCK_END, start) : -1;
    let next: string[];
    if (start >= 0 && end > start) {
        if (lines.slice(start, end + 1).join('\n') === block.join('\n')) return undefined;
        next = [...lines.slice(0, start), ...block, ...lines.slice(end + 1)];
    } else {
        const body = [...lines];
        while (body.length && body[body.length - 1] === '') body.pop();
        next = [...body, ...(body.length ? [''] : []), ...block, ''];
    }
    const text = next.join(newline);
    await writeFile(path, text.endsWith(newline) ? text : `${text}${newline}`);
    return path;
}

/**
 * Whether the managed trace block of `.gitignore` matches the policy.
 *
 * @private project setup
 */
export async function traceIgnoreRulesMatch(root: string, policy: TraceGitPolicy): Promise<boolean> {
    const lines = ((await readTextIfExists(join(root, '.gitignore'))) ?? '').split(/\r?\n/);
    const start = lines.indexOf(TRACE_BLOCK_START);
    const end = start >= 0 ? lines.indexOf(TRACE_BLOCK_END, start) : -1;
    return start >= 0 && end > start && lines.slice(start + 1, end).join('\n') === traceIgnoreLines(policy).join('\n');
}

/**
 * Creates missing core agents individually (existing customized files are never overwritten).
 *
 * @private project setup
 */
export async function ensureCoreAgents(root: string, agentsDirectory: string): Promise<string[]> {
    const created: string[] = [];
    // A role is present when any Book already uses its name (even one needing conversion): never create a twin.
    const index = (await AgentCatalog.load(root, agentsDirectory)).index;
    for (const agent of CORE_AGENTS) {
        if (index.winnerOf(nameKey(agent.name))) continue;
        const path = join(root, agentsDirectory, agent.file);
        if (await createIfMissing(path, agent.content)) created.push(path);
    }
    return created;
}

/**
 * Creates the default ordinary roles when the project has no ordinary agents yet.
 *
 * @private project setup
 */
export async function ensureDefaultRoles(root: string, agentsDirectory: string): Promise<string[]> {
    const catalog = await AgentCatalog.load(root, agentsDirectory);
    // Any visible Book in the agents folder (valid or awaiting conversion) means the project has its own roles.
    if (catalog.ordinary().length || catalog.index.all().some((entry) => entry.root === 'agents' && !entry.hidden && entry.tier !== 4)) return [];
    const created: string[] = [];
    for (const role of DEFAULT_ROLES) {
        const path = join(root, agentsDirectory, role.file);
        if (await createIfMissing(path, role.content)) created.push(path);
    }
    return created;
}

/**
 * Creates missing task templates.
 *
 * @private project setup
 */
export async function ensureTemplates(root: string, tasksDirectory: string): Promise<string[]> {
    const created: string[] = [];
    for (const template of TASK_TEMPLATES) {
        const path = join(root, tasksDirectory, 'templates', template.file);
        if (await createIfMissing(path, template.content)) created.push(path);
    }
    return created;
}

/**
 * Creates `AGENTS.md` when the project has no instructions file.
 *
 * @private project setup
 */
export async function ensureProjectInstructions(root: string, name: string, check?: string): Promise<string | undefined> {
    const path = join(root, 'AGENTS.md');
    return (await createIfMissing(path, projectInstructions({ name, check }))) ? path : undefined;
}

/**
 * Whether the project already has its first task: the Expert bootstrap or an older readiness starter, open,
 * completed or archived (it is never duplicated, reopened or resurrected).
 *
 * @private project setup
 */
export async function hasFirstTask(options: { root: string; tasksDirectory: string; timeZone: string; knownNames?: readonly string[] }): Promise<boolean> {
    const keys = new Set([...FIRST_TASK_NAMES, ...(options.knownNames ?? [])].map((name) => nameKey(name)));
    const queue = await readTaskQueue({ root: options.root, tasksDirectory: options.tasksDirectory, timeZone: options.timeZone });
    // The bootstrap is recognized by its origin (its generated name carries its creation time) or a former name/ID.
    if (queue.tasks.some((task) => task.origin === 'initialization' || keys.has(task.key) || task.legacyId === LEGACY_STARTER_TASK_ID)) return true;
    const archive = join(options.root, options.tasksDirectory, 'archive');
    for (const archived of await listDirectory(archive)) {
        const text = archived.isFile ? await readTextIfExists(join(archive, archived.name)) : undefined;
        if (!text) continue;
        const firstLine = text.split(/\r?\n/).find((line) => line.trim()) ?? '';
        if (/^TASK ORIGIN initialization\s*$/m.test(text) || keys.has(nameKey(firstLine.replace(/^#+\s*/, '').replace(/^TASK\s+/, ''))) || text.includes(`TASK ID ${LEGACY_STARTER_TASK_ID}`) || text.includes(`ptbk-task-id: ${LEGACY_STARTER_TASK_ID}`)) return true;
    }
    return false;
}

/**
 * Whether a destination is empty (missing, or containing nothing but a `.git` directory).
 *
 * @private project setup
 */
export async function isFreshDirectory(root: string): Promise<boolean> {
    const entries = await listDirectory(root);
    return entries.every((entry) => entry.name === '.git' || entry.name === '.DS_Store');
}

/**
 * Child-project strategy inside an existing Git working tree.
 *
 * @private project setup
 */
export type NestedStrategy = 'ignored' | 'submodule';

/**
 * Prepares a new child project inside the enclosing repository: ignored independent repository or real submodule.
 *
 * Parent changes are left uncommitted; the child gets its own repository.
 *
 * @private project setup
 */
export async function prepareNestedChild(options: { parentRoot: string; childRoot: string; strategy: NestedStrategy; submoduleUrl?: string }): Promise<{ parentChanges: string[] }> {
    const relativePath = relative(options.parentRoot, options.childRoot).split(sep).join('/');
    if (!relativePath || relativePath.startsWith('..')) throw new PtbkError('The child project must be inside the enclosing repository.', { kind: 'usage' });
    const tracked = await git(options.parentRoot, ['ls-files', '--', relativePath]);
    if (tracked.stdout.trim()) {
        throw new PtbkError(`The parent repository already tracks files under ${relativePath}.`, {
            kind: 'conflict',
            reason: 'Already tracked content requires explicit resolution.',
            next: ['Choose another folder, or untrack the content in the parent yourself (`git rm --cached`).'],
        });
    }
    if (!(await isFreshDirectory(options.childRoot))) throw new PtbkError(`${options.childRoot} is not empty.`, { kind: 'conflict', next: ['Choose an empty or new folder.'] });
    await ensureDirectory(options.childRoot);
    const parentChanges: string[] = [];
    if (options.strategy === 'ignored') {
        const ignorePath = join(options.parentRoot, '.gitignore');
        const content = (await readTextIfExists(ignorePath)) ?? '';
        const entry = `/${relativePath}/`;
        if (!content.split(/\r?\n/).some((line) => line.trim() === entry || line.trim() === `/${relativePath}` || line.trim() === `${relativePath}/`)) {
            await writeFile(ignorePath, `${content}${content && !content.endsWith('\n') ? '\n' : ''}${entry}\n`);
            parentChanges.push(ignorePath);
        }
        const child = await inspectGit(options.childRoot);
        if (child.state !== 'repository' || resolve(child.root) !== resolve(options.childRoot)) await gitOrThrow(options.childRoot, ['init', '--quiet'], { phase: 'child git init' });
        return { parentChanges };
    }
    if (!options.submoduleUrl) throw new PtbkError('A submodule needs an explicit source URL for later checkout.', { kind: 'usage', next: ['Pass `--submodule-url <url>` (an existing remote you control), or choose the ignored strategy.'] });
    const child = await inspectGit(options.childRoot);
    if (child.state !== 'repository' || resolve(child.root) !== resolve(options.childRoot)) await gitOrThrow(options.childRoot, ['init', '--quiet'], { phase: 'child git init' });
    return { parentChanges };
}

/**
 * Registers an initialized child repository (with a committed baseline) as a submodule of the parent.
 *
 * @private project setup
 */
export async function registerSubmodule(parentRoot: string, childRoot: string, url: string): Promise<string[]> {
    const relativePath = relative(parentRoot, childRoot).split(sep).join('/');
    await gitOrThrow(parentRoot, ['submodule', 'add', '--quiet', url, relativePath], { phase: 'submodule registration' });
    return [join(parentRoot, '.gitmodules'), childRoot];
}

