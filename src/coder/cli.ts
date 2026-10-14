import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { resolveWorkspace, requireGit, readContext, InputError, resolveAgentSelection } from './workspace.js';
import { initializeProject, addTask, saveAuthoredTask, generateBoilerplates, verifyTasks } from './authoring.js';
import { addTaskWizard } from './add-wizard.js';
import { discoverTasks } from './sources.js';
import { migrateTasks } from './migrate.js';
import { runQueue, fixChecks, recoverTask, taskEligibility, type RunOptions } from './engine.js';
import { acquireLease, readLedger, atomicWrite, type WorkspaceLease } from './state.js';
import { captureSnapshot, commitScoped, changedPaths, protectUnrelatedChanges, uncommittedOwnership } from './git.js';
import { runHarness, HARNESS_REGISTRY, redactSecrets, getHarness, loadProjectSecrets } from './harness.js';
import { planConversation } from './planner.js';
import { startCoderServer } from './server.js';
import { createFiniteRuntime } from './finite.js';
import type { Workspace } from './domain.js';
import { startService, stopService, serviceCommand, readServiceRecord, taskServiceEligibility, type ServiceOptions } from './service.js';
import { listRequests, answerRequest } from './requests.js';
import { setupHarnesses, inspectHarnesses, inspectHarnessExecution } from './setup.js';
import { updateTaskControls } from './sources.js';
import { readProjectConfiguration, ensureProjectConfiguration, type ProjectConfiguration } from './configuration.js';
import { installedEngineVersion } from './version.js';
import { promptText } from './interactive.js';
import { inspectProjectCheck, prepareProjectCheck, saveProjectCheck, type CheckSetupUI } from './check-setup.js';
import { promptChoice, promptChoices, type Choice } from './choices.js';
import { inspectEngineInstallation, checkEngineUpdate, updateEngineInstallation } from './updates.js';
import { inspectInitializationDestination, prepareInitializationDestination, finalizeInitializationDestination, installProjectEngine, inspectLocalInstallation, inspectProjectReadiness, persistInitializationPending, type PreparedInitializationDestination } from './initialization.js';
import { reportDiagnostic } from './diagnostics.js';
import { validateCheck } from './checks.js';
import { resolveHelpRequest, renderHelp, helpHint } from './help.js';
import { attachDashboard } from './attached-dashboard.js';
import { presentationFor, renderPanel, renderDocument, type TerminalPresentation } from './presentation.js';
import { runtimeSummary, pairingUrl, terminalServiceQr, dashboardUrl, agentLabel } from './status-view.js';
import { identifyRuntime } from './agent-identity.js';
import { discoverAgents } from './agents.js';
import { ensureFirstTask } from './first-task.js';
import { validateTunnelOptions, prepareTunnelClient } from './tunnel.js';

/** Shared QR rendering remains available to existing internal consumers. @private */
export { terminalServiceQr } from './status-view.js';

