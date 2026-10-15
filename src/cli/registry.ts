import type { CommandContext } from './context.js';
import {
    BROWSER_OPTIONS,
    COMMIT_OPTIONS,
    EXECUTION_POLICY_OPTIONS,
    EXECUTION_SELECTION_OPTIONS,
    JSON_OPTION,
    PRESENTATION_OPTIONS,
    PROJECT_OPTIONS,
    QUEUE_FILTER_OPTIONS,
    SERVER_OPTIONS,
    type CommandSpec,
    type OptionGroup,
} from './spec.js';

/**
 * Lazily imports a command module and runs its exported handler.
 */
function lazy(load: () => Promise<{ default: (context: CommandContext) => Promise<number> }>): (context: CommandContext) => Promise<number> {
    return async (context) => (await load()).default(context);
}

/**
 * Start-time options shared by start/restart and init's agenda flow.
 */
const START_OPTIONS: OptionGroup = {
    title: 'Process mode',
    options: [
        { name: 'daemon', type: 'boolean', description: 'Run in the background, independent of this terminal (default).' },
        { name: 'foreground', type: 'boolean', description: 'Keep the service attached to this terminal (live dashboard, or plain events with --raw).' },
        { name: 'persist', type: 'boolean', negatable: true, negatedOnly: true, description: 'Do not restart automatically after crashes or reboots (state stays durable).' },
        { name: 'harness-updates', type: 'boolean', negatable: true, negatedOnly: true, description: 'Do not update enabled harnesses automatically for this run.' },
        { name: 'harness', type: 'string', valueName: '<id>', repeatable: true, description: 'Restrict routing to these enabled harnesses for this run (repeatable).' },
        { name: 'resume-service', type: 'boolean', hidden: true, description: 'Internal: resume a persisted service at login/boot.' },
    ],
};

/**
 * All commands.
 *
 * @private command registry
 */
