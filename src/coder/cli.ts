import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { resolveWorkspace, requireGit, readContext, InputError, resolveAgentSelection } from './workspace.js';
import { initializeProject, addTask, generateBoilerplates, verifyTasks } from './authoring.js';
import { discoverTasks } from './sources.js';
import { migrateTasks } from './migrate.js';
import { runQueue, fixChecks, recoverTask, taskEligibility, type RunOptions } from './engine.js';
import { acquireLease, readLedger, type WorkspaceLease } from './state.js';
import { captureSnapshot, commitScoped } from './git.js';
import { runHarness, HARNESS_REGISTRY, redactSecrets, getHarness, loadProjectSecrets } from './harness.js';
import { planConversation } from './planner.js';
import { startCoderServer } from './server.js';
import { createTerminal } from './terminal.js';
import type { Workspace } from './domain.js';
import { startService, stopService, serviceCommand, readServiceRecord, type ServiceOptions } from './service.js';
import { listRequests, answerRequest } from './requests.js';
import { setupHarnesses, inspectHarnesses } from './setup.js';
import { updateTaskControls } from './sources.js';

/** Boolean CLI options whose presence is significant. */
const BOOLEAN_OPTIONS = new Set(['help', 'version', 'dry-run', 'no-commit', 'commit', 'no-auto', 'no-questions', 'auto-pull', 'auto-push', 'isolate', 'no-normalize-line-endings', 'no-ui', 'preserve-logs', 'allow-credits', 'auto-migrate', 'allow-destructive-auto-migrate', 'json', 'daemon', 'raw', 'interactive', 'no-persist', 'no-server', 'no-qr', 'no-install']);
/** Value options accepted by the CLI parser. */
const VALUE_OPTIONS = new Set(['path', 'tasks', 'harness', 'model', 'thinking-level', 'agent', 'context', 'min-priority', 'max-priority', 'priority', 'limit', 'git-changes', 'check', 'check-before', 'wait-between-prompts', 'wait-after-prompt', 'wait-after-error', 'template', 'count', 'ignore', 'period', 'port', 'action', 'occurrence', 'browser-mode', 'browser-profile', 'agenda', 'prompt', 'response', 'request']);
/** Commands supported by the installed executable. */
const COMMANDS = ['init', 'initialize', 'start', 'stop', 'restart', 'status', 'show', 'answer', 'add', 'generate-boilerplates', 'plan', 'list', 'run', 'fix', 'verify', 'server', 'migrate', 'recover', 'find-unwritten', 'find-refactor-candidates', 'find-fresh-emoji-tags', 'ping'];
/** Shared option groups avoid quietly ignoring command-specific flags. */
const ROUTING_OPTIONS = ['harness', 'model', 'thinking-level', 'agent', 'context'];
/** Execution switches have meaning only for commands using the shared engine. */
const EXECUTION_OPTIONS = [...ROUTING_OPTIONS, 'min-priority', 'max-priority', 'priority', 'limit', 'git-changes', 'check', 'check-before', 'no-commit', 'no-auto', 'no-questions', 'auto-pull', 'auto-push', 'isolate', 'no-normalize-line-endings', 'preserve-logs', 'allow-credits', 'wait-between-prompts', 'wait-after-prompt', 'wait-after-error', 'auto-migrate', 'allow-destructive-auto-migrate', 'dry-run'];
/** Exact option sets for authoring, diagnostics and read-only commands. */
const COMMAND_OPTIONS: Record<string, string[]> = {
    init: [...ROUTING_OPTIONS, 'commit', 'no-commit', 'no-questions', 'auto-push', 'agenda', 'no-install', 'allow-credits', 'check'], initialize: [...ROUTING_OPTIONS, 'commit', 'no-commit', 'no-questions', 'auto-push', 'agenda', 'no-install', 'allow-credits', 'check'],
    start: [...EXECUTION_OPTIONS, 'daemon', 'raw', 'interactive', 'no-persist', 'no-server', 'port', 'no-qr', 'browser-mode', 'browser-profile'],
    restart: [...EXECUTION_OPTIONS, 'daemon', 'raw', 'interactive', 'no-persist', 'no-server', 'port', 'no-qr', 'browser-mode', 'browser-profile'],
    stop: [], status: ['json'], show: ['json'], answer: ['request', 'response', 'action', 'json', 'no-questions'],
    add: ['commit', 'no-commit', 'no-questions', 'auto-push', 'priority', 'template'],
    'generate-boilerplates': ['commit', 'no-commit', 'no-questions', 'auto-push', 'count'],
    plan: [...ROUTING_OPTIONS, 'commit', 'no-commit', 'no-questions', 'allow-credits', 'prompt'],
    list: [...ROUTING_OPTIONS, 'min-priority', 'max-priority', 'priority', 'json'],
    run: [...EXECUTION_OPTIONS, 'json'], fix: EXECUTION_OPTIONS.filter(name => !['limit', 'min-priority', 'max-priority', 'priority'].includes(name)),
    server: [...EXECUTION_OPTIONS, 'port'],
    verify: ['commit', 'no-commit', 'no-questions', 'ignore'],
    migrate: ['no-commit', 'dry-run', 'json', 'no-questions'],
    recover: [...EXECUTION_OPTIONS, 'action', 'occurrence', 'json'],
    ping: [...ROUTING_OPTIONS, 'period', 'allow-credits', 'no-questions'],
    'find-unwritten': [], 'find-refactor-candidates': [], 'find-fresh-emoji-tags': [],
};
/** Parsed CLI values preserve whether a user selected a routing override. */
type Parsed = { command: string; values: Record<string, string | boolean | string[]>; arguments: string[] };

