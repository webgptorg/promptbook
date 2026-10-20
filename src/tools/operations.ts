import { join } from 'node:path';
import { PtbkError, errorMessage } from '../common/errors.js';
import { readTextIfExists, writeFileAtomic } from '../common/fs.js';
import { ENVIRONMENT_NAME, KEBAB_IDENTIFIER, kebabIdentifier, matchEnum } from '../common/naming.js';
import { canonicalizeConfig, configText, parseConfigText } from '../project/config.js';
import { maintainProjectConfiguration } from '../project/configuration.js';
import { commitFileContents, git, ignoredPaths, inspectGit, readAtHead } from '../project/git.js';
import type { Project } from '../project/workspace.js';
import { dotEnvPath, editDotEnv, environmentReference, isEngineManagedAssignment, parseEnvironmentReference, readDotEnv, type DotEnvChange } from './environment.js';
import {
    AUTHENTICATION_MODES,
    BROWSER_VARIANTS,
    HARNESS_VARIANTS,
    PROFILE_SOURCES,
    THINKING_LEVELS,
    TOOL_TYPES,
    toolTypeLabel,
    type HarnessToolRecord,
    type ToolRecord,
    type ToolType,
} from './model.js';
import { parseTools, serializeTool } from './normalize.js';

/**
 * Tolerant input describing a tool (CLI flags, API JSON, init choices); enum spellings and names are canonicalized
 * by the shared normalizer, never guessed per frontend.
 *
 * @private shared tool management
 */
export type ToolDraft = {
    readonly type: string;
    readonly variant: string;
    readonly name: string;
    readonly description?: string;
    readonly isEnabled?: boolean;
    readonly profileSource?: string;
    readonly profilePath?: string;
    readonly isHeadless?: boolean;
    readonly executable?: string;
    readonly authentication?: string;
    /** Environment-variable name of the API key (stored as `${{ env.NAME }}`). */
    readonly apiKeyEnv?: string;
    readonly accountProfile?: string;
    readonly model?: string;
    readonly thinkingLevel?: string;
    readonly models?: readonly string[];
};

/**
 * Field changes of a modify operation; `null` clears an optional field, `undefined` leaves it intact.
 *
 * @private shared tool management
 */
export type ToolChanges = {
    readonly variant?: string;
    readonly description?: string | null;
    readonly profileSource?: string;
    readonly profilePath?: string | null;
    readonly isHeadless?: boolean;
    readonly executable?: string | null;
    readonly authentication?: string;
    readonly apiKeyEnv?: string | null;
    readonly accountProfile?: string | null;
    readonly model?: string | null;
    readonly thinkingLevel?: string | null;
    readonly models?: readonly string[] | null;
};

/**
 * One saved tool-management operation.
 *
 * @private shared tool management
 */
export type ToolOperation =
    | { readonly kind: 'add'; readonly tool: ToolDraft; readonly before?: string; readonly after?: string }
    | { readonly kind: 'modify'; readonly name: string; readonly changes: ToolChanges; readonly rename?: string }
    | { readonly kind: 'enable' | 'disable' | 'remove'; readonly name: string }
    | { readonly kind: 'move'; readonly name: string; readonly before?: string; readonly after?: string };

/**
 * Explicit acknowledgements of a consequential operation (each one only waives its own protection).
 *
 * @private shared tool management
 */
export type ToolAcknowledgements = {
    /** In use: save now while the work that acquired the tool finishes with its original context (never a kill). */
    readonly force?: boolean;
    /** Leaves no enabled tool of the type: the engine keeps running but cannot start ordinary new work. */
    readonly confirmLastOfType?: boolean;
};

/**
 * A write-only secret for the project's `.env` (never echoed, logged or committed).
 *
 * @private shared tool management
 */
export type ToolSecret = { readonly variable: string; readonly value: string };

/**
 * Request of one operation from any entry point.
 *
 * @private shared tool management
 */
export type ToolOperationRequest = {
    readonly operation: ToolOperation;
    readonly acknowledgements?: ToolAcknowledgements;
    readonly secret?: ToolSecret;
    /** Entry point, for the commit body (`cli`, `dashboard`, `api`). */
    readonly via?: string;
};

