import { renderDocument, type TerminalPresentation } from './presentation.js';

/** A help request resolved independently of project state and command validation.
 * @private Internal CLI help routing.
 */
export interface HelpRequest {
    /** Requested command path, retaining the user's alias for its invocation. */
    path: readonly string[];
    /** Plain presentation explicitly requested by the invocation. */
    raw: boolean;
    /** Invalid scope or conflicting presentation/input flags. */
    error?: string;
}

/** Presentation and invoked installation identity for an offline help document.
 * @private Internal CLI help rendering.
 */
export interface HelpPresentation extends TerminalPresentation {
    /** Actual version of the package containing the running CLI. */
    version: string;
    /** Selected project, displayed only in the top-level overview. */
    projectPath?: string;
}

/** One documented option's syntax and observable meaning. */
interface HelpOption { syntax: string; description: string }

/** A command's complete local reference, without unrelated command details. */
interface CommandHelp {
    invocation: string;
    purpose: string;
    options: readonly string[];
    arguments?: readonly string[];
    notes?: readonly string[];
    examples: readonly string[];
}

/** Option syntax is shared so inherited flags keep the same meaning in each scope. */
const OPTIONS: Readonly<Record<string, HelpOption>> = {
    path: { syntax: '--path DIR', description: 'Project directory; default: current directory. CLI paths are relative to this invocation.' },
    tasks: { syntax: '--tasks DIR', description: 'Task source directory; default: tasks in the selected project.' },
    raw: { syntax: '--raw', description: 'Plain output without color, decoration, cursor controls or terminal prompts; does not change process placement.' },
    interactive: { syntax: '--interactive', description: 'Enable the command\'s terminal interaction; does not select foreground operation.' },
    'non-interactive': { syntax: '--non-interactive', description: 'Forbid terminal questions and keyboard controls; supply decisions explicitly.' },
    'no-ui': { syntax: '--no-ui', description: 'Plain output and no terminal prompts, following --raw.' },
    help: { syntax: '--help, -h', description: 'Show this command\'s offline help and exit without executing it.' },
    version: { syntax: '--version, -v', description: 'Print the actual invoked engine version and exit.' },
    harness: { syntax: '--harness NAME', description: 'Select a compatible enabled harness; task requirements remain constraints.' },
    model: { syntax: '--model NAME', description: 'Select a model supported by the selected harness.' },
    'thinking-level': { syntax: '--thinking-level LEVEL', description: 'low, medium, high, xhigh or max, where supported by the selected harness.' },
    agent: { syntax: '--agent NAME', description: 'Select an agent; finite run/fix/plan default to Developer, while start uses project roles and Manager.' },
    context: { syntax: '--context PATH', description: 'Additional project context supplied to the selected agent.' },
    commit: { syntax: '--commit', description: 'Commit explicitly approved authoring changes; ordinary authoring leaves changes uncommitted.' },
    'no-commit': { syntax: '--no-commit', description: 'Leave changes uncommitted; automatic execution also requires --git-changes ignore.' },
    'no-questions': { syntax: '--no-questions', description: 'Do not ask terminal questions; provide required decisions in advance.' },
    'auto-push': { syntax: '--auto-push', description: 'Push accepted commits; authoring also requires --commit. Default: off.' },
    'auto-pull': { syntax: '--auto-pull', description: 'Pull before work; requires automatic commits. Default: off.' },
    intent: { syntax: '--intent TEXT', description: 'Fresh-project goal: create Expert\'s first task and start its agenda. Blank intent creates sample setup without a model call.' },
    agenda: { syntax: '--agenda TEXT', description: 'Explicitly request a new Expert agenda task, including in an existing project; do not combine with --intent.' },
    'no-install': { syntax: '--no-install', description: 'Skip engine installation; cannot combine with --installation local.' },
    installation: { syntax: '--installation local|global', description: 'Choose destination-local dependencies (wizard default) or global installation; local uses this running version.' },
    'new-project': { syntax: '--new-project DIR', description: 'Create a child destination relative to --path; wizard default is the current directory.' },
    'nested-strategy': { syntax: '--nested-strategy back|ignored|submodule', description: 'For a child inside Git, cancel (default), ignore its independent repository, or create a real submodule.' },
    'submodule-source': { syntax: '--submodule-source URL', description: 'Existing source repository required by --nested-strategy submodule.' },
    harnesses: { syntax: '--harnesses NAME,NAME', description: 'Selected project integrations only; an empty value selects none. The wizard initially shows featured choices and More.' },
    'browser-mode': { syntax: '--browser-mode headless|headful', description: 'Project browser visibility; default: headless. Independent of harness authentication.' },
    'browser-profile': { syntax: '--browser-profile PATH', description: 'Persistent browser profile; default: ignored isolated .ptbk/browser/profile. Preserve existing sessions.' },
    'self-update': { syntax: '--self-update', description: 'Update the invoked outdated engine, then exit with a rerun instruction before project setup.' },
    'no-self-update': { syntax: '--no-self-update', description: 'Keep this invoked engine; never silently update unattended operation.' },
    'allow-credits': { syntax: '--allow-credits', description: 'Explicitly permit supported paid-credit use; default: no unauthorized paid fallback.' },
    check: { syntax: '--check COMMAND', description: 'Validation shell command; default software check: npm run check. Project settings may override it.' },
    'check-before': { syntax: '--check-before no|yes-and-fail|yes-and-fix', description: 'Pre-work validation policy; default: no. Repair conflicts with --git-changes continue.' },
    'min-priority': { syntax: '--min-priority N', description: 'Minimum inclusive task priority; default: 0.' },
    'max-priority': { syntax: '--max-priority N', description: 'Maximum inclusive task priority; default: no upper bound.' },
    priority: { syntax: '--priority N', description: 'Alias for the minimum inclusive priority; cannot contradict --min-priority.' },
    limit: { syntax: '--limit N', description: 'Maximum successful tasks in this finite invocation; default: unlimited.' },
    'git-changes': { syntax: '--git-changes fail|ignore|continue', description: 'Initial dirty-tree policy; default: fail. Continue preserves unrelated user edits.' },
    'no-auto': { syntax: '--no-auto', description: 'Ask before each task; requires an interactive terminal and permits manual execution decisions.' },
    isolate: { syntax: '--isolate', description: 'Use an isolated worktree; requires commits and forbids --git-changes continue.' },
    'no-normalize-line-endings': { syntax: '--no-normalize-line-endings', description: 'Disable normalization of owned text changes; normalization defaults to enabled.' },
    'preserve-logs': { syntax: '--preserve-logs', description: 'Preserve harness logs instead of ordinary cleanup.' },
    'wait-between-prompts': { syntax: '--wait-between-prompts DURATION', description: 'Delay between tasks; default: 0. Accepts seconds or durations such as 30m and 1h30m.' },
    'wait-after-prompt': { syntax: '--wait-after-prompt DURATION', description: 'Delay after task completion; default: 0.' },
    'wait-after-error': { syntax: '--wait-after-error DURATION', description: 'Technical-error backoff; default: 10m.' },
    'auto-migrate': { syntax: '--auto-migrate', description: 'Enable the project migration hook when configured; distinct from task-format migration.' },
    'allow-destructive-auto-migrate': { syntax: '--allow-destructive-auto-migrate', description: 'Permit destructive operations only with an enabled project migration hook.' },
    'dry-run': { syntax: '--dry-run', description: 'Read-only preview: no setup, update, authentication, model call, Git mutation or task execution.' },
    json: { syntax: '--json', description: 'Emit the structured inspection result.' },
    daemon: { syntax: '--daemon', description: 'Launch an ongoing background daemon and report once (default); conflicts with --foreground.' },
    foreground: { syntax: '--foreground', description: 'Own ongoing execution in this terminal; pretty uses the live dashboard and raw streams plain events.' },
    'no-persist': { syntax: '--no-persist', description: 'Disable automatic daemon restart after reboot; retain recovery state. Default: persistence enabled.' },
    'no-server': { syntax: '--no-server', description: 'Disable localhost HTTP/browser dashboard; default: enabled. Conflicts with --port.' },
    port: { syntax: '--port N', description: 'Localhost HTTP port; default: first free port from 3000. Explicit conflicts fail honestly.' },
    'no-qr': { syntax: '--no-qr', description: 'Suppress the dashboard QR code in live and snapshot views; retain the textual URL.' },
    'auto-update-harnesses': { syntax: '--auto-update-harnesses', description: 'Maintain outdated selected harnesses before work (default); never update unselected integrations.' },
    'no-auto-update-harnesses': { syntax: '--no-auto-update-harnesses', description: 'Disable automatic selected-harness maintenance for this invocation.' },
    request: { syntax: '--request ID', description: 'Durable request ID, equivalent to the first positional argument.' },
    response: { syntax: '--response TEXT', description: 'Explicit answer, equivalent to positional reply text; no hidden stdin prompt in raw mode.' },
    action: { syntax: '--action resume|retry|acknowledge', description: 'Resolve interrupted work explicitly: continue a safe phase, deliberately retry, or acknowledge failure.' },
    occurrence: { syntax: '--occurrence ID', description: 'Disambiguate a recurring task occurrence.' },
    template: { syntax: '--template PATH', description: 'Project task template; {{description}} is replaced with the supplied description.' },
    count: { syntax: '--count N|N*M', description: 'Number of unfinished templates; default: 5*1, valid total: 1 to 1000.' },
    prompt: { syntax: '--prompt TEXT', description: 'Initial read-only planning message; later discussion uses the same conversation.' },
    ignore: { syntax: '--ignore PATTERN', description: 'Ignore matching task paths during human review; repeatable.' },
    period: { syntax: '--period DURATION', description: 'Repeat the explicit harness/model probe at this interval; default: once.' },
};

