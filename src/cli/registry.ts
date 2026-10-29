import type { CommandContext } from './context.js';
import {
    BROWSER_OPTIONS,
    COMMIT_OPTIONS,
    EXECUTION_POLICY_OPTIONS,
    EXECUTION_SELECTION_OPTIONS,
    JSON_OPTION,
    PRESENTATION_OPTIONS,
    PROJECT_OPTIONS,
    DRY_RUN_OPTION,
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
        { name: 'dashboard', type: 'boolean', negatable: true, negatedOnly: true, description: 'Report once and return instead of opening the project dashboard afterwards (the default in an interactive terminal; raw/noninteractive output never opens it).' },
        { name: 'persist', type: 'boolean', negatable: true, negatedOnly: true, description: 'Do not restart automatically after crashes or reboots (state stays durable).' },
        { name: 'harness-updates', type: 'boolean', negatable: true, negatedOnly: true, description: 'Do not update enabled harnesses automatically for this run.' },
        { name: 'harness', type: 'string', valueName: '<variant|tool>', repeatable: true, description: 'Restrict routing to these harness variants or named harness tools for this run (repeatable; not saved).' },
        { name: 'resume-service', type: 'boolean', hidden: true, description: 'Internal: resume a persisted service at login/boot.' },
        { name: 'saved-launch', type: 'boolean', hidden: true, description: 'Internal: an explicit start that reuses the saved launch overrides (Start in the global dashboard).' },
    ],
};

/**
 * Identity options of a tool.
 */
const TOOL_IDENTITY_OPTIONS: OptionGroup = {
    title: 'Identity',
    options: [
        { name: 'variant', type: 'string', valueName: '<variant>', description: 'Adapter: CHROME, CHROMIUM, EDGE; or OPENAI_CODEX, CLAUDE_CODE, GITHUB_COPILOT, CLINE, OPENCODE, GEMINI, QWEN_CODE.' },
        { name: 'name', type: 'string', valueName: '<name>', description: 'Unique kebab-case tool name, e.g. work-browser or codex-company.' },
        { name: 'description', type: 'string', valueName: '<text>', description: 'Optional free text (helps agents choose the right browser/account).' },
    ],
};

/**
 * Browser fields.
 */
const TOOL_BROWSER_OPTIONS: OptionGroup = {
    title: 'Browser fields',
    options: [
        { name: 'profile-source', type: 'string', valueName: '<source>', description: 'MANAGED_GLOBAL (dedicated Promptbook profile, default), PROJECT (isolated in .ptbk/), USER_EXISTING (your Chrome profile) or CUSTOM.' },
        { name: 'profile-path', type: 'string', valueName: '<path>', description: 'Profile directory (required for CUSTOM).' },
        { name: 'is-headless', type: 'string', valueName: '<true|false>', description: 'Run without a window.', defaultText: 'true' },
        { name: 'executable', type: 'string', valueName: '<path>', description: 'Chrome-compatible executable.' },
    ],
};

/**
 * Harness fields.
 */
const TOOL_HARNESS_OPTIONS: OptionGroup = {
    title: 'Harness fields',
    options: [
        { name: 'authentication', type: 'string', valueName: '<mode>', description: 'NATIVE (the installation’s own login/subscription, default) or API_KEY.' },
        { name: 'api-key-env', type: 'string', valueName: '<NAME>', description: 'Environment variable holding the key; saved as ${{ env.NAME }} (never the key).' },
        { name: 'api-key-stdin', type: 'boolean', description: 'Read a new key from standard input (hidden when typed) into the ignored .env, with a timestamped comment.' },
        { name: 'account-profile', type: 'string', valueName: '<name>', description: 'Separate native login context (where the adapter supports it).' },
        {
            name: 'base-url',
            type: 'string',
            valueName: '<endpoint>',
            description: 'Model execution endpoint: default (the official one), official, local (inference on the engine\'s host) or an explicit base URL, where the adapter supports it. Models and thinking levels are not tool settings: plugins own the defaults and MODEL in Books states requirements.',
            defaultText: 'default',
        },
    ],
};

/**
 * Ordering options.
 */
const TOOL_ORDER_OPTIONS: OptionGroup = {
    title: 'Order',
    options: [
        { name: 'before', type: 'string', valueName: '<other>', description: 'Place it before this tool.' },
        { name: 'after', type: 'string', valueName: '<other>', description: 'Place it after this tool.' },
    ],
};

/**
 * Acknowledgements of consequential tool changes.
 */