/** Boolean CLI options whose presence is significant. */
const BOOLEAN_OPTIONS = new Set(['help', 'version', 'dry-run', 'no-commit', 'commit', 'no-auto', 'no-questions', 'auto-pull', 'auto-push', 'isolate', 'no-normalize-line-endings', 'no-ui', 'preserve-logs', 'allow-credits', 'auto-migrate', 'allow-destructive-auto-migrate', 'json', 'daemon', 'foreground', 'raw', 'interactive', 'non-interactive', 'no-persist', 'no-server', 'no-qr', 'tunnel', 'no-tunnel', 'no-install', 'self-update', 'no-self-update', 'auto-update-harnesses', 'no-auto-update-harnesses']);
/** Value options accepted by the CLI parser. */
const VALUE_OPTIONS = new Set(['path', 'tasks', 'harness', 'model', 'thinking-level', 'agent', 'context', 'min-priority', 'max-priority', 'priority', 'limit', 'git-changes', 'check', 'check-before', 'wait-between-prompts', 'wait-after-prompt', 'wait-after-error', 'template', 'count', 'ignore', 'period', 'port', 'action', 'occurrence', 'browser-mode', 'browser-profile', 'agenda', 'intent', 'prompt', 'response', 'request', 'installation', 'new-project', 'nested-strategy', 'submodule-source', 'harnesses', 'tunnel-provider']);
/** Commands supported by the installed executable. */
const COMMANDS = ['init', 'initialize', 'about', 'access', 'start', 'stop', 'restart', 'status', 'show', 'dashboard', 'answer', 'add', 'generate-boilerplates', 'plan', 'list', 'run', 'fix', 'verify', 'server', 'migrate', 'recover', 'find-unwritten', 'find-refactor-candidates', 'find-fresh-emoji-tags', 'ping'];
/** Shared option groups avoid quietly ignoring command-specific flags. */
const ROUTING_OPTIONS = ['harness', 'model', 'thinking-level', 'agent', 'context'];
/** Execution switches have meaning only for commands using the shared engine. */
const EXECUTION_OPTIONS = [...ROUTING_OPTIONS, 'min-priority', 'max-priority', 'priority', 'limit', 'git-changes', 'check', 'check-before', 'commit', 'no-commit', 'no-auto', 'no-questions', 'auto-pull', 'auto-push', 'isolate', 'no-normalize-line-endings', 'preserve-logs', 'allow-credits', 'wait-between-prompts', 'wait-after-prompt', 'wait-after-error', 'auto-migrate', 'allow-destructive-auto-migrate', 'dry-run'];
/** HTTP launch options do not affect attached clients. */
const TUNNEL_OPTIONS = ['tunnel', 'no-tunnel', 'tunnel-provider'];
/** Exact option sets for authoring, diagnostics and read-only commands. */
const COMMAND_OPTIONS: Record<string, string[]> = {
    init: [...TUNNEL_OPTIONS, ...ROUTING_OPTIONS, 'commit', 'no-commit', 'no-questions', 'auto-push', 'agenda', 'intent', 'no-install', 'allow-credits', 'check', 'installation', 'new-project', 'nested-strategy', 'submodule-source', 'harnesses', 'browser-mode', 'browser-profile', 'self-update', 'no-self-update'],
    initialize: [...TUNNEL_OPTIONS, ...ROUTING_OPTIONS, 'commit', 'no-commit', 'no-questions', 'auto-push', 'agenda', 'intent', 'no-install', 'allow-credits', 'check', 'installation', 'new-project', 'nested-strategy', 'submodule-source', 'harnesses', 'browser-mode', 'browser-profile', 'self-update', 'no-self-update'],
    start: [...TUNNEL_OPTIONS, ...EXECUTION_OPTIONS, 'daemon', 'foreground', 'no-persist', 'no-server', 'port', 'no-qr', 'browser-mode', 'browser-profile', 'auto-update-harnesses', 'no-auto-update-harnesses', 'harnesses'],
    restart: [...TUNNEL_OPTIONS, ...EXECUTION_OPTIONS, 'daemon', 'raw', 'no-persist', 'no-server', 'port', 'no-qr', 'browser-mode', 'browser-profile', 'auto-update-harnesses', 'no-auto-update-harnesses', 'harnesses'],
    about: [], access: ['action', 'request', 'json'],
    stop: [], status: ['json', 'no-qr'], show: ['json', 'no-qr'], dashboard: ['no-qr'], answer: ['request', 'response', 'action', 'json', 'no-questions'],
    add: ['commit', 'no-commit', 'no-questions', 'auto-push', 'priority', 'template'],
    'generate-boilerplates': ['commit', 'no-commit', 'no-questions', 'auto-push', 'count'],
    plan: [...ROUTING_OPTIONS, 'commit', 'no-commit', 'no-questions', 'allow-credits', 'prompt'],
    list: [...ROUTING_OPTIONS, 'min-priority', 'max-priority', 'priority', 'json'],
    run: [...TUNNEL_OPTIONS, ...EXECUTION_OPTIONS, 'json', 'no-server', 'no-qr', 'port', 'browser-mode', 'browser-profile'], fix: EXECUTION_OPTIONS.filter(name => !['limit', 'min-priority', 'max-priority', 'priority'].includes(name)),
    server: [...TUNNEL_OPTIONS, ...EXECUTION_OPTIONS, 'port'],
    verify: ['commit', 'no-commit', 'no-questions', 'ignore'],
    migrate: ['commit', 'no-commit', 'dry-run', 'json', 'no-questions'],
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
    if (command === 'help' && !values.version) {
        const inherited = new Set(['path', 'tasks', 'help', 'version', 'raw', 'no-ui', 'interactive', 'non-interactive']);
        for (const name of Object.keys(values)) if (!inherited.has(name)) throw new InputError(`--${name} requires a command. Use ptbk --help.`);
    }
    if (command !== 'help' && !values.help && !values.version) {
        const allowed = new Set(['path', 'tasks', 'help', 'version', 'raw', 'no-ui', 'interactive', 'non-interactive', ...COMMAND_OPTIONS[command]!]);
        for (const name of Object.keys(values)) if (!allowed.has(name)) throw new InputError(`--${name} is unsupported for ${command}. Use ptbk --help.`);
        if (values.json && command === 'run' && !values['dry-run']) throw new InputError('--json on run requires --dry-run.');
        if (values['dry-run'] && command === 'server') throw new InputError('server does not support --dry-run; use ptbk run --dry-run.');
        if (values['dry-run'] && ['start', 'restart'].includes(command)) throw new InputError(`${command} does not support --dry-run; use ptbk run --dry-run to preview work.`);
    }
    if (values.interactive && (values['non-interactive'] || values['no-ui'] || values.raw || values['no-questions'])) throw new InputError('--interactive conflicts with noninteractive/raw/no-UI/no-questions operation.');
    if (values.interactive && (!process.stdin.isTTY || !presentationFor(process.stdout).pretty)) throw new InputError('--interactive requires an interactive terminal; use --non-interactive or --raw.');
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
    const noCommit = values['no-commit'] !== undefined ? !!values['no-commit'] : values.commit !== undefined ? !values.commit : false;
    const filtering = ['list', 'run', 'start', 'restart', 'recover', 'server'].includes(parsed.command);
    const minPriority = filtering ? integer(values['min-priority'], '--min-priority') : undefined;
    const priority = filtering ? integer(values.priority, '--priority') : undefined;
    const maxPriority = filtering ? integer(values['max-priority'], '--max-priority') : undefined;
    if (minPriority !== undefined && priority !== undefined && minPriority !== priority) throw new InputError('--priority conflicts with --min-priority.');
    if ((minPriority ?? priority ?? 0) > (maxPriority ?? Infinity)) throw new InputError('Minimum priority exceeds maximum priority.');
    const gitChanges = String(values['git-changes'] || 'fail');
    if (!['fail', 'ignore', 'continue'].includes(gitChanges)) throw new InputError('--git-changes must be fail, ignore or continue.');
    const checkBefore = String(values['check-before'] || 'no');
    if (!['no', 'yes-and-fail', 'yes-and-fix'].includes(checkBefore)) throw new InputError('--check-before must be no, yes-and-fail or yes-and-fix.');
    if (values['no-auto'] && values['no-questions']) throw new InputError('--no-auto cannot be combined with --no-questions.');
    if (!values['dry-run'] && values['auto-pull'] && noCommit) throw new InputError('--auto-pull requires automatic commits.');
    if (values.isolate && (noCommit || gitChanges === 'continue')) throw new InputError('--isolate requires commits and cannot use --git-changes continue.');
    if (gitChanges === 'continue' && checkBefore === 'yes-and-fix') throw new InputError('--git-changes continue cannot use --check-before yes-and-fix.');
    if (values['allow-destructive-auto-migrate'] && !values['auto-migrate']) throw new InputError('--allow-destructive-auto-migrate requires --auto-migrate.');
    if (values['auto-migrate']) throw new InputError('Test-server auto-migration requires a project adapter; no test-server adapter is configured. Use ptbk migrate for Markdown tasks.');
    if (values.tunnel !== undefined && values['no-tunnel'] !== undefined && values.tunnel === values['no-tunnel']) throw new InputError('--tunnel conflicts with --no-tunnel.');
    if (values.tunnel && values['no-server']) throw new InputError('--tunnel conflicts with --no-server.');
    if (values.commit !== undefined && values['no-commit'] !== undefined && values.commit === values['no-commit']) throw new InputError('--commit conflicts with --no-commit.');
    if (values['auto-push'] && noCommit) throw new InputError('--auto-push requires automatic commits.');
    const thinkingLevel = String(values['thinking-level'] ?? '') || undefined;
    if (thinkingLevel && !['low', 'medium', 'high', 'xhigh', 'max'].includes(thinkingLevel)) throw new InputError('--thinking-level must be low, medium, high, xhigh or max.');
    if (values['browser-mode'] && !['headless', 'headful'].includes(String(values['browser-mode']))) throw new InputError('--browser-mode must be headless or headful.');
    if (values['no-server'] && values.port !== undefined) throw new InputError('--port conflicts with --no-server.');
    if (values.action && !['answer', 'access'].includes(parsed.command) && !['resume', 'retry', 'acknowledge'].includes(String(values.action))) throw new InputError('--action must be resume, retry or acknowledge.');
    if (['start', 'restart'].includes(parsed.command)) {
        if (values.limit !== undefined || values['no-auto']) throw new InputError('start requires indefinite automatic operation; use run for finite or manual work.');
        if (values.daemon && values.foreground) throw new InputError('--daemon conflicts with --foreground. Presentation flags do not change process placement.');
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
    return { harness: harnessName, model: values.model as string | undefined || undefined, thinkingLevel, agent: values.agent as string | undefined || undefined, context: values.context as string | undefined, check: values.check as string | undefined, checkBefore: checkBefore as RunOptions['checkBefore'], gitChanges: gitChanges as RunOptions['gitChanges'], noCommit, noAuto: !!values['no-auto'], noQuestions: !!values['no-questions'] || !!values['non-interactive'] || !!values['no-ui'] || !!values.raw, autoPull: !!values['auto-pull'], autoPush: !!values['auto-push'], isolate: !!values.isolate, normalizeLineEndings: !values['no-normalize-line-endings'], limit: integer(values.limit, '--limit'), minPriority: minPriority ?? priority, maxPriority, allowCredits: !!values['allow-credits'], preserveLogs: !!values['preserve-logs'], waitBetweenPrompts: parseDuration(values['wait-between-prompts']), waitAfterPrompt: parseDuration(values['wait-after-prompt']), waitAfterError: parseDuration(values['wait-after-error'], 600000), dryRun: !!values['dry-run'] };
}

/** Derive explicit supervisor settings without turning start into a fixed finite Developer run. */
function serviceOptions(parsed: Parsed, options: RunOptions, configuration?: ProjectConfiguration): ServiceOptions {
    const savedMode = parsed.values['process-mode'];
    const foreground = !parsed.values.daemon && (parsed.values.foreground !== undefined ? parsed.values.foreground : savedMode && savedMode !== 'daemon');
    const rich = presentationFor(process.stdout, !!parsed.values.raw || !!parsed.values['no-ui']).pretty;
    const mode = foreground ? rich && process.stdin.isTTY && parsed.values.interactive !== false && !options.noQuestions && savedMode !== 'raw' ? 'interactive' : 'raw' : 'daemon';
    return { ...options, mode, quiet: true,
        noTunnel: !!parsed.values['no-server'] || (parsed.values['no-tunnel'] !== undefined ? !!parsed.values['no-tunnel'] : parsed.values.tunnel !== undefined ? !parsed.values.tunnel : false), tunnelProvider: parsed.values['tunnel-provider'] as ServiceOptions['tunnelProvider'],
        tunnelClient: parsed.values['tunnel-client'] as string | undefined, tunnelHostname: parsed.values['tunnel-hostname'] as string | undefined, tunnelId: parsed.values['tunnel-id'] as string | undefined, tunnelCredentialsFile: parsed.values['tunnel-credentials-file'] as string | undefined,
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

/** Human-readable setup labels retain the stable values used by flags and configuration. */
const WIZARD_CHOICES: Record<string, { label: string; description?: string }> = {
    current: { label: 'Current directory' },
    new: { label: 'New subfolder' },
    local: { label: 'Install in this project', description: 'Use a local Promptbook dependency.' },
    global: { label: 'Use the global installation' },
    headless: { label: 'Keep the browser hidden', description: 'Headless browser mode.' },
    headful: { label: 'Show the browser', description: 'Visible browser mode.' },
    isolated: { label: 'Use an isolated browser profile' },
    existing: { label: 'Use an existing browser profile' },
    yes: { label: 'Yes' },
    no: { label: 'No' },
    retry: { label: 'Retry the update' },
    continue: { label: 'Continue with the loaded version' },
    back: { label: 'Back' },
    ignored: { label: 'Independent project', description: 'Ignore the child directory in the parent repository.' },
    submodule: { label: 'Git submodule', description: 'Record the child repository in the parent.' },
    keep: { label: 'Keep current versions' },
    all: { label: 'Update all listed harnesses' },
    choose: { label: 'Choose individual harnesses' },
};

/** Pick a bounded setup choice with arrows and Enter, retaining a visible default. */
async function wizardChoice(label: string, choices: string[], initial: string, signal: AbortSignal): Promise<string> {
    return promptChoice(label, choices.map(value => ({ value, ...(WIZARD_CHOICES[value] ?? { label: value }) })), {
        initial, signal, heading: `Promptbook ${await installedEngineVersion()} · Project setup`,
    });
}

/** Share the finite project validation picker and exact-command confirmation between init and start. */
function checkSetupUi(signal: AbortSignal): CheckSetupUI {
    return {
        choose: (label, choices, initial) => promptChoice('Choose project validation', choices, { initial, signal, heading: 'Project validation setup', preview: label }),
        text: (label, initial) => promptText(label, { initial, signal, heading: 'Project validation command', validate: value => value.trim() ? undefined : 'Supply a command that validates this project.' }),
        confirm: async label => await promptChoice('Save this project validation command?', [{ value: 'yes', label: 'Save validation' }, { value: 'no', label: 'Keep setup incomplete' }], { initial: 'yes', signal, heading: 'Project validation setup', preview: label.split('\n').slice(1).join('\n') }) === 'yes',
    };
}

/** Give an actionable setup path without guessing or disabling the project's validation. */
function checkSetupAction(workspace: Workspace): string {
    return `Run ptbk init --path ${JSON.stringify(workspace.projectPath)} --check "<project validation command>", or set execution.check in ptbk.json.`;
}

/** Keep the harness picker bounded, with every integration reachable through More. */
async function chooseHarnesses(signal: AbortSignal): Promise<string[]> {
    let includeMore = false;
    /** Retain checked integrations when returning to the featured catalog. */
    const choices = (selected: readonly string[] = []): Choice[] => [
        ...HARNESS_REGISTRY.filter(entry => includeMore || entry.featured || selected.includes(entry.name))
            .map(entry => ({ value: entry.name, label: entry.displayName })),
        { value: '@more', label: includeMore ? 'Featured harnesses' : 'More harnesses…', action: true },
    ];
    return promptChoices('Select harnesses (leave all unchecked to defer setup)', choices(), {
        signal, heading: `Promptbook ${await installedEngineVersion()} · Project setup`,
        onAction: (_value, selected) => { includeMore = !includeMore; return choices(selected); },
    });
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
        daemon: 'mode', foreground: 'mode', 'no-persist': 'noPersist', 'no-server': 'noServer',
        'no-commit': 'noCommit', commit: 'noCommit', tunnel: 'noTunnel', 'no-tunnel': 'noTunnel', 'tunnel-provider': 'tunnelProvider',
        'no-qr': 'noQr', port: 'port', 'browser-mode': 'browserMode', 'browser-profile': 'browserProfile',
        harnesses: 'enabledHarnesses', 'auto-update-harnesses': 'autoUpdateHarnesses', 'no-auto-update-harnesses': 'autoUpdateHarnesses',
    };
    for (const name of Object.keys(parsed.values)) {
        const key = names[name];
        if (key) Object.assign(next, { [key]: supplied[key] });
    }
    if (parsed.values.harness !== undefined && parsed.values.harnesses === undefined) next.enabledHarnesses = [String(parsed.values.harness)];
    next.quiet = true;
    return next;
}

/** Render the daemon outcome once, with QR limited to pretty terminal output. */
async function launchedService(state: Record<string, unknown>, options: ServiceOptions, presentation: TerminalPresentation, alreadyRunning = false): Promise<void> {
    if (options.mode !== 'daemon') {
        process.stdout.write(renderPanel(`Promptbook ${await installedEngineVersion()} · Foreground execution ended`, [['Project', String(state.project ?? process.cwd())], ['Status', 'stopped']], presentation));
        return;
    }
    if (presentation.pretty) Object.assign(state, await serviceCommand(await resolveWorkspace({ path: String(state.project) }, true), 'connection').catch(() => undefined));
    process.stdout.write(runtimeSummary(state, presentation, alreadyRunning ? 'Project already running' : 'ptbk started'));
    process.stdout.write(renderDocument('', [{ title: 'Service controls', lines: [`ptbk stop --path ${JSON.stringify(state.project)}`,
        state.persistent ? 'Startup persistence is enabled.' : 'Startup persistence is disabled.'] }], presentation));
    if (dashboardUrl(state) && !options.noQr) process.stdout.write(await terminalServiceQr(pairingUrl(state, presentation.pretty)!, presentation));
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
async function author(workspace: Workspace, options: RunOptions, commit: boolean, operation: (lease: WorkspaceLease) => Promise<string[]>, deferUserEdits?: (paths: string[]) => Promise<void>, quiet = false, summary = 'Update Promptbook tasks and configuration'): Promise<void> {
    await requireGit(workspace);
    const lease = await authoringLease(workspace, options.signal);
    try {
        const before = await captureSnapshot(workspace.gitRoot || workspace.projectPath);
        if (options.noCommit && options.ownedChanges) protectUnrelatedChanges(before, options.ownedChanges);
        const paths = await operation(lease);
        const relativePaths = paths.map(path => relative(before.root, path).split('\\').join('/'));
        const deferred = deferUserEdits ? relativePaths.filter(path => !commit || before.dirtyPaths.includes(path)) : [];
        const committable = relativePaths.filter(path => !deferred.includes(path));
        await deferUserEdits?.(deferred.map(path => resolve(before.root, path)));
        if (commit && committable.length) await commitScoped(before, summary, { paths: committable });
        if (!commit && paths.length) {
            const current = await captureSnapshot(before.root);
            const owned = (await changedPaths(before, current)).filter(path => relativePaths.includes(path) && !before.dirtyPaths.includes(path));
            options.ownedChanges = uncommittedOwnership(current, [...Object.keys(options.ownedChanges?.files ?? {}), ...owned]);
            await atomicWrite(join(workspace.statePath, 'uncommitted.json'), options.ownedChanges);
        }
        if (!commit && paths.length) process.stderr.write('Saved uncommitted changes (--no-commit). Review and commit these sources before a default ptbk start.\n');
        if (!quiet) for (const path of paths) process.stdout.write(`${path}\n`);
        if (options.autoPush && commit && committable.length) {
            const { execFile } = await import('node:child_process');
            const { promisify } = await import('node:util');
            await promisify(execFile)('git', ['-C', workspace.gitRoot || workspace.projectPath, 'push']);
        }
    } finally { await lease.release(); }
}
/** Wait for an active writer's safe boundary without adopting stale ownership or writing a draft early. */
async function authoringLease(workspace: Workspace, signal?: AbortSignal): Promise<WorkspaceLease> {
    const deadline = Date.now() + 300_000;
    let announced = false;
    for (;;) {
        try { return await acquireLease(workspace); }
        catch (error) {
            if (!/^Workspace is owned by PID .*Wait for the worker to finish\./.test((error as Error).message)) throw error;
            if (Date.now() >= deadline) throw new InputError('Authoring is still waiting for the active workspace writer after five minutes. No draft was written; pause the service and retry at its safe boundary.');
            if (!announced) { process.stderr.write('Waiting for the active workspace writer to reach a safe boundary before saving.\n'); announced = true; }
            await delay(250, undefined, { signal });
        }
    }
}

/** Scans useful authoring diagnostics without invoking the task engine. */
async function diagnostics(workspace: Workspace, command: string, presentation: TerminalPresentation): Promise<void> {
    if (command === 'find-fresh-emoji-tags') {
        const used = (await discoverTasks(workspace)).map(task => task.title).join('\n');
        const tags = ['🧩', '🛠️', '🌱', '📐', '🧭', '🔬', '🧵', '🦉', '🎛️', '🪴'].filter(tag => !used.includes(tag)).join(' ');
        process.stdout.write(presentation.pretty ? renderPanel(`Promptbook ${await installedEngineVersion()} · Available task tags`, [['Project', workspace.projectPath], ['Tags', tags || 'No unused tags from this set.']], presentation) : `${tags}\n`);
        return;
    }
    const findings: string[] = [];
    const visit = async (directory: string): Promise<void> => {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
            if (entry.name.startsWith('.') || ['node_modules', 'dist', 'coverage', 'done', 'traces'].includes(entry.name) || entry.isSymbolicLink()) continue;
            const path = join(directory, entry.name);
            if (entry.isDirectory()) await visit(path);
            else if (/\.(?:tsx?|jsx?|mjs|md|book)$/.test(entry.name)) {
                if ((await stat(path)).size > 2 * 1024 * 1024) continue;
                const content = await readFile(path, 'utf8');
                if (command === 'find-unwritten') {
                    content.split(/\r?\n/).forEach((line, index) => { if (/@@@|\bTODO\b|\bFIXME\b/.test(line)) { const finding = `${path}:${index + 1}: ${line.slice(0, 200)}`; if (presentation.pretty) findings.push(finding); else process.stdout.write(`${finding}\n`); } });
                } else if (content.split('\n').length >= 400) { const finding = `${path}: ${content.split('\n').length} lines`; if (presentation.pretty) findings.push(finding); else process.stdout.write(`${finding}\n`); }
            }
        }
    };
    await visit(workspace.projectPath);
    if (presentation.pretty) process.stdout.write(renderPanel(`Promptbook ${await installedEngineVersion()} · ${command}`, [['Project', workspace.projectPath], ['Findings', String(findings.length)]], presentation, { details: findings.length ? findings : ['No matching findings.'] }));
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
        const helpRequest = resolveHelpRequest(arguments_);
        if (helpRequest) {
            const pathOption = arguments_.findIndex(value => value === '--path');
            const pathValue = arguments_.find(value => value.startsWith('--path='))?.slice(7) ?? (pathOption >= 0 ? arguments_[pathOption + 1] : undefined);
            const help = renderHelp(helpRequest, { ...presentationFor(process.stdout, helpRequest.raw), version: await installedEngineVersion(), projectPath: resolve(pathValue && !pathValue.startsWith('-') ? pathValue : process.cwd()) });
            (help.exitCode ? process.stderr : process.stdout).write(help.text);
            return help.exitCode;
        }
        if (COMMANDS.includes(arguments_[0] ?? '')) command = arguments_[0]!;
        const parsed = parseArguments(arguments_);
        command = parsed.command;
        const presentation = presentationFor(process.stdout, !!parsed.values.raw || !!parsed.values['no-ui'] || !!parsed.values.json);
        if (parsed.values.version) {
            process.stdout.write(`${await installedEngineVersion()}\n`); return 0;
        }
        if (parsed.command === 'help') {
            const help = renderHelp({ path: [], raw: !!parsed.values.raw || !!parsed.values['no-ui'] }, { ...presentation, version: await installedEngineVersion(), projectPath: resolve(String(parsed.values.path ?? process.cwd())) });
            process.stdout.write(help.text); return help.exitCode;
        }
        if (parsed.command === 'about') {
            process.stdout.write(renderPanel(`Promptbook ${await installedEngineVersion()}`, [['Purpose', 'Agents, projects and tasks in readable files.'], ['Work', 'Checked execution with safe Git persistence.'], ['Defaults', 'ptbk.json'], ['Local state', '.ptbk/ recovery and browser data']], presentation, { next: ['ptbk init', 'ptbk start', 'ptbk dashboard', 'ptbk help'] })); return 0;
        }
        if (!['add', 'recover', 'answer', 'access'].includes(parsed.command) && parsed.arguments.length) throw new InputError(`Unexpected arguments for ${parsed.command}: ${parsed.arguments.join(' ')}`);
        runOptions(parsed);
        const explicitValues = { ...parsed.values };
        let interactive = !!process.stdin.isTTY && presentation.pretty && parsed.values.interactive !== false && !parsed.values['non-interactive'] && !parsed.values['no-questions'];
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
            if (explicitValues.check !== undefined) {
                phase = 'project validation setup';
                try { await validateCheck({ projectPath: destination } as Workspace, String(explicitValues.check)); }
                catch (error) { throw new InputError((error as Error).message); }
                phase = 'destination selection';
            }
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
        if (parsed.command === 'start') {
            const existingWorkspace = await resolveWorkspace({ path: destination }, true);
            const existing = await serviceCommand(existingWorkspace);
            if (existing) { await launchedService(existing, { mode: 'daemon', quiet: true, noQr: !!parsed.values['no-qr'] }, presentation, true); return 0; }
        }
        const configuration: ProjectConfiguration = ['stop', 'restart', 'status', 'show', 'answer', 'dashboard', 'access'].includes(parsed.command)
            ? { path: join(destination, 'ptbk.json'), exists: false, values: {}, sources: {}, document: {} }
            : await readProjectConfiguration(destination);
        parsed.values = { ...configuration.values, ...parsed.values };
        if (explicitValues.tunnel !== undefined && explicitValues['no-tunnel'] === undefined) parsed.values['no-tunnel'] = !explicitValues.tunnel;
        if (explicitValues.commit !== undefined && explicitValues['no-commit'] === undefined) parsed.values['no-commit'] = !explicitValues.commit;
        if (explicitValues.interactive === true && explicitValues['no-questions'] === undefined) parsed.values['no-questions'] = false;
        if (explicitValues['no-server'] === true && explicitValues.port === undefined) delete parsed.values.port;
        if (explicitValues.harness !== undefined && explicitValues.harnesses === undefined) parsed.values.harnesses = String(explicitValues.harness);
        if (explicitValues.tasks !== undefined) parsed.values.tasks = resolve(process.cwd(), String(explicitValues.tasks));
        if (explicitValues.context !== undefined && explicitValues.context !== '') parsed.values.context = resolve(process.cwd(), String(explicitValues.context));
        if (explicitValues.agent !== undefined && /[\\/]|\.book$/.test(String(explicitValues.agent))) parsed.values.agent = resolve(process.cwd(), String(explicitValues.agent));
        if (parsed.values['browser-profile']) parsed.values['browser-profile'] = resolve(process.cwd(), String(parsed.values['browser-profile']));
        const options = runOptions(parsed);
        if (TUNNEL_OPTIONS.some(key => explicitValues[key] !== undefined) || ['start', 'run', 'init', 'initialize'].includes(parsed.command)) validateTunnelOptions(serviceOptions(parsed, options, configuration));
        if (explicitValues.check !== undefined && !String(explicitValues.check).trim()) throw new InputError('--check requires a nonempty project validation command.');
        interactive &&= !options.noQuestions;
        if (!interactive) options.noQuestions = true;
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
            return await promptChoice(message, [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], {
                initial: 'no', signal: controller.signal,
            }) === 'yes';
        };
        const workspace = await resolveWorkspace({ path: destination, tasks: parsed.values.tasks as string | undefined }, ['init', 'initialize', 'migrate', 'add', 'generate-boilerplates', 'plan', 'start'].includes(parsed.command));
        diagnosticWorkspace = workspace;
        if (configuration.values.timezone !== undefined) {
            try { new Intl.DateTimeFormat('en', { timeZone: String(configuration.values.timezone) }).format(); workspace.timezone = String(configuration.values.timezone); }
            catch { throw new InputError(`${configuration.path}.timezone: invalid IANA timezone.`); }
        }
        redactionPath = workspace.projectPath;
        await loadProjectSecrets(workspace.projectPath);
        if (parsed.command === 'access') {
            const actions: Record<string, string> = { renew: 'pair-renew', devices: 'access-devices', revoke: 'access-revoke', token: 'api-token' };
            const choice = String(parsed.values.action ?? parsed.arguments[0] ?? 'devices');
            if (!actions[choice]) throw new InputError('access accepts renew, devices, revoke or token.');
            const result = await serviceCommand(workspace, actions[choice], { id: parsed.values.request ?? parsed.arguments[1] });
            if (!result) throw new InputError('No running project service; start it before managing dashboard access.');
            process.stdout.write(`${JSON.stringify(result, null, 2)}\n`); return 0;
        }
        if (parsed.command === 'dashboard') {
            phase = 'dashboard connection';
            await attachDashboard(workspace, { raw: !presentation.pretty, ...serviceOptions(parsed, options, configuration), interactive, noQr: !!parsed.values['no-qr'], signal: controller.signal });
            return interrupted ? 130 : 0;
        }
        if (['status', 'show'].includes(parsed.command)) {
            const state = await serviceCommand(workspace);
            const record = await readServiceRecord(workspace);
            let inspection = state;
            if (!inspection) {
                const ledger = await readLedger(workspace);
                const tasks = await discoverTasks(workspace);
                inspection = { project: workspace.projectPath, engineVersion: record?.engineVersion ?? (record ? 'unknown (older process record)' : await installedEngineVersion()), status: record?.desired === 'running' ? 'unreachable; inspect preserved process/recovery records' : 'stopped', installation: record?.installation, settings: record?.settings, requests: await listRequests(workspace, true),
                    tasks: await Promise.all(tasks.map(async task => ({ id: task.id, title: task.title, status: task.status, priority: task.priority, agent: task.agent, harness: task.harness, model: task.model, source: task.source.relativePath, eligibility: await taskEligibility(workspace, task, {}, ledger) }))) };
            }
            if (presentation.pretty && !parsed.values.json && state) Object.assign(inspection, await serviceCommand(workspace, 'connection').catch(() => undefined));
            inspection = identifyRuntime(inspection, await discoverAgents(workspace.projectPath));
            const sensitiveLink = inspection.pairingUrl;
            inspection = JSON.parse(redactSecrets(JSON.stringify(inspection), redactionPath));
            if (presentation.pretty && !parsed.values.json) inspection!.pairingUrl = sensitiveLink;
            process.stdout.write(parsed.values.json ? `${JSON.stringify(inspection, null, 2)}\n` : runtimeSummary(inspection!, presentation, parsed.command === 'show' ? 'Project inspection' : 'Project status'));
            if (!parsed.values.json && !parsed.values['no-qr'] && dashboardUrl(inspection!)) process.stdout.write(await terminalServiceQr(pairingUrl(inspection!, presentation.pretty)!, presentation));
            return 0;
        }
        if (parsed.command === 'answer') {
            const id = parsed.values.request as string | undefined || parsed.arguments[0];
            let response = parsed.values.response as string | undefined || parsed.arguments.slice(1).join(' ');
            if (!id) {
                const requests = await listRequests(workspace, true);
                process.stdout.write(presentation.pretty ? renderPanel(`Promptbook ${await installedEngineVersion()} · Pending requests`, [['Project', workspace.projectPath], ['Requests', `${requests.length} pending`]], presentation, { details: requests.map(request => `${request.id}: ${request.prompt}\nReason: ${request.reason}`), next: ['ptbk answer REQUEST_ID --response "your reply"'] }) : `${JSON.stringify(requests, null, 2)}\n`); return 0;
            }
            if (!response && interactive) {
                const request = (await listRequests(workspace)).find(item => item.id === id);
                if (!request) throw new InputError(`Unknown request ${id}.`);
                if (request.status !== 'pending') throw new InputError(`Request ${id} was already ${request.status}; no second answer was applied.`);
                const label = `${request.reason}\n${request.prompt}`;
                response = request.choices?.length
                    ? await promptChoice(label, request.choices.map(value => ({ value, label: value })), {
                        signal: controller.signal,
                        initial: request.kind === 'confirmation' && request.choices.includes('no') ? 'no' : undefined,
                    })
                    : await promptText(label, { signal: controller.signal, heading: 'Response' });
            }
            if (!response) throw new InputError('Supply --response or a reply argument; no invisible prompt was started.');
            const action = String(parsed.values.action || 'answered');
            if (!['answered', 'rejected', 'cancelled'].includes(action)) throw new InputError('answer --action must be answered, rejected or cancelled.');
            const answered = await answerRequest(workspace, id, response, action as 'answered');
            process.stdout.write(presentation.pretty ? renderPanel(`Promptbook ${await installedEngineVersion()} · Request resolved`, [['Request', answered.id], ['Status', answered.status], ['Response', answered.response ?? '']], presentation) : `${JSON.stringify(answered, null, 2)}\n`); return 0;
        }
        if (parsed.command === 'stop') {
            const prior = await readServiceRecord(workspace);
            const observed = await serviceCommand(workspace).catch(() => undefined);
            await stopService(workspace, true);
            const stopped = identifyRuntime({ ...observed, project: workspace.projectPath, engineVersion: prior?.engineVersion ?? await installedEngineVersion(), status: 'stopped', phase: undefined, currentTask: undefined, currentSelection: undefined, running: false, waiting: false, paused: false, url: undefined, idleReason: 'Stopped by user.', nextOpportunity: undefined, requests: await listRequests(workspace, true) }, await discoverAgents(workspace.projectPath).catch(() => []));
            process.stdout.write(runtimeSummary(stopped, presentation, 'ptbk stopped')); return 0;
        }
        if (parsed.command === 'restart') {
            const record = await readServiceRecord(workspace);
            if (!record) throw new InputError('No saved project process exists. Use ptbk start.');
            if (record.mode !== 'daemon') throw new InputError('Restart targets a daemon; this project was started in foreground mode.');
            const restartedOptions = restartOptions({ ...parsed, values: explicitValues }, options, record.settings);
            if (explicitValues.tunnel && restartedOptions.noServer) throw new InputError('--tunnel conflicts with the saved --no-server setting.');
            validateTunnelOptions(restartedOptions);
            await stopService(workspace, true);
            await requireGit(workspace);
            const state = await startService(workspace, restartedOptions);
            await launchedService(state, restartedOptions, presentation); return 0;
        }
        if (parsed.command === 'list' || (parsed.command === 'run' && options.dryRun)) {
            const tasks = await discoverTasks(workspace);
            const ledger = await readLedger(workspace);
            const previewOptions = parsed.command === 'run' ? { ...options, agent: options.agent ?? 'Developer' } : options;
            const service = serviceOptions(parsed, options, configuration);
            const inventory = parsed.command === 'list' ? await inspectHarnesses(workspace.projectPath, { names: service.enabledHarnesses ?? (options.harness ? [options.harness] : []), harnessSettings: configuration.harnessSettings, signal: controller.signal }) : [];
            const rows = identifyRuntime({ project: workspace.projectPath, tasks: await Promise.all(tasks.map(async task => ({ id: task.id, title: task.title, status: task.status, priority: task.priority, agent: task.agent, harness: task.harness, model: task.model, source: task.source.relativePath, ...await (parsed.command === 'list' ? taskServiceEligibility(workspace, task, service, inventory, ledger.tasks[task.id]) : taskEligibility(workspace, task, previewOptions, ledger)) }))) }, await discoverAgents(workspace.projectPath)).tasks as Array<Record<string, any>>;
            if (parsed.values.json) process.stdout.write(`${redactSecrets(JSON.stringify({ timezone: workspace.timezone, tasks: rows }, null, 2), redactionPath)}\n`);
            else if (presentation.pretty) process.stdout.write(redactSecrets(renderPanel(`Promptbook ${await installedEngineVersion()} · Task queue`, [['Project', workspace.projectPath], ['Timezone', workspace.timezone], ['Tasks', String(rows.length)]], presentation, { details: rows.length ? rows.map(row => `[${row.status}] p${row.priority} ${row.title}\n  ${agentLabel(row, presentation.pretty)} · ${row.source} · ${row.kind}: ${row.reason}`) : ['No tasks discovered.'] }), redactionPath));
            else { process.stdout.write(`Project: ${workspace.projectPath}\nTimezone: ${workspace.timezone}\n`); for (const row of rows) process.stdout.write(redactSecrets(`[${row.status}] p${row.priority} ${row.title}\n  ${agentLabel(row, presentation.pretty)} · ${row.source} · ${row.kind}: ${row.reason}\n`, redactionPath)); if (!rows.length) process.stdout.write('No tasks discovered.\n'); }
            return 0;
        }
        if (parsed.command.startsWith('find-')) { await diagnostics(workspace, parsed.command, presentation); return 0; }
        if (parsed.command === 'recover') {
            if (parsed.arguments.length !== 1) throw new InputError('recover requires exactly one task ID.');
            if (parsed.values.action && !options.dryRun) {
                options.context = await readContext(workspace, options.context);
                if (options.agent) options.agent = (await resolveAgentSelection(workspace, options.agent)).path;
            }
            const result = await recoverTask(workspace, parsed.arguments[0]!, { action: parsed.values.action as 'resume' | 'retry' | 'acknowledge' | undefined, occurrence: parsed.values.occurrence as string | undefined, dryRun: !!parsed.values['dry-run'] }, options);
            const review = { ...result, journals: result.journals.map(journal => ({ id: journal.id, taskId: journal.taskId, occurrenceId: journal.occurrenceId, phase: journal.phase, attempts: journal.attempts, commits: journal.commits, error: journal.error, trace: journal.trace, pendingPhase: journal.pendingPhase, syncPending: journal.syncPending })) };
            process.stdout.write(redactSecrets(presentation.pretty ? renderPanel(`Promptbook ${await installedEngineVersion()} · Recovery inspection`, [['Project', workspace.projectPath], ['Task', parsed.arguments[0]!], ['Action', String(parsed.values.action ?? 'inspection only')]], presentation, { details: review.journals.map(journal => `${journal.id} · ${journal.phase}${journal.error ? `\nFailure: ${journal.error}` : ''}${journal.trace ? `\nDiagnostic: ${journal.trace}` : ''}${journal.syncPending ? '\nSynchronization pending.' : ''}`), next: ['ptbk recover TASK_ID --json', 'Choose --action resume|retry|acknowledge only after reviewing the recovery boundary.'] }) : `${JSON.stringify(review, null, 2)}\n`, redactionPath)); return result.exitCode;
        }
        if (parsed.command === 'migrate' && options.dryRun) {
            const result = await migrateTasks(workspace, { dryRun: true, noCommit: options.noCommit });
            process.stdout.write(redactSecrets(presentation.pretty ? renderPanel(`Promptbook ${await installedEngineVersion()} · Migration preview`, [['Project', workspace.projectPath]], presentation, { details: [JSON.stringify(result, null, 2)], next: ['ptbk migrate --path PROJECT when ready to apply this conversion.'] }) : `${JSON.stringify(result, null, 2)}\n`, redactionPath)); return 0;
        }
        // Task authoring remains an inspection until a draft has been approved or supplied in full.
        readOnly = parsed.command === 'add';
        phase = 'execution preflight';
        if (parsed.command === 'start') {
            const readiness = await inspectProjectReadiness(workspace, { check: options.check, noCommit: options.noCommit });
            if (!readiness.ready) {
                if (!interactive) throw new InputError(`Project setup is incomplete: ${readiness.missing.join(', ')}. Run ptbk init --path ${JSON.stringify(workspace.projectPath)} with explicit installation/harness decisions, then retry start.`);
                if (await wizardChoice(`Complete missing setup in ${workspace.projectPath}?\n${readiness.missing.join(', ')}`, ['yes', 'no'], 'yes', controller.signal) !== 'yes') throw new InputError('Start requires completed project setup.');
                const result = await main(['init', '--path', workspace.projectPath,
                    ...(explicitValues.harness ? ['--harness', String(explicitValues.harness)] : []),
                    ...(explicitValues.harnesses !== undefined ? ['--harnesses', String(explicitValues.harnesses)] : []),
                    ...(explicitValues.check !== undefined ? ['--check', String(explicitValues.check)] : []),
                ]);
                if (result !== 0) return result;
                const refreshed = await readProjectConfiguration(workspace.projectPath);
                Object.assign(configuration, refreshed);
                parsed.values = { ...refreshed.values, ...explicitValues };
                Object.assign(options, runOptions(parsed));
                for (const key of Object.keys(explicitValues)) configuration.sources[key] = `CLI --${key}`;
                options.configurationSources = configuration.sources;
                const checked = await inspectProjectReadiness(workspace);
                if (!checked.ready) throw new InputError(`Project setup remains incomplete: ${checked.missing.join(', ')}.`);
            }
            if ((await inspectProjectCheck(workspace, options.check)).diagnostic && interactive) {
                phase = 'project validation setup';
                const selectedCheck = await prepareProjectCheck(workspace, { command: explicitValues.check === undefined ? undefined : String(explicitValues.check), ui: checkSetupUi(controller.signal) });
                if (!selectedCheck) throw new InputError(`Startup postponed until project validation is configured. ${checkSetupAction(workspace)}`);
                if (selectedCheck.updated !== undefined) await author(workspace, options, !options.noCommit,
                    lease => saveProjectCheck(workspace, selectedCheck, () => lease.assertOwned()), pending => persistInitializationPending(workspace, pending), true);
                Object.assign(configuration, await readProjectConfiguration(workspace.projectPath));
                for (const key of Object.keys(explicitValues)) configuration.sources[key] = `CLI --${key}`;
                options.configurationSources = configuration.sources;
                options.check = selectedCheck.command;
                phase = 'execution preflight';
            }
            const executionReadiness = await inspectProjectReadiness(workspace, { check: options.check, noCommit: options.noCommit });
            const prerequisites = executionReadiness.execution;
            if (prerequisites.length) throw new InputError(`Execution prerequisites remain unresolved: ${prerequisites.join(' ')} ${checkSetupAction(workspace)} Complete the indicated setup before starting.`);
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
            await author(workspace, options, !options.noCommit, async lease => {
                const browser = { mode: parsed.values['browser-mode'] ?? 'headless', ...(parsed.values['browser-profile'] ? { profile: parsed.values['browser-profile'] } : {}) };
                const paths = await ensureProjectConfiguration(workspace, { harnesses: selectedHarnesses, browser, tunnel: { enabled: !parsed.values['no-tunnel'], provider: parsed.values['tunnel-provider'] ?? 'cloudflare-quick' }, updates: { harnesses: true } });
                paths.push(...await initializeProject(workspace, { sample: !!prepared?.fresh && !agenda }));
                if (!agenda) paths.push(...(await ensureFirstTask(workspace, { harness: configuration.enabledHarnesses?.[0] ?? selectedHarnesses[0] })).paths);
                const selectedCheck = await prepareProjectCheck(workspace, { command: explicitValues.check === undefined ? undefined : String(explicitValues.check), ui: interactive ? checkSetupUi(controller.signal) : undefined });
                if (selectedCheck) {
                    if (selectedCheck.updated !== undefined) paths.push(...await saveProjectCheck(workspace, selectedCheck, () => lease.assertOwned()));
                    options.check = selectedCheck.command;
                }
                if (!parsed.values['no-install']) {
                    const installation = await installProjectEngine(workspace, { choice: installationChoice, version: await installedEngineVersion(), signal: controller.signal });
                    paths.push(...installation.changed); unresolved.push(...installation.unresolved);
                } else unresolved.push('Installation deferred by --no-install.');
                changedCount = new Set(paths).size;
                return [...new Set(paths)];
            }, pending => persistInitializationPending(workspace, pending), false, 'Initialize project');
            Object.assign(configuration, await readProjectConfiguration(workspace.projectPath));
            for (const key of Object.keys(explicitValues)) configuration.sources[key] = `CLI --${key}`;
            options.configurationSources = configuration.sources;
            if (prepared) {
                const parentChanges = [...new Set([...prepared.parentChanges, ...await finalizeInitializationDestination(prepared, { signal: controller.signal })])];
                if (parentChanges.length) process.stdout.write(`Parent metadata left uncommitted:\n${parentChanges.join('\n')}\n`);
            }
            phase = 'remote access setup';
            const remoteOptions = serviceOptions(parsed, options, configuration);
            if (!remoteOptions.noTunnel && !parsed.values['no-install']) {
                process.stdout.write('Remote dashboards use a protected Cloudflare relay by default. Use --no-tunnel for local-only access. Setup does not publish the project.\n');
                try { await prepareTunnelClient(workspace, remoteOptions, controller.signal); } catch (error) { unresolved.push((error as Error).message); }
            }
            phase = 'selected harness setup';
            const inventory = parsed.values['no-install'] ? await inspectHarnesses(workspace.projectPath, { names: selectedHarnesses, harnessSettings: configuration.harnessSettings, signal: controller.signal }) : await setupHarnesses(workspace.projectPath, {
                names: selectedHarnesses, install: true, login: interactive, interactive, signal: controller.signal,
                harnessSettings: configuration.harnessSettings,
                chooseUpdates: interactive ? async outdated => {
                    const choice = await wizardChoice(`Outdated selected global harnesses: ${outdated.map(item => getHarness(item.name).displayName).join(', ')}`, outdated.length === 1 ? ['keep', 'all'] : ['keep', 'all', 'choose'], 'keep', controller.signal);
                    if (choice !== 'choose') return choice as 'keep' | 'all';
                    return promptChoices('Select outdated harnesses to update', outdated.map(item => ({
                        value: item.name, label: getHarness(item.name).displayName,
                        description: `${item.currentVersion ?? 'unknown'} → ${item.latestVersion ?? 'latest'}`,
                    })), { signal: controller.signal });
                } : undefined,
                onOutput: text => process.stdout.write(redactSecrets(text, redactionPath)),
            });
            for (const item of inventory) if (!item.usable) unresolved.push(`${item.name}: ${item.diagnostic}`);
            if (!selectedHarnesses.length) unresolved.push('No harnesses enabled; select one with --harnesses NAME before starting work.');
            const readiness = await inspectProjectReadiness(workspace, { noCommit: options.noCommit && !!agenda });
            unresolved.push(...readiness.missing, ...readiness.execution);
            const savedInventory = await inspectHarnessExecution(workspace.projectPath, await inspectHarnesses(workspace.projectPath, { names: configuration.enabledHarnesses ?? [], harnessSettings: configuration.harnessSettings, signal: controller.signal }), { harnessSettings: configuration.harnessSettings, model: configuration.values.model as string | undefined, thinkingLevel: configuration.values['thinking-level'] as string | undefined, allowCredits: configuration.values['allow-credits'] === true, signal: controller.signal });
            if (!savedInventory.length) unresolved.push('No harness is enabled in saved ptbk.json; enable a usable harness before plain ptbk start.');
            for (const item of savedInventory) if (!item.usable && !unresolved.some(message => message.startsWith(`${item.name}:`))) unresolved.push(`${item.name}: ${item.diagnostic}`);
            if (options.noCommit && !agenda) unresolved.push('Setup changes were left uncommitted by --no-commit; review and commit them before ordinary committed start.');
            const savedCheck = await inspectProjectCheck(workspace);
            const temporaryCheck = options.check !== undefined && options.check !== savedCheck.command ? ` --check ${JSON.stringify(options.check)}` : '';
            const temporarySelection = configuration.exists && JSON.stringify(selectedHarnesses) !== JSON.stringify(configuration.enabledHarnesses ?? []) ? ` --harnesses ${JSON.stringify(selectedHarnesses.join(','))}` : '';
            const setupOutcome = changedCount ? `${changedCount} artifact(s) changed` : unresolved.length ? 'no files changed; setup remains incomplete' : 'already ready; no files changed';
            const next = unresolved.length
                ? `ptbk init --path ${JSON.stringify(workspace.projectPath)}${temporarySelection}${temporaryCheck}${savedCheck.diagnostic && !temporaryCheck ? ' --check "<project validation command>"' : ''}`
                : `ptbk start --path ${JSON.stringify(workspace.projectPath)}`;
            const retainedChoices = [...(temporarySelection ? [unresolved.length ? 'Saved harness defaults preserved; retain the temporary harness selection in the next setup invocation.' : 'Saved harness defaults preserved; plain start uses the saved selection.'] : []), ...(temporaryCheck ? [unresolved.length ? 'Saved validation preserved; retain the temporary --check override in the next setup invocation.' : 'Saved validation preserved; plain start uses the saved check.'] : [])];
            process.stdout.write(presentation.pretty ? renderPanel(`Promptbook ${await installedEngineVersion()} · Setup ${unresolved.length ? 'incomplete' : 'complete'}`, [['Project', workspace.projectPath], ['Setup', setupOutcome], ['Prerequisites', unresolved.length ? `${unresolved.length} unresolved` : 'ready']], presentation, { details: [...unresolved, ...retainedChoices], next: [next], tone: unresolved.length ? 'warning' : 'success' }) : `Setup: ${setupOutcome}.\n${unresolved.length ? `Unresolved prerequisites:\n${unresolved.map(message => `  ${message}`).join('\n')}\n` : ''}${retainedChoices.join('\n')}${retainedChoices.length ? '\n' : ''}Next: ${next}\n`);
            if (unresolved.length) return 2;
            if (agenda) {
                if ((await inspectProjectCheck(workspace, options.check)).diagnostic) throw new InputError(`The agenda was not created or executed because project validation remains unconfigured. ${checkSetupAction(workspace)}`);
                const harness = options.harness || inventory.find(item => item.usable)?.name;
                if (!harness) throw new InputError('Agenda initialization needs an authenticated harness; complete the displayed setup, then retry --agenda.');
                let bootstrapId: string | undefined;
                await author(workspace, options, !options.noCommit, async () => {
                    const first = await ensureFirstTask(workspace, { intent: agenda, harness });
                    bootstrapId = first.taskId;
                    return first.paths;
                });
                const bootstrap = await runQueue(workspace, { ...options, harness, agent: 'ptbk:expert', onlyTaskId: bootstrapId, limit: 1, check: options.check || 'npm run check', requireAcceptance: true, context: await readContext(workspace, options.context) });
                if (bootstrap.exitCode !== 0) return bootstrap.exitCode;
                if (options.noCommit) await atomicWrite(join(workspace.statePath, 'uncommitted.json'), uncommittedOwnership(await captureSnapshot(workspace.gitRoot!), [...Object.keys(options.ownedChanges?.files ?? {}), ...(bootstrap.retainedPaths ?? [])]));
                phase = 'agenda startup';
                const service = { ...serviceOptions(parsed, options, configuration), enabledHarnesses: selectedHarnesses, harness: options.harness, mode: 'daemon' as const };
                await launchedService(await startService(workspace, service), service, presentation);
            }
        } else if (parsed.command === 'add') {
            if (interactive) {
                const preparedTask = await addTaskWizard(workspace, { description: parsed.arguments.length ? parsed.arguments.join(' ') : undefined, priority: integer(parsed.values.priority, '--priority'), template: parsed.values.template as string | undefined, signal: controller.signal });
                if (!preparedTask) { process.stdout.write(renderPanel(`Promptbook ${await installedEngineVersion()} · Task creation cancelled`, [['Project', workspace.projectPath], ['Outcome', 'No task was created.']], presentation)); return 0; }
                readOnly = false;
                await author(workspace, options, !options.noCommit, async () => [await saveAuthoredTask(workspace, preparedTask)], undefined, presentation.pretty, `Add task - ${preparedTask.content.split(/\r?\n/)[0]!.replace(/^TASK /, '')}`);
                process.stdout.write(renderPanel(`Promptbook ${await installedEngineVersion()} · Task saved`, [['Project', workspace.projectPath], ['Task', preparedTask.path], ['Persistence', !options.noCommit ? 'committed' : 'left uncommitted']], presentation, { next: ['ptbk list', 'ptbk start'], tone: 'success' }));
            } else {
                const description = await descriptionInput(parsed.arguments, !interactive || !!options.noQuestions);
                if (!description.trim()) throw new InputError('A non-empty task description is required.');
                readOnly = false;
                let created = '';
                await author(workspace, options, !options.noCommit, async () => { created = await addTask(workspace, description, { priority: integer(parsed.values.priority, '--priority'), template: parsed.values.template as string | undefined }); return [created]; }, undefined, presentation.pretty, `Add task - ${description.split(/\r?\n/)[0]!.slice(0, 150)}`);
                if (presentation.pretty) process.stdout.write(renderPanel(`Promptbook ${await installedEngineVersion()} · Task saved`, [['Project', workspace.projectPath], ['Task', created]], presentation, { tone: 'success' }));
            }
        } else if (parsed.command === 'generate-boilerplates') {
            let paths: string[] = [];
            await author(workspace, options, !options.noCommit, async () => { paths = await generateBoilerplates(workspace, String(parsed.values.count || '5*1')); return paths; }, undefined, presentation.pretty, 'Create task templates');
            if (presentation.pretty) process.stdout.write(renderPanel(`Promptbook ${await installedEngineVersion()} · Task templates created`, [['Project', workspace.projectPath], ['Templates', String(paths.length)], ['Status', 'not-ready; complete placeholders before execution']], presentation, { details: paths.slice(0, 20), ...(paths.length > 20 ? { next: ['ptbk list to inspect all templates.'] } : {}) }));
        } else if (parsed.command === 'verify') {
            let paths: string[] = [];
            await author(workspace, options, !options.noCommit, async () => { paths = await verifyTasks(workspace, { noQuestions: options.noQuestions, ignore: parsed.values.ignore as string[] | undefined }); return paths; }, undefined, presentation.pretty, 'Review and archive task results');
            if (presentation.pretty) process.stdout.write(renderPanel(`Promptbook ${await installedEngineVersion()} · Human review complete`, [['Project', workspace.projectPath], ['Changed paths', String(paths.length)]], presentation, { details: paths.slice(0, 20) }));
        } else if (parsed.command === 'migrate') {
            let paths: string[] = [];
            await author(workspace, options, !options.noCommit, async lease => {
                const result = await migrateTasks(workspace, { dryRun: false, noCommit: options.noCommit }, lease);
                paths = [...result.created, ...result.archived]; return paths;
            }, undefined, presentation.pretty);
            if (presentation.pretty) process.stdout.write(renderPanel(`Promptbook ${await installedEngineVersion()} · Migration complete`, [['Project', workspace.projectPath], ['Changed paths', String(paths.length)]], presentation, { details: paths.slice(0, 20) }));
        } else {
            if (parsed.command === 'start') { phase = 'supervisor startup'; const service = serviceOptions(parsed, options, configuration); await launchedService(await startService(workspace, service), service, presentation); return 0; }
            options.context = await readContext(workspace, options.context);
            if (options.agent) options.agent = (await resolveAgentSelection(workspace, options.agent)).path;
            if (parsed.command === 'plan') {
                const result = await planConversation(workspace, { ...options, prompt: parsed.values.prompt as string | undefined, commit: !options.noCommit });
                if (presentation.pretty) process.stdout.write(renderPanel(`Promptbook ${await installedEngineVersion()} · Planning complete`, [['Project', workspace.projectPath], ['Saved tasks', String(result.saved.length)]], presentation, { details: result.saved }));
            }
            else if (parsed.command === 'server') {
                if (options.limit !== undefined) throw new InputError('server is persistent; use ptbk run --limit for a finite run.');
                await startCoderServer(workspace, { ...options, port: integer(parsed.values.port, '--port') });
            } else if (parsed.command === 'ping') {
                if (!options.harness) throw new InputError('ping requires --harness or PTBK_HARNESS.');
                do {
                    const result = await runHarness({ harness: options.harness, harnessConfiguration: options.harnessConfiguration, projectPath: workspace.projectPath, prompt: 'Reply with pong. Do not modify files or run tools.', model: options.model, thinkingLevel: options.thinkingLevel, signal: controller.signal, allowCredits: options.allowCredits, onOutput: text => process.stdout.write(redactSecrets(text, redactionPath)) });
                    if (presentation.pretty) process.stdout.write(renderPanel(`Promptbook ${await installedEngineVersion()} · Harness probe`, [['Harness', options.harness], ['Outcome', result.outcome]], presentation, { details: [result.output.slice(-8000)], tone: result.outcome === 'success' ? 'success' : 'error' }));
                    if (result.outcome !== 'success') return 1;
                    if (!parsed.values.period) break;
                    await delay(parseDuration(parsed.values.period), undefined, { signal: controller.signal });
                } while (!controller.signal.aborted);
            } else {
                phase = 'task execution';
                const runtime = await createFiniteRuntime(workspace, { ...options, onEvent: undefined,
                    ...serviceOptions(parsed, options, configuration), interactive, noQr: !!parsed.values['no-qr'],
                    noServer: parsed.command === 'run' ? !!parsed.values['no-server'] : true,
                    port: integer(parsed.values.port, '--port'),
                    browserMode: parsed.values['browser-mode'] as 'headless' | 'headful' | undefined,
                    browserProfile: parsed.values['browser-profile'] as string | undefined,
                }, abort);
                try {
                    const result = parsed.command === 'fix' ? await fixChecks(workspace, runtime.options) : await runQueue(workspace, runtime.options);
                    await runtime.complete(result);
                    await runtime.close();
                    process.stdout.write(presentation.pretty ? renderPanel(`Promptbook ${await installedEngineVersion()} · ${parsed.command} ${result.exitCode ? 'needs attention' : 'complete'}`, [['Project', workspace.projectPath], ['Completed', String(result.completed)], ['Failed', String(result.failed)], ['Synchronization', result.syncPending ? 'pending' : 'no pending synchronization']], presentation, { tone: result.exitCode ? 'warning' : 'success' }) : `${result.completed} completed, ${result.failed} failed${result.syncPending ? ', synchronization pending' : ''}.\n`);
                    return result.exitCode;
                } finally { await runtime.close(); }
            }
        }
        return interrupted ? 130 : 0;
    } catch (error) {
        if (interrupted || (error as Error).name === 'AbortError') return 130;
        if (phase === 'argument validation' && error instanceof InputError) {
            const raw = arguments_.some(value => ['--raw', '--raw=true', '--no-ui', '--no-ui=true', '--json'].includes(value));
            process.stderr.write(renderPanel(`Promptbook ${await installedEngineVersion()} · Invalid ${command === 'preflight' ? 'invocation' : command + ' invocation'}`, [['Error', error.message]], presentationFor(process.stderr, raw), { next: [helpHint(arguments_)], tone: 'error' }));
            return 2;
        }
        await reportDiagnostic(error, { command, phase, projectPath: redactionPath, workspace: diagnosticWorkspace, readOnly });
        if (error instanceof InputError) process.stderr.write(`${helpHint(arguments_)}\n`);
        return (error as { exitCode?: number }).exitCode ?? (error instanceof InputError ? 2 : 1);
    } finally {
        process.removeListener('SIGINT', abort);
        process.removeListener('SIGTERM', abort);
    }
}