/** Applicable inherited presentation and project-selection options. */
const COMMON = ['path', 'tasks', 'raw', 'interactive', 'non-interactive', 'no-ui', 'help', 'version'] as const;
/** Routing overrides shared only by commands that actually invoke or select agents. */
const ROUTING = ['harness', 'model', 'thinking-level', 'agent', 'context'] as const;
/** Engine controls for finite execution, not authoring or daemon lifecycle inspection. */
const EXECUTION = [...ROUTING, 'min-priority', 'max-priority', 'priority', 'limit', 'git-changes', 'check', 'check-before', 'no-commit', 'no-auto', 'no-questions', 'auto-pull', 'auto-push', 'isolate', 'no-normalize-line-endings', 'preserve-logs', 'allow-credits', 'wait-between-prompts', 'wait-after-prompt', 'wait-after-error', 'auto-migrate', 'allow-destructive-auto-migrate', 'dry-run'] as const;
/** Ongoing operation cannot disable persistence of tasks or impose a finite task limit. */
const ONGOING = EXECUTION.filter(name => !['no-commit', 'no-auto', 'limit', 'dry-run'].includes(name));
/** Startup-only placement, HTTP, browser and maintenance choices. */
const STARTUP = ['daemon', 'foreground', 'no-persist', 'no-server', 'port', 'no-qr', 'browser-mode', 'browser-profile', 'auto-update-harnesses', 'no-auto-update-harnesses', 'harnesses'] as const;
/** Saved settings never change merely because a temporary CLI override is supplied. */
const CONFIGURATION_NOTE = 'Defaults resolve from the engine, then project ptbk.json, then explicit CLI flags. CLI overrides are temporary and do not rewrite saved configuration.';
/** Initialization can explicitly repair missing validation without replacing healthy project defaults. */
const INIT_CONFIGURATION_NOTE = 'Defaults resolve from the engine, then project ptbk.json, then explicit CLI flags. Init --check COMMAND saves the project check when validation is missing or unconfigured; existing valid defaults remain intact and different overrides stay temporary. Interactive init/start offer the same validation setup.';
/** Runtime changes use a safe task boundary; startup-only changes require a restart. */
const RUNTIME_NOTE = 'Routing, pacing and browser changes are live-adjustable at safe task boundaries. Process placement, persistence and HTTP settings require restart.';
/** Shared authoring persistence flags have no authority to execute the task queue. */
const AUTHORING = ['commit', 'no-commit', 'no-questions', 'auto-push'] as const;