/**
 * A protection the operation needs explicitly acknowledged (nothing was written).
 *
 * @private shared tool management
 */
export type ToolRequirement = {
    readonly kind: 'in-use' | 'last-of-type';
    readonly message: string;
    /** Concrete alternatives (commands; clients offer the same meanings). */
    readonly alternatives: readonly string[];
};

/**
 * Outcome of a tool-management operation.
 *
 * @private shared tool management
 */
export type ToolOperationOutcome =
    | { readonly status: 'applied'; readonly summary: string; readonly commit?: string; readonly tool?: ToolRecord; readonly notes: readonly string[] }
    | { readonly status: 'no-op'; readonly summary: string; readonly notes: readonly string[] }
    | { readonly status: 'needs-acknowledgement'; readonly summary: string; readonly requirements: readonly ToolRequirement[] };

/**
 * Pure result of planning an operation on a raw tools array.
 */
type Plan = { readonly tools: unknown[]; readonly summary: string; readonly name: string; readonly type: ToolType; readonly before?: ToolRecord; readonly after?: ToolRecord; readonly noop: boolean };

/**
 * A usage error of tool management.
 */
function invalid(message: string, next?: string): PtbkError {
    return new PtbkError(message, { kind: 'usage', effect: 'Nothing was changed.', next: next ? [next] : undefined });
}

/**
 * Canonical record from a tolerant draft, validated by the shared typed contract.
 *
 * @private shared tool management
 */
export function recordFromDraft(draft: ToolDraft): ToolRecord {
    const type = matchEnum(draft.type, TOOL_TYPES);
    if (!type) throw invalid(`Unknown tool type "${draft.type}".`, `Use one of ${TOOL_TYPES.join(', ')}.`);
    const variant = matchEnum(draft.variant, type === 'BROWSER' ? BROWSER_VARIANTS : HARNESS_VARIANTS);
    if (!variant) throw invalid(`Unknown ${toolTypeLabel(type)} variant "${draft.variant}".`, `Use one of ${(type === 'BROWSER' ? BROWSER_VARIANTS : HARNESS_VARIANTS).join(', ')}.`);
    const name = KEBAB_IDENTIFIER.test(draft.name) ? draft.name : kebabIdentifier(draft.name);
    if (!name) throw invalid(`"${draft.name}" cannot be a tool name.`, 'Use a kebab-case name such as work-browser or codex-company.');
    const raw: Record<string, unknown> = { type, variant, name, ...(draft.description !== undefined ? { description: draft.description } : {}), isEnabled: draft.isEnabled ?? true };
    if (type === 'BROWSER') {
        for (const field of ['authentication', 'apiKeyEnv', 'accountProfile', 'model', 'thinkingLevel', 'models'] as const) if (draft[field] !== undefined) throw invalid(`--${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} does not apply to a BROWSER tool.`);
        const source = draft.profileSource === undefined ? 'MANAGED_GLOBAL' : matchEnum(draft.profileSource, PROFILE_SOURCES);
        if (!source) throw invalid(`Unknown profile source "${draft.profileSource}".`, `Use one of ${PROFILE_SOURCES.join(', ')}.`);
        raw.profile = { source, ...(draft.profilePath !== undefined ? { path: draft.profilePath } : {}) };
        raw.isHeadless = draft.isHeadless ?? true;
        if (draft.executable !== undefined) raw.executable = draft.executable;
    } else {
        for (const field of ['profileSource', 'profilePath', 'isHeadless', 'executable'] as const) if (draft[field] !== undefined) throw invalid(`--${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} does not apply to a HARNESS tool.`);
        const authentication = draft.authentication === undefined ? 'NATIVE' : matchEnum(draft.authentication, AUTHENTICATION_MODES);
        if (!authentication) throw invalid(`Unknown authentication "${draft.authentication}".`, `Use one of ${AUTHENTICATION_MODES.join(', ')}.`);
        raw.authentication = authentication;
        if (draft.apiKeyEnv !== undefined) {
            if (!ENVIRONMENT_NAME.test(draft.apiKeyEnv)) throw invalid(`"${draft.apiKeyEnv}" is not an environment-variable name.`, 'Pass the variable name (e.g. COMPANY_OPENAI_API_KEY), never the key itself.');
            raw.apiKey = environmentReference(draft.apiKeyEnv);
        }
        if (draft.accountProfile !== undefined) raw.accountProfile = draft.accountProfile;
        if (draft.model !== undefined) raw.model = draft.model;
        if (draft.thinkingLevel !== undefined) {
            if (!matchEnum(draft.thinkingLevel, THINKING_LEVELS)) throw invalid(`Unknown thinking level "${draft.thinkingLevel}".`, 'Use LOW, MEDIUM, HIGH, XHIGH or MAX.');
            raw.thinkingLevel = draft.thinkingLevel;
        }
        if (draft.models !== undefined) raw.models = [...draft.models];
    }
    const parsed = parseTools([raw]);
    const errors = parsed.problems.filter((problem) => problem.severity === 'error');
    if (errors.length || !parsed.tools[0]) throw invalid(`The ${toolTypeLabel(type)} tool "${name}" is invalid: ${errors.map((problem) => `${problem.location.replace(/^ptbk\.json › tools\[0\]\.?/, '') || 'record'} ${problem.message}`).join('; ')}.`);
    return parsed.tools[0];
}

