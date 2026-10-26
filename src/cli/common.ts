import { resolve } from 'node:path';
import { PtbkError, usageError } from '../common/errors.js';
import { confinePath } from '../common/fs.js';
import { BookIndex } from '../project/books.js';
import { setting, type BrowserOverrides, type EffectiveSettings } from '../project/config.js';
import { normalizeAgentName } from '../book/references.js';
import { generatedName } from '../tasks/identity.js';
import type { Project } from '../project/workspace.js';
import { resolveExistingProject } from '../project/workspace.js';
import { flag, option, type CommandContext } from './context.js';

/**
 * Resolves the selected project (`--path`, default current directory).
 *
 * @private CLI helpers
 */
export async function selectedProject(context: CommandContext): Promise<Project> {
    return await resolveExistingProject(option<string>(context, 'path'), context.cwd);
}

/**
 * Absolute `--tasks` directory (relative to the invocation directory), if given.
 *
 * @private CLI helpers
 */
export function tasksOverride(context: CommandContext): string | undefined {
    const value = option<string>(context, 'tasks');
    return value === undefined ? undefined : resolve(context.cwd, value);
}

/**
 * Converts invocation flags into temporary setting overrides (never written to ptbk.json).
 *
 * @private CLI helpers
 */
export function settingOverrides(context: CommandContext): Record<string, unknown> {
    const overrides: Record<string, unknown> = {};
    const set = (key: string, value: unknown): void => {
        if (value !== undefined) overrides[key] = value;
    };
    set('execution.check', option<string>(context, 'check'));
    set('execution.checkBefore', option<string>(context, 'check-before'));
    set('execution.gitChanges', option<string>(context, 'git-changes'));
    // --auto-pull/--auto-push are documented compatibility opt-ins to the one combined synchronization policy.
    const autoSync = flag(context, 'auto-sync') ?? (flag(context, 'auto-pull') || flag(context, 'auto-push') ? true : undefined);
    set('isAutoSync', autoSync);
    set('execution.isLineEndingNormalizationEnabled', flag(context, 'normalize-line-endings'));
    set('execution.isQuestionsEnabled', flag(context, 'questions'));
    set('execution.isCreditFallbackAllowed', flag(context, 'allow-credits'));
    set('execution.isLogPreservationEnabled', flag(context, 'preserve-logs'));
    set('execution.isAutoMigrateEnabled', flag(context, 'auto-migrate'));
    set('execution.waitBetweenPrompts', option<number>(context, 'wait-between-prompts'));
    set('execution.waitAfterPrompt', option<number>(context, 'wait-after-prompt'));
    set('execution.waitAfterError', option<number>(context, 'wait-after-error'));
    set('execution.isCommitEnabled', flag(context, 'commit'));
    set('server.isEnabled', flag(context, 'server'));
    set('server.port', option<number>(context, 'port'));
    set('server.tunnel.isEnabled', flag(context, 'tunnel'));
    set('server.tunnel.provider', option<string>(context, 'tunnel-provider'));
    set('service.isPersistent', flag(context, 'persist'));
    if (flag(context, 'harness-updates') === false) overrides['service.harnessUpdates'] = 'off';
    set('service.isQrShown', flag(context, 'qr'));
    set('traces.isCommitted', flag(context, 'commit-traces'));
    set('traces.isVideoIgnored', flag(context, 'ignore-trace-videos'));
    set('traces.isVideoRecordingEnabled', flag(context, 'record-video'));
    const contextFile = option<string>(context, 'context');
    if (contextFile !== undefined) overrides['paths.context'] = contextFile === '' ? null : contextFile;
    if (option<number>(context, 'port') !== undefined && (option<number>(context, 'port')! < 1 || option<number>(context, 'port')! > 65535)) {
        throw usageError('--port must be between 1 and 65535.', context.path.join(' '));
    }
    return overrides;
}

/**
 * Temporary browser overrides of this invocation (`--browser-mode`, `--browser-profile`, targeted by `--browser-tool`).
 *
 * @private CLI helpers
 */
