import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { resolveWorkspace, requireGit, readContext, InputError, resolveAgentSelection } from './workspace.js';
import { initializeProject, addTask, generateBoilerplates, verifyTasks } from './authoring.js';
import { discoverTasks } from './sources.js';
import { migrateTasks } from './migrate.js';
import { runQueue, fixChecks, recoverTask, taskEligibility, type RunOptions } from './engine.js';
import { acquireLease, readLedger, type WorkspaceLease } from './state.js';
import { captureSnapshot, commitScoped } from './git.js';
import { runHarness, HARNESS_REGISTRY, redactSecrets, getHarness, getHarnessCatalog, loadProjectSecrets } from './harness.js';
import { planConversation } from './planner.js';
import { startCoderServer } from './server.js';
import { createFiniteRuntime } from './finite.js';
import type { Workspace } from './domain.js';
import { startService, stopService, serviceCommand, readServiceRecord, type ServiceOptions } from './service.js';
import { listRequests, answerRequest } from './requests.js';
import { setupHarnesses, inspectHarnesses } from './setup.js';
import { updateTaskControls } from './sources.js';
import { readProjectConfiguration, ensureProjectConfiguration, type ProjectConfiguration } from './configuration.js';
import { installedEngineVersion } from './version.js';
import { promptText } from './interactive.js';
import { inspectEngineInstallation, checkEngineUpdate, updateEngineInstallation } from './updates.js';
import { inspectInitializationDestination, prepareInitializationDestination, finalizeInitializationDestination, installProjectEngine, inspectLocalInstallation, inspectProjectReadiness, persistInitializationPending, type PreparedInitializationDestination } from './initialization.js';
import { reportDiagnostic } from './diagnostics.js';
import { validateCheck } from './checks.js';

