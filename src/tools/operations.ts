import { rm } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { PtbkError, errorMessage } from '../common/errors.js';
import { readTextIfExists, writeFileAtomic } from '../common/fs.js';
import { harnessPlugin } from '../harness/registry.js';
import { ENVIRONMENT_NAME, KEBAB_IDENTIFIER, kebabIdentifier, matchEnum } from '../common/naming.js';
import { canonicalizeConfig, configText, parseConfigText } from '../project/config.js';
import { maintainProjectConfiguration } from '../project/configuration.js';
import { prefixedSubject, commitFileContents, git, ignoredPaths, inspectGit, readAtHead } from '../project/git.js';
import type { Project } from '../project/workspace.js';
import { dotEnvPath, editDotEnv, environmentReference, isEngineManagedAssignment, parseEnvironmentReference, readDotEnv, type DotEnvChange } from './environment.js';
import {
    AUTHENTICATION_MODES,
    PROFILE_SOURCES,
    TOOL_TYPES,
    dependentHarnesses,
    harnessPluginId,
    isEffectivelyEnabled,
    toolTypeLabel,
    variantsOf,
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
    /** `OFFICIAL`, `LOCAL` or an explicit base URL (`default` or omitted: the official endpoint). */
    readonly baseUrl?: string;
    /** Name of the INFERENCE_RUNTIME tool of a managed local harness connection. */
    readonly inferenceRuntime?: string;
    /** Service URL of an INFERENCE_RUNTIME tool (omitted: the adapter discovers its local service). */
    readonly endpoint?: string;
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
    /** New endpoint; `null` (or `default`) returns to the official endpoint. */
    readonly baseUrl?: string | null;
    /** New runtime reference; `null` removes it. */
    readonly inferenceRuntime?: string | null;
    /** New runtime service URL; `null` returns to discovery. */
    readonly endpoint?: string | null;
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
    | { readonly kind: 'move'; readonly name: string; readonly before?: string; readonly after?: string }
    /** Several additions saved together in one scoped commit (e.g. a local runtime and its harness connection). */
    | { readonly kind: 'add-together'; readonly tools: readonly ToolDraft[]; readonly summary: string };

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
    const variant = matchEnum(draft.variant, variantsOf(type));
    if (!variant) throw invalid(`Unknown ${toolTypeLabel(type)} variant "${draft.variant}".`, `Use one of ${variantsOf(type).join(', ')}.`);
    const name = KEBAB_IDENTIFIER.test(draft.name) ? draft.name : kebabIdentifier(draft.name);
    if (!name) throw invalid(`"${draft.name}" cannot be a tool name.`, 'Use a kebab-case name such as work-browser or codex-company.');
    const raw: Record<string, unknown> = { type, variant, name, ...(draft.description !== undefined ? { description: draft.description } : {}), isEnabled: draft.isEnabled ?? true };
    const flagName = (field: string): string => `--${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
    if (type !== 'HARNESS' && draft.inferenceRuntime !== undefined) throw invalid(`--inference-runtime applies to a HARNESS tool, not a ${toolTypeLabel(type)}.`);
    if (type !== 'INFERENCE_RUNTIME' && draft.endpoint !== undefined) throw invalid(`--endpoint applies to an INFERENCE_RUNTIME tool; a harness uses --base-url.`);
    if (type === 'BROWSER') {
        for (const field of ['authentication', 'apiKeyEnv', 'accountProfile', 'baseUrl'] as const) if (draft[field] !== undefined) throw invalid(`${flagName(field)} does not apply to a BROWSER tool.`);
        const source = draft.profileSource === undefined ? 'MANAGED_GLOBAL' : matchEnum(draft.profileSource, PROFILE_SOURCES);
        if (!source) throw invalid(`Unknown profile source "${draft.profileSource}".`, `Use one of ${PROFILE_SOURCES.join(', ')}.`);
        raw.profile = { source, ...(draft.profilePath !== undefined ? { path: draft.profilePath } : {}) };
        raw.isHeadless = draft.isHeadless ?? true;
        if (draft.executable !== undefined) raw.executable = draft.executable;
    } else if (type === 'HARNESS') {
        for (const field of ['profileSource', 'profilePath', 'isHeadless', 'executable'] as const) if (draft[field] !== undefined) throw invalid(`--${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} does not apply to a HARNESS tool.`);
        const authentication = draft.authentication === undefined ? 'NATIVE' : matchEnum(draft.authentication, AUTHENTICATION_MODES);
        if (!authentication) throw invalid(`Unknown authentication "${draft.authentication}".`, `Use one of ${AUTHENTICATION_MODES.join(', ')}.`);
        raw.authentication = authentication;
        if (draft.apiKeyEnv !== undefined) {
            if (!ENVIRONMENT_NAME.test(draft.apiKeyEnv)) throw invalid(`"${draft.apiKeyEnv}" is not an environment-variable name.`, 'Pass the variable name (e.g. COMPANY_OPENAI_API_KEY), never the key itself.');
            raw.apiKey = environmentReference(draft.apiKeyEnv);
        }
        if (draft.accountProfile !== undefined) raw.accountProfile = draft.accountProfile;
        // The default choice is the official endpoint, which needs no saved value; an explicit choice is saved.
        if (draft.baseUrl !== undefined && !/^default$/i.test(draft.baseUrl.trim())) raw.baseUrl = draft.baseUrl;
        if (draft.inferenceRuntime !== undefined) raw.inferenceRuntime = draft.inferenceRuntime;
    } else if (type === 'INFERENCE_RUNTIME') {
        for (const field of ['authentication', 'apiKeyEnv', 'accountProfile', 'baseUrl', 'profileSource', 'profilePath', 'isHeadless', 'executable'] as const) if (draft[field] !== undefined) throw invalid(`${flagName(field)} does not apply to an INFERENCE_RUNTIME tool.`);
        if (draft.endpoint !== undefined && !/^default$/i.test(draft.endpoint.trim())) raw.endpoint = draft.endpoint;
    }
    if (type === 'COMPUTER_CONTROL') {
        for (const field of ['authentication', 'apiKeyEnv', 'accountProfile', 'baseUrl', 'profileSource', 'profilePath', 'isHeadless', 'executable'] as const) if (draft[field] !== undefined) throw invalid(`The ${field} field does not apply to a COMPUTER_CONTROL tool.`);
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
    if (record.type !== 'HARNESS' && changes.inferenceRuntime !== undefined) throw invalid(`--inference-runtime applies to a HARNESS tool, not a ${toolTypeLabel(record.type)}.`);
    if (record.type !== 'INFERENCE_RUNTIME' && changes.endpoint !== undefined) throw invalid('--endpoint applies to an INFERENCE_RUNTIME tool; a harness uses --base-url.');
    if (record.type === 'BROWSER') {
        for (const field of ['authentication', 'apiKeyEnv', 'accountProfile', 'baseUrl'] as const) if (changes[field] !== undefined) throw invalid(`--${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} does not apply to a BROWSER tool.`);
        const source = changes.profileSource ?? record.profile.source;
        draft.profileSource = source;
        // Switching the source drops a path that belonged to the previous source, unless one is supplied.
        const keepPath = changes.profileSource === undefined || changes.profileSource === record.profile.source;
        optional('profilePath', changes.profilePath, keepPath ? record.profile.path : undefined);
        draft.isHeadless = changes.isHeadless ?? record.isHeadless;
        optional('executable', changes.executable, record.executable);
    } else if (record.type === 'HARNESS') {
        for (const field of ['profileSource', 'profilePath', 'isHeadless', 'executable'] as const) if (changes[field] !== undefined) throw invalid(`--${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} does not apply to a HARNESS tool.`);
        draft.authentication = changes.authentication ?? record.authentication;
        optional('apiKeyEnv', changes.apiKeyEnv, parseEnvironmentReference(record.apiKey));
        optional('accountProfile', changes.accountProfile, record.accountProfile);
        optional('baseUrl', changes.baseUrl, record.baseUrl);
        optional('inferenceRuntime', changes.inferenceRuntime, record.inferenceRuntime);
        // A variant change never silently discards a native account context or falls back to another (default) account.
        const variant = matchEnum(String(draft.variant), variantsOf('HARNESS'));
        const target = variant && variant !== record.variant ? harnessPlugin(harnessPluginId(variant as HarnessToolRecord['variant'])) : undefined;
        if (target && draft.accountProfile !== undefined && String(draft.authentication).toUpperCase() === 'NATIVE' && !target.accountHomeVariable) {
            throw invalid(`${target.displayName} does not support separate native account contexts, so ${record.name} cannot keep accountProfile "${String(draft.accountProfile)}" as a ${variant} tool.`, `Clear it explicitly in the same change (ptbk tool modify ${record.name} --variant ${variant} --clear-account-profile), or keep the variant.`);
        }
    } else if (record.type === 'INFERENCE_RUNTIME') {
        for (const field of ['authentication', 'apiKeyEnv', 'accountProfile', 'baseUrl', 'profileSource', 'profilePath', 'isHeadless', 'executable'] as const) if (changes[field] !== undefined) throw invalid(`The ${field} field does not apply to an INFERENCE_RUNTIME tool.`);
        optional('endpoint', changes.endpoint, record.endpoint);
    }
    if (record.type === 'COMPUTER_CONTROL') {
        for (const field of ['authentication', 'apiKeyEnv', 'accountProfile', 'baseUrl', 'profileSource', 'profilePath', 'isHeadless', 'executable', 'endpoint'] as const) if (changes[field] !== undefined) throw invalid(`The ${field} field does not apply to a COMPUTER_CONTROL tool.`);
    }
    return recordFromDraft(draft as ToolDraft);
}

/**
 * Refuses a new or changed runtime reference that does not resolve to an enabled INFERENCE_RUNTIME record of the same
 * project, with its concrete cause (never a silent fallback to the official endpoint or another resource).
 */
function assertRuntimeReference(tools: readonly ToolRecord[], record: ToolRecord): void {
    if (record.type !== 'HARNESS' || !record.inferenceRuntime) return;
    const target = tools.find((tool) => tool.name === record.inferenceRuntime);
    const runtimes = tools.filter((tool) => tool.type === 'INFERENCE_RUNTIME').map((tool) => tool.name);
    const next = runtimes.length ? `Local model runtimes: ${runtimes.join(', ')}.` : 'Add one first (`ptbk tool setup-local`, or `ptbk tool add INFERENCE_RUNTIME --variant OLLAMA --name local-ollama`).';
    if (!target) throw invalid(`No local model runtime is named "${record.inferenceRuntime}".`, next);
    if (target.type !== 'INFERENCE_RUNTIME') throw invalid(`"${record.inferenceRuntime}" is a ${toolTypeLabel(target.type)} tool, not a local model runtime.`, next);
    if (!target.isEnabled) throw invalid(`The local model runtime "${record.inferenceRuntime}" is disabled.`, `Enable it first: ptbk tool enable ${record.inferenceRuntime}`);
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
            assertRuntimeReference(parsed.tools, record);
            const at = position(record.name, operation.before, operation.after);
            tools.splice(at, 0, serializeTool(record));
            return { tools, summary: `Add ${toolTypeLabel(record.type)} tool ${record.name}`, name: record.name, type: record.type, after: record, noop: false };
        }
        case 'add-together': {
            if (!operation.tools.length) throw invalid('Nothing to add.');
            let current: unknown[] = tools;
            const added: ToolRecord[] = [];
            for (const draft of operation.tools) {
                const step = planToolOperation(current, { kind: 'add', tool: draft });
                current = step.tools;
                added.push(step.after!);
            }
            const last = added[added.length - 1]!;
            return { tools: current, summary: operation.summary, name: last.name, type: last.type, after: last, noop: false };
        }
        case 'modify': {
            const record = recordOf(operation.name);
            const rename = operation.rename && operation.rename !== record.name ? (KEBAB_IDENTIFIER.test(operation.rename) ? operation.rename : kebabIdentifier(operation.rename)) : undefined;
            if (operation.rename && !rename && operation.rename !== record.name) throw invalid(`"${operation.rename}" cannot be a tool name.`);
            if (rename && (indexOf(rename) >= 0 || parsed.tools.some((tool) => tool.name === rename))) throw new PtbkError(`A tool named "${rename}" already exists.`, { kind: 'conflict', effect: 'Nothing was changed.' });
            const next = modifiedRecord(record, operation.changes, rename);
            if (next.type === 'HARNESS' && record.type === 'HARNESS' && next.inferenceRuntime !== record.inferenceRuntime) assertRuntimeReference(parsed.tools, next);
            const index = indexOf(record.name);
            const serialized = serializeTool(next, tools[index] as Record<string, unknown>);
            let noop = JSON.stringify(serialized) === JSON.stringify(tools[index]);
            tools[index] = serialized;
            // Renaming a runtime updates its dependent harness references in the same atomic change.
            if (rename && record.type === 'INFERENCE_RUNTIME') {
                for (const dependent of dependentHarnesses(parsed.tools, record.name)) {
                    const at = indexOf(dependent.name);
                    tools[at] = serializeTool({ ...dependent, inferenceRuntime: rename }, tools[at] as Record<string, unknown>);
                    noop = false;
                }
            }
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
    const immediateDesktopRevocation = plan.type === 'COMPUTER_CONTROL' && (operation.kind === 'disable' || operation.kind === 'remove');
    // A runtime is part of the acquired context of every in-use harness connection that references it.
    const usingDependents = plan.type === 'INFERENCE_RUNTIME' ? dependentHarnesses(tools, plan.name).filter((tool) => inUse.has(tool.name)).map((tool) => tool.name) : [];
    if (!immediateDesktopRevocation && affectsUse && (inUse.has(plan.name) || usingDependents.length) && !acknowledgements.force) {
        found.push({
            kind: 'in-use',
            message: usingDependents.length && !inUse.has(plan.name) ? `The local model runtime "${plan.name}" is in use by active work through ${usingDependents.join(', ')}.` : `The tool "${plan.name}" is in use by active work.`,
            alternatives: [
                `${command} --force    # save now; the work that already acquired the tool finishes with its original configuration (not a kill)`,
                `ptbk stop --force    # stop the whole engine; after it has stopped, repeat: ${command}`,
            ],
        });
    }
    // Baseline types are browsers and harnesses; a harness counts only while its runtime reference (if any) resolves.
    // Runtimes and computer control are optional: losing one matters only when it takes the last usable harness.
    const parsedAfter = parseTools(plan.tools).tools;
    const baselineType = plan.type === 'INFERENCE_RUNTIME' ? 'HARNESS' : plan.type;
    const enabledBefore = tools.filter((tool) => tool.type === baselineType && isEffectivelyEnabled(tools, tool)).length;
    const enabledAfter = parsedAfter.filter((tool) => tool.type === baselineType && isEffectivelyEnabled(parsedAfter, tool)).length;
    if (baselineType !== 'COMPUTER_CONTROL' && (operation.kind === 'disable' || operation.kind === 'remove') && enabledBefore > 0 && enabledAfter === 0 && !acknowledgements.confirmLastOfType) {
        const label = toolTypeLabel(baselineType);
        const dependents = plan.type === 'INFERENCE_RUNTIME' ? dependentHarnesses(tools, plan.name).filter((tool) => tool.isEnabled).map((tool) => tool.name) : [];
        found.push({
            kind: 'last-of-type',
            message:
                plan.type === 'INFERENCE_RUNTIME'
                    ? `Without the local model runtime "${plan.name}", no enabled harness remains usable (${dependents.join(', ')} depend on it). The engine keeps running, but cannot start ordinary new work until another harness is enabled or added. The runtime software and its models stay installed.`
                    : `"${plan.name}" is the last enabled ${label}. The engine keeps running, but cannot start ordinary new work until another ${label} is enabled or added.`,
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
        case 'add-together':
            return `ptbk tool setup-local (${operation.tools.map((tool) => tool.name).join(', ')})`;
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
 * Undoes this operation's own `.gitignore` working-copy change when the secret could not be stored, unless someone
 * changed the file since (their newer content is kept).
 */
async function restoreProtection(protection: { readonly path: string; readonly previous: string | undefined; readonly written: string } | undefined): Promise<void> {
    if (!protection || protection.previous === protection.written) return;
    if ((await readTextIfExists(protection.path).catch(() => undefined)) !== protection.written) return;
    if (protection.previous === undefined) await rm(protection.path, { force: true }).catch(() => undefined);
    else await writeFileAtomic(protection.path, protection.previous).catch(() => undefined);
}

/**
 * Why an environment variable still has a consumer after an operation, or `undefined` when none was found: the
 * post-operation configuration texts (committed and working copy) and every other tracked or untracked, non-ignored
 * project file. A failed search throws: uncertainty is never proof of non-use.
 *
 * @private shared tool management
 */
export async function remainingConsumers(project: Project, repositoryRoot: string, variable: string, configurations: readonly string[]): Promise<string | undefined> {
    const word = new RegExp(`(^|[^A-Za-z0-9_])${variable}([^A-Za-z0-9_]|$)`);
    const configuration = configurations.find((text) => word.test(text));
    if (configuration !== undefined) {
        const raw = JSON.parse(configuration) as Record<string, unknown>;
        const tools = parseTools(Array.isArray(raw.tools) ? (raw.tools as unknown[]) : []).tools;
        const tool = tools.find((entry) => word.test(JSON.stringify(serializeTool(entry))));
        if (tool) return `the tool ${tool.name} (enabled or disabled) still references it`;
        const fields = Object.keys(raw).filter((key) => key !== 'tools' && word.test(JSON.stringify(raw[key])));
        return `ptbk.json still uses it (${fields.map((key) => `\`${key}\``).join(', ') || 'configuration'}${configurations.indexOf(configuration) > 0 ? ', uncommitted working copy' : ''})`;
    }
    const exclude = (path: string): string => `:!${relative(repositoryRoot, path).replace(/\\/g, '/')}`;
    const search = await git(repositoryRoot, ['grep', '--untracked', '-I', '-l', '-w', '-F', variable, '--', '.', exclude(project.configPath), exclude(dotEnvPath(project.root))], { literal: false });
    if (search.exitCode === 0) return `it is also used by ${search.stdout.trim().split('\n').slice(0, 3).join(', ')}`;
    if (search.exitCode !== 1) throw new Error(`searching the project for ${variable} failed: ${(search.spawnError ?? search.stderr.trim()) || `exit ${String(search.exitCode)}`}`);
    return undefined;
}

/**
 * Context of applying an operation (the engine passes its coordination; a stopped project uses safe defaults).
 *
 * @private shared tool management
 */
export type ToolOperationContext = {
    /** A native account verified asynchronously may replace only the configuration it actually verified. */
    readonly expectedTool?: ToolRecord;
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
 * supplied secret, and commits only its own non-secret changes immediately (category `tool.change`), even during an
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
        if (context.expectedTool) {
            const expected = context.expectedTool;
            const expectedConfig = JSON.stringify(serializeTool(expected));
            for (const raw of [head.raw, working.raw]) {
                const current = parseTools(toolsOf(raw)).tools.find(tool => tool.name === expected.name);
                if (!current || JSON.stringify(serializeTool(current)) !== expectedConfig) throw new PtbkError('The tool changed while signing in. Reopen its current setup.', { kind: 'conflict' });
            }
        }
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
        if (plan.type === 'COMPUTER_CONTROL' && (request.operation.kind === 'disable' || request.operation.kind === 'remove')) notes.push('Computer control stops immediately, including observation; acquired work does not retain desktop access.');
        if (plan.type === 'INFERENCE_RUNTIME' && (request.operation.kind === 'disable' || request.operation.kind === 'remove')) {
            const dependents = dependentHarnesses(before, plan.name).map((tool) => tool.name);
            notes.push(`Only this project's reference changes: the ${plan.before?.variant === 'LM_STUDIO' ? 'LM Studio' : 'Ollama'} service and its downloaded models stay installed for other projects.`);
            if (dependents.length) notes.push(`${dependents.join(', ')} ${dependents.length === 1 ? 'is' : 'are'} unavailable for new work until ${request.operation.kind === 'remove' ? 'rebound to another runtime' : 'the runtime is enabled again'} (never reconnected implicitly).`);
        }
        if (plan.type === 'INFERENCE_RUNTIME' && request.operation.kind === 'modify' && request.operation.rename && request.operation.rename !== plan.name) {
            const dependents = dependentHarnesses(before, plan.name).map((tool) => tool.name);
            if (dependents.length) notes.push(`Updated the runtime reference of ${dependents.join(', ')}.`);
        }
        const files: Array<{ path: string; content: string; working: string }> = [];
        // A supplied secret goes only to the ignored local .env (timestamped, non-destructive).
        const envChanges: DotEnvChange[] = [];
        /** Working `.gitignore` before this operation established the protection (restored if it fails). */
        let protection: { readonly path: string; readonly previous: string | undefined; readonly written: string } | undefined;
        if (request.secret) {
            const reference = parseEnvironmentReference((plan.after as HarnessToolRecord | undefined)?.apiKey);
            if (plan.type !== 'HARNESS' || !reference) throw invalid('A secret can only be stored for a HARNESS tool with an apiKey reference.', 'Pass --api-key-env NAME together with --api-key-stdin.');
            if (reference !== request.secret.variable) throw invalid(`The secret is for ${request.secret.variable}, but the tool references ${reference}.`);
            const tracked = await git(repositoryRoot, ['ls-files', '--error-unmatch', '--', dotEnvPath(project.root)], { literal: true });
            if (tracked.exitCode === 0) {
                throw new PtbkError('.env is tracked by Git, so ptbk does not store secrets in it.', { kind: 'conflict', project: project.root, effect: 'Nothing was changed.', next: ['Untrack it (`git rm --cached .env`, commit) and rotate any secret that was committed, then retry.'] });
            }
            const dotEnvFile = dotEnvPath(project.root);
            if (!(await ignoredPaths(project.root, [dotEnvFile])).size) {
                // The effective ignore rule is persisted and verified before the secret is stored, also for a secret-only
                // rotation; a prepared patch alone is not protection. Its versioned change gets its scoped commit below.
                const gitignore = join(project.root, '.gitignore');
                const headIgnore = (await readAtHead(repositoryRoot, gitignore)) ?? '';
                const workingIgnore = await readTextIfExists(gitignore);
                const committed = withIgnoreLine(headIgnore, '.env');
                const workingWithRule = withIgnoreLine(workingIgnore ?? '', '.env') ?? workingIgnore ?? '';
                try {
                    if (workingWithRule !== (workingIgnore ?? '')) await writeFileAtomic(gitignore, workingWithRule);
                    protection = { path: gitignore, previous: workingIgnore, written: workingWithRule };
                    if (!(await ignoredPaths(project.root, [dotEnvFile])).size) throw new Error('Git still does not ignore .env with the added rule (another ignore rule re-includes it)');
                } catch (error) {
                    await restoreProtection(protection);
                    throw new PtbkError('ptbk could not make Git ignore .env, so the secret was not stored.', {
                        kind: 'conflict',
                        project: project.root,
                        reason: errorMessage(error),
                        effect: 'Nothing was changed: .env keeps its previous content and ptbk.json is unchanged.',
                        next: ['Make sure `.env` is ignored (add `.env` to .gitignore and remove any `!.env` rule), then retry.'],
                    });
                }
                if (committed) files.push({ path: gitignore, content: committed, working: workingWithRule });
            }
            envChanges.push({ kind: 'set', name: request.secret.variable, value: request.secret.value });
        }
        // Removal retires a credential only when ptbk added it and nothing else can be using it.
        if (request.operation.kind === 'remove' && plan.before?.type === 'HARNESS') {
            const variable = parseEnvironmentReference(plan.before.apiKey);
            if (variable) {
                // The whole post-operation configuration (committed and working copy, including uncommitted edits such as a
                // check command) is a consumer candidate; only the removed tool's own reference is excluded.
                const postOperation = [JSON.stringify({ ...head.raw, tools: plan.tools }), JSON.stringify({ ...working.raw, tools: workingPlan.tools })];
                const consumers = async (): Promise<string | undefined> => await remainingConsumers(project, repositoryRoot, variable, postOperation);
                const dotEnv = await readDotEnv(project.root);
                const kept = await consumers().catch((error: unknown) => `its remaining consumers could not be established (${errorMessage(error)})`);
                if (kept) notes.push(`${variable} stays active in .env: ${kept}.`);
                else if (!isEngineManagedAssignment(dotEnv, variable)) notes.push(`${variable} stays active: ptbk did not add it, so its other consumers are unknown.`);
                // Rechecked at the coordinated .env write boundary before the assignment is commented out.
                else envChanges.push({ kind: 'retire', name: variable, consumers });
            }
        }
        if (plan.noop && !envChanges.length && !files.length) return { status: 'no-op', summary: `${plan.summary}: nothing to change.`, notes } satisfies ToolOperationOutcome;
        if (envChanges.length) {
            let edit: Awaited<ReturnType<typeof editDotEnv>>;
            try {
                edit = await editDotEnv(project.root, envChanges, { reason: plan.summary.toLowerCase(), operation: commandOf(request.operation), timeZone: context.timeZone });
            } catch (error) {
                // The secret was not stored: the protection added for it is withdrawn rather than left as a silent change.
                await restoreProtection(protection);
                throw error;
            }
            notes.push(...edit.notes);
        }
        if (protection) notes.push('Added .env to .gitignore before storing the secret.');
        let commit: string | undefined;
        if (!plan.noop || files.length) {
            if (!plan.noop) {
                const headConfig = canonicalizeConfig({ ...head.raw, tools: plan.tools }).raw;
                const workingConfig = canonicalizeConfig({ ...working.raw, tools: workingPlan.tools }).raw;
                files.unshift({ path: project.configPath, content: configText(headConfig), working: configText(workingConfig) });
            }
            const result = await commitFileContents({
                projectRoot: project.root,
                repositoryRoot,
                files: files.map((file) => ({ path: file.path, content: file.content })),
                subject: prefixedSubject(plan.noop ? `${plan.summary}: ignore .env before storing its secret` : plan.summary, 'tool.change'),
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
