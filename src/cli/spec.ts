import type { CommandContext } from './context.js';

/**
 * Value type of a command-line option.
 *
 * @private CLI specification
 */
export type OptionType = 'boolean' | 'string' | 'integer' | 'duration' | 'enum';

/**
 * One command-line option.
 *
 * @private CLI specification
 */
export type OptionSpec = {
    /** Long name without dashes (`path`, `no-commit` is expressed by `negatable`). */
    readonly name: string;
    /** Value type. */
    readonly type: OptionType;
    /** Allowed values for enums. */
    readonly values?: readonly string[];
    /** Placeholder shown in help, e.g. `<dir>`. */
    readonly valueName?: string;
    /** One-line description. */
    readonly description: string;
    /** Human-readable default. */
    readonly defaultText?: string;
    /** Boolean also accepts `--no-<name>`. */
    readonly negatable?: boolean;
    /** Only `--no-<name>` is meaningful (help shows the negated form). */
    readonly negatedOnly?: boolean;
    /** Can be given several times (values accumulate). */
    readonly repeatable?: boolean;
    /** Single-letter alias. */
    readonly short?: string;
    /** Hidden from help (internal plumbing). */
    readonly hidden?: boolean;
    /** Whether the value is a live-adjustable runtime setting, a saved default or startup-only (for help). */
    readonly note?: string;
};

/**
 * Named group of options shown together in help.
 *
 * @private CLI specification
 */
export type OptionGroup = {
    /** Heading in help. */
    readonly title: string;
    /** Options of the group. */
    readonly options: readonly OptionSpec[];
    /** Inherited/shared groups are listed after command-specific ones. */
    readonly shared?: boolean;
};

/**
 * Positional argument of a command.
 *
 * @private CLI specification
 */
export type ArgumentSpec = {
    /** Placeholder name. */
    readonly name: string;
    /** Description. */
    readonly description: string;
    /** Required argument. */
    readonly required?: boolean;
    /** Accepts several words/values. */
    readonly variadic?: boolean;
};

/**
 * Help section grouping commands at the top level.
 *
 * @private CLI specification
 */
export type CommandCategory = 'Start here' | 'Run the agenda' | 'Observe and respond' | 'Author work' | 'Maintain' | 'Information';

/**
 * One command (or nested subcommand).
 *
 * @private CLI specification
 */
export type CommandSpec = {
    /** Command word. */
    readonly name: string;
    /** Alias words. */
    readonly aliases?: readonly string[];
    /** One-line summary. */
    readonly summary: string;
    /** Longer explanation (paragraphs separated by blank lines). */
    readonly description: string;
    /** Category for the top-level overview. */
    readonly category: CommandCategory;
    /** Positional arguments. */
    readonly arguments?: readonly ArgumentSpec[];
    /** Option groups (command-specific first, then shared). */
    readonly optionGroups: readonly OptionGroup[];
    /** Examples. */
    readonly examples: ReadonlyArray<{ readonly command: string; readonly description: string }>;
    /** Nested subcommands. */
    readonly subcommands?: readonly CommandSpec[];
    /** Handler (lazy import inside). */
    readonly run?: (context: CommandContext) => Promise<number>;
    /** Hidden from the overview. */
    readonly hidden?: boolean;
};

/**
 * `--path` and `--tasks`.
 *
 * @private CLI specification
 */
export const PROJECT_OPTIONS: OptionGroup = {
    title: 'Project',
    shared: true,
    options: [
        { name: 'path', type: 'string', valueName: '<dir>', description: 'Project directory.', defaultText: 'current directory' },
        { name: 'tasks', type: 'string', valueName: '<dir>', description: 'Task source directory.', defaultText: 'paths.tasks in ptbk.json, else tasks/' },
    ],
};

/**
 * Presentation and input policy options.
 *
 * @private CLI specification
 */