/** Boolean CLI options whose presence is significant. */
const BOOLEAN_OPTIONS = new Set(['help', 'version', 'dry-run', 'no-commit', 'commit', 'no-auto', 'no-questions', 'auto-pull', 'auto-push', 'isolate', 'no-normalize-line-endings', 'no-ui', 'preserve-logs', 'allow-credits', 'auto-migrate', 'allow-destructive-auto-migrate', 'json', 'daemon', 'raw', 'interactive', 'non-interactive', 'no-persist', 'no-server', 'no-qr', 'no-install', 'self-update', 'no-self-update', 'auto-update-harnesses', 'no-auto-update-harnesses']);
/** Value options accepted by the CLI parser. */
const VALUE_OPTIONS = new Set(['path', 'tasks', 'harness', 'model', 'thinking-level', 'agent', 'context', 'min-priority', 'max-priority', 'priority', 'limit', 'git-changes', 'check', 'check-before', 'wait-between-prompts', 'wait-after-prompt', 'wait-after-error', 'template', 'count', 'ignore', 'period', 'port', 'action', 'occurrence', 'browser-mode', 'browser-profile', 'agenda', 'intent', 'prompt', 'response', 'request', 'installation', 'new-project', 'nested-strategy', 'submodule-source', 'harnesses']);
/** Commands supported by the installed executable. */
const COMMANDS = ['init', 'initialize', 'about', 'start', 'stop', 'restart', 'status', 'show', 'answer', 'add', 'generate-boilerplates', 'plan', 'list', 'run', 'fix', 'verify', 'server', 'migrate', 'recover', 'find-unwritten', 'find-refactor-candidates', 'find-fresh-emoji-tags', 'ping'];
/** Shared option groups avoid quietly ignoring command-specific flags. */
const ROUTING_OPTIONS = ['harness', 'model', 'thinking-level', 'agent', 'context'];
/** Execution switches have meaning only for commands using the shared engine. */
const EXECUTION_OPTIONS = [...ROUTING_OPTIONS, 'min-priority', 'max-priority', 'priority', 'limit', 'git-changes', 'check', 'check-before', 'no-commit', 'no-auto', 'no-questions', 'auto-pull', 'auto-push', 'isolate', 'no-normalize-line-endings', 'preserve-logs', 'allow-credits', 'wait-between-prompts', 'wait-after-prompt', 'wait-after-error', 'auto-migrate', 'allow-destructive-auto-migrate', 'dry-run'];
/** Exact option sets for authoring, diagnostics and read-only commands. */
const COMMAND_OPTIONS: Record<string, string[]> = {
    init: [...ROUTING_OPTIONS, 'commit', 'no-commit', 'no-questions', 'auto-push', 'agenda', 'intent', 'no-install', 'allow-credits', 'check', 'installation', 'new-project', 'nested-strategy', 'submodule-source', 'harnesses', 'browser-mode', 'browser-profile', 'self-update', 'no-self-update'],
    initialize: [...ROUTING_OPTIONS, 'commit', 'no-commit', 'no-questions', 'auto-push', 'agenda', 'intent', 'no-install', 'allow-credits', 'check', 'installation', 'new-project', 'nested-strategy', 'submodule-source', 'harnesses', 'browser-mode', 'browser-profile', 'self-update', 'no-self-update'],
    start: [...EXECUTION_OPTIONS, 'daemon', 'raw', 'no-persist', 'no-server', 'port', 'no-qr', 'browser-mode', 'browser-profile', 'auto-update-harnesses', 'no-auto-update-harnesses', 'harnesses'],
    restart: [...EXECUTION_OPTIONS, 'daemon', 'raw', 'no-persist', 'no-server', 'port', 'no-qr', 'browser-mode', 'browser-profile', 'auto-update-harnesses', 'no-auto-update-harnesses', 'harnesses'],
    about: [],
    stop: [], status: ['json'], show: ['json'], answer: ['request', 'response', 'action', 'json', 'no-questions'],
    add: ['commit', 'no-commit', 'no-questions', 'auto-push', 'priority', 'template'],
    'generate-boilerplates': ['commit', 'no-commit', 'no-questions', 'auto-push', 'count'],
    plan: [...ROUTING_OPTIONS, 'commit', 'no-commit', 'no-questions', 'allow-credits', 'prompt'],
    list: [...ROUTING_OPTIONS, 'min-priority', 'max-priority', 'priority', 'json'],
    run: [...EXECUTION_OPTIONS, 'json', 'no-server', 'no-qr', 'port', 'browser-mode', 'browser-profile'], fix: EXECUTION_OPTIONS.filter(name => !['limit', 'min-priority', 'max-priority', 'priority'].includes(name)),
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
            if (inline.length && !['true', 'false'].includes(inline.join('='))) throw new InputError(`--${name} accepts only true or false.`);
            if (values[name!] !== undefined) throw new InputError(`--${name} was specified more than once.`);
            values[name!] = inline.length ? inline[0] === 'true' : true;
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
        const allowed = new Set(['path', 'tasks', 'help', 'version', 'no-ui', 'interactive', 'non-interactive', ...COMMAND_OPTIONS[command]!]);
        for (const name of Object.keys(values)) if (!allowed.has(name)) throw new InputError(`--${name} is unsupported for ${command}. Use ptbk --help.`);
        if (values.json && command === 'run' && !values['dry-run']) throw new InputError('--json on run requires --dry-run.');
        if (values['dry-run'] && command === 'server') throw new InputError('server does not support --dry-run; use ptbk run --dry-run.');
    }
    if (values.interactive && (values['non-interactive'] || values['no-ui'] || values.raw || values['no-questions'])) throw new InputError('--interactive conflicts with noninteractive/raw/no-UI/no-questions operation.');
    if (values.interactive && (!process.stdin.isTTY || !process.stdout.isTTY)) throw new InputError('--interactive requires an interactive terminal; use --non-interactive or --raw.');
    if (values['self-update'] && values['no-self-update']) throw new InputError('--self-update conflicts with --no-self-update.');
    if (values['auto-update-harnesses'] && values['no-auto-update-harnesses']) throw new InputError('--auto-update-harnesses conflicts with --no-auto-update-harnesses.');
    if (values['installation'] && !['local', 'global'].includes(String(values['installation']))) throw new InputError('--installation must be local or global.');
    if (values['nested-strategy'] && !['back', 'ignored', 'submodule'].includes(String(values['nested-strategy']))) throw new InputError('--nested-strategy must be back, ignored or submodule.');
    if (values['agenda'] !== undefined && values['intent'] !== undefined) throw new InputError('Choose --intent or --agenda, not both.');
    if (values['no-install'] && values.installation === 'local') throw new InputError('--no-install conflicts with --installation local.');
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
    const thinkingLevel = String(values['thinking-level'] ?? '') || undefined;
    if (thinkingLevel && !['low', 'medium', 'high', 'xhigh', 'max'].includes(thinkingLevel)) throw new InputError('--thinking-level must be low, medium, high, xhigh or max.');
    if (values['browser-mode'] && !['headless', 'headful'].includes(String(values['browser-mode']))) throw new InputError('--browser-mode must be headless or headful.');
    if (values['no-server'] && values.port !== undefined) throw new InputError('--port conflicts with --no-server.');
    if (values.action && parsed.command !== 'answer' && !['resume', 'retry', 'acknowledge'].includes(String(values.action))) throw new InputError('--action must be resume, retry or acknowledge.');
    if (['start', 'restart'].includes(parsed.command)) {
        if (values['no-commit'] || values.limit !== undefined || values['no-auto']) throw new InputError('start requires commits and indefinite automatic operation; use run for finite or manual work.');
        if ([values.daemon, values.raw, values.interactive].filter(Boolean).length > 1) throw new InputError('Choose only one of --daemon, --raw or --interactive.');
        if (values.interactive && !process.stdin.isTTY) throw new InputError('--interactive requires an interactive terminal; use --raw or --daemon.');
        if (values['no-server'] && values.port !== undefined) throw new InputError('--port conflicts with --no-server.');
        if (values['browser-mode'] && !['headless', 'headful'].includes(String(values['browser-mode']))) throw new InputError('--browser-mode must be headless or headful.');
    }
    const harnessName = values.harness as string | undefined || undefined;
    if (harnessName) {
        let harness;
        try { harness = getHarness(harnessName); } catch (error) { throw new InputError((error as Error).message); }
        if (thinkingLevel && !harness.thinkingLevels.includes(thinkingLevel)) throw new InputError(`${harnessName} does not support thinking level ${thinkingLevel}.`);
    }
    return { harness: harnessName, model: values.model as string | undefined || undefined, thinkingLevel, agent: values.agent as string | undefined || undefined, context: values.context as string | undefined, check: values.check as string | undefined, checkBefore: checkBefore as RunOptions['checkBefore'], gitChanges: gitChanges as RunOptions['gitChanges'], noCommit: !!values['no-commit'], noAuto: !!values['no-auto'], noQuestions: !!values['no-questions'] || !!values['non-interactive'] || !!values['no-ui'] || !!values.raw, autoPull: !!values['auto-pull'], autoPush: !!values['auto-push'], isolate: !!values.isolate, normalizeLineEndings: !values['no-normalize-line-endings'], limit: integer(values.limit, '--limit'), minPriority: minPriority ?? priority, maxPriority, allowCredits: !!values['allow-credits'], preserveLogs: !!values['preserve-logs'], waitBetweenPrompts: parseDuration(values['wait-between-prompts']), waitAfterPrompt: parseDuration(values['wait-after-prompt']), waitAfterError: parseDuration(values['wait-after-error'], 600000), dryRun: !!values['dry-run'] };
}