/** Parses options without silently accepting unsupported switches. */
function parseArguments(arguments_: string[]): Parsed {
    const values: Parsed['values'] = {};
    const positional: string[] = [];
    let literal = false;
    for (let index = 0; index < arguments_.length; index++) {
        const argument = arguments_[index]!;
        if (literal) { positional.push(argument); continue; }
        if (argument === '--') { literal = true; continue; }
        if (argument === '-h') { values.help = true; continue; }
        if (argument === '-v') { values.version = true; continue; }
        if (!argument.startsWith('-')) { positional.push(argument); continue; }
        if (!argument.startsWith('--')) throw new InputError(`Unsupported option ${argument}. Use --help.`);
        const [name, ...inline] = argument.slice(2).split('=');
        if (name === 'test' || name === 'test-before') throw new InputError(`--${name} was replaced by --${name === 'test' ? 'check' : 'check-before'}.`);
        if (BOOLEAN_OPTIONS.has(name!)) {
            if (inline.length) throw new InputError(`--${name} does not accept a value.`);
            values[name!] = true;
        } else if (VALUE_OPTIONS.has(name!)) {
            const value = inline.length ? inline.join('=') : arguments_[++index];
            if (value === undefined || (!inline.length && value.startsWith('--'))) throw new InputError(`--${name} requires a value.`);
            if (['agent', 'harness', 'model', 'thinking-level'].includes(name!) && !value.trim()) throw new InputError(`--${name} requires a nonempty value.`);
            if (name === 'ignore') values.ignore = [...(values.ignore as string[] || []), value];
            else if (values[name!] !== undefined) throw new InputError(`--${name} was specified more than once.`);
            else values[name!] = value;
        } else throw new InputError(`Unsupported option --${name}. Use --help for supported options.`);
    }
    if (positional[0] === 'coder') throw new InputError('The coder command group was replaced. Use ptbk <command>, for example ptbk run or ptbk --help.');
    const command = positional.shift() || 'help';
    if (command !== 'help' && !COMMANDS.includes(command)) throw new InputError(`Unknown command ${command}. Use ptbk --help.`);
    if (command !== 'help' && !values.help && !values.version) {
        const allowed = new Set(['path', 'tasks', 'help', 'version', 'no-ui', ...COMMAND_OPTIONS[command]!]);
        for (const name of Object.keys(values)) if (!allowed.has(name)) throw new InputError(`--${name} is unsupported for ${command}. Use ptbk --help.`);
        if (values.json && command === 'run' && !values['dry-run']) throw new InputError('--json on run requires --dry-run.');
        if (values['dry-run'] && command === 'server') throw new InputError('server does not support --dry-run; use ptbk run --dry-run.');
    }
    return { command, values, arguments: positional };
}

/** Converts a nonnegative decimal option without accepting partial numeric strings. */
function integer(value: unknown, label: string): number | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new InputError(`${label} must be a nonnegative integer.`);
    return Number(value);
}

/** Parses pacing durations; intervals never use floating point or negative values.
 * @private Internal CLI duration parser.
 */
export function parseDuration(value: unknown, fallback = 0): number {
    if (value === undefined) return fallback;
    const text = String(value);
    if (/^\d+$/.test(text)) {
        const result = Number(text) * 1000;
        if (Number.isSafeInteger(result)) return result;
    }
    const units: Record<string, number> = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
    let duration = 0;
    let consumed = '';
    for (const match of text.matchAll(/(\d+)(ms|s|m|h|d|w)/g)) { duration += Number(match[1]) * units[match[2]!]!; consumed += match[0]; }
    if (consumed !== text || !consumed || !Number.isSafeInteger(duration)) throw new InputError(`Invalid duration ${JSON.stringify(text)}. Use 5s, 30m or 1h30m.`);
    return duration;
}