/** Each supported command has a bounded reference rather than a global option dump. */
const COMMAND_HELP: Readonly<Record<string, CommandHelp>> = {
    help: { invocation: 'help [command-path] [options]', purpose: 'Show an offline top-level overview or the reference for one supported command path, without executing it.', options: [], arguments: ['command-path: optional supported command name or alias; omitted path shows the workflow overview.'], notes: ['Equivalent scoped forms: ptbk help init, ptbk init help and ptbk init --help. Unknown paths fail rather than falling back to the overview.', 'Help ignores missing operation-specific inputs and project readiness. It does not initialize, authenticate, update tools, call models or start services.'], examples: ['ptbk help', 'ptbk help init', 'ptbk help help', 'ptbk dashboard --help --raw'] },
    init: {
        invocation: 'init [options]', purpose: 'Prepare a project incrementally through a finite setup wizard, preserving existing files, settings and Git history.',
        options: [...ROUTING, ...AUTHORING, 'intent', 'agenda', 'installation', 'no-install', 'new-project', 'nested-strategy', 'submodule-source', 'harnesses', 'browser-mode', 'browser-profile', 'self-update', 'no-self-update', 'allow-credits', 'check'],
        notes: ['With available prerequisites, accepting defaults prepares the current directory with blank-intent sample setup and the exact running engine version locally. Basic setup does not execute tasks or call a model.', 'Setup creates required Git commits by default; --no-commit leaves setup uncommitted. Existing user staging and unrelated changes are preserved.', 'An outdated invoked engine offers self-update first (default: yes). Unattended operation needs explicit installation and update decisions.', 'Featured harnesses: OpenAI Codex, Claude Code. Select More in the harness picker to reach the full catalog.', INIT_CONFIGURATION_NOTE],
        examples: ['ptbk init', 'ptbk initialize --new-project demo', 'ptbk init --installation local --no-self-update --harnesses openai-codex --non-interactive', 'ptbk init --intent "Build a small project tracker"'],
    },
    start: { invocation: 'start [options]', purpose: 'Start the project\'s ongoing agenda as a daemon by default, render one launch result and return the terminal.', options: [...ONGOING, ...STARTUP], notes: ['Start is indefinite automatic work with task commits; use run for finite/manual execution. An empty queue does not end the agenda.', '--raw changes output only: start --raw remains a one-shot daemon launch. --foreground owns execution until it stops.', 'Missing prerequisites may open the shared setup wizard when questions are allowed. Repeated start reports the existing correct process without creating another worker.', CONFIGURATION_NOTE, RUNTIME_NOTE], examples: ['ptbk start', 'ptbk start --raw', 'ptbk start --foreground --raw', 'ptbk start --no-server --no-persist'] },
    restart: { invocation: 'restart [options]', purpose: 'Restart the selected project daemon, report the outcome once and retain its recovery state.', options: [...ONGOING, ...STARTUP.filter(name => name !== 'foreground')], notes: ['Restart applies daemon startup settings. It does not attach a dashboard or restart a foreground process as a daemon.', CONFIGURATION_NOTE, RUNTIME_NOTE], examples: ['ptbk restart', 'ptbk restart --path ./project --raw', 'ptbk restart --port 3100'] },
    stop: { invocation: 'stop [options]', purpose: 'Gracefully stop the selected project daemon and report the outcome once.', options: [], notes: ['An intentional stop suppresses automatic daemon startup until the next explicit start. Foreground processes use their own owning invocation controls.', 'Stopping the service is distinct from closing an attached dashboard.'], examples: ['ptbk stop', 'ptbk stop --path ./project --raw'] },
    dashboard: { invocation: 'dashboard [options]', purpose: 'Continuously observe and control an existing project service without starting another worker.', options: ['no-qr'], notes: ['The service engine version and shared runtime state come from the inspected process. A missing or unreachable service is an error, not implicit startup.', 'Q or Ctrl+C closes only this client. X explicitly asks the service to finish its current task and stop; a second X cancels owned work.', 'Controls: P pause/resume, S skip wait, O switch presentation, R pending requests, H harness catalog, C settings, D details, arrows/End scroll.', '--raw continuously observes plain state without prompts. Use status or show for a one-shot snapshot.', RUNTIME_NOTE], examples: ['ptbk dashboard', 'ptbk dashboard --path ./project', 'ptbk dashboard --raw'] },
    status: { invocation: 'status [options]', purpose: 'Inspect the selected project process, version, connection and pending requests once, without starting work.', options: ['json', 'no-qr'], notes: ['Inspection is read-only, offline-capable and does not consume pending requests.'], examples: ['ptbk status', 'ptbk status --path ./project --json'] },
    show: { invocation: 'show [options]', purpose: 'Show the project\'s process, queue, effective settings and pending requests once, without changing its lifecycle.', options: ['json', 'no-qr'], notes: ['Inspection is read-only and shows the inspected service version when it exists.'], examples: ['ptbk show', 'ptbk show --json'] },
    answer: { invocation: 'answer [request-id] [reply] [options]', purpose: 'List pending durable requests or submit an explicit answer once, even when HTTP is disabled.', options: ['request', 'response', 'action', 'json', 'no-questions'], arguments: ['request-id: pending request identifier; omitted ID lists pending requests.', 'reply: nonempty answer text, including for rejection/cancellation; predefined interactive answers use a selectable picker.'], notes: ['--action answered|rejected|cancelled chooses the durable response status; default: answered. Replies share the same record as terminal/browser/API responses.', 'Raw/noninteractive use supplies the response explicitly and never waits on invisible input.'], examples: ['ptbk answer', 'ptbk answer REQUEST_ID "Approved answer"', 'ptbk answer --request REQUEST_ID --response "Declined" --action rejected --non-interactive'] },
    add: { invocation: 'add [description] [options]', purpose: 'Create one task Book through a finite wizard, supplied text, stdin or a template, without a model call or task execution.', options: [...AUTHORING, 'priority', 'template'], arguments: ['description: task description; omitted text is collected interactively or read from piped stdin.'], notes: ['The wizard reuses supplied text, previews the task and confirms before saving. Cancellation creates no task.', 'Task priority defaults to 0. --priority sets the new task\'s priority rather than a queue filter.', CONFIGURATION_NOTE], examples: ['ptbk add "Add a health endpoint"', 'ptbk add "Write release notes" --priority 5 --no-questions', 'ptbk add --template tasks/templates/task.book'] },
    'generate-boilerplates': { invocation: 'generate-boilerplates [options]', purpose: 'Create unfinished, not-ready task templates that cannot run automatically.', options: [...AUTHORING, 'count'], examples: ['ptbk generate-boilerplates', 'ptbk generate-boilerplates --count 3*2 --commit'] },
    plan: { invocation: 'plan [options]', purpose: 'Discuss a project and save reviewed task proposals using an enforceably read-only harness, without implementing them.', options: [...ROUTING, ...AUTHORING, 'allow-credits', 'prompt'], notes: ['Planning and advisors cannot write application files or launch unrestricted work. Only reviewed task proposals may be saved.', 'Conversation controls: /save ready proposals, /draft not-ready proposals, /discard unsaved proposals, /exit. EOF discards unsaved proposals.', 'OpenAI Codex is the supported baseline; an unsupported read-only capability fails rather than granting unrestricted execution.', CONFIGURATION_NOTE], examples: ['ptbk plan', 'ptbk plan --prompt "Plan a safer import flow"', 'ptbk plan --agent Planner --harness openai-codex'] },
    list: { invocation: 'list [options]', purpose: 'Inspect queue ordering, priority filters, eligibility and blockers without executing or repairing anything.', options: [...ROUTING, 'min-priority', 'max-priority', 'priority', 'json'], notes: ['List reports missing capabilities without installing tools, authenticating or calling models.', CONFIGURATION_NOTE], examples: ['ptbk list', 'ptbk list --min-priority 5 --json'] },
    run: { invocation: 'run [options]', purpose: 'Execute a finite current queue sequentially with one selected configuration, then return its truthful outcome.', options: [...EXECUTION, 'json', 'no-server', 'no-qr', 'port', 'browser-mode', 'browser-profile'], notes: ['The default finite agent is Developer. A live dashboard is used on suitable terminals; raw operation streams plain events.', 'Future work is reported without keeping this finite invocation alive. --json is supported only with --dry-run.', CONFIGURATION_NOTE, RUNTIME_NOTE], examples: ['ptbk run --dry-run', 'ptbk run --dry-run --json', 'ptbk run --harness openai-codex --check "npm run check" --limit 1', 'ptbk run --no-commit --git-changes ignore --non-interactive'] },
    server: { invocation: 'server [options]', purpose: 'Run the compatibility persistent task server in this foreground invocation with a localhost control API.', options: [...EXECUTION.filter(name => !['limit', 'dry-run'].includes(name)), 'port'], notes: ['This is an owning persistent foreground process, not a one-shot daemon launch. Use start for the ordinary ongoing agenda and dashboard to attach a separate client.', 'A finite --limit or --dry-run belongs to run rather than server.', CONFIGURATION_NOTE], examples: ['ptbk server', 'ptbk server --port 3100 --raw'] },
    fix: { invocation: 'fix [options]', purpose: 'Check and repair project validation using the selected agent, without running backlog tasks.', options: EXECUTION.filter(name => !['limit', 'min-priority', 'max-priority', 'priority'].includes(name)), notes: ['Default agent: Developer. Fix is validation work, not ordinary task-queue execution.', CONFIGURATION_NOTE], examples: ['ptbk fix', 'ptbk fix --check "npm run check" --harness openai-codex'] },
    verify: { invocation: 'verify [options]', purpose: 'Interactively review completed tasks and choose archive, follow-up, skip or quit; this is human review, not a check run.', options: [...AUTHORING, 'ignore'], notes: ['An interactive human review is required; --no-questions cannot perform it. Ignore patterns may be repeated.'], examples: ['ptbk verify', 'ptbk verify --ignore "tasks/generated/**" --commit'] },
    migrate: { invocation: 'migrate [options]', purpose: 'Explicitly convert legacy Markdown task sections to Books while preserving payload, assets and recovery copies.', options: ['no-commit', 'dry-run', 'json', 'no-questions'], notes: ['Default: commit converted task sources. --dry-run previews without writes; --no-commit leaves conversion changes uncommitted.', 'Conversion refuses changed or colliding destinations; it does not start tasks.'], examples: ['ptbk migrate --dry-run', 'ptbk migrate --dry-run --json', 'ptbk migrate --no-commit'] },
    recover: { invocation: 'recover <task-reference> [options]', purpose: 'Inspect interrupted or blocked work; make a recovery decision only when an explicit action is supplied.', options: [...EXECUTION, 'action', 'occurrence', 'json'], arguments: ['task-reference: exactly one stable task identifier; --occurrence selects a recurring occurrence.'], notes: ['Without --action, recovery is read-only. Resume continues a safe phase; retry is a deliberate reattempt; acknowledge accepts a failed outcome and is not success.', 'Completed model work is not repeated to fix a failed commit or push. Ownership, source revisions and external effects remain protected.', 'Recovery actions are option values, not subcommands: use --action resume|retry|acknowledge.'], examples: ['ptbk recover TASK_ID', 'ptbk recover TASK_ID --action resume --dry-run', 'ptbk recover TASK_ID --action acknowledge --occurrence OCCURRENCE_ID'] },
    ping: { invocation: 'ping [options]', purpose: 'Explicitly make a small harness/model call to test availability, optionally repeating at a supplied interval.', options: [...ROUTING, 'period', 'allow-credits', 'no-questions'], notes: ['Ping can call a model; unlike help, list and dry-run, it is an explicitly requested inference.', CONFIGURATION_NOTE], examples: ['ptbk ping --harness openai-codex', 'ptbk ping --period 30s --non-interactive'] },
    'find-unwritten': { invocation: 'find-unwritten [options]', purpose: 'Find TODO, FIXME and @@@ placeholders in project text sources without a model call.', options: [], examples: ['ptbk find-unwritten', 'ptbk find-unwritten --path ./project'] },
    'find-refactor-candidates': { invocation: 'find-refactor-candidates [options]', purpose: 'List large project source files as possible refactoring candidates without executing work.', options: [], examples: ['ptbk find-refactor-candidates'] },
    'find-fresh-emoji-tags': { invocation: 'find-fresh-emoji-tags [options]', purpose: 'Suggest emoji tags not already used in discovered task titles.', options: [], examples: ['ptbk find-fresh-emoji-tags'] },
    about: { invocation: 'about', purpose: 'Promptbook operates agents, projects and checked tasks in readable files, with safe Git persistence and durable recovery.', options: [], notes: ['Ordinary workflow: initialize or clone a project, start its agenda, then optionally attach a dashboard.', 'Versioned project defaults live in ptbk.json. Local recovery, requests and browser state live in ignored .ptbk/.', 'This product overview works offline without initialization, updates, authentication or a running service.'], examples: ['ptbk init', 'ptbk start', 'ptbk dashboard'] },
};

