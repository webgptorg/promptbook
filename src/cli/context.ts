import { usageError } from '../common/errors.js';
import { createTerminalProfile, type TerminalProfile } from '../ui/terminal.js';
import type { ParsedOptions } from './parser.js';
import type { CommandSpec } from './spec.js';

/**
 * Everything a command handler needs about its invocation.
 *
 * @private CLI context
 */
export type CommandContext = {
    /** Resolved command path, e.g. `['start']`. */
    readonly path: readonly string[];
    /** Command specification. */
    readonly spec: CommandSpec;
    /** Parsed options. */
    readonly options: ParsedOptions;
    /** Options given explicitly. */
    readonly explicit: ReadonlySet<string>;
    /** Positional arguments. */
    readonly positionals: readonly string[];
    /** Presentation/input profile. */
    readonly terminal: TerminalProfile;
    /** Invocation directory. */
    readonly cwd: string;
    /** Process environment. */
    readonly env: NodeJS.ProcessEnv;
    /** The original argv (without node/script). */
    readonly argv: readonly string[];
};

/**
 * Reads a typed option value.
 *
 * @private CLI context
 */
export function option<T>(context: CommandContext, name: string): T | undefined {
    return context.options[name] as T | undefined;
}

/**
 * Reads a boolean option: `true`, `false` (negated) or `undefined` (not given).
 *
 * @private CLI context
 */
export function flag(context: CommandContext, name: string): boolean | undefined {
    const value = context.options[name];
    return typeof value === 'boolean' ? value : undefined;
}

/**
 * Creates the command context after validating the presentation/input policy.
 *
 * Contradictions (`--raw --interactive`, explicit interactive without a terminal) are usage errors.
 *
 * @private CLI context
 */
export function createCommandContext(input: {
    path: readonly string[];
    spec: CommandSpec;
    options: ParsedOptions;
    explicit: ReadonlySet<string>;
    positionals: readonly string[];
    argv: readonly string[];
}): CommandContext {
    const commandPath = input.path.join(' ');
    const raw = input.options.raw === true;
    const interactive = input.options.interactive === true;
    const nonInteractive = input.options['non-interactive'] === true;
    if (interactive && nonInteractive) throw usageError('--interactive and --non-interactive contradict each other.', commandPath);
    if (raw && interactive) throw usageError('--raw output cannot be combined with --interactive input.', commandPath);
    const terminal = createTerminalProfile({ raw, interactive, nonInteractive, terminalTitle: input.options['terminal-title'] !== false });
    if (interactive && !terminal.interactive) {
        throw usageError('--interactive was requested, but stdin/stdout is not an interactive terminal.', commandPath, 'Run in a terminal or supply decisions with flags.');
    }
    return { ...input, terminal, cwd: process.cwd(), env: process.env };
}