/** Validates execution combinations before filesystem mutation. */
function runOptions(parsed: Parsed): RunOptions {
    const values = parsed.values;
    const minPriority = integer(values['min-priority'], '--min-priority');
    const priority = integer(values.priority, '--priority');
    const maxPriority = integer(values['max-priority'], '--max-priority');
    if (minPriority !== undefined && priority !== undefined && minPriority !== priority) throw new InputError('--priority conflicts with --min-priority.');
    if ((minPriority ?? priority ?? 0) > (maxPriority ?? Infinity)) throw new InputError('Minimum priority exceeds maximum priority.');
    const gitChanges = String(values['git-changes'] || 'fail');
    if (!['fail', 'ignore', 'continue'].includes(gitChanges)) throw new InputError('--git-changes must be fail, ignore or continue.');
    const checkBefore = String(values['check-before'] || 'no');
    if (!['no', 'yes-and-fail', 'yes-and-fix'].includes(checkBefore)) throw new InputError('--check-before must be no, yes-and-fail or yes-and-fix.');
    if (values['no-auto'] && values['no-questions']) throw new InputError('--no-auto cannot be combined with --no-questions.');
    if (!values['dry-run'] && values['auto-pull'] && values['no-commit']) throw new InputError('--auto-pull requires automatic commits.');
    if (values.isolate && (values['no-commit'] || gitChanges === 'continue')) throw new InputError('--isolate requires commits and cannot use --git-changes continue.');
    if (gitChanges === 'continue' && checkBefore === 'yes-and-fix') throw new InputError('--git-changes continue cannot use --check-before yes-and-fix.');
    if (values['allow-destructive-auto-migrate'] && !values['auto-migrate']) throw new InputError('--allow-destructive-auto-migrate requires --auto-migrate.');
    if (values['auto-migrate']) throw new InputError('Test-server auto-migration requires a project adapter; no test-server adapter is configured. Use ptbk migrate for Markdown tasks.');
    if (['run', 'fix', 'server'].includes(parsed.command) && !values['dry-run'] && values['no-commit'] && !values['no-auto'] && gitChanges !== 'ignore') throw new InputError('Automatic --no-commit requires --git-changes ignore.');
    if (values.commit && values['no-commit']) throw new InputError('--commit conflicts with --no-commit.');
    if (['init', 'initialize', 'add', 'generate-boilerplates', 'plan'].includes(parsed.command) && values['auto-push'] && !values.commit) throw new InputError('Authoring --auto-push requires --commit.');
    const thinkingLevel = String(values['thinking-level'] || process.env.PTBK_THINKING_LEVEL || '') || undefined;
    if (thinkingLevel && !['low', 'medium', 'high', 'xhigh', 'max'].includes(thinkingLevel)) throw new InputError('--thinking-level must be low, medium, high, xhigh or max.');
    if (values.action && parsed.command !== 'answer' && !['resume', 'retry', 'acknowledge'].includes(String(values.action))) throw new InputError('--action must be resume, retry or acknowledge.');
    if (['start', 'restart'].includes(parsed.command)) {
        if (values['no-commit'] || values.limit !== undefined || values['no-auto']) throw new InputError('start requires commits and indefinite automatic operation; use run for finite or manual work.');
        if ([values.daemon, values.raw, values.interactive].filter(Boolean).length > 1) throw new InputError('Choose only one of --daemon, --raw or --interactive.');
        if (values.interactive && !process.stdin.isTTY) throw new InputError('--interactive requires an interactive terminal; use --raw or --daemon.');
        if (values['no-server'] && values.port !== undefined) throw new InputError('--port conflicts with --no-server.');
        if (values['browser-mode'] && !['headless', 'headful'].includes(String(values['browser-mode']))) throw new InputError('--browser-mode must be headless or headful.');
    }
    const harnessName = values.harness as string | undefined || process.env.PTBK_HARNESS;
    if (harnessName) {
        let harness;
        try { harness = getHarness(harnessName); } catch (error) { throw new InputError((error as Error).message); }
        if (thinkingLevel && !harness.thinkingLevels.includes(thinkingLevel)) throw new InputError(`${harnessName} does not support thinking level ${thinkingLevel}.`);
    }
    return { harness: values.harness as string | undefined || process.env.PTBK_HARNESS, model: values.model as string | undefined || process.env.PTBK_MODEL, thinkingLevel, agent: values.agent as string | undefined, context: values.context as string | undefined, check: values.check as string | undefined, checkBefore: checkBefore as RunOptions['checkBefore'], gitChanges: gitChanges as RunOptions['gitChanges'], noCommit: !!values['no-commit'], noAuto: !!values['no-auto'], noQuestions: !!values['no-questions'], autoPull: !!values['auto-pull'], autoPush: !!values['auto-push'], isolate: !!values.isolate, normalizeLineEndings: !values['no-normalize-line-endings'], limit: integer(values.limit, '--limit'), minPriority: minPriority ?? priority, maxPriority, allowCredits: !!values['allow-credits'], preserveLogs: !!values['preserve-logs'], waitBetweenPrompts: parseDuration(values['wait-between-prompts']), waitAfterPrompt: parseDuration(values['wait-after-prompt']), waitAfterError: parseDuration(values['wait-after-error'], 600000), dryRun: !!values['dry-run'] };
}

