import { EXIT, PtbkError, usageError } from '../../common/errors.js';
import { loadSettings, setting } from '../../project/config.js';
import { inspectGit, snapshotDirty } from '../../project/git.js';
import { SyncCoordinator } from '../../engine/sync.js';
import { maintainProjectConfiguration } from '../../project/configuration.js';
import type { Project } from '../../project/workspace.js';
import { HarnessPool } from '../../engine/harnesses.js';
import { loginLocation } from '../../harness/maintenance.js';
import { harnessPlugin } from '../../harness/registry.js';
import type { HarnessContext } from '../../harness/types.js';
import { persistentServiceEnvironment } from '../../service/records.js';
import { harnessPluginId, type HarnessToolRecord } from '../../tools/model.js';
import { attendHarnessSignIn, serviceProblemOf } from '../../ui/harness-sign-in.js';
import type { ServiceSnapshot, ToolsView, ToolView } from '../../engine/snapshot.js';
import { lookupService } from '../../service/control.js';
import { applyToolOperation, commandOf, type ToolChanges, type ToolDraft, type ToolOperation, type ToolOperationOutcome, type ToolOperationRequest } from '../../tools/operations.js';
import { inspectInventory } from '../../tools/readiness.js';
import { confirm } from '../../ui/prompts.js';
import { readConcealed } from '../../ui/secret.js';
import { symbols } from '../../ui/terminal.js';
import { printJson, readStdin, selectedProject } from '../common.js';
import { flag, option, type CommandContext } from '../context.js';

/**
 * Width of the field labels of `ptbk tool show`.
 */
const FIELD_LABEL_WIDTH = 12;

/**
 * How long a tool operation routed through the running engine may take (it can wait for the Git lock of a commit).
 */
const TOOL_OPERATION_TIMEOUT_MS = 120_000;

/**
 * Reads a secret without echoing it (concealed terminal input) or from piped standard input.
 */
async function readSecret(context: CommandContext, variable: string): Promise<string> {
    if (!process.stdin.isTTY) return (await readStdin()).replace(/\r?\n$/, '');
    return await readConcealed(context.terminal, `Value of ${variable}`);
}

/**
 * Parses a `true`/`false` option value.
 */
function booleanOption(context: CommandContext, name: string): boolean | undefined {
    const value = option<string>(context, name);
    if (value === undefined) return undefined;
    if (/^(true|yes|1)$/i.test(value)) return true;
    if (/^(false|no|0)$/i.test(value)) return false;
    throw usageError(`--${name} expects true or false (got "${value}").`, context.path.join(' '));
}

/**
 * Field options shared by add and modify (tolerant enum input; canonical values are saved).
 */
function fieldOptions(context: CommandContext): Omit<ToolDraft, 'type' | 'variant' | 'name'> & { variant?: string } {
    return {
        ...(option<string>(context, 'variant') !== undefined ? { variant: option<string>(context, 'variant') } : {}),
        ...(option<string>(context, 'description') !== undefined ? { description: option<string>(context, 'description') } : {}),
        ...(option<string>(context, 'profile-source') !== undefined ? { profileSource: option<string>(context, 'profile-source') } : {}),
        ...(option<string>(context, 'profile-path') !== undefined ? { profilePath: option<string>(context, 'profile-path') } : {}),
        ...(booleanOption(context, 'is-headless') !== undefined ? { isHeadless: booleanOption(context, 'is-headless') } : {}),
        ...(option<string>(context, 'executable') !== undefined ? { executable: option<string>(context, 'executable') } : {}),
        ...(option<string>(context, 'authentication') !== undefined ? { authentication: option<string>(context, 'authentication') } : {}),
        ...(option<string>(context, 'api-key-env') !== undefined ? { apiKeyEnv: option<string>(context, 'api-key-env') } : {}),
        ...(option<string>(context, 'account-profile') !== undefined ? { accountProfile: option<string>(context, 'account-profile') } : {}),
        ...(option<string>(context, 'base-url') !== undefined ? { baseUrl: option<string>(context, 'base-url') } : {}),
    };
}

/**
 * The operation an invocation describes.
 */