/** Known aliases preserve their invoked spelling while sharing a command's reference. */
const ALIASES: Readonly<Record<string, string>> = { initialize: 'init' };
/** Option values must not be confused with the literal command word "help". */
const VALUE_OPTIONS = new Set(Object.values(OPTIONS).filter(option => /--[\w-]+ (?!,)/.test(option.syntax)).map(option => option.syntax.match(/^--([\w-]+)/)![1]!));
/** Global switches that can accompany a bare overview without hiding a usage error. */
const OVERVIEW_OPTIONS = new Set(COMMON);

/** Remove terminal controls from user-supplied diagnostic and presentation labels. */
function printable(value: string): string {
    return value.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\x00-\x1f\x7f]/g, ' ');
}

/** Tokenize only enough to find help, without validating operation-specific requirements. */
function helpTokens(argv: readonly string[]): { positional: string[]; flags: Map<string, string>; literal: boolean; invalidBare: boolean; unknown: string[] } {
    const positional: string[] = []; const flags = new Map<string, string>(); const unknown: string[] = []; let literal = false; let invalidBare = false;
    for (let index = 0; index < argv.length; index++) {
        const token = argv[index]!;
        if (token === '--') { literal = true; break; }
        if (token === '-h' || token === '-v') { flags.set(token === '-h' ? 'help' : 'version', 'true'); continue; }
        if (!token.startsWith('-')) { positional.push(token); continue; }
        if (!token.startsWith('--')) { invalidBare = true; unknown.push(token); continue; }
        const equals = token.indexOf('=');
        const name = token.slice(2, equals < 0 ? undefined : equals);
        const value = equals < 0 ? 'true' : token.slice(equals + 1);
        flags.set(name, value);
        if (!Object.hasOwn(OPTIONS, name)) unknown.push(`--${name}`);
        if (!OVERVIEW_OPTIONS.has(name as typeof COMMON[number])) invalidBare = true;
        if (VALUE_OPTIONS.has(name) && equals < 0) {
            if (argv[index + 1] !== undefined && !argv[index + 1]!.startsWith('-')) index++;
            else invalidBare = true;
        }
    }
    return { positional, flags, literal, invalidBare, unknown };
}