export function browserOverrides(context: CommandContext): BrowserOverrides | undefined {
    const mode = option<'headless' | 'headful'>(context, 'browser-mode');
    const profile = option<string>(context, 'browser-profile');
    const tool = option<string>(context, 'browser-tool');
    if (!mode && !profile) {
        if (tool) throw usageError('--browser-tool selects the browser of --browser-mode/--browser-profile; give one of them too.', context.path.join(' '));
        return undefined;
    }
    return { tool, mode, profile };
}

/**
 * Validates option combinations before any work (contradictions are never silently resolved).
 *
 * @private CLI helpers
 */
export function validateCombinations(context: CommandContext): void {
    const path = context.path.join(' ');
    const noCommit = flag(context, 'commit') === false;
    const gitChanges = option<string>(context, 'git-changes');
    // Legacy use is diagnosed before anything changes; it never silently creates a worktree or pretends to isolate.
    if (flag(context, 'isolate') !== undefined) {
        throw new PtbkError('--isolate is no longer supported: task worktrees were removed.', {
            kind: 'usage',
            reason: 'Tasks and chats now share the project\'s one working tree and current branch. Different files are edited concurrently; work on the same file waits for its current owner (per-file ownership). No branch or worktree is created.',
            effect: 'Nothing was started or changed.',
            next: [`Run the command again without --isolate (ptbk ${path}).`, 'To serialize all work, set "execution": { "maxConcurrentWork": 1 } in ptbk.json.'],
        });
    }
    if (gitChanges === 'continue' && option<string>(context, 'check-before') === 'yes-and-fix') throw usageError('--git-changes continue conflicts with --check-before yes-and-fix.', path);
    if (flag(context, 'auto-sync') === false && (flag(context, 'auto-pull') || flag(context, 'auto-push'))) throw usageError('--no-auto-sync contradicts --auto-pull/--auto-push (compatibility aliases of --auto-sync).', path);
    if (noCommit && (flag(context, 'auto-sync') || flag(context, 'auto-pull') || flag(context, 'auto-push'))) throw usageError('--no-commit conflicts with automatic synchronization (--auto-sync, --auto-pull, --auto-push): synchronization publishes commits.', path);
    if (flag(context, 'daemon') && flag(context, 'foreground')) throw usageError('--daemon and --foreground are mutually exclusive.', path);
    if (flag(context, 'tunnel') === true && flag(context, 'server') === false) throw usageError('--tunnel needs the HTTP server; it conflicts with --no-server.', path);
    if (option<number>(context, 'port') !== undefined && flag(context, 'server') === false) throw usageError('--port conflicts with --no-server.', path);
}

/**
 * Writes JSON output.
 *
 * @private CLI helpers
 */
export function printJson(value: unknown): void {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Reads all of standard input.
 *
 * @private CLI helpers
 */
export async function readStdin(): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString('utf8');
}

/**
 * The task source directory for writes: `--tasks` or `paths.tasks`, confined to the project (no escape through
 * `..` or symlinks).
 *
 * @private CLI helpers
 */
export async function writableTasksDirectory(context: CommandContext, project: Project, settings: EffectiveSettings): Promise<string> {
    return await confinePath(project.root, tasksOverride(context) ?? resolve(project.root, setting<string>(settings, 'paths.tasks')));
}

/**
 * The generated name of a new task: the readable title plus creation date/time, distinct (under normalization) from
 * every Book the shared resolver knows in the project and from names already allocated in the same batch.
 *
 * @private CLI helpers
 */
export async function generatedTaskName(project: Project, settings: EffectiveSettings, title: string, extraTaken: Iterable<string> = []): Promise<string> {
    const taken = new Set([...(await projectTakenNames(project, settings)), ...[...extraTaken].map((name) => normalizeAgentName(name))]);
    return generatedName(title, { taken, timeZone: setting<string>(settings, 'timezone') });
}

/**
 * Normalized names of every Book in the project now (fresh index), for collision checks at publication.
 *
 * @private CLI helpers
 */
export async function projectTakenNames(project: Project, settings: EffectiveSettings): Promise<Set<string>> {
    const index = await BookIndex.load(project.root, { agents: setting<string>(settings, 'paths.agents'), tasks: setting<string>(settings, 'paths.tasks') });
    return index.names();
}