/** Show offline, readable help from this installation without dumping provider internals. */
async function printHelp(command = 'help', projectPath = process.cwd()): Promise<void> {
    const version = await installedEngineVersion();
    process.stdout.write(`Promptbook ${version}
Operate agents and checked tasks over a Git project.

Usage: ptbk <command> [options]
Project: ${resolve(projectPath)}

Project setup
  init | initialize           Incremental project setup
  add [description]           Create a task Book without a model call
  plan                        Read-only planning and approved task saving

Execution
  start                       Ongoing agenda; daemon by default
  run                         Finite execution of the current queue
  fix                         Check and repair project validation
  verify                      Human review and archive

Inspection and controls
  list                        Queue and eligibility
  stop | restart              Control the project daemon
  status | show               Process, queue and pending requests
  answer [request-id] [reply]  Answer a durable human request
  recover <task-id>           Inspect interrupted work
  about                       Product and running engine version

Authoring tools
  migrate                     Convert legacy Markdown to Books
  generate-boilerplates       Create unfinished task templates
  find-unwritten              Find placeholders
  find-refactor-candidates    Find large source files
  find-fresh-emoji-tags       Suggest unused tags
  ping                        Explicit small harness/model call

Common options
  --path DIR --tasks DIR       Select project and task source
  --interactive               Terminal wizard or dashboard
  --non-interactive --no-ui    Plain output; no terminal prompts
  --help --version             Offline help and actual engine version

Start modes: --daemon (default), --raw, --interactive
Harnesses: OpenAI Codex, Claude Code; More: ptbk init --help

Defaults are saved in ptbk.json. CLI flags and live controls are temporary.
Routing, pacing and browser changes apply at safe task boundaries.
Process mode, persistence and HTTP settings require restart.

Examples
  ptbk init
  ptbk start
  ptbk run --dry-run
  ptbk ${command === 'help' ? 'run' : command} --help
`);
    if (command !== 'help') {
        process.stdout.write(`
${command} options
`);
        const names = [...COMMAND_OPTIONS[command] ?? []];
        for (const name of names) process.stdout.write(`  --${name}${VALUE_OPTIONS.has(name) ? ' VALUE' : ''}
`);
        if (['init', 'initialize'].includes(command)) process.stdout.write(`
  --new-project DIR creates a destination; nested Git requires
  --nested-strategy ignored|submodule (with --submodule-source) or back.
  --installation local|global chooses destination installation.
  Local installation uses the exact running version in dependencies.
  --harnesses NAME,NAME selects integrations; an empty value defers setup.
  --intent TEXT starts Expert bootstrap; blank intent creates sample setup.
  --self-update updates the invoked installation, then exits for a rerun.
  --no-install skips installation; --no-commit leaves setup uncommitted.
  More harnesses: ${HARNESS_REGISTRY.map(harness => harness.name).join(', ')}
`);
        if (['run', 'start'].includes(command)) process.stdout.write(`
  --check COMMAND selects validation; error pacing defaults to 10m.
  Read-only dry-run never installs, updates, calls models or writes files.
`);
    }
}

/** Derive explicit supervisor settings without turning start into a fixed finite Developer run. */
function serviceOptions(parsed: Parsed, options: RunOptions, configuration?: ProjectConfiguration): ServiceOptions {
    let mode = parsed.values.raw ? 'raw' : parsed.values.interactive ? 'interactive' : parsed.values.daemon ? 'daemon' : parsed.values['process-mode'] ?? 'daemon';
    if (mode === 'interactive' && (parsed.values['no-ui'] || parsed.values['non-interactive'])) mode = 'raw';
    if (mode === 'interactive' && (!process.stdin.isTTY || !process.stdout.isTTY || options.noQuestions && parsed.values['non-interactive'])) throw new InputError('Interactive process mode requires an interactive terminal; override with --raw or --daemon.');
    return { ...options, mode: mode as ServiceOptions['mode'],
        noPersist: !!parsed.values['no-persist'], noServer: !!parsed.values['no-server'], noQr: !!parsed.values['no-qr'],
        port: integer(parsed.values.port, '--port'), browserMode: parsed.values['browser-mode'] as ServiceOptions['browserMode'], browserProfile: parsed.values['browser-profile'] as string | undefined,
        enabledHarnesses: parsed.values.harnesses !== undefined ? harnessNames(String(parsed.values.harnesses)) : configuration?.enabledHarnesses,
        autoUpdateHarnesses: parsed.values['no-auto-update-harnesses'] !== undefined ? !parsed.values['no-auto-update-harnesses'] : parsed.values['auto-update-harnesses'] !== undefined ? !!parsed.values['auto-update-harnesses'] : configuration?.autoUpdateHarnesses,
        configurationSources: configuration?.sources, harnessSettings: configuration?.harnessSettings };
}

/** Parse explicit selections, including an intentionally empty enabled set. */
function harnessNames(value: string): string[] {
    const names = [...new Set(value.split(',').map(name => name.trim()).filter(Boolean))];
    for (const name of names) getHarness(name);
    return names;
}