/** Resolve bare, prefix, trailing and flag help before any command can have side effects.
 * Literal text after `--` is never interpreted as a help request. Actual command arguments
 * may precede `--help`; explicit `help <path>` and trailing-help paths must match exactly.
 * @private Internal executable help routing.
 */
export function resolveHelpRequest(argv: readonly string[]): HelpRequest | undefined {
    const tokens = helpTokens(argv);
    const enabled = (name: string) => tokens.flags.has(name) && tokens.flags.get(name) !== 'false';
    if (enabled('version')) return undefined;
    const prefix = tokens.positional[0] === 'help';
    const trailing = !tokens.literal && tokens.positional.at(-1) === 'help';
    const flag = enabled('help');
    const bareTerminator = tokens.literal && argv.indexOf('--') === argv.length - 1 && !tokens.positional.length && !tokens.invalidBare;
    if (!prefix && !trailing && !flag && (tokens.positional.length || tokens.invalidBare || tokens.literal && !bareTerminator)) return undefined;
    let path = prefix ? tokens.positional.slice(1) : trailing ? tokens.positional.slice(0, -1) : tokens.positional.slice();
    if (flag && !prefix && !trailing && ['add', 'answer', 'recover'].includes(path[0] ?? '')) path = path.slice(0, 1);
    const request: HelpRequest = { path, raw: enabled('raw') || enabled('no-ui') };
    if (tokens.unknown.length) {
        request.error = `Unsupported option ${printable(tokens.unknown[0]!)}.`;
    } else if (enabled('interactive') && (request.raw || enabled('non-interactive') || enabled('no-questions'))) {
        request.error = '--interactive conflicts with raw/no-UI/noninteractive/no-questions operation.';
    } else if (path.length > 1 || (path.length === 1 && !COMMAND_HELP[ALIASES[path[0]!] ?? path[0]!])) {
        request.error = `Unknown help command path: ${printable(path.join(' '))}.`;
    }
    return request;
}

