import { randomUUID } from 'node:crypto';
import { lstat, open, readFile, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Workspace } from './domain.js';
import { readProjectConfiguration, type ProjectConfiguration } from './configuration.js';
import { validateCheck } from './checks.js';
import { replaceFileWithRetry } from './file-replacement.js';
import { confinePath, InputError } from './workspace.js';

/** Offline validation readiness distinguishes a configured command from a passing check. @private */
export interface ProjectCheckInspection { command: string; diagnostic?: string; }

/** The finite setup wizard receives terminal controls without owning input or executing work. @private */
export interface CheckSetupUI {
    choose(label: string, choices: Array<{ value: string; label: string; description?: string }>, initial: string): Promise<string>;
    text(label: string, initial?: string): Promise<string>;
    confirm(label: string): Promise<boolean>;
}

/** An exact configuration snapshot prepared for the caller's later authoring lease. @private */
export interface PreparedProjectCheck {
    command: string;
    path: string;
    previous: string;
    updated?: string;
}

/** Explicit commands can resolve missing setup; valid saved choices remain temporary overrides. @private */
export interface ProjectCheckSetupOptions { command?: string; ui?: CheckSetupUI; }

/** Select saved validation even when it is explicitly blank, preserving configuration precedence. */
function defaultCommand(configuration: ProjectConfiguration): string {
    return typeof configuration.values.check === 'string' ? configuration.values.check : 'npm run check';
}

/** Inspect availability without running shell commands, their substitutions, or an agent. */
async function inspectCommand(workspace: Workspace, command: string): Promise<ProjectCheckInspection> {
    try { await validateCheck(workspace, command); return { command }; }
    catch (error) { return { command, diagnostic: error instanceof Error ? error.message : String(error) }; }
}

/** Inspect the effective configured check without writing configuration or running validation. @private */
export async function inspectProjectCheck(workspace: Workspace, override?: string): Promise<ProjectCheckInspection> {
    const configuration = await readProjectConfiguration(workspace.projectPath);
    return inspectCommand(workspace, override === undefined ? defaultCommand(configuration) : override);
}

/** Read one unchanged configuration document before preparing a reviewed edit. */
async function checkSnapshot(workspace: Workspace): Promise<{ configuration: ProjectConfiguration; path: string; previous: string }> {
    const path = join(workspace.projectPath, 'ptbk.json');
    const configuration = await readProjectConfiguration(workspace.projectPath);
    if (!configuration.exists) throw new InputError('Check setup requires project initialization first. Run ptbk init before saving validation.');
    await confinePath(workspace.projectPath, path);
    const previous = await readFile(path, 'utf8');
    if (JSON.stringify(JSON.parse(previous)) !== JSON.stringify(configuration.document)) throw new InputError(`${path}: configuration changed during validation setup; its new content was preserved.`);
    return { configuration, path, previous };
}

/** Locate an existing effective check, otherwise use the canonical execution.check setting. */
function checkLocation(document: Record<string, unknown>): string | undefined {
    for (const section of ['process', 'execution', 'routing']) {
        const value = document[section];
        if (value && typeof value === 'object' && !Array.isArray(value) && Object.hasOwn(value, 'check')) return section;
    }
    return Object.hasOwn(document, 'check') ? undefined : 'execution';
}

/** Prepare only the selected check setting while preserving all other saved project choices. */
function updatedSnapshot(snapshot: Awaited<ReturnType<typeof checkSnapshot>>, command: string): PreparedProjectCheck {
    const document = JSON.parse(snapshot.previous) as Record<string, unknown>;
    const section = checkLocation(document);
    if (section === undefined) document.check = command;
    else {
        const settings = (document[section] ?? {}) as Record<string, unknown>;
        settings.check = command;
        document[section] = settings;
    }
    return { command, path: snapshot.path, previous: snapshot.previous, updated: `${JSON.stringify(document, null, 4)}\n` };
}

/**
 * Resolve unconfigured validation through an explicit command or a finite, reviewed wizard.
 * Existing valid defaults are never rewritten, and --check remains temporary for those projects.
 * A newly selected command updates an existing effective check in place, or execution.check when absent.
 * Preparing a command neither runs it nor makes a claim that project validation has passed.
 * @private
 */