const TOOL_SAFETY_OPTIONS: OptionGroup = {
    title: 'Confirmations',
    options: [
        { name: 'yes', type: 'boolean', description: 'Confirm disabling/removing the last enabled browser or harness (the engine keeps running but waits for tools).' },
        { name: 'force', short: 'F', type: 'boolean', description: 'The tool is in use: save the change now while the work that acquired it finishes with its original configuration (not a kill; `ptbk stop --force` stops the whole engine).' },
        JSON_OPTION,
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
        summary: 'Set up a project from your intent, then start its agenda in the background.',
        description: `A finite, attended setup. It first asks what you are working on (free text, long pasted material, images or other files) and preserves that input verbatim in specs/_initial.md with project-local attachments. It then offers where the project lives (a new folder in the shared <home>/PTBK/project/ folder first, the current directory, or a new subfolder; under sudo the original user's home) and prepares Git, ptbk.json, agents (for a blank intent the default sample roles; a supplied intent gets relevant specialists from the first task; plus the core agents Adam, Router — initialized with a concrete MODEL from the first suitable selected harness and its plugin defaults —, Tasker, Teacher, Fixer and Chatter — the default partner of new chats, with TEAM access to every other initialized role), task templates, project instructions, ignore rules, global (preferred) or local installation, the selected harnesses (ready ones preselected; installed, logged in and verified, also in the environment the background service keeps; over SSH or without a display, sign-in is finished on another device, e.g. Codex's one-time code or Claude Code's link and pasted code), an optional Wallet setup (default No) and one browser — saved as named tools in ptbk.json "tools" through the same operations as \`ptbk tool\` — trace settings and optional automatic Git synchronization, and saves one ordinary Expert task that transforms the project according to the initial specification. There is no check-command question: an existing real check is kept, otherwise an informational placeholder records that real validation is not configured yet (it never counts as passing tests). Setup is committed with a "ptbk: " subject and the task's Task-Name trailer; a new repository starts on main.

After successful setup the agenda starts automatically as a background service (the same operation as \`ptbk start\`); init never waits for the first task. In an interactive terminal a short countdown then opens the ordinary dashboard (Enter opens it at once, Esc/Ctrl+C skips it — the service keeps running either way); \`--no-dashboard\` and raw/noninteractive init return directly. Stop the service with \`ptbk stop\`. Repeating init with satisfied prerequisites changes nothing and reuses a running service.

Without a terminal (or with --non-interactive), supply decisions with flags: missing decisions fail before any change, and blank intent creates a skeleton whose first task is a readiness review.`,
        optionGroups: [
            {
                title: 'Initial input and destination',
                options: [
                    { name: 'intent', type: 'string', valueName: '<text>', description: 'What you are working on, saved verbatim in specs/_initial.md (new projects only).' },
                    { name: 'intent-file', type: 'string', valueName: '<path|->', description: 'Read the intent verbatim from a file (or standard input with -).' },
                    { name: 'attach', type: 'string', valueName: '<path>', repeatable: true, description: 'Attach an image or file to the intent (repeatable); copied into specs/_initial/ and linked.' },
                    { name: 'subfolder', type: 'string', valueName: '<name>', description: 'Initialize a new subfolder of the selected path instead of the directory itself.' },
                    { name: 'nested', type: 'enum', values: ['ignored', 'submodule'], valueName: '<strategy>', description: 'For a new child inside an existing Git repository: independent ignored repository or Git submodule.' },
                    { name: 'submodule-url', type: 'string', valueName: '<url>', description: 'Source URL recorded for a submodule child (required with --nested submodule).' },
                    { name: 'self-update', type: 'enum', values: ['yes', 'no'], valueName: '<decision>', description: 'Update this ptbk installation first when a newer release exists (your input is kept for the rerun).', defaultText: 'asked interactively; no when unattended' },
                ],
            },
            {
                title: 'Installation and harnesses',
                options: [
                    { name: 'installation', type: 'enum', values: ['local', 'global'], valueName: '<scope>', description: "Use the global CLI (preferred) or install ptbk in the project's dependencies (exact running version).", defaultText: 'global (asked interactively)' },
                    { name: 'harness', type: 'string', valueName: '<id>', repeatable: true, description: 'Select a harness (repeatable): openai-codex, claude-code, github-copilot, cline, opencode, gemini, qwen-code. Each becomes a native harness tool; more instances/accounts are added later with `ptbk tool add`.' },
                    { name: 'no-harness', type: 'boolean', description: 'Explicitly select no harness (no model work can run and Router gets no initial MODEL; the agenda waits for tools).' },
                    { name: 'install-harnesses', type: 'boolean', description: 'Authorize global installation of missing selected harness CLIs (unattended).' },
                    { name: 'update-harnesses', type: 'enum', values: ['keep', 'update'], valueName: '<decision>', description: 'Outdated selected harnesses: keep current versions or update them.', defaultText: 'asked interactively; keep when unattended' },
                ],
            },
            {
                title: 'Browser, traces and validation',
                options: [
                    { name: 'browser-profile', type: 'string', valueName: '<source>', description: 'Profile of the initial browser tool: global (dedicated Promptbook profile), isolated (this project), user (your Chrome profile) or a path.', defaultText: 'global' },
                    { name: 'browser-mode', type: 'enum', values: ['headless', 'headful'], valueName: '<mode>', description: 'Browser visibility.', defaultText: 'headless' },
                    { name: 'commit-traces', type: 'boolean', negatable: true, description: 'Include task traces (traces/<task-file-basename>/) in result commits; --no-commit-traces ignores the whole traces/ folder.', defaultText: 'off' },
                    { name: 'ignore-trace-videos', type: 'boolean', negatable: true, description: 'Keep trace videos out of Git even when traces are committed.', defaultText: 'on' },
                    { name: 'record-video', type: 'boolean', negatable: true, description: 'Record browser activity of tasks using the project browser.', defaultText: 'on' },
                    { name: 'check', type: 'string', valueName: '<command>', description: 'Real project check to save when none is configured (otherwise a temporary override). Without it, an informational placeholder is saved — no question is asked.' },
                    { name: 'defer-check', type: 'boolean', hidden: true, description: 'Compatibility: init no longer asks for a check.' },
                ],
            },
            {
                title: 'Automatic synchronization',
                options: [
                    { name: 'auto-sync', type: 'boolean', negatable: true, description: 'Synchronize with a Git remote (pull every minute and before work, push completed work); --no-auto-sync keeps the project local.', defaultText: 'asked interactively; off when unattended' },
                    { name: 'sync-provider', type: 'enum', values: ['github', 'origin', 'existing'], valueName: '<provider>', description: 'Where to synchronize: a new GitHub repository, another origin URL, or the existing origin.' },
                    { name: 'github-repository', type: 'string', valueName: '<owner/name>', description: 'GitHub repository to create and publish (uses your GitHub CLI login).' },
                    { name: 'github-visibility', type: 'enum', values: ['private', 'public'], valueName: '<visibility>', description: 'Visibility of the new GitHub repository.', defaultText: 'private' },
                    { name: 'origin-url', type: 'string', valueName: '<url>', description: 'Another Git origin to publish to (ordinary Git transport/authentication).' },
                    { name: 'auto-pull', type: 'boolean', hidden: true, description: 'Compatibility alias of --auto-sync.' },
                    { name: 'auto-push', type: 'boolean', hidden: true, description: 'Compatibility alias of --auto-sync.' },
                ],
            },
            COMMIT_OPTIONS,
            {
                title: 'Automatic background start (startup-only)',
                options: [
                    { name: 'start', type: 'boolean', negatable: true, negatedOnly: true, description: 'Only prepare the project; do not start the agenda (start it later with `ptbk start`).' },
                    { name: 'dashboard', type: 'boolean', negatable: true, negatedOnly: true, description: 'Return after the summary instead of the countdown into the project dashboard (interactive terminals only).' },
                    { name: 'persist', type: 'boolean', negatable: true, negatedOnly: true, description: 'Do not register restart persistence.' },
                    ...SERVER_OPTIONS.options,
                ],
            },
            PROJECT_OPTIONS,
            PRESENTATION_OPTIONS,
        ],
        examples: [
            { command: 'ptbk init', description: 'Describe your project, answer a few setup questions; the agenda then starts in the background.' },
            { command: 'ptbk init --subfolder my-agenda', description: 'Create and initialize a new folder.' },
            { command: 'ptbk init --non-interactive --installation local --harness openai-codex --check "npm test"', description: 'Unattended setup with a blank intent (readiness review).' },
            { command: 'ptbk init --auto-sync --github-repository my-company/newsletter', description: 'Also publish to a new private GitHub repository and keep it synchronized.' },
            { command: 'ptbk init --intent-file brief.md --attach mockup.png --harness claude-code --installation local', description: 'Unattended setup from a written brief with an image.' },
            { command: 'ptbk dashboard', description: 'Afterwards (or after skipping the countdown): watch and control the running agenda.' },
        ],
        run: lazy(() => import('./commands/init.js')),
    },
    {
        name: 'start',
        category: 'Run the agenda',
        summary: 'Start (or reuse) the ongoing agenda as a background service, then open its dashboard.',
        description: `Successful \`ptbk init\` already starts the agenda; use start for an initialized, cloned or intentionally stopped project. It is the ongoing work launcher (there is no separate finite run): it executes eligible tasks one at a time, lets Router choose the agent and concrete MODEL of tasks that do not determine them (also ahead of future tasks), checks and commits each accepted result, and discovers goal-driven work when the backlog is empty. By default it launches a persistent daemon and serves the local dashboard/API on a free loopback port (from 3000) for access on this computer. In an interactive terminal it then opens the ordinary project dashboard (the same viewer as \`ptbk dashboard\`; leaving it keeps the daemon running). With \`--no-dashboard\`, \`--raw\`, \`--non-interactive\` or redirected output it renders one status snapshot and returns the terminal.

Missing setup is offered through the same initialization workflow when interactive; unattended starts report what is missing. Repeated start never starts another service or changes the running one's configuration or pause: it is start-or-open (the dashboard attaches) or, without a dashboard, one report.

With \`--paused\` an absent service starts with a manual pause active before any task is claimed. With persistence enabled, the next OS startup restores the service the same way after a stop, force stop or \`ptbk panic\` (and after an unexpected end of its process); only a service that was running when the host shut down continues its work by itself.`,
        optionGroups: [
            START_OPTIONS,
            {
                title: 'Work intent',
                options: [{ name: 'paused', type: 'boolean', description: 'Start an absent service directly paused: dashboard, API, controls and chat work, while queued tasks wait for `ptbk resume` (a running service keeps its state).' }],
            },
            SERVER_OPTIONS,
            BROWSER_OPTIONS,
            EXECUTION_POLICY_OPTIONS,
            COMMIT_OPTIONS,
            { title: 'Context', options: [EXECUTION_SELECTION_OPTIONS.options[4]!] },
            PROJECT_OPTIONS,
            PRESENTATION_OPTIONS,
        ],
        examples: [
            { command: 'ptbk start', description: 'Background agenda with local dashboard and reboot persistence.' },
            { command: 'ptbk start --paused', description: 'Make the service available for inspection and chat without running queued tasks.' },
            { command: 'ptbk start --foreground', description: 'Own the agenda in this terminal with the live dashboard.' },
            { command: 'ptbk start --no-dashboard', description: 'Start the daemon and return after one status snapshot.' },
            { command: 'ptbk start --raw', description: 'Still a daemon; plain one-shot output.' },
        ],
        run: lazy(() => import('./commands/start.js')),
    },
    {
        name: 'pause',
        category: 'Run the agenda',
        summary: 'Stop claiming new tasks; the current task settles, then the service stays alive in pause.',
        description: 'Adds the manual pause reason — the shared engine pause (the same operation as P in the dashboards and the browser/API controls). Pause reasons compose: the Health sub-engine may add its own (low disk or memory), and background work resumes only when none remains. While a task runs, the service is `pausing`: no next background task, follow-up, Router assignment, Teacher, Fixer or discovery work starts, and the current task finishes (or is checkpointed) normally — the harness is not suspended. With no task running it pauses immediately. Chat (including its first-message routing and TEAM consultations), task authoring, inspection and controls keep working; tasks created meanwhile stay pending until resume. Replacing a pending stop/restart with pause asks for confirmation; without a terminal it reports the conflict (run `ptbk resume`, then `ptbk pause`). Runtime-only: no commit.',
        optionGroups: [PROJECT_OPTIONS, PRESENTATION_OPTIONS],
        examples: [
            { command: 'ptbk pause', description: 'Pause after the current task.' },
            { command: 'ptbk resume', description: 'Continue (or cancel the pending pause).' },
        ],
        run: lazy(() => import('./commands/pause.js')),
    },
    {
        name: 'resume',
        category: 'Run the agenda',
        summary: 'Remove the manual pause, or cancel a pending pause/stop/restart.',
        description: 'Removes the manual pause reason, or cancels a pending pause, stop or restart (including its planned replacement), without interrupting or replaying the current task. The service returns to `running` only when no other pause reason remains: a Health pause (low disk or memory) resolves automatically, a soft one can be overridden for its incident on the dashboard Health page, and the result then says `Still paused`. Once shutdown has actually begun, cancellation is reported as too late. Cancelling a pending stop leaves no permanent-stop setting behind. Runtime-only: no commit.',
        optionGroups: [PROJECT_OPTIONS, PRESENTATION_OPTIONS],
        examples: [{ command: 'ptbk resume', description: 'Run again / cancel a pending stop.' }],
        run: lazy(() => import('./commands/resume.js')),
    },
    {
        name: 'stop',
        category: 'Run the agenda',
        summary: "Gracefully stop the project's service (a reboot restores it only paused); --force/-F stops immediately.",
        description: 'The shared engine stop for any placement (daemon or an owning foreground terminal). By default it is graceful: the service is `stopping`, no next task starts, the current task finishes its checks and result persistence (or is safely checkpointed, e.g. while waiting for a human), then the owner cleans up and exits. Repeating stop never escalates. `--force`/`-F` immediately ends the engine and every execution process it owns (harnesses, helpers, an engine-owned browser), without waiting for work to finish and without marking it done; interrupted work keeps its recovery record and the owner attempts bounded cleanup of its own lock and records. An engine that does not answer, or does not end within the bound, is terminated after its PID is verified against the recorded start (it then gets no cleanup); an owner that cannot be verified is reported, never killed. Force stop is a deliberate stop: supervisors and a pending restart do not undo it. The result says whether the stop is still pending or completed (confirmed only after the owner ended); `ptbk resume` cancels a pending stop. A completed intentional stop keeps the service down now; with persistence enabled the next OS startup restores it directly paused (inspection, controls and chat, but no queued task) until you resume it, while an explicit `ptbk start` (or the start performed by a successful `ptbk init`) runs it again sooner.',
        optionGroups: [
            {
                title: 'Stop',
                options: [
                    { name: 'force', short: 'F', type: 'boolean', description: 'Stop immediately: end the engine and all its owned execution (recoverable), also when it does not answer.' },
                    { name: 'timeout', type: 'duration', valueName: '<duration>', description: 'How long to wait for the owner to end before reporting the stop as pending.', defaultText: '2m' },
                    { name: 'after-task', type: 'boolean', hidden: true, description: 'Compatibility: graceful stop is now the default.' },
                ],
            },
            PROJECT_OPTIONS,
            PRESENTATION_OPTIONS,
        ],
        examples: [
            { command: 'ptbk stop', description: 'Let the current task finish, then stop.' },
            { command: 'ptbk stop -F', description: 'Stop now; interrupted work resumes on the next start.' },
            { command: 'ptbk resume', description: 'Cancel a pending stop.' },
        ],
        run: lazy(() => import('./commands/stop.js')),
    },
    {
        name: 'restart',
        category: 'Run the agenda',
        summary: 'Gracefully restart the service: drain, release the project, start exactly one replacement.',
        description: 'The shared engine restart: the service drains like a graceful stop (`stopping` with restart intent), releases ownership, and exactly one replacement starts for the same project with the same effective configuration and installation (a daemon\'s supervisor, or the owning foreground terminal — never turned into a daemon). Newly given flags replace a daemon\'s saved launch overrides. A failed replacement start is reported as a failure; `ptbk resume` cancels a pending restart. Restart is not an intentional permanent stop and never installs an engine update. With no service running it starts the daemon. In an interactive terminal the replacement\'s dashboard opens afterwards (`--no-dashboard` reports once instead).',
        optionGroups: [{ title: 'Restart', options: [{ name: 'timeout', type: 'duration', valueName: '<duration>', description: 'How long to wait for the current task to settle and the replacement to start.', defaultText: '3m' }] }, START_OPTIONS, SERVER_OPTIONS, BROWSER_OPTIONS, EXECUTION_POLICY_OPTIONS, COMMIT_OPTIONS, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
        examples: [{ command: 'ptbk restart', description: 'Restart with the same settings.' }],
        run: lazy(() => import('./commands/restart.js')),
    },
    {
        name: 'panic',
        category: 'Run the agenda',
        summary: 'Emergency: force-stop every active engine on this computer and all their owned execution (confirmed).',
        description:
            'Works from any directory, for every accessible Promptbook engine of your OS user across installations and versions (foreground or background, running, pausing, paused or stopping, including a pending restart and engines that no longer answer). It first lists them and asks for one confirmation; `--yes` skips it, and without a terminal `--yes` is required (nothing is prompted or changed otherwise). Each engine ends through the same whole-engine force stop as `ptbk stop --force`: no current task, check or chat turn is waited for, and its harnesses, helpers and engine-owned browser end with it; interrupted work keeps its recovery record and nothing is marked done. Targets come from verified host discovery (never process-name matching), so unrelated Node or browser processes survive, and every target is attempted independently. Each is a deliberate stop: supervisors and pending replacements do not bring it back, its project stays listed as stopped in `ptbk dashboard --global`, and with persistence enabled the next OS startup restores it only paused (no queued task runs until you resume it). There are no soft or pause variants (the global dashboard has Stop all and Pause all). The result reports each engine as terminated, already ended, unconfirmed or failed; no Git commit is created and no dashboard opens.',
        optionGroups: [
            {
                title: 'Confirmation',
                options: [
                    { name: 'yes', type: 'boolean', description: 'Force-stop at once without asking (required without a terminal).' },
                    { name: 'soft', type: 'boolean', hidden: true, description: 'Unsupported: diagnosed (panic always force-stops).' },
                    { name: 'pause', type: 'boolean', hidden: true, description: 'Unsupported: diagnosed (panic always force-stops).' },
                ],
            },
            PROJECT_OPTIONS,
            PRESENTATION_OPTIONS,
        ],
        examples: [
            { command: 'ptbk panic', description: 'List every active engine, confirm, then force-stop them all.' },
            { command: 'ptbk panic --yes', description: 'Force-stop everything now (scripts and emergencies).' },
            { command: 'ptbk dashboard --global', description: 'Start them again explicitly (S, or A then S for all).' },
        ],
        run: lazy(() => import('./commands/panic.js')),
    },
    {
        name: 'dashboard',
        category: 'Observe and respond',
        summary: 'Attach the live home screen and pages to the running service (or --global: every known project).',
        description: `Continuously shows and controls the running project engine. Any number of dashboards can attach; opening or leaving one never starts, stops or owns the service, and a project without a running service is reported (nothing is started). Its terminal tab is titled \`PTBK <current agent> <project>\`.

The root is a home screen of compact tiles that always fits the terminal without scrolling (it adapts to width and height): Current work, System, Health, Chats, Tasks, Agents, Tools, Results, Connection and — only with autosync — Synchronization. Arrows move the focus between tiles; a tile that needs you (a waiting chat, a health incident, a failing tool…) is marked and blinks until you are working in the viewer, without ever moving your focus. Enter opens the focused tile as a full page (Escape returns; Escape on the home screen leaves the viewer). Pages scroll: System has the engine/process details, every active pause reason and the lifecycle controls; Health shows disk, RAM, swap, CPU and connectivity with the soft-incident override (O), project-cache cleanup (K) and Linux swap (W); Tools manages named tools (Space enable/disable, N add, M modify, [ ] move, D remove, Enter one tool's details with browser recovery 1/2/3); Agents (C chat, E edit its Book, S sort), Chats (N new chat, Chatter first), Tasks (smart order, S sort, D reverse, E edit source, T Tasker), Results (activity log), Connection (local address) and Synchronization (G synchronize now).

Shortcuts on the home screen open the same pages or call the same operations: A answer the agent waiting for you (its real author), N next waiting chat, C new chat (Enter = Chatter, or Choose another agent), L chats, E current work, I system, H health, T tools, B the browser, Y synchronization, G synchronize now; P pause/resume (manual pause only; Health pauses resolve on Health), U cancel a pending pause/stop/restart, X graceful stop (never escalates), R restart, F force stop (confirmed), S skip a pacing wait; O plain presentation, Q/Ctrl+C leave. The Book editor inserts a line with Enter and saves with Ctrl+S without closing. With --raw it streams plain state changes instead.

\`ptbk dashboard --global\` works from any directory (no project is selected or initialized): a continuously refreshed table of every project known to your OS user — registered by a successful init or start, and kept after stop, force stop, panic and reboot until you remove it — across installations and versions. Live rows show path, version, PID, mode, live state and current work; stopped rows say \`stopped\` with the last run labelled historical. It stays open with zero projects and shows projects registered or started later. Enter attaches to a running project's dashboard without \`cd\` (Q returns to the table). S start (a stopped project, with its recorded installation and launch options), Shift+S start paused (available for inspection and chat, queued tasks wait for Resume), X graceful stop, F force stop (confirmed), P pause, R resume (never starts or clears Health) and D remove (a verified stopped entry only; its files stay) act on the selected project; A followed by the same key acts on every applicable project, with per-project outcomes. Closing it leaves every engine as it was.`,
        optionGroups: [
            { title: 'View', options: [{ name: 'global', type: 'boolean', description: 'Host-wide table of every known project and its engine, with individual and bulk controls (independent of the current directory; conflicts with --path).' }] },
            PROJECT_OPTIONS,
            PRESENTATION_OPTIONS,
        ],
        examples: [
            { command: 'ptbk dashboard', description: 'Live view of the current project.' },
            { command: 'ptbk dashboard --path ../site --raw', description: 'Plain continuous observation.' },
            { command: 'ptbk dashboard --global', description: 'All known projects on this computer; Enter attaches, S/X/F/P/R/D control, A for all.' },
        ],
        run: lazy(() => import('./commands/dashboard.js')),
    },
    {
        name: 'status',
        aliases: ['show'],
        category: 'Observe and respond',
        summary: 'Show one snapshot of the service status, chat attention and connection.',
        description: 'Renders the same grouped status as the dashboard once and returns. It never starts work or a service.',
        optionGroups: [{ title: 'View', options: [JSON_OPTION] }, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
        examples: [
            { command: 'ptbk status', description: 'Snapshot of the current project.' },
            { command: 'ptbk show --json', description: 'Machine-readable snapshot.' },
        ],
        run: lazy(() => import('./commands/status.js')),
    },
    {
        name: 'tool',
        category: 'Maintain',
        summary: 'Manage the named browser and harness tools of the project (saved and committed immediately).',
        description: `Tools are ordered named project resources in ptbk.json "tools": BROWSER profiles and HARNESS instances (each harness variant can have several instances: the first usable one serves work, later ones are fallbacks, e.g. a second subscription or a paid API account). Every change is saved and committed at once as its own "ptbk: " commit, also while a task runs (the running engine uses a newly added tool at the task's next selection). Enable/disable is the normal reversible change; remove deletes only the configuration record, never browser profiles, native logins or .env history.

API keys are stored as references (\${{ env.NAME }}); a new key goes into the ignored .env through --api-key-stdin (hidden input), never as a command-line argument.`,
        optionGroups: [PROJECT_OPTIONS, PRESENTATION_OPTIONS],
        examples: [
            { command: 'ptbk tool list', description: 'The ordered inventory with enabled, usable and in-use state.' },
            { command: 'ptbk tool add BROWSER --variant CHROME --name work-browser --profile-source PROJECT --is-headless true', description: 'A second, isolated browser profile.' },
            { command: 'ptbk tool add HARNESS --variant OPENAI_CODEX --name company-api --authentication API_KEY --api-key-env COMPANY_OPENAI_API_KEY', description: 'A paid API fallback after the native Codex subscription.' },
            { command: 'ptbk tool disable company-api', description: 'Stop selecting it (configuration and key are kept).' },
        ],
        subcommands: [
            {
                name: 'list',
                category: 'Maintain',
                summary: 'List the ordered tool inventory (read-only).',
                description: 'Shows every named tool with type, variant, enabled state, actual usability and whether active work uses it. Reads the running engine’s live view when one runs; otherwise inspects locally without launching a browser or calling a model.',
                optionGroups: [{ title: 'Output', options: [JSON_OPTION] }, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
                examples: [{ command: 'ptbk tool list --json', description: 'Machine-readable inventory (secrets only as references).' }],
                run: lazy(() => import('./commands/tool.js').then((module) => ({ default: module.list }))),
            },
            {
                name: 'show',
                category: 'Maintain',
                summary: 'Show one tool’s non-secret configuration and diagnostics (read-only).',
                description: 'Prints the canonical saved record, the resolved browser profile path or harness authentication context, readiness and the concrete next action. Never prints secret values.',
                arguments: [{ name: 'name', description: 'Tool name.', required: true }],
                optionGroups: [{ title: 'Output', options: [JSON_OPTION] }, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
                examples: [{ command: 'ptbk tool show project-browser', description: 'Profile source, path and health of the browser.' }],
                run: lazy(() => import('./commands/tool.js').then((module) => ({ default: module.show }))),
            },
            {
                name: 'add',
                category: 'Maintain',
                summary: 'Add a named BROWSER or HARNESS tool.',
                description: 'Creates a typed named instance with its variant-specific options and commits it immediately. Enum values are accepted in any case/separator spelling and saved canonically (CHROME, OPENAI_CODEX, MANAGED_GLOBAL, API_KEY …). A harness is then checked as this terminal and the background service see it; a native one that is not signed in is offered the same sign-in as init (in its own account context, over SSH on another device), interactively only.',
                arguments: [{ name: 'type', description: 'BROWSER or HARNESS.', required: true }],
                optionGroups: [TOOL_IDENTITY_OPTIONS, TOOL_BROWSER_OPTIONS, TOOL_HARNESS_OPTIONS, TOOL_ORDER_OPTIONS, TOOL_SAFETY_OPTIONS, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
                examples: [
                    { command: 'ptbk tool add BROWSER --variant CHROME --name personal-browser --profile-source USER_EXISTING --is-headless false', description: 'Your own Chrome profile as an explicitly authorized browser.' },
                    { command: 'ptbk tool add HARNESS --variant CLAUDE_CODE --name claude-code', description: 'A native Claude Code instance.' },
                    { command: 'printf %s "$KEY" | ptbk tool add HARNESS --variant OPENAI_CODEX --name company-api --authentication API_KEY --api-key-env COMPANY_OPENAI_API_KEY --api-key-stdin', description: 'Store a new key in .env without it entering the command line.' },
                ],
                run: lazy(() => import('./commands/tool.js')),
            },
            {
                name: 'modify',
                category: 'Maintain',
                summary: 'Change fields of a tool (unspecified fields stay as they are).',
                description: 'Updates only the given fields and commits immediately. --rename changes the instance name. If active work uses the tool, it is refused unless --force: the change is then saved while the work that acquired the tool finishes with its original configuration.',
                arguments: [{ name: 'name', description: 'Tool name.', required: true }],
                optionGroups: [
                    { title: 'Identity', options: [{ name: 'rename', type: 'string', valueName: '<new-name>', description: 'New kebab-case name.' }, TOOL_IDENTITY_OPTIONS.options[0]!, TOOL_IDENTITY_OPTIONS.options[2]!, { name: 'clear-description', type: 'boolean', description: 'Remove the description.' }] },
                    { ...TOOL_BROWSER_OPTIONS, options: [...TOOL_BROWSER_OPTIONS.options, { name: 'clear-executable', type: 'boolean', description: 'Use the default executable discovery again.' }] },
                    TOOL_HARNESS_OPTIONS,
                    TOOL_SAFETY_OPTIONS,
                    PROJECT_OPTIONS,
                    PRESENTATION_OPTIONS,
                ],
                examples: [
                    { command: 'ptbk tool modify work-browser --is-headless false', description: 'Show the browser window.' },
                    { command: 'ptbk tool modify company-api --api-key-stdin', description: 'Rotate the key (the old .env line stays, commented out with a timestamp).' },
                ],
                run: lazy(() => import('./commands/tool.js')),
            },
            ...(['enable', 'disable'] as const).map((name) => ({
                name,
                category: 'Maintain' as const,
                summary: name === 'enable' ? 'Make a tool available for new selections again.' : 'Stop selecting a tool (configuration and credentials are kept).',
                description:
                    name === 'enable'
                        ? 'Persists isEnabled: true and commits it; the running engine can use the tool at once, also in the current task. A native harness that is not signed in is offered its sign-in in an interactive terminal; enabling an already enabled tool changes nothing and only checks it again.'
                        : 'Persists isEnabled: false and commits it. Disabling the last enabled browser or harness needs --yes: the engine keeps running but waits for tools. If active work uses the tool, --force saves the change while that work finishes with it.',
                arguments: [{ name: 'name', description: 'Tool name.', required: true }],
                optionGroups: [TOOL_SAFETY_OPTIONS, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
                examples: [...(name === 'enable' ? [{ command: 'ptbk tool enable codex-company', description: 'Check a native harness again and sign it in when its login is missing.' }] : []), { command: `ptbk tool ${name} company-api`, description: name === 'enable' ? 'Use the API fallback again.' : 'Pause using the API fallback.' }],
                run: lazy(() => import('./commands/tool.js')),
            })),
            {
                name: 'remove',
                aliases: ['delete'],
                category: 'Maintain',
                summary: 'Permanently remove a tool’s configuration record (secondary to disable).',
                description: 'Deletes the record from ptbk.json and commits it. Browser profiles, native account stores and .env history are never deleted; an API-key line that ptbk added and nothing else uses is commented out with a timestamp, otherwise it stays active. Same --yes/--force protections as disable.',
                arguments: [{ name: 'name', description: 'Tool name.', required: true }],
                optionGroups: [TOOL_SAFETY_OPTIONS, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
                examples: [{ command: 'ptbk tool remove old-browser', description: 'Remove a browser record (its profile stays).' }],
                run: lazy(() => import('./commands/tool.js')),
            },
            {
                name: 'move',
                category: 'Maintain',
                summary: 'Reorder a tool (order is the same-variant fallback priority).',
                description: 'Moves the record before or after another one and commits it, without recreating credentials or changing its identity.',
                arguments: [{ name: 'name', description: 'Tool name.', required: true }],
                optionGroups: [TOOL_ORDER_OPTIONS, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
                examples: [{ command: 'ptbk tool move codex-personal --after codex-company', description: 'Use the personal account only after the company one.' }],
                run: lazy(() => import('./commands/tool.js')),
            },
        ],
    },
    {
        name: 'chat',
        category: 'Observe and respond',
        summary: 'Start a persistent conversation (with Chatter by default), or reopen a chat by name.',
        description: 'Directly opens a new chat in the selected project. Without --agent it first offers exactly two choices: Chat with Chatter (the focused default — Enter) and Choose another agent (every valid target: project agents, hidden/core agents and Expert). Without a terminal, a new chat goes to Chatter. Chatter answers project questions, consults the right teammates (attributed, linked consultation chats) and creates ordinary tasks only for work you ask for. Every human-facing message is saved in chats/ and committed ("ptbk: Chat - <name>", with the visual of the one agent that replied). Reopening a chat keeps its real participants. Ctrl+C closes only the client: the service and the conversation stay. Works with or without a running service; no dashboard is needed.',
        arguments: [{ name: 'message', description: 'First message (noninteractive use; prints the reply when it arrives).', variadic: true }],
        optionGroups: [
            {
                title: 'Chat',
                options: [
                    { name: 'agent', type: 'string', valueName: '<agent>', description: 'Agent of the new chat, e.g. Developer, @Developer or "{Frontend Developer}" (default: Chatter).' },
                    { name: 'open', type: 'string', valueName: '<name>', description: 'Reopen an existing chat by its name (normalized).' },
                    { name: 'title', type: 'string', valueName: '<name>', description: 'Name of the new chat (default: derived from the agent and first message, made distinct).' },
                    { name: 'list', type: 'boolean', description: 'List all chats (waiting for you first) and exit.' },
                    { name: 'stdin', type: 'boolean', description: 'Read the message from standard input.' },
                    JSON_OPTION,
                ],
            },
            COMMIT_OPTIONS,
            PROJECT_OPTIONS,
            PRESENTATION_OPTIONS,
        ],
        examples: [
            { command: 'ptbk chat', description: 'New conversation: Enter talks to Chatter, or choose another agent.' },
            { command: 'ptbk chat "What is the project working on?"', description: 'Ask Chatter noninteractively and print the reply.' },
            { command: 'ptbk chat --agent Developer "How far is the CSV export?"', description: 'Start a chat with an explicit agent.' },
            { command: 'ptbk chat --open "Developer: How far is the CSV export?"', description: 'Reopen an existing chat.' },
            { command: 'ptbk chat --list', description: 'List all chats.' },
        ],
        run: lazy(() => import('./commands/chat.js')),
    },
    {
        name: 'ask',
        category: 'Observe and respond',
        summary: 'Ask one agent a quick question (saved as an ordinary chat) and print the answer.',
        description: 'Creates a new chat with the agent (default: routing.defaultAgent), waits for its read-only answer and prints it (its MODEL is resolved once, before the first reply). The question and answer stay in chats/ and can be continued with `ptbk chat --open`. Use `ptbk add` for explicit work.',
        arguments: [{ name: 'question', description: 'Your question.', variadic: true }],
        optionGroups: [
            {
                title: 'Question',
                options: [
                    { name: 'agent', type: 'string', valueName: '<agent>', description: 'Agent to ask (default: routing.defaultAgent).' },
                    { name: 'title', type: 'string', valueName: '<name>', description: 'Name of the chat.' },
                    { name: 'stdin', type: 'boolean', description: 'Read the question from standard input.' },
                ],
            },
            COMMIT_OPTIONS,
            PROJECT_OPTIONS,
            PRESENTATION_OPTIONS,
        ],
        examples: [{ command: 'ptbk ask --agent Expert "Which commitments can a task Book use?"', description: 'Quick enquiry.' }],
        run: lazy(() => import('./commands/ask.js')),
    },
    {
        name: 'answer',
        category: 'Observe and respond',
        summary: 'Answer an agent that waits for you in a chat.',
        description: 'Without arguments, lists chats whose agent waits for your answer, decision or action (and lets you pick and answer one interactively). With a chat name and an answer, appends it as your committed message; offered answers must be chosen exactly (ask questions with `ptbk chat --open`). The waiting task resumes on a valid answer. Works with or without a running service or HTTP.',
        arguments: [
            { name: 'chat', description: 'Name of the waiting chat.' },
            { name: 'answer', description: 'Answer text (or one of the offered answers).', variadic: true },
        ],
        optionGroups: [
            {
                title: 'Answer',
                options: [{ name: 'stdin', type: 'boolean', description: 'Read the answer from standard input.' }, JSON_OPTION],
            },
            COMMIT_OPTIONS,
            PROJECT_OPTIONS,
            PRESENTATION_OPTIONS,
        ],
        examples: [
            { command: 'ptbk answer', description: 'List agents waiting for you.' },
            { command: 'ptbk answer "Developer asks: Which database?" "Use PostgreSQL"', description: 'Answer one waiting chat.' },
        ],
        run: lazy(() => import('./commands/answer.js')),
    },
    {
        name: 'add',
        category: 'Author work',
        summary: 'Create and commit a task (wizard, text, stdin or template) without a model call.',
        description: 'Creates an unfinished task Book in the task source and commits it ("ptbk: Add task - <title>") so the agenda can pick it up immediately; Router assigns a missing agent and specializes its MODEL before execution. Interactive add guides the description, template and priority and confirms before saving; cancelling creates nothing.',
        arguments: [{ name: 'description', description: 'Task description; the first line becomes the title.', variadic: true }],
        optionGroups: [
            {
                title: 'Task',
                options: [
                    { name: 'title', type: 'string', valueName: '<title>', description: 'Explicit title (otherwise the first line of the description).' },
                    { name: 'stdin', type: 'boolean', description: 'Read the description from standard input.' },
                    { name: 'template', type: 'string', valueName: '<name>', description: 'Start from tasks/templates/<name>.book.' },
                    { name: 'priority', type: 'string', valueName: '<priority>', description: 'TASK PRIORITY (number or words like high).' },
                    { name: 'agent', type: 'string', valueName: '<ref>', description: 'TASK AGENT (omit to let Router assign).' },
                    { name: 'harness', type: 'string', valueName: '<variant>', description: 'Harness requirement, saved as MODEL harness=… (a variant; MODEL never binds an account).' },
                    { name: 'model', type: 'string', valueName: '<model>', description: 'Model requirement, saved as MODEL model=….' },
                    { name: 'thinking-level', type: 'enum', values: ['low', 'medium', 'high', 'xhigh', 'max'], valueName: '<level>', description: 'Thinking requirement, saved as MODEL thinking=….' },
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
        summary: 'List tasks with readiness explanations, or inspect one task (read-only).',
        description: 'Shows the queue in execution order with the reason each task is ready, waiting or blocked, the same way start, run and the dashboards evaluate it. With a task reference ({Task name}, @Name, a bare name or a source path) it shows the task, any same-name copies it shadows, its audit trail in traces/<task-file-basename>/, recording status and the commits carrying its Task-Name. Never edits sources, calls a model or creates Router tasks.',
        arguments: [{ name: 'task', description: 'Task to inspect: "{Task name}", a bare name or a source path.' }],
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
            { command: 'ptbk list "#improve-csv-export-k3x9qa"', description: 'One task: trace, video and commits.' },
        ],
        run: lazy(() => import('./commands/list.js')),
    },
    {
        name: 'fix',
        category: 'Maintain',
        summary: 'Run the project check and repair it when it fails (not the task queue).',
        description: 'Runs the configured check. A healthy project needs no model and creates no commit. A failing check becomes an explicit maintenance task executed by the selected agent (default Developer) and committed when the check passes.',
        optionGroups: [EXECUTION_SELECTION_OPTIONS, { title: 'Check', options: [EXECUTION_POLICY_OPTIONS.options[0]!, DRY_RUN_OPTION] }, COMMIT_OPTIONS, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
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
        summary: 'Convert Markdown tasks and Books in former syntax into canonical Books (no model call).',
        description: 'Creates one `TASK <name>` Book per Markdown section (the payload under GOAL), preserving title, state, priority, selectors (as TASK RUNNER), time restrictions and known completion history, verifies the meaning and moves the original file into tasks/archive/. Books in former syntax (a plain name line, ENTITY, text directly under the name) become `AGENT|TASK|CHAT <name>` Books with the same name and content; descriptive text moves under GOAL, PERSONA or NOTE. Ambiguous kinds and names that cannot follow a keyword are reported, not guessed. Read-only commands never convert anything. One maintenance commit.',
        arguments: [{ name: 'file', description: 'Markdown or Book files to convert (default: all task sources and project Books).', variadic: true }],
        optionGroups: [{ title: 'Migration', options: [DRY_RUN_OPTION] }, COMMIT_OPTIONS, PROJECT_OPTIONS, PRESENTATION_OPTIONS],
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
                    DRY_RUN_OPTION,
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
        name: 'help',
        category: 'Information',
        summary: 'Show the technical command reference for ptbk or one command path.',
        description: 'Equivalent to `<command> --help`. Without a command, shows the technical overview of commands and options (bare interactive `ptbk` offers the Initialize/Start/Dashboard picker instead).',
        arguments: [{ name: 'command', description: 'Command path, e.g. `init` or `tool list`.', variadic: true }],
        optionGroups: [PRESENTATION_OPTIONS],
        examples: [{ command: 'ptbk help start', description: 'Help for start.' }],
    },
    {
        name: 'about',
        category: 'Information',
        summary: 'A compact product box: Promptbook, the running engine version, its purpose and website.',
        description: 'A short visual product box (Promptbook name, actual engine version, purpose and ptbk.io) — not a command reference; use `ptbk help` for that. Raw output keeps the same information as plain text.',
        optionGroups: [PRESENTATION_OPTIONS],
        examples: [{ command: 'ptbk about', description: 'About this installation.' }],
        run: lazy(() => import('./commands/about.js')),
    },
];