/** Ask a bounded setup choice through the shared editor, retaining a visible default. */
async function wizardChoice(label: string, choices: string[], initial: string, signal: AbortSignal): Promise<string> {
    return (await promptText(`${label}\nChoices: ${choices.join(', ')}`, { initial, signal, heading: `Promptbook ${await installedEngineVersion()} · Project setup`, validate: value => choices.includes(value.trim().toLowerCase()) ? undefined : `Choose ${choices.join(', ')}.` })).trim().toLowerCase();
}

/** Keep the harness picker bounded and searchable as ordinary integrations are added. */
async function chooseHarnesses(signal: AbortSignal): Promise<string[]> {
    let includeMore = false; let query = ''; let offset = 0;
    for (;;) {
        const entries = getHarnessCatalog({ includeMore, query, offset, limit: 12 });
        const choice = (await promptText(`Harnesses\n${entries.map(entry => `${entry.id} (${entry.displayName})`).join('\n') || 'No matching integrations.'}\nComma-separated identifiers; blank defers setup.\nMore · next · back · search TEXT`, {
            signal, validate: value => {
                const text = value.trim();
                if (/^(?:more|next|back|search(?:\s.*)?)$/i.test(text)) return undefined;
                try { harnessNames(text); return undefined; } catch (error) { return (error as Error).message; }
            },
        })).trim();
        if (/^more$/i.test(choice)) { includeMore = true; offset = 0; continue; }
        if (/^next$/i.test(choice)) { offset = entries.length === 12 ? offset + 12 : 0; continue; }
        if (/^back$/i.test(choice)) { includeMore = false; query = ''; offset = 0; continue; }
        if (/^search(?:\s|$)/i.test(choice)) { query = choice.replace(/^search\s*/i, ''); offset = 0; continue; }
        return harnessNames(choice);
    }
}

/** Explicit init is the only engine-update gate; a changed engine must be invoked afresh. */
async function selfUpdateGate(parsed: Parsed, interactive: boolean, signal: AbortSignal): Promise<boolean> {
    if (parsed.values['no-self-update'] || parsed.values['self-update'] === false || !interactive && !parsed.values['self-update']) return false;
    const installation = await inspectEngineInstallation({ signal });
    const update = await checkEngineUpdate(installation.version, { signal });
    if (update.diagnostic) process.stderr.write(`${update.diagnostic}\n`);
    if (!update.available || !update.latest) return false;
    const accepted = parsed.values['self-update'] || interactive && await wizardChoice(`Update engine ${update.current} to ${update.latest}?\nInstallation: ${installation.packagePath} (${installation.scope})`, ['yes', 'no'], 'yes', signal) === 'yes';
    if (!accepted) return false;
    for (;;) {
        try {
            await updateEngineInstallation(installation, update.latest, { signal, onOutput: text => process.stdout.write(text) });
            process.stdout.write(`Installed Promptbook ${update.latest} in ${installation.packagePath}. Run the command again to initialize your target with the new engine.\n`);
            return true;
        } catch (error) {
            if (!interactive) throw error;
            process.stderr.write(`${redactSecrets((error as Error).message)}\n`);
            if (await wizardChoice('Engine update failed; retry or continue with the loaded version?', ['retry', 'continue'], 'continue', signal) === 'continue') return false;
        }
    }
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
        harnesses: 'enabledHarnesses', 'auto-update-harnesses': 'autoUpdateHarnesses', 'no-auto-update-harnesses': 'autoUpdateHarnesses',
    };
    for (const name of Object.keys(parsed.values)) {
        const key = names[name];
        if (key) Object.assign(next, { [key]: supplied[key] });
    }
    if (parsed.values.harness !== undefined && parsed.values.harnesses === undefined) next.enabledHarnesses = [String(parsed.values.harness)];
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
    return promptText('Task description');
}