export const COMMANDS: readonly CommandSpec[] = [
    {
        name: 'init',
        aliases: ['initialize'],
        category: 'Start here',
        summary: 'Prepare a project through a finite wizard (or flags), ready for `ptbk start`.',
        description: `Incrementally prepares an empty folder or an existing project: Git, ptbk.json, agents (core agents Adam, Manager and Teacher plus default roles), task templates, project instructions, the .ptbk/ ignore rule, local or global installation, selected harnesses (installed, logged in and verified), the project browser, a real project check and a first runnable task. Setup artifacts are committed with a "PTBK: " subject.

Repeating init with satisfied prerequisites changes nothing. For a fresh folder, an intent creates a first task for Expert, runs it and continues into \`ptbk start\`; a blank intent creates a sample project without any model call.

Without a terminal (or with --non-interactive), supply decisions with flags: missing decisions fail before any change.`,
        optionGroups: [
            {
                title: 'Destination and intent',
                options: [
                    { name: 'subfolder', type: 'string', valueName: '<name>', description: 'Initialize a new subfolder of the selected path instead of the directory itself.' },
                    { name: 'nested', type: 'enum', values: ['ignored', 'submodule'], valueName: '<strategy>', description: 'For a new child inside an existing Git repository: independent ignored repository or Git submodule.' },
                    { name: 'submodule-url', type: 'string', valueName: '<url>', description: 'Source URL recorded for a submodule child (required with --nested submodule).' },
                    { name: 'intent', type: 'string', valueName: '<text>', description: 'What the new project should achieve (fresh folders only); starts the agenda after setup.' },
                    { name: 'intent-file', type: 'string', valueName: '<path>', description: 'Read the intent from a file.' },
                    { name: 'self-update', type: 'enum', values: ['yes', 'no'], valueName: '<decision>', description: 'Update this ptbk installation first when a newer release exists.', defaultText: 'asked interactively; no when unattended' },
                ],
            },
            {
                title: 'Installation and harnesses',
                options: [
                    { name: 'installation', type: 'enum', values: ['local', 'global'], valueName: '<scope>', description: "Install ptbk in the project's dependencies (exact running version) or use the global CLI.", defaultText: 'local (asked interactively)' },
                    { name: 'harness', type: 'string', valueName: '<id>', repeatable: true, description: 'Select a harness (repeatable): openai-codex, claude-code, github-copilot, cline, opencode, gemini, qwen-code.' },
                    { name: 'no-harness', type: 'boolean', description: 'Explicitly select no harness (setup stays incomplete).' },
                    { name: 'install-harnesses', type: 'boolean', description: 'Authorize global installation of missing selected harness CLIs (unattended).' },
                    { name: 'update-harnesses', type: 'enum', values: ['keep', 'update'], valueName: '<decision>', description: 'Outdated selected harnesses: keep current versions or update them.', defaultText: 'asked interactively; keep when unattended' },
                ],
            },
            {
                title: 'Browser and validation',
                options: [
                    { name: 'browser-profile', type: 'string', valueName: '<path|isolated>', description: 'Project browser profile.', defaultText: 'isolated profile in .ptbk/' },
                    { name: 'browser-mode', type: 'enum', values: ['headless', 'headful'], valueName: '<mode>', description: 'Browser visibility.', defaultText: 'headless' },
                    { name: 'check', type: 'string', valueName: '<command>', description: 'Project check to save when none is configured (otherwise a temporary override).' },
                    { name: 'defer-check', type: 'boolean', description: 'Explicitly defer the check decision (setup stays incomplete).' },
                ],
            },
            COMMIT_OPTIONS,
            { title: 'Agenda start after an intent (startup-only)', options: [...SERVER_OPTIONS.options, { name: 'persist', type: 'boolean', negatable: true, negatedOnly: true, description: 'Do not register restart persistence.' }] },
            PROJECT_OPTIONS,
            PRESENTATION_OPTIONS,
        ],
        examples: [
            { command: 'ptbk init', description: 'Interactive wizard in the current directory.' },
            { command: 'ptbk init --subfolder my-agenda', description: 'Create and initialize a new folder.' },
            { command: 'ptbk init --non-interactive --installation local --harness openai-codex --check "npm test"', description: 'Unattended setup.' },
            { command: 'ptbk init --intent "A static site about birds"', description: 'Fresh project created by Expert, then started.' },
        ],
        run: lazy(() => import('./commands/init.js')),
    },
    {
        name: 'start',
        category: 'Run the agenda',
        summary: 'Start the ongoing agenda as a background service and report once.',
        description: `Starts actual work: executes eligible tasks one at a time, routes unassigned tasks through Manager, checks and commits each accepted result, and discovers goal-driven work when the backlog is empty. By default it launches a persistent daemon, serves the local dashboard/API on a free loopback port (from 3000) with protected remote access through a managed tunnel, renders one status snapshot and returns the terminal.

Missing setup is offered through the same initialization workflow when interactive; unattended starts report what is missing. Repeated start reports the existing service without starting another one. Use \`ptbk dashboard\` to watch it live.`,
        optionGroups: [START_OPTIONS, SERVER_OPTIONS, BROWSER_OPTIONS, EXECUTION_POLICY_OPTIONS, COMMIT_OPTIONS, { title: 'Context', options: [EXECUTION_SELECTION_OPTIONS.options[4]!] }, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
        examples: [
            { command: 'ptbk start', description: 'Background agenda with dashboard, tunnel and reboot persistence.' },
            { command: 'ptbk start --no-tunnel', description: 'Local-only dashboard.' },
            { command: 'ptbk start --foreground', description: 'Own the agenda in this terminal with the live dashboard.' },
            { command: 'ptbk start --raw', description: 'Still a daemon; plain one-shot output.' },
        ],
        run: lazy(() => import('./commands/start.js')),
    },
    {
        name: 'stop',
        category: 'Run the agenda',
        summary: "Stop the project's daemon (it stays stopped after reboot).",
        description: 'Stops the daemon safely: owned work is cancelled and keeps its recovery record (use --after-task to finish the current task first). An intentional stop also removes startup persistence until the next explicit `ptbk start`.',
        optionGroups: [
            {
                title: 'Stop',
                options: [
                    { name: 'after-task', type: 'boolean', description: 'Finish the current task before stopping.' },
                    { name: 'timeout', type: 'duration', valueName: '<duration>', description: 'How long to wait for the service to release the project.', defaultText: '2m' },
                ],
            },
            PROJECT_OPTIONS,
            PRESENTATION_OPTIONS,
        ],
        examples: [
            { command: 'ptbk stop', description: 'Stop now; interrupted work resumes on the next start.' },
            { command: 'ptbk stop --after-task', description: 'Let the current task finish first.' },
        ],
        run: lazy(() => import('./commands/stop.js')),
    },
    {
        name: 'restart',
        category: 'Run the agenda',
        summary: 'Restart the daemon with its effective configuration.',
        description: 'Stops the daemon (recoverably) and starts it again with the same invocation overrides it was started with; newly given flags replace them. Restart is not an intentional permanent stop.',
        optionGroups: [START_OPTIONS, SERVER_OPTIONS, BROWSER_OPTIONS, EXECUTION_POLICY_OPTIONS, COMMIT_OPTIONS, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
        examples: [{ command: 'ptbk restart', description: 'Restart with the same settings.' }],
        run: lazy(() => import('./commands/restart.js')),
    },
    {
        name: 'dashboard',
        category: 'Observe and respond',
        summary: 'Attach a live terminal view and controls to the running service.',
        description: 'Continuously shows the shared project status (requests first, current work, queue, results and connection) and offers controls: A answer, P pause/resume, S skip a pacing wait, X stop the service, R renew pairing, O plain presentation, Q leave. Leaving never stops the service. With --raw it streams plain state changes instead.',
        optionGroups: [{ title: 'View', options: [SERVER_OPTIONS.options[4]!] }, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
        examples: [
            { command: 'ptbk dashboard', description: 'Live view of the current project.' },
            { command: 'ptbk dashboard --path ../site --raw', description: 'Plain continuous observation.' },
        ],
        run: lazy(() => import('./commands/dashboard.js')),
    },
    {
        name: 'status',
        aliases: ['show'],
        category: 'Observe and respond',
        summary: 'Show one snapshot of the service status, requests and connection.',
        description: 'Renders the same grouped status as the dashboard once and returns. It never starts work, a service or a tunnel, and never mints pairing credentials.',
        optionGroups: [{ title: 'View', options: [SERVER_OPTIONS.options[4]!, JSON_OPTION] }, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
        examples: [
            { command: 'ptbk status', description: 'Snapshot of the current project.' },
            { command: 'ptbk show --json', description: 'Machine-readable snapshot.' },
        ],
        run: lazy(() => import('./commands/status.js')),
    },
    {
        name: 'answer',
        category: 'Observe and respond',
        summary: 'List and answer pending requests to the user.',
        description: 'Without arguments, lists pending requests (and lets you pick and answer one interactively). With a request ID and an answer, applies it once. Works with or without a running service or HTTP.',
        arguments: [
            { name: 'request-id', description: 'Request to answer, e.g. r-k3x9m2.' },
            { name: 'answer', description: 'Answer text (or one of the declared choices).', variadic: true },
        ],
        optionGroups: [
            {
                title: 'Answer',
                options: [
                    { name: 'decline', type: 'boolean', description: 'Decline the request instead of answering.' },
                    { name: 'stdin', type: 'boolean', description: 'Read the answer from standard input.' },
                    JSON_OPTION,
                ],
            },
            PROJECT_OPTIONS,
            PRESENTATION_OPTIONS,
        ],
        examples: [
            { command: 'ptbk answer', description: 'List pending requests.' },
            { command: 'ptbk answer r-k3x9m2 "Use PostgreSQL"', description: 'Answer one request.' },
        ],
        run: lazy(() => import('./commands/answer.js')),
    },
    {
        name: 'run',
        category: 'Run the agenda',
        summary: 'Execute the existing eligible queue once with one configuration, then exit.',
        description: 'Finite execution: one agent, harness, model and thinking level for every task; tasks with incompatible explicit requirements are skipped with an explanation. New follow-up work does not extend the run, future tasks stay pending and recurring definitions run at most once. Uses the same checks, completion, commits and recovery as start.',
        optionGroups: [EXECUTION_SELECTION_OPTIONS, QUEUE_FILTER_OPTIONS, EXECUTION_POLICY_OPTIONS, COMMIT_OPTIONS, { title: 'Live view', options: [{ ...SERVER_OPTIONS.options[0]!, negatable: true, description: 'Serve the dashboard/API during this run (--server enables; off by default).', defaultText: 'off' }, ...SERVER_OPTIONS.options.slice(1)] }, BROWSER_OPTIONS, { title: 'Output', options: [JSON_OPTION] }, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
        examples: [
            { command: 'ptbk run --harness openai-codex --limit 1', description: 'Run one task with Codex.' },
            { command: 'ptbk run --dry-run', description: 'Preview the queue and configuration.' },
            { command: 'ptbk run --agent @Planner --check "npm test"', description: 'Explicit agent and check.' },
        ],
        run: lazy(() => import('./commands/run.js')),
    },
    {
        name: 'add',
        category: 'Author work',
        summary: 'Create and commit a task (wizard, text, stdin or template) without a model call.',
        description: 'Creates an unfinished task Book in the task source and commits it ("PTBK: Add task - <title>") so the agenda can pick it up immediately; Manager assigns missing routing. Interactive add guides the description, template and priority and confirms before saving; cancelling creates nothing.',
        arguments: [{ name: 'description', description: 'Task description; the first line becomes the title.', variadic: true }],
        optionGroups: [
            {
                title: 'Task',
                options: [
                    { name: 'title', type: 'string', valueName: '<title>', description: 'Explicit title (otherwise the first line of the description).' },
                    { name: 'stdin', type: 'boolean', description: 'Read the description from standard input.' },
                    { name: 'template', type: 'string', valueName: '<name>', description: 'Start from tasks/templates/<name>.book.' },
                    { name: 'priority', type: 'string', valueName: '<priority>', description: 'TASK PRIORITY (number or words like high).' },
                    { name: 'agent', type: 'string', valueName: '<ref>', description: 'TASK AGENT (omit to let Manager assign).' },
                    { name: 'harness', type: 'string', valueName: '<id>', description: 'TASK HARNESS requirement.' },
                    { name: 'model', type: 'string', valueName: '<model>', description: 'TASK MODEL requirement.' },
                    { name: 'thinking-level', type: 'enum', values: ['low', 'medium', 'high', 'xhigh', 'max'], valueName: '<level>', description: 'TASK THINKING LEVEL requirement.' },
                    { name: 'after', type: 'string', valueName: '<date>', description: 'TASK AFTER earliest start (YYYY-MM-DD[THH:mm][offset]).' },
                    { name: 'repeat', type: 'string', valueName: '<interval>', description: 'TASK REPEAT interval, e.g. 7d.' },
                    { name: 'yes', type: 'boolean', description: 'Save without the interactive confirmation.' },
                ],
            },
            COMMIT_OPTIONS,
            PROJECT_OPTIONS,
            PRESENTATION_OPTIONS,
        ],
        examples: [
            { command: 'ptbk add "Improve CSV export"', description: 'Add and commit a task.' },
            { command: 'cat spec.md | ptbk add --stdin --priority high', description: 'Description from stdin.' },
            { command: 'ptbk add --template bugfix', description: 'Interactive add from a template.' },
        ],
        run: lazy(() => import('./commands/add.js')),
    },
    {
        name: 'generate-boilerplates',
        category: 'Author work',
        summary: 'Create unfinished, non-runnable task templates to fill in later.',
        description: 'Creates N files with M placeholder sections each (`@@@` placeholders are never executed). With M = 1 the files are task Books; otherwise Markdown task files.',
        optionGroups: [
            {
                title: 'Boilerplates',
                options: [
                    { name: 'count', type: 'string', valueName: '<N|N*M>', description: 'Number of files (and sections per file).', defaultText: '5*1' },
                    { name: 'template', type: 'string', valueName: '<name>', description: 'Template from tasks/templates/.' },
                ],
            },
            COMMIT_OPTIONS,
            PROJECT_OPTIONS,
            PRESENTATION_OPTIONS,
        ],
        examples: [{ command: 'ptbk generate-boilerplates --count 3*2', description: 'Three Markdown files with two placeholder sections each.' }],
        run: lazy(() => import('./commands/boilerplates.js')),
    },
    {
        name: 'plan',
        category: 'Author work',
        summary: 'Discuss intent with a read-only planner and save approved tasks.',
        description: 'Explores the project read-only and proposes tasks without implementing anything. Commands: /save saves proposals as ready tasks, /draft saves them as not ready, /discard drops them, /exit leaves (EOF discards unsaved proposals). Saves are committed. Requires a harness with enforceable read-only mode (OpenAI Codex is the baseline).',
        arguments: [{ name: 'message', description: 'Opening message.', variadic: true }],
        optionGroups: [EXECUTION_SELECTION_OPTIONS, COMMIT_OPTIONS, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
        examples: [{ command: 'ptbk plan "We need a newsletter signup"', description: 'Start a planning conversation.' }],
        run: lazy(() => import('./commands/plan.js')),
    },
    {
        name: 'list',
        category: 'Observe and respond',
        summary: 'List tasks with readiness explanations (read-only).',
        description: 'Shows the queue in execution order with the reason each task is ready, waiting or blocked, the same way start, run and the dashboards evaluate it. Never assigns IDs, calls a model or creates Manager tasks.',
        optionGroups: [
            {
                title: 'Filter',
                options: [
                    { name: 'all', type: 'boolean', description: 'Include completed and retired tasks.' },
                    { name: 'ready', type: 'boolean', description: 'Only tasks that can start now.' },
                    JSON_OPTION,
                ],
            },
            PROJECT_OPTIONS,
            PRESENTATION_OPTIONS,
        ],
        examples: [
            { command: 'ptbk list', description: 'Unfinished tasks with reasons.' },
            { command: 'ptbk list --all --json', description: 'Everything, machine-readable.' },
        ],
        run: lazy(() => import('./commands/list.js')),
    },
    {
        name: 'fix',
        category: 'Maintain',
        summary: 'Run the project check and repair it when it fails (not the task queue).',
        description: 'Runs the configured check. A healthy project needs no model and creates no commit. A failing check becomes an explicit maintenance task executed by the selected agent (default Developer) and committed when the check passes.',
        optionGroups: [EXECUTION_SELECTION_OPTIONS, { title: 'Check', options: [EXECUTION_POLICY_OPTIONS.options[0]!, QUEUE_FILTER_OPTIONS.options[5]!] }, COMMIT_OPTIONS, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
        examples: [{ command: 'ptbk fix', description: 'Check, and repair if needed.' }],
        run: lazy(() => import('./commands/fix.js')),
    },
    {
        name: 'verify',
        category: 'Maintain',
        summary: 'Review completed results, create follow-ups and archive them (human review).',
        description: 'Walks through completed tasks for human review: accept and archive (moved to tasks/archive/, committed), create a follow-up task, or skip. This is not a check run.',
        optionGroups: [
            {
                title: 'Review',
                options: [
                    { name: 'order', type: 'enum', values: ['newest', 'oldest'], valueName: '<order>', description: 'Review order.', defaultText: 'oldest' },
                    { name: 'ignore', type: 'string', valueName: '<pattern>', repeatable: true, description: 'Skip tasks whose title or path contains this text (repeatable).' },
                    { name: 'archive-all', type: 'boolean', description: 'Archive every completed task without asking (unattended).' },
                ],
            },
            COMMIT_OPTIONS,
            PROJECT_OPTIONS,
            PRESENTATION_OPTIONS,
        ],
        examples: [{ command: 'ptbk verify --order newest', description: 'Review the latest results first.' }],
        run: lazy(() => import('./commands/verify.js')),
    },
    {
        name: 'migrate',
        category: 'Author work',
        summary: 'Convert Markdown task sections into task Books (no model call).',
        description: 'Creates one Book per Markdown section, preserving title, payload, state, priority, selectors (as TASK RUNNER), time restrictions and known completion history, verifies the meaning and moves the original file into tasks/archive/. Unconvertible sections block the file. One maintenance commit.',
        arguments: [{ name: 'file', description: 'Markdown files to convert (default: all in the task sources).', variadic: true }],
        optionGroups: [{ title: 'Migration', options: [QUEUE_FILTER_OPTIONS.options[5]!] }, COMMIT_OPTIONS, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
        examples: [
            { command: 'ptbk migrate --dry-run', description: 'Preview the conversion.' },
            { command: 'ptbk migrate', description: 'Convert and commit.' },
        ],
        run: lazy(() => import('./commands/migrate.js')),
    },
    {
        name: 'recover',
        category: 'Observe and respond',
        summary: 'Inspect and resolve interrupted or failed work.',
        description: 'Without --action, shows the recorded state of a task (read-only). --action resume continues a safe interrupted phase, retry runs it again with a fresh budget, acknowledge records the failure (TASK STATUS failed). Acknowledgement is not success.',
        arguments: [{ name: 'task', description: 'Task reference (#id, path or path#section).' }],
        optionGroups: [
            {
                title: 'Recovery',
                options: [
                    { name: 'action', type: 'enum', values: ['resume', 'retry', 'acknowledge'], valueName: '<action>', description: 'Recovery action.' },
                    { name: 'occurrence', type: 'string', valueName: '<time>', description: 'Occurrence of recurring work.' },
                    QUEUE_FILTER_OPTIONS.options[5]!,
                ],
            },
            PROJECT_OPTIONS,
            PRESENTATION_OPTIONS,
        ],
        examples: [
            { command: 'ptbk recover', description: 'Show interrupted or failed work.' },
            { command: 'ptbk recover #fix-login --action retry', description: 'Retry a failed task.' },
        ],
        run: lazy(() => import('./commands/recover.js')),
    },
    {
        name: 'find-unwritten',
        category: 'Maintain',
        summary: 'List placeholder (@@@) tasks that still need writing.',
        description: 'Finds task Books and Markdown sections containing the `@@@` placeholder. Read-only.',
        optionGroups: [{ title: 'Output', options: [JSON_OPTION] }, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
        examples: [{ command: 'ptbk find-unwritten', description: 'Show unwritten tasks.' }],
        run: lazy(() => import('./commands/find.js').then((module) => ({ default: module.findUnwritten }))),
    },
    {
        name: 'find-refactor-candidates',
        category: 'Maintain',
        summary: 'List large source files that are candidates for refactoring.',
        description: 'Ranks tracked text files by line count. With --create-tasks, authors (and commits) one refactoring task per candidate.',
        optionGroups: [
            {
                title: 'Search',
                options: [
                    { name: 'min-lines', type: 'integer', valueName: '<n>', description: 'Minimal number of lines.', defaultText: '400' },
                    { name: 'limit', type: 'integer', valueName: '<n>', description: 'Maximal number of candidates.', defaultText: '10' },
                    { name: 'create-tasks', type: 'boolean', description: 'Create a refactoring task for each candidate.' },
                    JSON_OPTION,
                ],
            },
            COMMIT_OPTIONS,
            PROJECT_OPTIONS,
            PRESENTATION_OPTIONS,
        ],
        examples: [{ command: 'ptbk find-refactor-candidates --min-lines 600', description: 'Very large files.' }],
        run: lazy(() => import('./commands/find.js').then((module) => ({ default: module.findRefactorCandidates }))),
    },
    {
        name: 'find-fresh-emoji-tags',
        category: 'Maintain',
        summary: 'Suggest emoji tags not yet used as `[tag]` markers in the project.',
        description: 'Collects `[emoji]` cross-reference tags used in tracked files and suggests unused ones.',
        optionGroups: [{ title: 'Output', options: [{ name: 'count', type: 'integer', valueName: '<n>', description: 'Number of suggestions.', defaultText: '5' }, JSON_OPTION] }, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
        examples: [{ command: 'ptbk find-fresh-emoji-tags --count 3', description: 'Three fresh tags.' }],
        run: lazy(() => import('./commands/find.js').then((module) => ({ default: module.findFreshEmojiTags }))),
    },
    {
        name: 'ping',
        category: 'Run the agenda',
        summary: 'Make an explicit small harness/model call to verify it responds.',
        description: 'Sends a tiny read-only prompt through the selected harness and reports latency and the effective model. This is a real (possibly paid) model call; --period repeats it.',
        optionGroups: [
            { title: 'Ping', options: [EXECUTION_SELECTION_OPTIONS.options[1]!, EXECUTION_SELECTION_OPTIONS.options[2]!, EXECUTION_SELECTION_OPTIONS.options[3]!, { name: 'period', type: 'duration', valueName: '<duration>', description: 'Repeat every period until interrupted.' }] },
            PROJECT_OPTIONS,
            PRESENTATION_OPTIONS,
        ],
        examples: [{ command: 'ptbk ping --harness claude-code', description: 'One ping.' }],
        run: lazy(() => import('./commands/ping.js')),
    },
    {
        name: 'lint',
        category: 'Maintain',
        summary: 'Validate agent and task Books and ptbk.json (exit code 1 on errors).',
        description: 'Checks Book syntax, agent references and inheritance, task controls, dependencies and configuration without any model call. Suitable as (part of) a project check.',
        optionGroups: [{ title: 'Output', options: [JSON_OPTION] }, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
        examples: [{ command: 'ptbk lint', description: 'Validate the project.' }],
        run: lazy(() => import('./commands/lint.js')),
    },
    {
        name: 'access',
        category: 'Observe and respond',
        summary: 'Manage remote dashboard access: pairing, devices and API tokens.',
        description: 'Trusted local management of the protected remote dashboard.',
        optionGroups: [PROJECT_OPTIONS, PRESENTATION_OPTIONS],
        examples: [
            { command: 'ptbk access pair', description: 'Show the current pairing link and QR.' },
            { command: 'ptbk access revoke --all', description: 'Sign out all paired devices.' },
        ],
        subcommands: [
            {
                name: 'pair',
                category: 'Observe and respond',
                summary: 'Show (or renew) the single-use pairing link and QR code.',
                description: 'Prints the existing pairing link of the running service. --renew creates a new link and invalidates the previous one. The link is a secret: it grants dashboard access to whoever opens it first.',
                optionGroups: [{ title: 'Pairing', options: [{ name: 'renew', type: 'boolean', description: 'Create a new pairing link.' }, SERVER_OPTIONS.options[4]!] }, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
                examples: [{ command: 'ptbk access pair --renew', description: 'New pairing link.' }],
                run: lazy(() => import('./commands/access.js').then((module) => ({ default: module.pair }))),
            },
            {
                name: 'devices',
                category: 'Observe and respond',
                summary: 'List paired devices.',
                description: 'Lists device sessions created by pairing.',
                optionGroups: [{ title: 'Output', options: [JSON_OPTION] }, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
                examples: [{ command: 'ptbk access devices', description: 'Paired devices.' }],
                run: lazy(() => import('./commands/access.js').then((module) => ({ default: module.devices }))),
            },
            {
                name: 'revoke',
                category: 'Observe and respond',
                summary: 'Revoke a paired device or all devices.',
                description: 'Revoked devices lose access immediately.',
                arguments: [{ name: 'device-id', description: 'Device to revoke.' }],
                optionGroups: [{ title: 'Revoke', options: [{ name: 'all', type: 'boolean', description: 'Revoke every paired device.' }] }, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
                examples: [{ command: 'ptbk access revoke d-k3x9m2', description: 'Revoke one device.' }],
                run: lazy(() => import('./commands/access.js').then((module) => ({ default: module.revoke }))),
            },
            {
                name: 'token',
                category: 'Observe and respond',
                summary: 'Issue a project-scoped API token for direct API clients.',
                description: 'The token is shown once; send it as `Authorization: Bearer <token>`.',
                arguments: [{ name: 'label', description: 'Label of the client.' }],
                optionGroups: [{ title: 'Token', options: [{ name: 'revoke', type: 'string', valueName: '<token-id>', description: 'Revoke a token instead.' }] }, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
                examples: [{ command: 'ptbk access token ci', description: 'New token labeled ci.' }],
                run: lazy(() => import('./commands/access.js').then((module) => ({ default: module.token }))),
            },
        ],
    },
    {
        name: 'help',
        category: 'Information',
        summary: 'Show help for ptbk or one command path.',
        description: 'Equivalent to `<command> --help`. Without a command, shows the overview.',
        arguments: [{ name: 'command', description: 'Command path, e.g. `init` or `access pair`.', variadic: true }],
        optionGroups: [PRESENTATION_OPTIONS],
        examples: [{ command: 'ptbk help start', description: 'Help for start.' }],
    },
    {
        name: 'about',
        category: 'Information',
        summary: 'Short product overview and the running engine version.',
        description: 'Explains what Promptbook is and which installation is running.',
        optionGroups: [PRESENTATION_OPTIONS],
        examples: [{ command: 'ptbk about', description: 'About this installation.' }],
        run: lazy(() => import('./commands/about.js')),
    },
];