export const PRESENTATION_OPTIONS: OptionGroup = {
    title: 'Presentation and input',
    shared: true,
    options: [
        { name: 'raw', type: 'boolean', description: 'Plain output: no color, layout, cursor control, QR art or prompts.', defaultText: 'automatic when redirected' },
        { name: 'no-ui', type: 'boolean', description: 'Same as --raw.', hidden: false },
        { name: 'interactive', type: 'boolean', description: 'Request terminal interaction appropriate to the command.' },
        { name: 'non-interactive', type: 'boolean', description: 'Forbid terminal questions; supply decisions with flags.' },
    ],
};

/**
 * `--json` machine output.
 *
 * @private CLI specification
 */
export const JSON_OPTION: OptionSpec = { name: 'json', type: 'boolean', description: 'Print machine-readable JSON.' };

/**
 * `--commit` / `--no-commit`.
 *
 * @private CLI specification
 */
export const COMMIT_OPTIONS: OptionGroup = {
    title: 'Git persistence',
    options: [
        { name: 'commit', type: 'boolean', negatable: true, description: 'Commit versioned changes with a `PTBK: ` subject (default). --no-commit saves without committing.', defaultText: 'on' },
    ],
};

/**
 * Finite-work configuration: agent, harness, model, thinking level, context.
 *
 * @private CLI specification
 */
export const EXECUTION_SELECTION_OPTIONS: OptionGroup = {
    title: 'Execution selection',
    options: [
        { name: 'agent', type: 'string', valueName: '<ref>', description: 'Responsible agent (@Name or {Full Name}).', defaultText: 'Developer' },
        { name: 'harness', type: 'string', valueName: '<variant|tool>', description: 'Harness variant (e.g. openai-codex, claude-code; its ordered instances may serve it) or one harness tool name.', defaultText: 'routing.harness' },
        { name: 'model', type: 'string', valueName: '<model>', description: 'Model of the selected harness.', defaultText: 'harness default' },
        { name: 'thinking-level', type: 'enum', values: ['low', 'medium', 'high', 'xhigh', 'max'], valueName: '<level>', description: 'Reasoning effort (only where supported).' },
        { name: 'context', type: 'string', valueName: '<file>', description: 'Additional context file; an empty value disables it.', defaultText: 'AGENTS.md' },
    ],
};

/**
 * Options shared by finite run and ongoing start execution.
 *
 * @private CLI specification
 */
export const EXECUTION_POLICY_OPTIONS: OptionGroup = {
    title: 'Execution policy',
    options: [
        { name: 'check', type: 'string', valueName: '<command>', description: 'Project check command for this invocation (temporary override).' },
        { name: 'check-before', type: 'enum', values: ['no', 'yes-and-fail', 'yes-and-fix'], valueName: '<mode>', description: 'Run the check before work.', defaultText: 'no' },
        { name: 'git-changes', type: 'enum', values: ['fail', 'ignore', 'continue'], valueName: '<policy>', description: 'Unrelated uncommitted changes: refuse, keep aside, or resume one interrupted task.', defaultText: 'fail' },
        { name: 'auto-sync', type: 'boolean', negatable: true, description: 'Automatic Git synchronization for this invocation (existing origin and current branch: pull every 60 s and before work/commits with visible merges, push completed work).', defaultText: 'isAutoSync in ptbk.json (off)' },
        { name: 'auto-pull', type: 'boolean', description: 'Compatibility alias of --auto-sync (enables both pull and push).' },
        { name: 'auto-push', type: 'boolean', description: 'Compatibility alias of --auto-sync (enables both pull and push).' },
        { name: 'isolate', type: 'boolean', description: 'Execute each task in a separate Git worktree; its verified result joins the branch through a visible merge commit (conflicts go to Fixer).' },
        { name: 'normalize-line-endings', type: 'boolean', negatable: true, negatedOnly: true, description: 'Keep CRLF line endings in changed files.' },
        { name: 'questions', type: 'boolean', negatable: true, negatedOnly: true, description: 'Agents may not ask the user questions.' },
        { name: 'allow-credits', type: 'boolean', description: 'Authorize explicit paid-credit fallback where the harness supports it.' },
        { name: 'preserve-logs', type: 'boolean', description: 'Keep all system logs in .ptbk/ without rotation (task traces are never rotated).' },
        { name: 'auto-migrate', type: 'boolean', description: 'Run the configured migration hook (execution.migrateCommand) after agent work.' },
        { name: 'wait-between-prompts', type: 'duration', valueName: '<duration>', description: 'Pause between tasks (e.g. 30m, 1h30m).', defaultText: '0' },
        { name: 'wait-after-prompt', type: 'duration', valueName: '<duration>', description: 'Pause after each harness call.', defaultText: '0' },
        { name: 'wait-after-error', type: 'duration', valueName: '<duration>', description: 'Pause after a technical error.', defaultText: '10m' },
    ],
};