/** Point usage errors back to the affected command rather than dumping global help.
 * @private Internal CLI diagnostic guidance.
 */
export function helpHint(argv: readonly string[]): string {
    const tokens = helpTokens(argv).positional;
    const command = tokens[0] === 'help' ? tokens[1] : tokens[0];
    return `Use ptbk${command && COMMAND_HELP[ALIASES[command] ?? command] ? ` ${command}` : ''} --help.`;
}

/** Align option syntax when space permits; the shared document renderer handles wrapping. */
function optionLines(names: readonly string[], width: number, scope?: string): string[] {
    const options = [...new Set(names)].map(name => {
        const option = OPTIONS[name];
        if (!option) throw new Error(`Help option ${name} has no reference.`);
        if (scope === 'answer' && name === 'action') return { syntax: '--action answered|rejected|cancelled', description: 'Durable response status; default: answered. Each status requires nonempty reply text.' };
        if (scope === 'run' && name === 'json') return { ...option, description: 'Emit the structured queue preview; requires --dry-run.' };
        if (scope === 'restart' && name === 'daemon') return { ...option, description: 'Restart background daemon operation and report once; restart always targets a daemon.' };
        if (scope === 'init' && name === 'commit') return { ...option, description: 'Enable setup commits (default); preserve unrelated changes and existing user staging.' };
        if (scope === 'add' && name === 'priority') return { syntax: '--priority N', description: 'Priority of the new task; default: 0.' };
        if (['init', 'migrate', 'add', 'plan', 'verify', 'generate-boilerplates'].includes(scope ?? '') && name === 'no-commit') return { ...option, description: 'Leave this command\'s authoring/setup changes uncommitted.' };
        return option;
    });
    const column = Math.min(38, Math.max(...options.map(option => option.syntax.length), 0));
    return options.flatMap(option => width < column + 24 || option.syntax.length > column
        ? [option.syntax, `  ${option.description}`]
        : [`${option.syntax.padEnd(column)}  ${option.description}`]);
}