/** Prints the supported commands, routing policies and harness capability registry. */
function printHelp(): void {
    process.stdout.write(`ptbk — local task execution and safe Git persistence\n\nUsage: ptbk <command> [options]\nCommands:\n  init | initialize           Add missing project configuration\n  add [description]           Create a task Book from argument, stdin or prompt\n  generate-boilerplates       Create unfinished tasks (--count N or N*M)\n  plan                        Read-only planning, /save, /draft, /discard, /exit\n  list                        Inspect mixed queue and eligibility\n  run                         Execute currently eligible tasks\n  fix                         Run checks and repair only if needed\n  verify                      Human review and archive; does not run checks\n  start                       Ongoing automatic agenda (daemon by default)\n  stop | restart              Control the selected project daemon\n  status | show               Read-only process, queue and requests\n  answer [request-id] [reply]  Answer one durable human request\n  migrate                     Deterministically migrate legacy Markdown\n  recover <task-id>           Inspect recovery; --action resume|retry|acknowledge\n  find-unwritten              Find authoring placeholders\n  find-refactor-candidates    Find large source files\n  find-fresh-emoji-tags       Suggest unused authoring emoji tags\n  ping                        Make a small harness call (--period duration)\n\nWorkspace: --path DIR --tasks DIR --context TEXT_OR_FILE\nRouting: --agent BOOK --harness NAME --model NAME --thinking-level low|medium|high|xhigh|max\nFilters: --min-priority N --max-priority N --priority N (minimum alias) --limit N\nChecks: --check COMMAND --check-before no|yes-and-fail|yes-and-fix\nGit: --git-changes fail|ignore|continue --no-commit --no-auto --auto-pull --auto-push --isolate\nAuthoring: --commit --template FILE --count N --ignore FILTER (repeatable)\nExecution: --dry-run --no-questions --no-ui --preserve-logs --allow-credits\n  --no-normalize-line-endings --wait-between-prompts DURATION\n  --wait-after-prompt DURATION --wait-after-error DURATION (default 10m)\nStart: --daemon (default), --raw, --interactive, --no-persist, --no-server\n  --port N (automatic free port from 3000), --no-qr\n  --browser-mode headless|headful (default headless), --browser-profile PATH\n  Routing/pacing/browser mode changes apply to future tasks at safe boundaries;\n  mode/profile/persistence/HTTP port changes require restart.\nInit: --agenda DESCRIPTION executes Expert bootstrap and starts the agenda; --no-install skips harness installation.\nRecovery: --action ACTION --occurrence ID --dry-run\nOutput: --json (list/recover/migrate), --help, --version\nEnvironment: PTBK_HARNESS, PTBK_MODEL, PTBK_THINKING_LEVEL\n\nHarness registry:\n${JSON.stringify(HARNESS_REGISTRY, null, 2)}\n\nRead-only list and dry-run do not install tools, write state or call models.\nNode 22.13+ or 24+ on Linux, macOS and Windows. See docs/runtime.md.\n`);
}

/** Derive explicit supervisor settings without turning start into a fixed finite Developer run. */
function serviceOptions(parsed: Parsed, options: RunOptions): ServiceOptions {
    return { ...options, mode: parsed.values.raw ? 'raw' : parsed.values.interactive ? 'interactive' : 'daemon',
        noPersist: !!parsed.values['no-persist'], noServer: !!parsed.values['no-server'], noQr: !!parsed.values['no-qr'],
        port: integer(parsed.values.port, '--port'), browserMode: parsed.values['browser-mode'] as ServiceOptions['browserMode'], browserProfile: parsed.values['browser-profile'] as string | undefined };
}