/**
 * Applies field changes to a typed record (a variant change keeps the type; incompatible fields are refused).
 */
function modifiedRecord(record: ToolRecord, changes: ToolChanges, rename?: string): ToolRecord {
    const draft: Record<string, unknown> = { type: record.type, variant: changes.variant ?? record.variant, name: rename ?? record.name, isEnabled: record.isEnabled };
    const optional = (key: string, change: unknown, current: unknown): void => {
        const value = change === undefined ? current : change === null ? undefined : change;
        if (value !== undefined) draft[key] = value;
    };
    optional('description', changes.description, record.description);
    if (record.type === 'BROWSER') {
        for (const field of ['authentication', 'apiKeyEnv', 'accountProfile', 'model', 'thinkingLevel', 'models'] as const) if (changes[field] !== undefined) throw invalid(`--${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} does not apply to a BROWSER tool.`);
        const source = changes.profileSource ?? record.profile.source;
        draft.profileSource = source;
        // Switching the source drops a path that belonged to the previous source, unless one is supplied.
        const keepPath = changes.profileSource === undefined || changes.profileSource === record.profile.source;
        optional('profilePath', changes.profilePath, keepPath ? record.profile.path : undefined);
        draft.isHeadless = changes.isHeadless ?? record.isHeadless;
        optional('executable', changes.executable, record.executable);
    } else {
        for (const field of ['profileSource', 'profilePath', 'isHeadless', 'executable'] as const) if (changes[field] !== undefined) throw invalid(`--${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} does not apply to a HARNESS tool.`);
        draft.authentication = changes.authentication ?? record.authentication;
        optional('apiKeyEnv', changes.apiKeyEnv, parseEnvironmentReference(record.apiKey));
        optional('accountProfile', changes.accountProfile, record.accountProfile);
        optional('model', changes.model, record.model);
        optional('thinkingLevel', changes.thinkingLevel, record.thinkingLevel);
        optional('models', changes.models, record.models);
    }
    return recordFromDraft(draft as ToolDraft);
}

/**
 * Plans one operation on a raw tools array (pure): the new canonical array and what changes. Unknown extension
 * fields of untouched and modified records are preserved.
 *
 * @private shared tool management
 */