function operationOf(context: CommandContext): ToolOperation {
    const sub = context.path[1];
    const [first, second] = context.positionals;
    const name = (): string => {
        if (!first) throw usageError(`ptbk tool ${sub} needs the tool name.`, context.path.join(' '));
        return first;
    };
    switch (sub) {
        case 'add': {
            if (!first) throw usageError('ptbk tool add needs the tool type (BROWSER or HARNESS).', context.path.join(' '));
            const variant = option<string>(context, 'variant');
            const toolName = option<string>(context, 'name') ?? second;
            if (!variant) throw usageError('ptbk tool add needs --variant (e.g. CHROME or OPENAI_CODEX).', context.path.join(' '));
            if (!toolName) throw usageError('ptbk tool add needs --name (a kebab-case identifier such as work-browser).', context.path.join(' '));
            const { variant: _variant, ...fields } = fieldOptions(context);
            void _variant;
            return { kind: 'add', tool: { type: first, variant, name: toolName, ...fields }, before: option<string>(context, 'before'), after: option<string>(context, 'after') };
        }
        case 'modify': {
            const fields = fieldOptions(context);
            const changes: ToolChanges = {
                ...fields,
                ...(flag(context, 'clear-description') ? { description: null } : {}),
                ...(/^(default|official)$/i.test(option<string>(context, 'base-url') ?? '') ? { baseUrl: null } : {}),
                ...(flag(context, 'clear-executable') ? { executable: null } : {}),
            };
            const rename = option<string>(context, 'rename');
            if (!Object.keys(changes).length && !rename && !flag(context, 'api-key-stdin')) throw usageError('Nothing to modify: give the fields to change (see `ptbk tool modify --help`).', context.path.join(' '));
            return { kind: 'modify', name: name(), changes, rename };
        }
        case 'enable':
        case 'disable':
            return { kind: sub, name: name() };
        case 'remove':
        case 'delete':
            return { kind: 'remove', name: name() };
        case 'move': {
            const before = option<string>(context, 'before');
            const after = option<string>(context, 'after');
            if (!before && !after) throw usageError('ptbk tool move needs --before <other> or --after <other>.', context.path.join(' '));
            return { kind: 'move', name: name(), before, after };
        }
        default:
            throw usageError(`Unknown tool subcommand "${sub ?? ''}".`, 'tool');
    }
}

/**
 * The tool inventory: from the running engine (live in-use state) or inspected locally (read-only).
 */
async function inventory(context: CommandContext, project: Project): Promise<{ view: ToolsView; live: boolean; current?: ServiceSnapshot['current'] }> {
    const lookup = await lookupService(project);
    if (lookup.state === 'running' && lookup.engine.compatible) {
        const snapshot = await lookup.client.request<ServiceSnapshot>('snapshot');
        if (snapshot.tools) return { view: snapshot.tools, live: true, current: snapshot.current };
    }
    const settings = await loadSettings(project, { env: context.env });
    return { view: await inspectInventory(project, settings, context.env, new HarnessPool(project.root, settings, context.env)), live: false };
}

/**
 * One inventory row.
 */
function row(context: CommandContext, item: ToolView): string {
    const { style } = context.terminal;
    const marks = symbols(context.terminal.unicode);
    const mark = item.state === 'usable' ? style.success(marks.ok) : item.state === 'disabled' ? style.muted('–') : item.state === 'unknown' ? style.muted('?') : style.warning(marks.warn);
    const flags = [item.isEnabled ? 'enabled' : 'disabled', item.inUse ? 'in use' : '', item.retained ? 'retained by current work' : '', item.overridden ? 'overridden for this invocation' : ''].filter(Boolean).join(', ');
    return `${String(item.order).padStart(2)}. ${mark} ${style.bold(item.name)} ${style.muted(`${item.type} ${item.variant}`)} · ${flags}${item.description ? style.muted(` · ${item.description}`) : ''}\n      ${item.summary}${item.nextAction && item.state !== 'usable' ? style.muted(` → ${item.nextAction}`) : ''}`;
}

/**
 * `ptbk tool list`: the ordered inventory with enabled, usable and in-use state (read-only).
 *
 * @private command
 */