/** Render the top-level workflow overview without expanding every command's reference. */
function overview(presentation: HelpPresentation): string {
    return renderDocument(`Promptbook ${printable(presentation.version)}`, [
        { title: 'Purpose', lines: ['Operate agents and checked tasks over a Git project.', 'Usage: ptbk <command> [arguments] [options]', ...(presentation.projectPath ? [`Project: ${printable(presentation.projectPath)}`] : [])] },
        { title: 'Ordinary workflow', lines: ['ptbk init       Prepare a project (or clone an existing one).', 'ptbk start      Launch its ongoing daemon and report once.', 'ptbk dashboard  Attach a live view to the existing service.', 'ptbk stop       Stop the daemon intentionally.'] },
        { title: 'Command groups', lines: ['Setup and authoring: init (initialize), add, plan, generate-boilerplates', 'Execution: start, run (finite queue), fix (validation), verify (human review), server (compatibility)', 'Inspect and control: dashboard, status, show, list, answer, stop, restart, recover', 'Local helpers: migrate, find-unwritten, find-refactor-candidates, find-fresh-emoji-tags', 'Information and explicit probes: help, about, ping'] },
        { title: 'Common options', lines: optionLines(COMMON, presentation.width) },
        { title: 'Defaults and operation', lines: [CONFIGURATION_NOTE, 'Pretty output is the default on a suitable terminal; redirected output is plain. --raw changes presentation, not daemon versus foreground operation.', 'Start defaults to a daemon; --foreground owns its ongoing execution. Interactive run is finite foreground work.', 'Featured harnesses: OpenAI Codex, Claude Code. The init harness picker offers More for all integrations.'] },
        { title: 'Examples and detailed help', lines: ['ptbk init', 'ptbk start', 'ptbk run --dry-run', 'ptbk help init', 'ptbk start --help', 'ptbk dashboard help', 'For a complete local reference, use ptbk help <command>. Help works offline and never executes work.'] },
    ], presentation);
}