export function planToolOperation(rawTools: readonly unknown[], operation: ToolOperation): Plan {
    const parsed = parseTools(rawTools);
    const tools = [...rawTools];
    const indexOf = (name: string): number => tools.findIndex((entry) => entry !== null && typeof entry === 'object' && (entry as Record<string, unknown>).name === name);
    const recordOf = (name: string): ToolRecord => {
        const record = parsed.tools.find((tool) => tool.name === name);
        if (!record) {
            const known = parsed.tools.map((tool) => tool.name);
            throw new PtbkError(indexOf(name) >= 0 ? `The tool "${name}" is invalid in ptbk.json; repair it first.` : `No tool is named "${name}".`, { kind: 'not-found', effect: 'Nothing was changed.', next: [known.length ? `Configured tools: ${known.join(', ')} (\`ptbk tool list\`).` : 'No tools are configured; add one with `ptbk tool add`.'] });
        }
        return record;
    };
    const position = (name: string, before?: string, after?: string): number => {
        if (before && after) throw invalid('Give either --before or --after, not both.');
        const anchor = before ?? after;
        if (!anchor) return tools.length;
        if (anchor === name) throw invalid('A tool cannot be moved relative to itself.');
        const index = indexOf(anchor);
        if (index < 0) throw invalid(`No tool is named "${anchor}".`);
        return before ? index : index + 1;
    };
    switch (operation.kind) {
        case 'add': {
            const record = recordFromDraft(operation.tool);
            if (indexOf(record.name) >= 0 || parsed.tools.some((tool) => tool.name === record.name)) throw new PtbkError(`A tool named "${record.name}" already exists.`, { kind: 'conflict', effect: 'Nothing was changed.', next: ['Choose another name, or change the existing tool with `ptbk tool modify`.'] });
            const at = position(record.name, operation.before, operation.after);
            tools.splice(at, 0, serializeTool(record));
            return { tools, summary: `Add ${toolTypeLabel(record.type)} tool ${record.name}`, name: record.name, type: record.type, after: record, noop: false };
        }
        case 'modify': {
            const record = recordOf(operation.name);
            const rename = operation.rename && operation.rename !== record.name ? (KEBAB_IDENTIFIER.test(operation.rename) ? operation.rename : kebabIdentifier(operation.rename)) : undefined;
            if (operation.rename && !rename && operation.rename !== record.name) throw invalid(`"${operation.rename}" cannot be a tool name.`);
            if (rename && (indexOf(rename) >= 0 || parsed.tools.some((tool) => tool.name === rename))) throw new PtbkError(`A tool named "${rename}" already exists.`, { kind: 'conflict', effect: 'Nothing was changed.' });
            const next = modifiedRecord(record, operation.changes, rename);
            const index = indexOf(record.name);
            const serialized = serializeTool(next, tools[index] as Record<string, unknown>);
            const noop = JSON.stringify(serialized) === JSON.stringify(tools[index]);
            tools[index] = serialized;
            return { tools, summary: rename ? `Rename tool ${record.name} to ${rename}` : `Modify tool ${record.name}`, name: record.name, type: record.type, before: record, after: next, noop };
        }
        case 'enable':
        case 'disable': {
            const record = recordOf(operation.name);
            const isEnabled = operation.kind === 'enable';
            const index = indexOf(record.name);
            const next = { ...record, isEnabled } as ToolRecord;
            tools[index] = serializeTool(next, tools[index] as Record<string, unknown>);
            return { tools, summary: `${isEnabled ? 'Enable' : 'Disable'} tool ${record.name}`, name: record.name, type: record.type, before: record, after: next, noop: record.isEnabled === isEnabled };
        }
        case 'remove': {
            const record = recordOf(operation.name);
            tools.splice(indexOf(record.name), 1);
            return { tools, summary: `Remove tool ${record.name}`, name: record.name, type: record.type, before: record, noop: false };
        }
        case 'move': {
            const record = recordOf(operation.name);
            const from = indexOf(record.name);
            const [entry] = tools.splice(from, 1);
            const at = position(record.name, operation.before, operation.after);
            tools.splice(at, 0, entry);
            return { tools, summary: `Move tool ${record.name}${operation.before ? ` before ${operation.before}` : operation.after ? ` after ${operation.after}` : ' to the end'}`, name: record.name, type: record.type, before: record, after: record, noop: at === from };
        }
    }
}

/**
 * Applies a batch of operations to a raw configuration (pure; used by init inside its setup transaction).
 *
 * @private shared tool management
 */