export async function list(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const { view, live } = await inventory(context, project);
    if (flag(context, 'json')) {
        printJson({ ...view, source: live ? 'running engine' : 'local inspection' });
        return EXIT.success;
    }
    const lines = [`Tools of ${project.root} (${live ? 'live from the running engine' : 'inspected now; no engine is running'}):`];
    if (!view.items.length) lines.push('  No tools are configured. Add one with `ptbk tool add BROWSER …` or `ptbk tool add HARNESS …`.');
    for (const item of view.items) lines.push(row(context, item));
    for (const problem of view.problems) lines.push(context.terminal.style.warning(`Problem: ${problem}`));
    if (view.waiting) lines.push(context.terminal.style.warning(`New work waits for tools: ${view.waiting.reason} → ${view.waiting.action}`));
    context.terminal.write(`${lines.join('\n')}\n`);
    return EXIT.success;
}

/**
 * `ptbk tool show <name>`: non-secret configuration and actual diagnostics of one instance (read-only).
 *
 * @private command
 */
export async function show(context: CommandContext): Promise<number> {
    const project = await selectedProject(context);
    const name = context.positionals[0];
    if (!name) throw usageError('ptbk tool show needs the tool name.', 'tool show');
    const { view, live, current } = await inventory(context, project);
    const item = view.items.find((candidate) => candidate.name === name);
    if (!item) throw new PtbkError(`No tool is named "${name}".`, { kind: 'not-found', next: [view.items.length ? `Configured tools: ${view.items.map((candidate) => candidate.name).join(', ')}.` : 'Add one with `ptbk tool add`.'] });
    if (flag(context, 'json')) {
        printJson(item);
        return EXIT.success;
    }
    const lines = [
        `${item.name} — ${item.variantLabel} (${item.type} ${item.variant}), position ${item.order}`,
        ...(item.description ? [`Description  ${item.description}`] : []),
        `Enabled      ${item.isEnabled ? 'yes' : 'no (configuration and credentials are kept)'}`,
        `State        ${item.state} — ${item.summary}`,
        ...(item.nextAction && item.state !== 'usable' ? [`Next action  ${item.nextAction}`] : []),
        `In use       ${item.inUse ? `yes${current?.tool === item.name ? ` (by "${current.taskTitle}")` : ''}` : live ? 'no' : 'no engine is running'}${item.retained ? ' · the current work keeps its acquired configuration' : ''}`,
        ...Object.entries(item.fields).map(([key, value]) => `${key.padEnd(FIELD_LABEL_WIDTH)} ${value}`),
    ];
    context.terminal.write(`${lines.join('\n')}\n`);
    return EXIT.success;
}

/**
 * Prints an operation outcome; returns the exit code.
 */
function report(context: CommandContext, operation: ToolOperation, outcome: ToolOperationOutcome): number {
    const { terminal } = context;
    const marks = symbols(terminal.unicode);
    if (flag(context, 'json')) {
        printJson(outcome);
        return outcome.status === 'needs-acknowledgement' ? EXIT.incomplete : EXIT.success;
    }
    if (outcome.status === 'needs-acknowledgement') {
        const lines = [terminal.style.warning(`${marks.warn} Nothing was changed.`)];
        for (const requirement of outcome.requirements) {
            lines.push(requirement.message);
            lines.push(requirement.kind === 'in-use' ? 'Choose one:' : 'To proceed:');
            requirement.alternatives.forEach((alternative, index) => lines.push(`  ${requirement.alternatives.length > 1 ? `${index + 1}. ` : ''}${alternative}`));
        }
        if (outcome.requirements.length > 1) lines.push(terminal.style.muted('Both acknowledgements are required: --yes does not imply --force, and --force does not waive the last-tool warning.'));
        terminal.write(`${lines.join('\n')}\n`);
        return EXIT.incomplete;
    }
    const head = outcome.status === 'no-op' ? `${marks.ok} ${outcome.summary}` : `${terminal.style.success(marks.ok)} ${outcome.summary}${outcome.commit ? ` — committed ${outcome.commit.slice(0, 8)}` : ''}`;
    terminal.write(`${[head, ...outcome.notes.map((note) => terminal.style.muted(`  ${note}`))].join('\n')}\n`);
    void operation;
    return EXIT.success;
}

/**
 * Runs one saved operation: through the running engine (coordinated ownership, live in-use state) or, without one,
 * through the same shared implementation directly. Interactive terminals confirm a required acknowledgement once.
 */