/** Applies authoring changes under the same lease and commits only their paths. */
async function author(workspace: Workspace, options: RunOptions, commit: boolean, operation: (lease: WorkspaceLease) => Promise<string[]>, deferUserEdits?: (paths: string[]) => Promise<void>): Promise<void> {
    await requireGit(workspace);
    const lease = await acquireLease(workspace);
    try {
        const before = await captureSnapshot(workspace.gitRoot || workspace.projectPath);
        const paths = await operation(lease);
        const relativePaths = paths.map(path => relative(before.root, path).split('\\').join('/'));
        const deferred = deferUserEdits ? relativePaths.filter(path => !commit || before.dirtyPaths.includes(path)) : [];
        const committable = relativePaths.filter(path => !deferred.includes(path));
        await deferUserEdits?.(deferred.map(path => resolve(before.root, path)));
        if (commit && committable.length) await commitScoped(before, 'chore: Update ptbk tasks and configuration', { paths: committable });
        for (const path of paths) process.stdout.write(`${path}\n`);
        if (options.autoPush && commit && committable.length) {
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
    let diagnosticWorkspace: Workspace | undefined;
    let command = 'preflight'; let phase = 'argument validation'; let readOnly = true;
    let interrupted = false;
    const abort = () => { interrupted = true; controller.abort(); };
    process.once('SIGINT', abort);
    process.once('SIGTERM', abort);
    try {
        const parsed = parseArguments(arguments_);
        command = parsed.command;
        if (parsed.values.version) {
            process.stdout.write(`${await installedEngineVersion()}\n`); return 0;
        }
        if (parsed.values.help || parsed.command === 'help') { await printHelp(parsed.values.help ? parsed.command : 'help', String(parsed.values.path ?? process.cwd())); return 0; }
        if (parsed.command === 'about') { process.stdout.write(`Promptbook ${await installedEngineVersion()}\nAgents, projects and tasks in readable files.\nExecute checked work with safe Git persistence using ptbk start or ptbk run.\nSaved defaults: ptbk.json. Local recovery and browser state: .ptbk/.\n`); return 0; }
        if (!['add', 'recover', 'answer'].includes(parsed.command) && parsed.arguments.length) throw new InputError(`Unexpected arguments for ${parsed.command}: ${parsed.arguments.join(' ')}`);
        runOptions(parsed);
        const explicitValues = { ...parsed.values };
        let interactive = !!process.stdin.isTTY && !!process.stdout.isTTY && !parsed.values['non-interactive'] && !parsed.values['no-questions'] && !parsed.values['no-ui'] && !parsed.values.raw;
        if (['init', 'initialize'].includes(parsed.command)) {
            const target = resolve(String(parsed.values.path ?? process.cwd()), String(parsed.values['new-project'] ?? '.'));
            let exists = false;
            try { exists = (await stat(target)).isDirectory(); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
            if (exists) {
                const saved = await readProjectConfiguration(target);
                if (explicitValues['no-questions'] === undefined && !explicitValues.interactive && saved.values['no-questions'] === true) interactive = false;
            }
        }
        if (parsed.values['no-auto'] && !interactive) throw new InputError('--no-auto requires an interactive terminal and conflicts with noninteractive operation.');
        let prepared: PreparedInitializationDestination | undefined;
        let intent: string | undefined = (parsed.values.intent ?? parsed.values.agenda) as string | undefined;
        let installationChoice = parsed.values.installation as 'local' | 'global' | undefined;
        let initialHarnesses: string[] | undefined;
        let destination = resolve(String(parsed.values.path ?? process.cwd()));
        if (['init', 'initialize'].includes(parsed.command)) {
            phase = 'engine update check';
            if (await selfUpdateGate(parsed, interactive, controller.signal)) return 0;
            phase = 'destination selection';
            let newProject = parsed.values['new-project'] !== undefined;
            if (interactive && parsed.values.path === undefined && !newProject) {
                const choice = await wizardChoice('Choose the project destination', ['current', 'new'], 'current', controller.signal);
                if (choice === 'new') { parsed.values['new-project'] = await promptText('New subfolder path', { signal: controller.signal, validate: value => value.trim() ? undefined : 'Supply a folder path.' }); newProject = true; }
            }
            if (newProject) destination = resolve(destination, String(parsed.values['new-project']));
            let inspection = await inspectInitializationDestination(destination);
            newProject ||= !inspection.exists;
            inspection = await inspectInitializationDestination(destination, { newProject });
            if (!inspection.fresh && parsed.values.intent !== undefined && String(parsed.values.intent).trim()) throw new InputError('--intent creates a fresh project. Initialize an existing project in place to preserve its purpose, or use --agenda for an explicitly requested new agenda task.');
            let strategy = parsed.values['nested-strategy'] as 'back' | 'ignored' | 'submodule' | undefined;
            if (inspection.nested && !strategy && interactive) strategy = await wizardChoice(`The child is inside ${inspection.parentGitRoot}.\nAn ignored child has independent history; a submodule records its source in the parent.`, ['back', 'ignored', 'submodule'], 'back', controller.signal) as 'back' | 'ignored' | 'submodule';
            if (strategy === 'back') {
                if (!interactive) { process.stdout.write('Setup cancelled before changing either project.\n'); return 0; }
                const retained = Object.entries(explicitValues).filter(([key]) => !['path', 'new-project', 'nested-strategy', 'submodule-source', 'self-update', 'no-self-update'].includes(key));
                return main(['init', '--no-self-update', ...retained.flatMap(([key, value]) => typeof value === 'boolean' ? [`--${key}=${value}`] : Array.isArray(value) ? value.flatMap(item => [`--${key}`, item]) : [`--${key}`, value])]);
            }
            if (inspection.nested && !strategy) throw new InputError('A new child inside Git needs --nested-strategy ignored|submodule or back before any changes.');
            if (strategy === 'submodule' && !parsed.values['submodule-source'] && interactive) parsed.values['submodule-source'] = await promptText('Existing submodule source (URL or repository path)', { signal: controller.signal });
            if (inspection.fresh && intent === undefined && interactive) intent = await promptText('Project intent (leave empty for sample setup)', { signal: controller.signal, heading: `Promptbook ${await installedEngineVersion()} · Project intent` });
            const localInstallation = inspection.exists ? await inspectLocalInstallation(inspection.destination) : undefined;
            if (!parsed.values['no-install'] && !localInstallation?.declared && !installationChoice) {
                if (!interactive) throw new InputError('Choose --installation local|global in advance, or --no-install to defer installation. No destination changes were made.');
                installationChoice = await wizardChoice('Destination engine installation', ['local', 'global'], 'local', controller.signal) as 'local' | 'global';
            }
            if (parsed.values.harnesses !== undefined) initialHarnesses = harnessNames(String(parsed.values.harnesses));
            else if (parsed.values.harness) initialHarnesses = [String(parsed.values.harness)];
            const savedSelection = inspection.exists ? (await readProjectConfiguration(inspection.destination)).enabledHarnesses : undefined;
            if (interactive && !parsed.values['no-install'] && initialHarnesses === undefined && !savedSelection?.length) {
                initialHarnesses = await chooseHarnesses(controller.signal);
            }
            if (interactive && inspection.fresh && parsed.values['browser-mode'] === undefined) parsed.values['browser-mode'] = await wizardChoice('Project browser visibility (independent of harness login)', ['headless', 'headful'], 'headless', controller.signal);
            if (interactive && inspection.fresh && parsed.values['browser-profile'] === undefined) {
                const profile = await wizardChoice('Project browser profile: an existing profile grants access to its sessions and can affect them', ['isolated', 'existing'], 'isolated', controller.signal);
                if (profile === 'existing') parsed.values['browser-profile'] = await promptText('Existing Chrome-compatible profile path', { signal: controller.signal, validate: value => value.trim() ? undefined : 'Supply an existing profile path.' });
            }
            if (parsed.values['browser-mode'] && !['headless', 'headful'].includes(String(parsed.values['browser-mode']))) throw new InputError('--browser-mode must be headless or headful.');
            process.stdout.write(`Promptbook ${await installedEngineVersion()} · Setup\nDestination: ${inspection.destination}\n`);
            prepared = await prepareInitializationDestination({ destination, newProject, nestedStrategy: strategy, submoduleSource: parsed.values['submodule-source'] as string | undefined, signal: controller.signal });
            if (prepared.cancelled) return 0;
            destination = prepared.destination;
        }
        phase = 'project configuration';
        const configuration: ProjectConfiguration = ['stop', 'restart', 'status', 'show', 'answer'].includes(parsed.command)
            ? { path: join(destination, 'ptbk.json'), exists: false, values: {}, sources: {}, document: {} }
            : await readProjectConfiguration(destination);
        parsed.values = { ...configuration.values, ...parsed.values };
        if (explicitValues.commit === true && explicitValues['no-commit'] === undefined) parsed.values['no-commit'] = false;
        if (explicitValues.interactive === true && explicitValues['no-questions'] === undefined) parsed.values['no-questions'] = false;
        if (explicitValues['no-server'] === true && explicitValues.port === undefined) delete parsed.values.port;
        if (explicitValues.harness !== undefined && explicitValues.harnesses === undefined) parsed.values.harnesses = String(explicitValues.harness);
        if (explicitValues.tasks !== undefined) parsed.values.tasks = resolve(process.cwd(), String(explicitValues.tasks));
        if (explicitValues.context !== undefined && explicitValues.context !== '') parsed.values.context = resolve(process.cwd(), String(explicitValues.context));
        if (explicitValues.agent !== undefined && /[\\/]|\.book$/.test(String(explicitValues.agent))) parsed.values.agent = resolve(process.cwd(), String(explicitValues.agent));
        if (parsed.values['browser-profile']) parsed.values['browser-profile'] = resolve(process.cwd(), String(parsed.values['browser-profile']));
        const options = runOptions(parsed);
        interactive &&= !options.noQuestions;
        const harnessSettings = options.harness ? configuration.harnessSettings?.[options.harness] : undefined;
        if (harnessSettings) {
            if (harnessSettings.model !== undefined && explicitValues.model === undefined && (!configuration.sources.model || configuration.sources.model.startsWith('PTBK_') || configuration.sources.model.includes('.harnesses.'))) options.model = harnessSettings.model || undefined;
            if (harnessSettings.thinkingLevel !== undefined && explicitValues['thinking-level'] === undefined && (!configuration.sources['thinking-level'] || configuration.sources['thinking-level']!.startsWith('PTBK_') || configuration.sources['thinking-level']!.includes('.harnesses.'))) options.thinkingLevel = harnessSettings.thinkingLevel || undefined;
            options.harnessConfiguration = { apiKeyEnv: harnessSettings.apiKeyEnv, configurationPath: harnessSettings.configurationPath };
        }
        options.harnessSettings = configuration.harnessSettings;
        for (const key of Object.keys(explicitValues)) configuration.sources[key] = `CLI --${key}`;
        options.configurationSources = configuration.sources;
        options.signal = controller.signal;
        options.onEvent = event => { if (event.type !== 'output') process.stdout.write(`${redactSecrets(typeof event === 'string' ? event : JSON.stringify(event), redactionPath)}\n`); };
        options.confirm = async (_step, message) => {
            if (!process.stdin.isTTY || options.noQuestions) throw new InputError('Confirmation requires an interactive terminal.');
            return (await promptText(`${message}\nAnswer yes or no`, { signal: controller.signal })).trim().toLowerCase() === 'yes';
        };
        const workspace = await resolveWorkspace({ path: destination, tasks: parsed.values.tasks as string | undefined }, ['init', 'initialize', 'migrate', 'add', 'generate-boilerplates', 'plan', 'start'].includes(parsed.command));
        diagnosticWorkspace = workspace;
        if (configuration.values.timezone !== undefined) {
            try { new Intl.DateTimeFormat('en', { timeZone: String(configuration.values.timezone) }).format(); workspace.timezone = String(configuration.values.timezone); }
            catch { throw new InputError(`${configuration.path}.timezone: invalid IANA timezone.`); }
        }
        redactionPath = workspace.projectPath;
        await loadProjectSecrets(workspace.projectPath);
        if (['status', 'show'].includes(parsed.command)) {
            const state = await serviceCommand(workspace);
            const record = await readServiceRecord(workspace);
            let inspection = state;
            if (!inspection) {
                const ledger = await readLedger(workspace);
                const tasks = await discoverTasks(workspace);
                inspection = { project: workspace.projectPath, engineVersion: record?.engineVersion ?? (record ? 'unknown (older process record)' : await installedEngineVersion()), status: record?.desired === 'running' ? 'unreachable; inspect preserved process/recovery records' : 'stopped', installation: record?.installation, settings: record?.settings, requests: await listRequests(workspace, true),
                    tasks: await Promise.all(tasks.map(async task => ({ id: task.id, title: task.title, status: task.status, priority: task.priority, source: task.source.relativePath, eligibility: await taskEligibility(workspace, task, {}, ledger) }))) };
            }
            process.stdout.write(`${redactSecrets(JSON.stringify(inspection, null, 2), redactionPath)}\n`); return 0;
        }
        if (parsed.command === 'answer') {
            const id = parsed.values.request as string | undefined || parsed.arguments[0];
            let response = parsed.values.response as string | undefined || parsed.arguments.slice(1).join(' ');
            if (!id) { process.stdout.write(`${JSON.stringify(await listRequests(workspace, true), null, 2)}\n`); return 0; }
            if (!response && process.stdin.isTTY && !options.noQuestions) {
                response = await promptText('Response', { signal: controller.signal });
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
            await startService(workspace, restartOptions({ ...parsed, values: explicitValues }, options, record.settings)); return 0;
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
        readOnly = false;
        phase = 'execution preflight';
        if (parsed.command === 'start') {
            const readiness = await inspectProjectReadiness(workspace);
            if (!readiness.ready) {
                if (!interactive) throw new InputError(`Project setup is incomplete: ${readiness.missing.join(', ')}. Run ptbk init --path ${JSON.stringify(workspace.projectPath)} with explicit installation/harness decisions, then retry start.`);
                if (await wizardChoice(`Complete missing setup in ${workspace.projectPath}?\n${readiness.missing.join(', ')}`, ['yes', 'no'], 'yes', controller.signal) !== 'yes') throw new InputError('Start requires completed project setup.');
                const result = await main(['init', '--path', workspace.projectPath,
                    ...(explicitValues.harness ? ['--harness', String(explicitValues.harness)] : []),
                    ...(explicitValues.harnesses !== undefined ? ['--harnesses', String(explicitValues.harnesses)] : []),
                ]);
                if (result !== 0) return result;
                const refreshed = await readProjectConfiguration(workspace.projectPath);
                configuration.enabledHarnesses = refreshed.enabledHarnesses; configuration.autoUpdateHarnesses = refreshed.autoUpdateHarnesses;
                parsed.values = { ...refreshed.values, ...explicitValues };
                Object.assign(options, runOptions(parsed));
                const checked = await inspectProjectReadiness(workspace);
                if (!checked.ready) throw new InputError(`Project setup remains incomplete: ${checked.missing.join(', ')}.`);
            }
            const executionReadiness = await inspectProjectReadiness(workspace);
            const prerequisites = executionReadiness.execution.filter(message => !(options.check && /check/i.test(message)));
            if (prerequisites.length) throw new InputError(`Execution prerequisites remain unresolved: ${prerequisites.join(' ')} Complete the indicated setup before starting.`);
            await validateCheck(workspace, options.check ?? 'npm run check');
            if (interactive) {
                const selected = serviceOptions(parsed, options, configuration).enabledHarnesses ?? (options.harness ? [options.harness] : []);
                const inventory = await inspectHarnesses(workspace.projectPath, { names: selected, harnessSettings: configuration.harnessSettings, signal: controller.signal });
                if (!inventory.some(item => item.usable && (!options.harness || item.name === options.harness))) {
                    const names = selected.length ? selected : await chooseHarnesses(controller.signal);
                    if (!names.length) throw new InputError('Start requires at least one enabled authenticated harness; setup was deferred.');
                    const initialized = await main(['init', '--path', workspace.projectPath, '--harnesses', names.join(',')]);
                    if (initialized !== 0) return initialized;
                    parsed.values.harnesses = names.join(',');
                    if (options.harness && !names.includes(options.harness)) throw new InputError(`The selected harnesses exclude routing preference ${options.harness}. Select a compatible --harness or edit ptbk.json before starting.`);
                }
            }
        }
        if (['init', 'initialize'].includes(parsed.command)) await requireGit(workspace, true);
        else await requireGit(workspace);
        if (['init', 'initialize'].includes(parsed.command)) {
            const agenda = intent?.trim() || undefined;
            const selectedHarnesses = initialHarnesses ?? configuration.enabledHarnesses ?? (options.harness ? [options.harness] : []);
            let changedCount = 0;
            let unresolved: string[] = [];
            phase = 'project setup and installation';
            await author(workspace, options, !options.noCommit, async () => {
                const browser = { mode: parsed.values['browser-mode'] ?? 'headless', ...(parsed.values['browser-profile'] ? { profile: parsed.values['browser-profile'] } : {}) };
                const paths = await ensureProjectConfiguration(workspace, { harnesses: selectedHarnesses, browser, updates: { harnesses: true } });
                paths.push(...await initializeProject(workspace));
                if (!parsed.values['no-install']) {
                    const installation = await installProjectEngine(workspace, { choice: installationChoice, version: await installedEngineVersion(), signal: controller.signal });
                    paths.push(...installation.changed); unresolved.push(...installation.unresolved);
                } else unresolved.push('Installation deferred by --no-install.');
                changedCount = new Set(paths).size;
                return [...new Set(paths)];
            }, pending => persistInitializationPending(workspace, pending));
            if (prepared) {
                const parentChanges = [...new Set([...prepared.parentChanges, ...await finalizeInitializationDestination(prepared, { signal: controller.signal })])];
                if (parentChanges.length) process.stdout.write(`Parent metadata left uncommitted:\n${parentChanges.join('\n')}\n`);
            }
            phase = 'selected harness setup';
            const inventory = parsed.values['no-install'] ? await inspectHarnesses(workspace.projectPath, { names: selectedHarnesses, harnessSettings: configuration.harnessSettings, signal: controller.signal }) : await setupHarnesses(workspace.projectPath, {
                names: selectedHarnesses, install: true, login: interactive, interactive, signal: controller.signal,
                harnessSettings: configuration.harnessSettings,
                chooseUpdates: interactive ? async outdated => {
                    const choice = await wizardChoice(`Outdated selected global harnesses: ${outdated.map(item => item.name).join(', ')}`, outdated.length === 1 ? ['keep', 'all'] : ['keep', 'all', 'choose'], 'keep', controller.signal);
                    if (choice !== 'choose') return choice as 'keep' | 'all';
                    return harnessNames(await promptText(`Update which outdated harnesses? ${outdated.map(item => item.name).join(', ')}`, { signal: controller.signal }));
                } : undefined,
                onOutput: text => process.stdout.write(redactSecrets(text, redactionPath)),
            });
            for (const item of inventory) if (!item.usable) unresolved.push(`${item.name}: ${item.diagnostic}`);
            if (!selectedHarnesses.length) unresolved.push('No harnesses enabled; select one with --harnesses NAME before starting work.');
            const readiness = await inspectProjectReadiness(workspace);
            unresolved.push(...readiness.execution.filter(message => !(options.check && /check/i.test(message))));
            const temporarySelection = configuration.exists && JSON.stringify(selectedHarnesses) !== JSON.stringify(configuration.enabledHarnesses ?? []) ? ` --harnesses ${JSON.stringify(selectedHarnesses.join(','))}` : '';
            process.stdout.write(`Setup: ${changedCount ? `${changedCount} artifact(s) changed` : 'already ready; no files changed'}.\n${unresolved.length ? `Deferred prerequisites:\n${unresolved.map(message => `  ${message}`).join('\n')}\n` : ''}${temporarySelection ? 'Saved harness defaults preserved; pass the temporary selection to start.\n' : ''}Next: ptbk start --path ${JSON.stringify(workspace.projectPath)}${temporarySelection}\n`);
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
                phase = 'agenda startup';
                await startService(workspace, { ...serviceOptions(parsed, options, configuration), enabledHarnesses: selectedHarnesses, harness: options.harness, mode: 'daemon' });
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
            if (parsed.command === 'start') { phase = 'supervisor startup'; await startService(workspace, serviceOptions(parsed, options, configuration)); return 0; }
            options.context = await readContext(workspace, options.context);
            if (options.agent) options.agent = (await resolveAgentSelection(workspace, options.agent)).path;
            if (parsed.command === 'plan') await planConversation(workspace, { ...options, prompt: parsed.values.prompt as string | undefined, commit: !!parsed.values.commit });
            else if (parsed.command === 'server') {
                if (options.limit !== undefined) throw new InputError('server is persistent; use ptbk run --limit for a finite run.');
                await startCoderServer(workspace, { ...options, port: integer(parsed.values.port, '--port') });
            } else if (parsed.command === 'ping') {
                if (!options.harness) throw new InputError('ping requires --harness or PTBK_HARNESS.');
                do {
                    const result = await runHarness({ harness: options.harness, harnessConfiguration: options.harnessConfiguration, projectPath: workspace.projectPath, prompt: 'Reply with pong. Do not modify files or run tools.', model: options.model, thinkingLevel: options.thinkingLevel, signal: controller.signal, allowCredits: options.allowCredits, onOutput: text => process.stdout.write(redactSecrets(text, redactionPath)) });
                    if (result.outcome !== 'success') return 1;
                    if (!parsed.values.period) break;
                    await delay(parseDuration(parsed.values.period), undefined, { signal: controller.signal });
                } while (!controller.signal.aborted);
            } else {
                phase = 'task execution';
                const runtime = await createFiniteRuntime(workspace, { ...options, onEvent: undefined,
                    interactive,
                    noServer: parsed.command === 'run' ? !!parsed.values['no-server'] : true,
                    port: integer(parsed.values.port, '--port'),
                    browserMode: parsed.values['browser-mode'] as 'headless' | 'headful' | undefined,
                    browserProfile: parsed.values['browser-profile'] as string | undefined,
                }, abort);
                try {
                    const result = parsed.command === 'fix' ? await fixChecks(workspace, runtime.options) : await runQueue(workspace, runtime.options);
                    await runtime.complete(result);
                    await runtime.close();
                    process.stdout.write(`${result.completed} completed, ${result.failed} failed${result.syncPending ? ', synchronization pending' : ''}.\n`);
                    return result.exitCode;
                } finally { await runtime.close(); }
            }
        }
        return interrupted ? 130 : 0;
    } catch (error) {
        if (interrupted || (error as Error).name === 'AbortError') return 130;
        await reportDiagnostic(error, { command, phase, projectPath: redactionPath, workspace: diagnosticWorkspace, readOnly });
        return (error as { exitCode?: number }).exitCode ?? (error instanceof InputError ? 2 : 1);
    } finally {
        process.removeListener('SIGINT', abort);
        process.removeListener('SIGTERM', abort);
    }
}