export function applyToolOperationsToConfig(raw: Readonly<Record<string, unknown>>, operations: readonly ToolOperation[]): Record<string, unknown> {
    const result = structuredClone(raw) as Record<string, unknown>;
    let tools: unknown[] = Array.isArray(result.tools) ? (result.tools as unknown[]) : [];
    for (const operation of operations) tools = planToolOperation(tools, operation).tools;
    result.tools = tools;
    return canonicalizeConfig(result).raw;
}

/**
 * Protections of one plan that need an explicit acknowledgement (recomputed when the operation is applied).
 */
function requirements(plan: Plan, operation: ToolOperation, tools: readonly ToolRecord[], inUse: ReadonlySet<string>, acknowledgements: ToolAcknowledgements): ToolRequirement[] {
    const found: ToolRequirement[] = [];
    const command = commandOf(operation);
    const affectsUse = operation.kind === 'modify' || operation.kind === 'disable' || operation.kind === 'remove';
    if (affectsUse && inUse.has(plan.name) && !acknowledgements.force) {
        found.push({
            kind: 'in-use',
            message: `The tool "${plan.name}" is in use by active work.`,
            alternatives: [
                `${command} --force    # save now; the work that already acquired the tool finishes with its original configuration (not a kill)`,
                `ptbk stop --force    # stop the whole engine; after it has stopped, repeat: ${command}`,
            ],
        });
    }
    const enabledBefore = tools.filter((tool) => tool.type === plan.type && tool.isEnabled).length;
    const parsedAfter = parseTools(plan.tools).tools;
    const enabledAfter = parsedAfter.filter((tool) => tool.type === plan.type && tool.isEnabled).length;
    if ((operation.kind === 'disable' || operation.kind === 'remove') && enabledBefore > 0 && enabledAfter === 0 && !acknowledgements.confirmLastOfType) {
        const label = toolTypeLabel(plan.type);
        found.push({
            kind: 'last-of-type',
            message: `"${plan.name}" is the last enabled ${label}. The engine keeps running, but cannot start ordinary new work until another ${label} is enabled or added.`,
            alternatives: [`${command} --yes    # confirm`],
        });
    }
    return found;
}

/**
 * The equivalent CLI command of an operation (for alternatives shown by every client).
 *
 * @private shared tool management
 */
export function commandOf(operation: ToolOperation): string {
    switch (operation.kind) {
        case 'add':
            return `ptbk tool add ${operation.tool.type} --variant ${operation.tool.variant} --name ${operation.tool.name}`;
        case 'modify':
            return `ptbk tool modify ${operation.name}${operation.rename ? ` --rename ${operation.rename}` : ''} …`;
        case 'move':
            return `ptbk tool move ${operation.name} ${operation.before ? `--before ${operation.before}` : `--after ${operation.after ?? ''}`}`.trim();
        default:
            return `ptbk tool ${operation.kind} ${operation.name}`;
    }
}

/**
 * Adds an ignore line to `.gitignore` content (pure; `undefined` when already present).
 */
function withIgnoreLine(content: string, line: string): string | undefined {
    const lines = content.split(/\r?\n/).map((entry) => entry.trim());
    if (lines.includes(line) || lines.includes(`/${line}`)) return undefined;
    const newline = content.includes('\r\n') ? '\r\n' : '\n';
    const prefix = content && !content.endsWith('\n') ? newline : '';
    return `${content}${prefix}${content ? newline : ''}# Local secrets (never committed)${newline}${line}${newline}`;
}

/**
 * Context of applying an operation (the engine passes its coordination; a stopped project uses safe defaults).
 *
 * @private shared tool management
 */
export type ToolOperationContext = {
    readonly env: NodeJS.ProcessEnv;
    /** Tool names held by active work (empty without a running engine). */
    readonly inUse?: ReadonlySet<string>;
    /** Serializes Git/configuration writes with the engine's other operations. */
    readonly gitLock?: <T>(action: () => Promise<T>) => Promise<T>;
    /** Optional synchronization attempts around the operation (never prerequisites). */
    readonly sync?: { readonly before?: () => Promise<void>; readonly after?: () => Promise<void> };
    /** Time zone of `.env` audit comments. */
    readonly timeZone?: string;
};