async function apply(context: CommandContext): Promise<number> {
    if (context.explicit.has('commit')) throw usageError('Saved tool management always commits its own change; --commit/--no-commit do not apply.', context.path.join(' '));
    const project = await selectedProject(context);
    const operation = operationOf(context);
    const request: { operation: ToolOperation; acknowledgements: { force: boolean; confirmLastOfType: boolean }; secret?: ToolOperationRequest['secret']; via: string } = {
        operation,
        acknowledgements: { force: flag(context, 'force') === true, confirmLastOfType: flag(context, 'yes') === true },
        via: 'cli',
    };
    if (flag(context, 'api-key-stdin')) {
        const variable = option<string>(context, 'api-key-env') ?? (operation.kind === 'modify' ? await existingReference(context, project, operation.name) : undefined);
        if (!variable) throw usageError('--api-key-stdin needs --api-key-env NAME (the variable that will hold the key in .env).', context.path.join(' '));
        if (operation.kind === 'modify' && !option<string>(context, 'api-key-env')) (operation.changes as { apiKeyEnv?: string }).apiKeyEnv = variable;
        const value = await readSecret(context, variable);
        if (!value) throw usageError('No secret was supplied; nothing was changed.', context.path.join(' '));
        request.secret = { variable, value };
    }
    for (let round = 0; round < 3; round++) {
        const outcome = await execute(context, project, request);
        if (outcome.status !== 'needs-acknowledgement') {
            const code = report(context, operation, outcome);
            if (!flag(context, 'json')) await setUpHarness(context, project, operation);
            return code;
        }
        if (!context.terminal.interactive || flag(context, 'json')) return report(context, operation, outcome);
        // Interactive: the last-of-type warning can be confirmed here; an in-use tool still needs the explicit choice.
        const lastOfType = outcome.requirements.find((requirement) => requirement.kind === 'last-of-type');
        if (!lastOfType || outcome.requirements.some((requirement) => requirement.kind === 'in-use')) return report(context, operation, outcome);
        const answer = await confirm(context.terminal, { frame: { title: 'ptbk tool', step: commandOf(operation) }, question: `${lastOfType.message} Continue?`, defaultYes: false });
        if (answer !== true) {
            context.terminal.write('Nothing was changed.\n');
            return EXIT.incomplete;
        }
        request.acknowledgements = { ...request.acknowledgements, confirmLastOfType: true };
    }
    return EXIT.incomplete;
}

/**
 * After adding, modifying or enabling a harness tool: its readiness in this terminal and in the background service's
 * environment. A signed-out native instance gets init's attended sign-in in its own account context (interactive
 * terminals only; otherwise the state and the next action are reported, never waited on), and a running engine then
 * reinspects its tools at once instead of after its periodic inspection.
 */
async function setUpHarness(context: CommandContext, project: Project, operation: ToolOperation): Promise<void> {
    const name = operation.kind === 'add' ? operation.tool.name : operation.kind === 'modify' ? (operation.rename ?? operation.name) : operation.kind === 'enable' ? operation.name : undefined;
    if (!name) return;
    const settings = await loadSettings(project, { env: context.env });
    const tool = settings.tools.find((candidate): candidate is HarnessToolRecord => candidate.type === 'HARNESS' && candidate.name === name);
    const plugin = tool?.isEnabled ? harnessPlugin(harnessPluginId(tool.variant)) : undefined;
    if (!tool || !plugin) return;
    const { terminal } = context;
    const marks = symbols(terminal.unicode);
    // The instance as this terminal and as the background service (after detachment or reboot) see it.
    const pools = [new HarnessPool(project.root, settings, context.env), new HarnessPool(project.root, settings, persistentServiceEnvironment(context.env))];
    await Promise.all(pools.map(async (pool) => await pool.reloadCredentials()));
    const [here, service] = pools.map((pool) => pool.context(name)) as [HarnessContext, HarnessContext];
    let inspection = await plugin.inspect(here);
    let serviceProblem = await serviceProblemOf(plugin, inspection, service);
    const wasReady = inspection.usable && !serviceProblem;
    if (tool.authentication === 'NATIVE' && terminal.interactive) {
        ({ inspection, serviceProblem } = await attendHarnessSignIn(terminal, {
            plugin,
            context: here,
            service,
            place: loginLocation(context.env),
            inspection,
            serviceProblem,
            frame: () => ({ title: 'ptbk tool', step: `Sign in ${name}` }),
            exits: [{ value: 'skip', label: 'Not now (the tool stays saved but cannot be used until signed in)' }],
            say: (text) => terminal.write(`${text}\n`),
        }));
    }
    if (inspection.usable && !serviceProblem) {
        terminal.write(`${terminal.style.success(marks.ok)} ${name}: ${inspection.summary}\n`);
        if (wasReady) return;
        const lookup = await lookupService(project);
        // An older engine without this request finds the sign-in at its next periodic inspection.
        if (lookup.state === 'running' && lookup.engine.compatible) await lookup.client.request('tool-recheck').catch(() => undefined);
        return;
    }
    const signedOut = tool.authentication === 'NATIVE' && inspection.installed && inspection.authenticated === false;
    const next = serviceProblem?.nextAction ?? (signedOut ? `Sign in from an interactive terminal with \`ptbk tool enable ${name}\` (it stays enabled).` : inspection.nextAction);
    terminal.write(`${terminal.style.warning(marks.warn)} ${name}: ${serviceProblem ? `signed in here, but ${serviceProblem.summary}` : inspection.summary}${next ? terminal.style.muted(` → ${next}`) : ''}\n`);
}

