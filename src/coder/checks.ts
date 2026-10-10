import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Workspace } from './domain.js';
import { runProcess, redactSecrets } from './harness.js';
import { assertSnapshot, captureSnapshot, changedPaths, git, isRuntimePath, readFileSnapshot, sameFile, writeFileSnapshot, type GitSnapshot } from './git.js';

/** Real validation outcome and all imported checker changes. @private */
export interface CheckResult { outcome: 'passed' | 'failed' | 'setup' | 'cancelled'; exitCode: number | null; output: string; changedPaths: string[]; command: string; viewPath?: string }
/** Check execution controls supplied by the common engine. @private */
export interface CheckOptions { signal?: AbortSignal; protectedPaths?: string[]; onOutput?: (text: string) => void; preserveView?: boolean; assertOwned?: () => Promise<void> }
/** A private execution result and the exact imported paths. @private */
export interface PrivateOperationResult<T> { result: T; changedPaths: string[]; viewPath?: string }
/** Reject unavailable and recursive generated validation rather than pretending it passed. @private */
export async function validateCheck(workspace: Workspace, command: string): Promise<void> {
    if (!command.trim()) throw new Error('Check setup error: --check must contain a validation command.');
    if (/\bptbk\s+(?:coder\s+)?(?:run|fix|server)\b/.test(command)) throw new Error('Check setup error: the validation command recursively invokes ptbk. Configure a project validation command.');
    if (/^npm\s+run\s+check(?:\s+--.*)?$/.test(command.trim())) {
        let pkg: { scripts?: Record<string, string> };
        try { pkg = JSON.parse(await fs.readFile(path.join(workspace.projectPath, 'package.json'), 'utf8')) as typeof pkg; }
        catch (error) { throw new Error(`Check setup error: cannot read project package.json: ${(error as Error).message}`); }
        const stack = new Set<string>();
        /** Walk referenced npm scripts so indirect recursion cannot hang validation. */
        function inspect(name: string): void {
            const script = pkg.scripts?.[name];
            if (!script || stack.has(name) || /\bptbk\s+(?:coder\s+)?(?:run|fix|server)\b/.test(script) || /PTBK_CHECK_SETUP_REQUIRED|Configure a real project check script/.test(script)) throw new Error(`Check setup error: scripts.${name} is missing, recursive, or an unconfigured setup placeholder. Configure real validation first.`);
            stack.add(name);
            for (const match of script.matchAll(/\bnpm\s+(?:run(?:-script)?\s+([a-zA-Z0-9:_-]+)|(test|start))\b/g)) inspect(match[1] ?? match[2]!);
            stack.delete(name);
        }
        inspect('check');
    }
}
/** Copy the live checkout, including ignored dependencies, without copying any operational views. @private */
async function populateView(root: string, view: string, baseline: GitSnapshot): Promise<void> {
    const original = await captureSnapshot(view, true);
    for (const name of Object.keys(original.files)) if (!baseline.files[name]) await writeFileSnapshot(view, name);
    /** Copy only source descendants, excluding the private destination before descending. */
    async function copyDirectory(source: string, destination: string): Promise<void> {
        await fs.mkdir(destination, { recursive: true });
        for (const entry of await fs.readdir(source, { withFileTypes: true })) {
            const from = path.join(source, entry.name); const to = path.join(destination, entry.name);
            const relative = path.relative(root, from).split(path.sep).join('/');
            if (entry.name === '.git' || isRuntimePath(relative)) continue;
            if (entry.isDirectory()) await copyDirectory(from, to);
            else {
                const stat = await fs.lstat(from);
                await fs.rm(to, { force: true, recursive: true });
                if (entry.isSymbolicLink()) await fs.symlink(await fs.readlink(from), to);
                else if (entry.isFile()) { await fs.copyFile(from, to); await fs.chmod(to, stat.mode); }
            }
        }
    }
    await copyDirectory(root, view);
    // Reapply captured bytes so the checked version is the declared boundary, even if copying raced.
    for (const [name, entry] of Object.entries(baseline.files)) await writeFileSnapshot(view, name, entry);
}
/** Run validation in a private Git checkout and import its delta only across an unchanged boundary. @private */
export async function runPrivateOperation<T>(workspace: Workspace, operation: (privateWorkspace: Workspace) => Promise<T>, options: CheckOptions = {}): Promise<PrivateOperationResult<T>> {
    const root = workspace.gitRoot ?? workspace.projectPath;
    const baseline = await captureSnapshot(root, true);
    const directory = path.join(workspace.statePath, 'check-views'); await fs.mkdir(directory, { recursive: true });
    const view = path.join(directory, randomUUID());
    let registered = false; let preserve = options.preserveView ?? false;
    try {
        if (baseline.head) { await git(root, ['worktree', 'add', '--detach', view, baseline.head]); registered = true; }
        else { await fs.mkdir(view); await git(view, ['init', '--quiet']); }
        await populateView(root, view, baseline);
        await assertSnapshot(baseline, { ignored: true });
        await options.assertOwned?.();
        const map = (filename: string) => path.join(view, path.relative(root, filename));
        const privateWorkspace: Workspace = { ...workspace, gitRoot: view, projectPath: map(workspace.projectPath), tasksPath: map(workspace.tasksPath), legacyPath: map(workspace.legacyPath) };
        const privateBoundary = await captureSnapshot(view);
        const result = await operation(privateWorkspace);
        const checked = await captureSnapshot(view, true);
        if (checked.head !== privateBoundary.head || checked.index !== privateBoundary.index || checked.indexFlags !== privateBoundary.indexFlags) throw new Error('Private operation changed Git HEAD or index; its content was preserved for review and not imported.');
        const delta = await changedPaths({ ...baseline, root: view }, checked);
        await assertSnapshot(baseline, { ignored: true });
        await options.assertOwned?.();
        const protectedPaths = options.protectedPaths ?? baseline.dirtyPaths;
        const overlaps = delta.filter((name) => protectedPaths.includes(name));
        if (overlaps.length) { preserve = true; throw new Error(`Check import overlaps pre-existing user work: ${overlaps.join(', ')}. Live work and private check view ${view} were preserved.`); }
        for (const name of delta) {
            await options.assertOwned?.();
            // Recheck each target immediately before replacing it, to catch edits during import.
            const live = await readFileSnapshot(root, name);
            if (!sameFile(live, baseline.files[name])) { preserve = true; throw new Error(`Concurrent edit to ${name}; private check view preserved at ${view}.`); }
            await writeFileSnapshot(root, name, checked.files[name]);
        }
        return { result, changedPaths: delta, ...(preserve ? { viewPath: view } : {}) };
    } catch (error) {
        preserve = true;
        throw new Error(`Private operation failed: ${(error as Error).message}. Private checkout is retained at ${view}.`);
    } finally {
        if (!preserve) {
            if (registered) await git(root, ['worktree', 'remove', '--force', view]);
            else await fs.rm(view, { recursive: true, force: true });
        }
    }
}
/** Run validation against the declared content version, preserving isolated checker output on conflicts. @private */
export async function runCheck(workspace: Workspace, command: string, options: CheckOptions = {}): Promise<CheckResult> {
    await validateCheck(workspace, command);
    const operation = await runPrivateOperation(workspace, async privateWorkspace => {
        const shell = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : '/bin/sh';
        const args = process.platform === 'win32' ? ['/d', '/s', '/c', command] : ['-c', command];
        return runProcess(shell, args, { cwd: privateWorkspace.projectPath, redactionPath: workspace.projectPath, signal: options.signal, env: { ...process.env, PTBK_CODER_CHECK_VIEW: '1' }, onOutput: options.onOutput });
    }, options);
    const result = operation.result;
    const outcome = result.cancelled ? 'cancelled' : result.spawnError || result.exitCode === 127 ? 'setup' : result.exitCode === 0 ? 'passed' : 'failed';
    return { outcome, exitCode: result.exitCode, output: redactSecrets(result.output, workspace.projectPath), changedPaths: operation.changedPaths, command, viewPath: operation.viewPath };
}