/** Preserve saved restart preferences unless the caller explicitly overrides their CLI option. */
function restartOptions(parsed: Parsed, options: RunOptions, saved: ServiceOptions): ServiceOptions {
    const supplied = serviceOptions(parsed, options);
    const next = { ...saved, signal: options.signal };
    const names: Record<string, keyof ServiceOptions> = {
        harness: 'harness', model: 'model', 'thinking-level': 'thinkingLevel', agent: 'agent', context: 'context',
        'min-priority': 'minPriority', priority: 'minPriority', 'max-priority': 'maxPriority',
        'git-changes': 'gitChanges', check: 'check', 'check-before': 'checkBefore',
        'no-questions': 'noQuestions', 'auto-pull': 'autoPull', 'auto-push': 'autoPush', isolate: 'isolate',
        'no-normalize-line-endings': 'normalizeLineEndings', 'preserve-logs': 'preserveLogs', 'allow-credits': 'allowCredits',
        'wait-between-prompts': 'waitBetweenPrompts', 'wait-after-prompt': 'waitAfterPrompt', 'wait-after-error': 'waitAfterError',
        daemon: 'mode', raw: 'mode', interactive: 'mode', 'no-persist': 'noPersist', 'no-server': 'noServer',
        'no-qr': 'noQr', port: 'port', 'browser-mode': 'browserMode', 'browser-profile': 'browserProfile',
    };
    for (const name of Object.keys(parsed.values)) {
        const key = names[name];
        if (key) Object.assign(next, { [key]: supplied[key] });
    }
    return next;
}

/** Reads a description from stdin only when the command explicitly needs it. */
async function descriptionInput(positional: string[], noQuestions: boolean): Promise<string> {
    if (positional.length) return positional.join(' ');
    if (!process.stdin.isTTY) {
        let text = '';
        for await (const chunk of process.stdin) { text += String(chunk); if (text.length > 2 * 1024 * 1024) throw new InputError('Task input exceeds 2 MiB.'); }
        return text;
    }
    if (noQuestions) throw new InputError('Supply a task description argument or stdin with --no-questions.');
    const terminal = createInterface({ input: process.stdin, output: process.stdout });
    try { return await terminal.question('Task description: '); } finally { terminal.close(); }
}

/** Applies authoring changes under the same lease and commits only their paths. */
async function author(workspace: Workspace, options: RunOptions, commit: boolean, operation: (lease: WorkspaceLease) => Promise<string[]>): Promise<void> {
    await requireGit(workspace);
    const lease = await acquireLease(workspace);
    try {
        const before = await captureSnapshot(workspace.gitRoot || workspace.projectPath);
        const paths = await operation(lease);
        if (commit && paths.length) await commitScoped(before, 'chore: Update ptbk tasks and configuration', { paths: paths.map(path => relative(before.root, path).split('\\').join('/')) });
        for (const path of paths) process.stdout.write(`${path}\n`);
        if (options.autoPush && commit && paths.length) {
            const { execFile } = await import('node:child_process');
            const { promisify } = await import('node:util');
            await promisify(execFile)('git', ['-C', workspace.gitRoot || workspace.projectPath, 'push']);
        }
    } finally { await lease.release(); }
}

/** Scans useful authoring diagnostics without invoking the task engine. */
async function diagnostics(workspace: Workspace, command: string): Promise<void> {
    if (command === 'find-fresh-emoji-tags') {
        const used = (await discoverTasks(workspace)).map(task => task.title).join('\n');
        process.stdout.write(['🧩', '🛠️', '🌱', '📐', '🧭', '🔬', '🧵', '🦉', '🎛️', '🪴'].filter(tag => !used.includes(tag)).join(' ') + '\n');
        return;
    }
    const visit = async (directory: string): Promise<void> => {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
            if (entry.name.startsWith('.') || ['node_modules', 'dist', 'coverage', 'done', 'traces'].includes(entry.name) || entry.isSymbolicLink()) continue;
            const path = join(directory, entry.name);
            if (entry.isDirectory()) await visit(path);
            else if (/\.(?:tsx?|jsx?|mjs|md|book)$/.test(entry.name)) {
                if ((await stat(path)).size > 2 * 1024 * 1024) continue;
                const content = await readFile(path, 'utf8');
                if (command === 'find-unwritten') {
                    content.split(/\r?\n/).forEach((line, index) => { if (/@@@|\bTODO\b|\bFIXME\b/.test(line)) process.stdout.write(`${path}:${index + 1}: ${line.slice(0, 200)}\n`); });
                } else if (content.split('\n').length >= 400) process.stdout.write(`${path}: ${content.split('\n').length} lines\n`);
            }
        }
    };
    await visit(workspace.projectPath);
}