/**
 * The current `apiKey` variable of a harness tool.
 */
async function existingReference(context: CommandContext, project: Project, name: string): Promise<string | undefined> {
    const settings = await loadSettings(project, { env: context.env });
    const tool = settings.tools.find((candidate) => candidate.name === name);
    return tool?.type === 'HARNESS' ? /env\.([A-Za-z_][A-Za-z0-9_]*)/.exec(tool.apiKey ?? '')?.[1] : undefined;
}

/**
 * Executes a request with the right owner.
 */
async function execute(context: CommandContext, project: Project, request: ToolOperationRequest): Promise<ToolOperationOutcome> {
    const lookup = await lookupService(project);
    if (lookup.state === 'running') {
        if (!lookup.engine.compatible) {
            throw new PtbkError(`The running engine (ptbk ${lookup.engine.version}) cannot apply tool changes from this ptbk.`, { kind: 'unsupported', project: project.root, next: [`Use its own CLI (npx ptbk@${lookup.engine.version} tool …), or restart it with this version.`] });
        }
        return await lookup.client.request<ToolOperationOutcome>('tool-operation', request as unknown as Record<string, unknown>, TOOL_OPERATION_TIMEOUT_MS);
    }
    if (lookup.state === 'unreachable') throw new PtbkError('A ptbk service owns this project but is not reachable.', { kind: 'conflict', project: project.root, reason: lookup.reason, effect: 'Nothing was changed.', next: ['Run `ptbk status`, or stop the service first.'] });
    // Without a running engine the same implementation runs here, after the required committed configuration pass.
    await maintainProjectConfiguration(project, { commit: true, env: context.env });
    const settings = await loadSettings(project, { env: context.env });
    const gitInfo = await inspectGit(project.root);
    let sync: { before: () => Promise<void>; after: () => Promise<void> } | undefined;
    if (setting<boolean>(settings, 'isAutoSync') && gitInfo.state === 'repository') {
        // The same coordinator as the engine's: attempts around this operation's commit, never prerequisites.
        const coordinator = new SyncCoordinator({
            repositoryRoot: () => gitInfo.root,
            env: context.env,
            gitLock: async (action) => await action(),
            enabled: () => true,
            integrationBlocker: async (files) => {
                const dirty = await snapshotDirty(project.root, gitInfo.root);
                const overlap = files.filter((file) => Object.keys(dirty).some((path) => path.endsWith(file)));
                return overlap.length ? `uncommitted local changes of ${overlap.join(', ')} are preserved` : undefined;
            },
            onConflict: async (conflict) => context.terminal.write(`Synchronization conflict with ${conflict.upstream} (${conflict.files.join(', ')}); the local branch is unchanged. The running engine hands it to Fixer.\n`),
            onIntegrated: async () => undefined,
            onChange: () => undefined,
            log: (text, level) => level !== 'info' && context.terminal.write(`${text}\n`),
        });
        sync = { before: async () => void (await coordinator.request('boundary')), after: async () => void (await coordinator.request('post-commit')) };
    }
    return await applyToolOperation(project, request, { env: context.env, sync, timeZone: setting<string>(settings, 'timezone') });
}

/**
 * `ptbk tool add|modify|enable|disable|remove|delete|move`.
 *
 * @private command
 */
export default async function tool(context: CommandContext): Promise<number> {
    return await apply(context);
}