/** Produce one scoped pretty/raw document using the actual invoked engine version.
 * A rejected help path has an unsuccessful exit code and never becomes global help.
 * @private Internal executable help presentation.
 */
export function renderHelp(request: HelpRequest, presentation: HelpPresentation): { text: string; exitCode: number } {
    const options = request.raw ? { ...presentation, pretty: false, color: false } : presentation;
    if (request.error) {
        const parent = request.path[0];
        const guidance = parent && COMMAND_HELP[ALIASES[parent] ?? parent] ? `Use ptbk ${parent} --help for supported syntax.` : 'Use ptbk --help for supported commands.';
        return { text: renderDocument(`Promptbook ${printable(presentation.version)}`, [{ title: 'Help error', lines: [request.error, guidance] }], options), exitCode: 2 };
    }
    if (!request.path.length) return { text: overview(options), exitCode: 0 };
    const invoked = request.path[0]!;
    const scope = ALIASES[invoked] ?? invoked;
    const command = COMMAND_HELP[scope];
    if (!command || request.path.length !== 1) return renderHelp({ ...request, error: `Unknown help command path: ${printable(request.path.join(' '))}.` }, options);
    const invocation = invoked + command.invocation.slice(scope.length);
    const sections = [
        { title: 'Usage', lines: [`Usage: ptbk ${invocation}`, command.purpose, ...(scope === 'init' ? ['Alias: ptbk initialize'] : [])] },
        ...(command.arguments ? [{ title: 'Arguments', lines: [...command.arguments] }] : []),
        ...(command.options.length ? [{ title: 'Command options', lines: optionLines(command.options, options.width, scope) }] : []),
        { title: 'Inherited options', lines: optionLines(scope === 'about' ? ['raw', 'help', 'version'] : COMMON, options.width, scope) },
        ...(command.notes ? [{ title: 'Behavior and defaults', lines: [...command.notes] }] : []),
        { title: 'Examples', lines: [...command.examples] },
        { title: 'Broader help', lines: ['Use ptbk --help for the workflow and command groups.'] },
    ];
    return { text: renderDocument(`Promptbook ${printable(presentation.version)} · ${invoked}`, sections, options), exitCode: 0 };
}