/** Runs the installed CLI and implements the documented exit-code contract.
 * @private Internal executable entry point.
 */
export async function main(arguments_: string[]): Promise<number> {
    const controller = new AbortController();
    let redactionPath = process.cwd();
    let interrupted = false;
    const abort = () => { interrupted = true; controller.abort(); };
    process.once('SIGINT', abort);
    process.once('SIGTERM', abort);
    try {
        const parsed = parseArguments(arguments_);
        if (parsed.values.version) {
            const manifest = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string };
            process.stdout.write(`${manifest.version}\n`); return 0;
        }
        if (parsed.values.help) { printHelp(); return 0; }
        if (parsed.command === 'help') {
            const project = resolve(String(parsed.values.path || process.cwd()));
            if (!process.stdin.isTTY) { process.stdout.write(`Project: ${project}\nUse ptbk start --path ${JSON.stringify(project)} to operate its agenda. Run ptbk --help for options.\n`); return 0; }
            const reader = createInterface({ input: process.stdin, output: process.stdout });
            let start = false;
            try { start = /^(y|yes)$/i.test((await reader.question(`Start the agenda in ${project}? [y/N] `)).trim()); } finally { reader.close(); }
            if (!start) return 0;
            parsed.command = 'start';
        }
        if (!['add', 'recover', 'answer'].includes(parsed.command) && parsed.arguments.length) throw new InputError(`Unexpected arguments for ${parsed.command}: ${parsed.arguments.join(' ')}`);
        const options = runOptions(parsed);
        options.signal = controller.signal;
        options.onEvent = event => { if (event.type !== 'output') process.stdout.write(`${redactSecrets(typeof event === 'string' ? event : JSON.stringify(event), redactionPath)}\n`); };
        options.confirm = async (_step, message) => {
            if (!process.stdin.isTTY || options.noQuestions) throw new InputError('Confirmation requires an interactive terminal.');
            const terminal = createInterface({ input: process.stdin, output: process.stdout });
            try { return /^(y|yes)$/i.test((await terminal.question(`${message} [y/N] `)).trim()); } finally { terminal.close(); }
        };
        const workspace = await resolveWorkspace({ path: parsed.values.path as string | undefined, tasks: parsed.values.tasks as string | undefined }, ['init', 'initialize', 'migrate', 'add', 'generate-boilerplates', 'plan'].includes(parsed.command));
        redactionPath = workspace.projectPath;
        await loadProjectSecrets(workspace.projectPath);
        if (['status', 'show'].includes(parsed.command)) {
            const state = await serviceCommand(workspace);
            const record = await readServiceRecord(workspace);
            let inspection = state;
            if (!inspection) {
                const ledger = await readLedger(workspace);
                const tasks = await discoverTasks(workspace);
                inspection = { project: workspace.projectPath, status: record?.desired === 'running' ? 'unreachable; inspect preserved process/recovery records' : 'stopped', installation: record?.installation, settings: record?.settings, requests: await listRequests(workspace, true),
                    tasks: await Promise.all(tasks.map(async task => ({ id: task.id, title: task.title, status: task.status, priority: task.priority, source: task.source.relativePath, eligibility: await taskEligibility(workspace, task, {}, ledger) }))) };
            }
            process.stdout.write(`${redactSecrets(JSON.stringify(inspection, null, 2), redactionPath)}\n`); return 0;
        }
        if (parsed.command === 'answer') {
            const id = parsed.values.request as string | undefined || parsed.arguments[0];
            let response = parsed.values.response as string | undefined || parsed.arguments.slice(1).join(' ');
            if (!id) { process.stdout.write(`${JSON.stringify(await listRequests(workspace, true), null, 2)}\n`); return 0; }
            if (!response && process.stdin.isTTY && !options.noQuestions) {
                const reader = createInterface({ input: process.stdin, output: process.stdout });
                try { response = await reader.question('Response: '); } finally { reader.close(); }
            }
            if (!response) throw new InputError('Supply --response or a reply argument; no invisible prompt was started.');
            const action = String(parsed.values.action || 'answered');
            if (!['answered', 'rejected', 'cancelled'].includes(action)) throw new InputError('answer --action must be answered, rejected or cancelled.');
            process.stdout.write(`${JSON.stringify(await answerRequest(workspace, id, response, action as 'answered'), null, 2)}\n`); return 0;
        }
        if (parsed.command === 'stop') { await stopService(workspace); return 0; }
        if (parsed.command === 'restart') {
            const record = await readServiceRecord(workspace);
            if (!record) throw new InputError('No saved project process exists. Use ptbk start.');
            if (record.mode !== 'daemon') throw new InputError('Restart targets a daemon; this project was started in foreground mode.');
            await stopService(workspace);
            await requireGit(workspace);
            await startService(workspace, restartOptions(parsed, options, record.settings)); return 0;
        }
        if (parsed.command === 'list' || (parsed.command === 'run' && options.dryRun)) {
            const tasks = await discoverTasks(workspace);
            const ledger = await readLedger(workspace);
            const previewOptions = parsed.command === 'run' ? { ...options, agent: options.agent ?? 'Developer' } : options;
            const rows = await Promise.all(tasks.map(async task => ({ id: task.id, title: task.title, status: task.status, priority: task.priority, source: task.source.relativePath, ...await taskEligibility(workspace, task, previewOptions, ledger) })));
            if (parsed.values.json) process.stdout.write(`${redactSecrets(JSON.stringify({ timezone: workspace.timezone, tasks: rows }, null, 2), redactionPath)}\n`);
            else { process.stdout.write(`Project: ${workspace.projectPath}\nTimezone: ${workspace.timezone}\n`); for (const row of rows) process.stdout.write(redactSecrets(`[${row.status}] p${row.priority} ${row.title}\n  ${row.source} · ${row.kind}: ${row.reason}\n`, redactionPath)); if (!rows.length) process.stdout.write('No tasks discovered.\n'); }
            return 0;
        }
        if (parsed.command.startsWith('find-')) { await diagnostics(workspace, parsed.command); return 0; }
        if (parsed.command === 'recover') {
            if (parsed.arguments.length !== 1) throw new InputError('recover requires exactly one task ID.');
            if (parsed.values.action && !options.dryRun) {
                options.context = await readContext(workspace, options.context);
                if (options.agent) options.agent = (await resolveAgentSelection(workspace, options.agent)).path;
            }
            const result = await recoverTask(workspace, parsed.arguments[0]!, { action: parsed.values.action as 'resume' | 'retry' | 'acknowledge' | undefined, occurrence: parsed.values.occurrence as string | undefined, dryRun: !!parsed.values['dry-run'] }, options);
            const review = { ...result, journals: result.journals.map(journal => ({ id: journal.id, taskId: journal.taskId, occurrenceId: journal.occurrenceId, phase: journal.phase, attempts: journal.attempts, commits: journal.commits, error: journal.error, trace: journal.trace, pendingPhase: journal.pendingPhase, syncPending: journal.syncPending })) };
            process.stdout.write(`${redactSecrets(JSON.stringify(review, null, 2), redactionPath)}\n`); return result.exitCode;
        }
        if (parsed.command === 'migrate' && options.dryRun) { process.stdout.write(`${redactSecrets(JSON.stringify(await migrateTasks(workspace, { dryRun: true, noCommit: options.noCommit }), null, 2), redactionPath)}\n`); return 0; }
        if (['init', 'initialize'].includes(parsed.command)) await requireGit(workspace, true);
        else await requireGit(workspace);
        if (['init', 'initialize'].includes(parsed.command)) {
            let agenda = parsed.values.agenda as string | undefined;
            if (!agenda && process.stdin.isTTY && !options.noQuestions) {
                const reader = createInterface({ input: process.stdin, output: process.stdout });
                try { agenda = (await reader.question('Initialize only (Enter), or describe the ongoing agenda: ')).trim() || undefined; } finally { reader.close(); }
            }
            await author(workspace, options, !!parsed.values.commit || !!agenda, () => initializeProject(workspace));
            const inventory = parsed.values['no-install'] ? await inspectHarnesses(workspace.projectPath, { signal: controller.signal }) : await setupHarnesses(workspace.projectPath, { names: options.harness ? [options.harness] : undefined, install: true, login: !options.noQuestions, interactive: !!process.stdin.isTTY, signal: controller.signal, onOutput: text => process.stdout.write(redactSecrets(text, redactionPath)) });
            process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
            if (agenda) {
                const harness = options.harness || inventory.find(item => item.usable)?.name;
                if (!harness) throw new InputError('Agenda initialization needs an authenticated harness; complete the displayed setup, then retry --agenda.');
                let bootstrapId: string | undefined;
                await author(workspace, options, true, async () => {
                    const path = await addTask(workspace, agenda!);
                    const task = (await discoverTasks(workspace)).find(item => item.source.path === path)!;
                    bootstrapId = task.id;
                    await updateTaskControls(task, { agent: '@Expert', harness, origin: 'engine:agenda-bootstrap' });
                    return [path];
                });
                const bootstrap = await runQueue(workspace, { ...options, harness, agent: 'ptbk:expert', onlyTaskId: bootstrapId, limit: 1, check: options.check || 'npm run check', requireAcceptance: true, context: await readContext(workspace, options.context) });
                if (bootstrap.exitCode !== 0) return bootstrap.exitCode;
                await startService(workspace, { ...options, harness: options.harness, mode: 'daemon' });
            }
        } else if (parsed.command === 'add') {
            const description = await descriptionInput(parsed.arguments, !!options.noQuestions);
            await author(workspace, options, !!parsed.values.commit, async () => [await addTask(workspace, description, { priority: integer(parsed.values.priority, '--priority'), template: parsed.values.template as string | undefined })]);
        } else if (parsed.command === 'generate-boilerplates') {
            await author(workspace, options, !!parsed.values.commit, () => generateBoilerplates(workspace, String(parsed.values.count || '5*1')));
        } else if (parsed.command === 'verify') {
            await author(workspace, options, !!parsed.values.commit, () => verifyTasks(workspace, { noQuestions: options.noQuestions, ignore: parsed.values.ignore as string[] | undefined }));
        } else if (parsed.command === 'migrate') {
            await author(workspace, options, !options.noCommit, async lease => {
                const result = await migrateTasks(workspace, { dryRun: false, noCommit: options.noCommit }, lease);
                return [...result.created, ...result.archived];
            });
        } else {
            if (parsed.command === 'start') { await startService(workspace, serviceOptions(parsed, options)); return 0; }
            options.context = await readContext(workspace, options.context);
            if (options.agent) options.agent = (await resolveAgentSelection(workspace, options.agent)).path;
            if (parsed.command === 'plan') await planConversation(workspace, { ...options, prompt: parsed.values.prompt as string | undefined, commit: !!parsed.values.commit });
            else if (parsed.command === 'server') {
                if (options.limit !== undefined) throw new InputError('server is persistent; use ptbk run --limit for a finite run.');
                await startCoderServer(workspace, { ...options, port: integer(parsed.values.port, '--port') });
            } else if (parsed.command === 'ping') {
                if (!options.harness) throw new InputError('ping requires --harness or PTBK_HARNESS.');
                do {
                    const result = await runHarness({ harness: options.harness, projectPath: workspace.projectPath, prompt: 'Reply with pong. Do not modify files or run tools.', model: options.model, thinkingLevel: options.thinkingLevel, signal: controller.signal, allowCredits: options.allowCredits, onOutput: text => process.stdout.write(redactSecrets(text, redactionPath)) });
                    if (result.outcome !== 'success') return 1;
                    if (!parsed.values.period) break;
                    await delay(parseDuration(parsed.values.period), undefined, { signal: controller.signal });
                } while (!controller.signal.aborted);
            } else {
                const terminal = createTerminal(!parsed.values['no-ui'] && !options.noAuto, abort, workspace.projectPath);
                try {
                    options.isPaused = terminal.isPaused;
                    options.shouldStop = terminal.shouldStop;
                    options.skipWait = terminal.skipWait;
                    options.onWait = terminal.setWaiting;
                    options.onOutput = terminal.output;
                    options.onEvent = event => { if (event.type !== 'output') terminal.status(`${event.type}${event.taskId ? ` (${event.taskId})` : ''}: ${event.message}`); };
                    const result = parsed.command === 'fix' ? await fixChecks(workspace, options) : await runQueue(workspace, options);
                    terminal.close();
                    process.stdout.write(`${result.completed} completed, ${result.failed} failed${result.syncPending ? ', synchronization pending' : ''}.\n`);
                    return result.exitCode;
                } finally { terminal.close(); }
            }
        }
        return interrupted ? 130 : 0;
    } catch (error) {
        if (interrupted || (error as Error).name === 'AbortError') return 130;
        process.stderr.write(`${redactSecrets((error as Error).message || String(error), redactionPath)}\n`);
        return (error as { exitCode?: number }).exitCode ?? (error instanceof InputError ? 2 : 1);
    } finally {
        process.removeListener('SIGINT', abort);
        process.removeListener('SIGTERM', abort);
    }
}
