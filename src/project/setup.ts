import { writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { ensureDirectory, listDirectory, pathExists, readTextIfExists } from '../common/fs.js';
import { formatAgentReference } from '../book/references.js';
import { readTaskQueue } from '../tasks/sources.js';
import { AgentCatalog } from './agents.js';
import { CORE_AGENTS, DEFAULT_ROLES, RUNTIME_IGNORE_LINE, STARTER_TASK_ID, TASK_TEMPLATES, projectInstructions, starterTask } from './defaults.js';
import { git, gitOrThrow, inspectGit } from './git.js';
import { newTaskPath } from '../tasks/authoring.js';

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
 * Creates missing core agents individually (existing customized files are never overwritten).
 *
 * @private project setup
 */
export async function ensureCoreAgents(root: string, agentsDirectory: string): Promise<string[]> {
    const created: string[] = [];
    for (const agent of CORE_AGENTS) {
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
    if (catalog.ordinary().length) return [];
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
 * Creates the first runnable task once per project (never duplicated, reopened or resurrected).
 *
 * @private project setup
 */
export async function ensureStarterTask(options: { root: string; tasksDirectory: string; agentsDirectory: string; timeZone: string; alreadyCreated: boolean; skip?: boolean }): Promise<string | undefined> {
    if (options.alreadyCreated || options.skip) return undefined;
    const tasksRoot = join(options.root, options.tasksDirectory);
    const queue = await readTaskQueue({ root: options.root, tasksDirectory: options.tasksDirectory, timeZone: options.timeZone });
    if (queue.tasks.some((task) => task.id === STARTER_TASK_ID)) return undefined;
    for (const archived of await listDirectory(join(tasksRoot, 'archive'))) {
        if (archived.isFile && (await readTextIfExists(join(tasksRoot, 'archive', archived.name)))?.includes(`TASK ID ${STARTER_TASK_ID}`)) return undefined;
    }
    const catalog = await AgentCatalog.load(options.root, options.agentsDirectory);
    const developer = catalog.ordinary().find((definition) => definition.normalized === 'developer');
    const path = await newTaskPath(tasksRoot, 'promptbook readiness check', Date.now(), options.timeZone);
    await ensureDirectory(tasksRoot);
    await writeFile(path, starterTask({ agent: developer ? formatAgentReference(developer.name) : undefined }), { flag: 'wx' });
    return path;
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