export async function prepareProjectCheck(workspace: Workspace, options: ProjectCheckSetupOptions = {}): Promise<PreparedProjectCheck | undefined> {
    const snapshot = await checkSnapshot(workspace);
    const readiness = await inspectCommand(workspace, defaultCommand(snapshot.configuration));
    if (options.command !== undefined) {
        await validateCheck(workspace, options.command);
        return readiness.diagnostic ? updatedSnapshot(snapshot, options.command) : { command: options.command, path: snapshot.path, previous: snapshot.previous };
    }
    if (!readiness.diagnostic) return { command: readiness.command, path: snapshot.path, previous: snapshot.previous };
    if (!options.ui) return undefined;

    /** Offer known project validator scripts only after checking their complete npm dependency graph. */
    const choices: Array<{ value: string; label: string; description?: string }> = [];
    let metadata: { scripts?: Record<string, unknown> };
    try {
        const manifest = await confinePath(workspace.projectPath, join(workspace.projectPath, 'package.json'));
        const value: unknown = JSON.parse(await readFile(manifest, 'utf8'));
        metadata = value && typeof value === 'object' && !Array.isArray(value) ? value as typeof metadata : {};
    }
    catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
        metadata = {};
    }
    for (const name of ['typecheck', 'lint', 'test', 'build']) {
        const script = metadata.scripts?.[name];
        if (typeof script !== 'string' || !script.trim()) continue;
        const command = `npm run ${name}`;
        if (!(await inspectCommand(workspace, command)).diagnostic) choices.push({ value: command, label: command, description: script });
    }
    choices.push({ value: '@custom', label: 'Enter a project validation command', description: 'Use a real shell command that verifies this project, including non-software projects.' }, { value: '@defer', label: 'Configure validation later', description: 'Keep setup incomplete; unattended execution remains blocked.' });
    const location = checkLocation(snapshot.configuration.document);
    const field = location === undefined ? 'check' : `${location}.check`;
    let initial = choices[0]!.value;
    let diagnostic = readiness.diagnostic;
    let draft = '';
    for (;;) {
        const selection = await options.ui.choose(`Configure project validation\n${diagnostic}`, choices, initial);
        if (selection === '@defer') return undefined;
        if (!choices.some(choice => choice.value === selection)) throw new InputError('Unknown validation setup choice; no configuration was changed.');
        initial = selection;
        const command = selection === '@custom' ? (await options.ui.text('Project validation shell command', draft)).trim() : selection;
        if (selection === '@custom') draft = command;
        const inspection = await inspectCommand(workspace, command);
        if (inspection.diagnostic) { diagnostic = inspection.diagnostic; continue; }
        if (!await options.ui.confirm(`Save this project validation command?\n${snapshot.path}\n${field}: ${command}\nThis configures future checks; it does not run them or report that they passed.`)) return undefined;
        return updatedSnapshot(snapshot, command);
    }
}

/**
 * Publish a prepared check choice under the caller's lease without overwriting concurrent edits.
 * Confinement, symlink status, ownership, and exact configuration bytes are checked before every attempt.
 * @private
 */
export async function saveProjectCheck(workspace: Workspace, prepared: PreparedProjectCheck, assertOwned?: () => Promise<void>): Promise<string[]> {
    const path = join(workspace.projectPath, 'ptbk.json');
    if (resolve(prepared.path) !== resolve(path)) throw new InputError('Validation setup can only update this project\'s ptbk.json.');
    /** Protect the logical config path as well as its confined target before publishing anything. */
    const guard = async (): Promise<void> => {
        await assertOwned?.();
        await confinePath(workspace.projectPath, path);
        try {
            const attributes = await lstat(path);
            if (attributes.isSymbolicLink() || !attributes.isFile()) throw new InputError(`${path}: refusing to replace a symlink or non-file during validation setup.`);
            if (await readFile(path, 'utf8') !== prepared.previous) throw new InputError(`${path}: configuration changed concurrently; the editor's version was preserved.`);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new InputError(`${path}: configuration disappeared concurrently; no validation choice was saved.`);
            throw error;
        }
    };
    await guard();
    if (prepared.updated === undefined) return [];
    await validateCheck(workspace, prepared.command);
    const temporary = `${path}.${randomUUID()}.tmp`;
    try {
        const handle = await open(temporary, 'wx', (await lstat(path)).mode);
        try { await handle.writeFile(prepared.updated); await handle.sync(); }
        finally { await handle.close(); }
        await replaceFileWithRetry(temporary, path, guard);
        return [path];
    } finally { await unlink(temporary).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; }); }
}
