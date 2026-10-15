import { resolve } from 'node:path';
import { usageError } from '../common/errors.js';
import { confinePath } from '../common/fs.js';
import { setting, type EffectiveSettings } from '../project/config.js';
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
    set('execution.autoPull', flag(context, 'auto-pull'));
    set('execution.autoPush', flag(context, 'auto-push'));
    set('execution.isolate', flag(context, 'isolate'));
    set('execution.normalizeLineEndings', flag(context, 'normalize-line-endings'));
    set('execution.questions', flag(context, 'questions'));
    set('execution.allowCredits', flag(context, 'allow-credits'));
    set('execution.preserveLogs', flag(context, 'preserve-logs'));
    set('execution.autoMigrate', flag(context, 'auto-migrate'));
    set('execution.waitBetweenPrompts', option<number>(context, 'wait-between-prompts'));
    set('execution.waitAfterPrompt', option<number>(context, 'wait-after-prompt'));
    set('execution.waitAfterError', option<number>(context, 'wait-after-error'));
    set('execution.commit', flag(context, 'commit'));
    set('browser.mode', option<string>(context, 'browser-mode'));
    set('browser.profile', option<string>(context, 'browser-profile'));
    set('server.enabled', flag(context, 'server'));
    set('server.port', option<number>(context, 'port'));
    set('server.tunnel.enabled', flag(context, 'tunnel'));
    set('server.tunnel.provider', option<string>(context, 'tunnel-provider'));
    set('service.persist', flag(context, 'persist'));
    if (flag(context, 'harness-updates') === false) overrides['service.harnessUpdates'] = 'off';
    set('service.qr', flag(context, 'qr'));
    const contextFile = option<string>(context, 'context');
    if (contextFile !== undefined) overrides['paths.context'] = contextFile === '' ? null : contextFile;
    if (option<number>(context, 'port') !== undefined && (option<number>(context, 'port')! < 1 || option<number>(context, 'port')! > 65535)) {
        throw usageError('--port must be between 1 and 65535.', context.path.join(' '));
    }
    return overrides;
}

/**
 * Validates option combinations before any work (contradictions are never silently resolved).
 *
 * @private CLI helpers
 */
export function validateCombinations(context: CommandContext): void {
    const path = context.path.join(' ');
    const minimum = option<number>(context, 'min-priority');
    const maximum = option<number>(context, 'max-priority');
    if (minimum !== undefined && maximum !== undefined && minimum > maximum) throw usageError(`--min-priority ${minimum} is greater than --max-priority ${maximum}.`, path);
    if (minimum !== undefined && minimum < 0) throw usageError('Priority bounds must be nonnegative.', path);
    const limit = option<number>(context, 'limit');
    if (limit !== undefined && limit < 1) throw usageError('--limit must be at least 1.', path);
    if (flag(context, 'auto') === false) {
        if (!context.terminal.interactive) throw usageError('--no-auto needs an interactive terminal to confirm each task.', path);
        if (flag(context, 'questions') === false) throw usageError('--no-auto conflicts with --no-questions.', path);
    }
    const noCommit = flag(context, 'commit') === false;
    const gitChanges = option<string>(context, 'git-changes');
    if (flag(context, 'isolate')) {
        if (noCommit) throw usageError('--isolate requires commits; it conflicts with --no-commit.', path);
        if (gitChanges === 'continue') throw usageError('--isolate conflicts with --git-changes continue.', path);
    }
    if (gitChanges === 'continue' && option<string>(context, 'check-before') === 'yes-and-fix') throw usageError('--git-changes continue conflicts with --check-before yes-and-fix.', path);
    if (noCommit && (flag(context, 'auto-pull') || flag(context, 'auto-push'))) throw usageError('--no-commit conflicts with --auto-pull/--auto-push.', path);
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