/**
 * The single implementation behind init, `ptbk tool`, dashboards and the API: validates the operation against the
 * configuration current at application time, applies the shared protections, edits `.env` non-destructively for a
 * supplied secret, and commits only its own non-secret changes immediately (`PTBK: <operation>`), even during an
 * unrelated active task whose edits stay uncommitted in the working tree.
 *
 * @private shared tool management
 */
export async function applyToolOperation(project: Project, request: ToolOperationRequest, context: ToolOperationContext): Promise<ToolOperationOutcome> {
    const gitLock = context.gitLock ?? (async <T>(action: () => Promise<T>) => await action());
    const gitInfo = await inspectGit(project.root);
    if (gitInfo.state !== 'repository') throw new PtbkError('Tool management needs the project’s Git working tree.', { kind: 'setup', project: project.root, next: ['Run `ptbk init`.'] });
    const repositoryRoot = gitInfo.root;
    // Required configuration evolution comes first, as its own committed pass.
    await maintainProjectConfiguration(project, { commit: true, env: context.env, gitLock, normalize: false });
    await context.sync?.before?.().catch(() => undefined);
    const outcome = await gitLock(async () => {
        const workingText = await readTextIfExists(project.configPath);
        const headText = await readAtHead(repositoryRoot, project.configPath);
        if (workingText === undefined) throw new PtbkError('This project has no ptbk.json.', { kind: 'setup', project: project.root, next: ['Run `ptbk init`.'] });
        if (headText === undefined) {
            throw new PtbkError('ptbk.json is not committed yet (an explicitly uncommitted setup).', { kind: 'conflict', project: project.root, effect: 'Nothing was changed.', next: ['Commit ptbk.json first; tool changes are always committed on their own.'] });
        }
        const working = parseConfigText(workingText);
        const head = parseConfigText(headText);
        if (working.diagnostics.length || head.diagnostics.length) throw new PtbkError('ptbk.json is not valid JSON.', { kind: 'configuration', project: project.root, reason: [...working.diagnostics, ...head.diagnostics].map((diagnostic) => diagnostic.message).join('; '), effect: 'Nothing was changed.' });
        const toolsOf = (raw: Record<string, unknown>): unknown[] => (Array.isArray(raw.tools) ? (raw.tools as unknown[]) : []);
        // The committed change is planned on HEAD; the same change is applied to the working copy, so someone else's
        // uncommitted edit of ptbk.json stays uncommitted and is never swept into this commit.
        const plan = planToolOperation(toolsOf(head.raw), request.operation);
        let workingPlan: Plan;
        try {
            workingPlan = workingText === headText ? plan : planToolOperation(toolsOf(working.raw), request.operation);
        } catch (error) {
            throw new PtbkError('ptbk.json has uncommitted edits that conflict with this tool change.', { kind: 'conflict', project: project.root, reason: errorMessage(error), effect: 'Nothing was changed.', next: ['Commit or discard the ptbk.json edits, then retry.'] });
        }
        const before = parseTools(toolsOf(head.raw)).tools;
        const needed = requirements(plan, request.operation, before, context.inUse ?? new Set(), request.acknowledgements ?? {});
        if (needed.length) return { status: 'needs-acknowledgement', summary: needed.map((requirement) => requirement.message).join(' '), requirements: needed } satisfies ToolOperationOutcome;
        const notes: string[] = [];
        const files: Array<{ path: string; content: string; working: string }> = [];
        // A supplied secret goes only to the ignored local .env (timestamped, non-destructive).
        const envChanges: DotEnvChange[] = [];
        if (request.secret) {
            const reference = parseEnvironmentReference((plan.after as HarnessToolRecord | undefined)?.apiKey);
            if (plan.type !== 'HARNESS' || !reference) throw invalid('A secret can only be stored for a HARNESS tool with an apiKey reference.', 'Pass --api-key-env NAME together with --api-key-stdin.');
            if (reference !== request.secret.variable) throw invalid(`The secret is for ${request.secret.variable}, but the tool references ${reference}.`);
            const tracked = await git(repositoryRoot, ['ls-files', '--error-unmatch', '--', dotEnvPath(project.root)], { literal: true });
            if (tracked.exitCode === 0) {
                throw new PtbkError('.env is tracked by Git, so ptbk does not store secrets in it.', { kind: 'conflict', project: project.root, effect: 'Nothing was changed.', next: ['Untrack it (`git rm --cached .env`, commit) and rotate any secret that was committed, then retry.'] });
            }
            if (!(await ignoredPaths(project.root, [dotEnvPath(project.root)])).size) {
                const gitignore = join(project.root, '.gitignore');
                const headIgnore = (await readAtHead(repositoryRoot, gitignore)) ?? '';
                const workingIgnore = (await readTextIfExists(gitignore)) ?? '';
                const committed = withIgnoreLine(headIgnore, '.env');
                if (committed) files.push({ path: gitignore, content: committed, working: withIgnoreLine(workingIgnore, '.env') ?? workingIgnore });
                notes.push('Added .env to .gitignore before storing the secret.');
            }
            envChanges.push({ kind: 'set', name: request.secret.variable, value: request.secret.value });
        }
        // Removal retires a credential only when ptbk added it and nothing else can be using it.
        if (request.operation.kind === 'remove' && plan.before?.type === 'HARNESS') {
            const variable = parseEnvironmentReference(plan.before.apiKey);
            if (variable) {
                const remaining = parseTools(plan.tools).tools.some((tool) => tool.type === 'HARNESS' && parseEnvironmentReference(tool.apiKey) === variable);
                const dotEnv = await readDotEnv(project.root);
                const elsewhere = (await git(repositoryRoot, ['grep', '--untracked', '-I', '-l', '-w', '-F', variable, '--', '.', ':!ptbk.json'], { literal: false })).stdout.trim();
                if (remaining) notes.push(`${variable} stays active in .env: another tool (enabled or disabled) still references it.`);
                else if (elsewhere) notes.push(`${variable} stays active in .env: it is also used by ${elsewhere.split('\n').slice(0, 3).join(', ')}.`);
                else if (!isEngineManagedAssignment(dotEnv, variable)) notes.push(`${variable} stays active: ptbk did not add it, so its other consumers are unknown.`);
                else envChanges.push({ kind: 'retire', name: variable });
            }
        }
        if (plan.noop && !envChanges.length) return { status: 'no-op', summary: `${plan.summary}: nothing to change.`, notes } satisfies ToolOperationOutcome;
        if (envChanges.length) {
            const edit = await editDotEnv(project.root, envChanges, { reason: plan.summary.toLowerCase(), operation: commandOf(request.operation), timeZone: context.timeZone });
            notes.push(...edit.notes);
        }
        let commit: string | undefined;
        if (!plan.noop) {
            const headConfig = canonicalizeConfig({ ...head.raw, tools: plan.tools }).raw;
            const workingConfig = canonicalizeConfig({ ...working.raw, tools: workingPlan.tools }).raw;
            files.unshift({ path: project.configPath, content: configText(headConfig), working: configText(workingConfig) });
            const result = await commitFileContents({
                projectRoot: project.root,
                repositoryRoot,
                files: files.map((file) => ({ path: file.path, content: file.content })),
                subject: plan.summary,
                body: [`Saved tool management${request.via ? ` (${request.via})` : ''}: ${commandOf(request.operation)}`, ...notes.filter((note) => !/\.env/.test(note) || /gitignore/.test(note))].join('\n'),
                trailers: { 'PTBK-Tool': plan.after?.name ?? plan.name },
                temporaryDirectory: project.runtime.temporary,
                env: context.env,
            });
            commit = result.committed ? result.sha : undefined;
            for (const file of files) await writeFileAtomic(file.path, file.working);
        }
        return { status: 'applied', summary: plan.summary, commit, tool: plan.after, notes } satisfies ToolOperationOutcome;
    });
    if (outcome.status === 'applied') await context.sync?.after?.().catch(() => undefined);
    return outcome;
}