/**
 * HTTP, tunnel and QR options.
 *
 * @private CLI specification
 */
export const SERVER_OPTIONS: OptionGroup = {
    title: 'Dashboard server and remote access (startup-only)',
    options: [
        { name: 'server', type: 'boolean', negatable: true, description: 'Serve the local HTTP API and browser dashboard (--no-server disables HTTP and the tunnel).', defaultText: 'on' },
        { name: 'port', type: 'integer', valueName: '<port>', description: 'Local port (loopback only).', defaultText: 'first free from 3000' },
        { name: 'tunnel', type: 'boolean', negatable: true, description: 'Protected remote tunnel for phone access (--no-tunnel keeps access local).', defaultText: 'on with HTTP' },
        { name: 'tunnel-provider', type: 'enum', values: ['cloudflare-quick', 'cloudflare-named'], valueName: '<provider>', description: 'Tunnel provider.', defaultText: 'cloudflare-quick' },
        { name: 'qr', type: 'boolean', negatable: true, negatedOnly: true, description: 'Do not print QR codes (HTTP and remote access stay as configured).' },
    ],
};

/**
 * Browser options.
 *
 * @private CLI specification
 */
export const BROWSER_OPTIONS: OptionGroup = {
    title: 'Browser tool overrides (this invocation only)',
    options: [
        { name: 'browser-mode', type: 'enum', values: ['headless', 'headful'], valueName: '<mode>', description: 'Browser visibility for this invocation.', defaultText: 'the tool’s isHeadless' },
        { name: 'browser-profile', type: 'string', valueName: '<source>', description: 'Profile for this invocation: MANAGED_GLOBAL (`global`), PROJECT (`isolated`), USER_EXISTING (`user`) or a profile path. Saved changes use `ptbk tool modify`.', defaultText: 'the tool’s profile' },
        { name: 'browser-tool', type: 'string', valueName: '<name>', description: 'The browser tool the two overrides apply to (required when several browsers are enabled).' },
    ],
};

/**
 * Finite queue filters.
 *
 * @private CLI specification
 */
export const QUEUE_FILTER_OPTIONS: OptionGroup = {
    title: 'Queue selection',
    options: [
        { name: 'min-priority', type: 'integer', valueName: '<n>', description: 'Only tasks with at least this priority.' },
        { name: 'priority', type: 'integer', valueName: '<n>', description: 'Alias of --min-priority.' },
        { name: 'max-priority', type: 'integer', valueName: '<n>', description: 'Only tasks with at most this priority.' },
        { name: 'limit', type: 'integer', valueName: '<n>', description: 'Stop after this many successful tasks.' },
        { name: 'auto', type: 'boolean', negatable: true, negatedOnly: true, description: 'Confirm each task before it starts (interactive only).' },
        { name: 'dry-run', type: 'boolean', description: 'Preview the queue and selected configuration without executing.' },
    ],
};

/**
 * Every option group a command accepts, flattened.
 *
 * @private CLI specification
 */
export function allOptions(spec: CommandSpec): OptionSpec[] {
    return spec.optionGroups.flatMap((group) => group.options);
}
