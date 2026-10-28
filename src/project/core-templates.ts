import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { formatAgentReference } from '../book/references.js';
import { ensureDirectory, readJsonIfExists, readTextIfExists, writeJsonAtomic } from '../common/fs.js';
import { shortHash } from '../common/ids.js';
import { ENGINE_VERSION } from '../common/version.js';
import { nameKey } from '../tasks/model.js';
import { AgentCatalog } from './agents.js';
import { CORE_AGENTS, ROUTER_NAME, type CoreBookInput } from './defaults.js';

/**
 * Persistent provenance of one installed core Book: the exact engine template it was created from or last
 * reconciled with, the inputs that produced it and the engine version.
 */
type CoreBaseline = {
    /** Exact template text. */
    readonly template: string;
    /** Inputs of a dynamic template (Chatter's initial TEAM, Router's bootstrap MODEL). */
    readonly input: CoreBookInput;
    /** Engine version that recorded it. */
    readonly engineVersion: string;
    readonly recordedAt: string;
};

/**
 * `.ptbk/core-templates.json`: baselines by core file (relative to the agents directory). Persistent ignored project
 * metadata, not a cache: cleanup never removes it.
 */
type CoreBaselines = { readonly version: 1; readonly baselines: Readonly<Record<string, CoreBaseline>> };

/**
 * Why a core Book needs Fixer's judgment instead of a deterministic update.
 *
 * @private core agent preparation
 */
export type CoreConflict = {
    /** Core file relative to the agents directory. */
    readonly file: string;
    /** Role name. */
    readonly name: string;
    /** Absolute path of the project Book. */
    readonly path: string;
    /** `overlap`: local and upstream changes touch the same lines; `unknown-baseline`: no verifiable baseline. */
    readonly reason: 'overlap' | 'unknown-baseline';
    /** The old baseline when known. */
    readonly baseline?: string;
    /** The new engine template. */
    readonly template: string;
};

/**
 * Outcome of one preparation pass.
 *
 * @private core agent preparation
 */
export type CorePreparation = {
    /** Newly created core Books (absolute paths). */
    readonly created: readonly string[];
    /** Core Books updated by a clean three-way merge (absolute paths). */
    readonly updated: readonly string[];
    /** Books whose update needs Fixer (their files are left unchanged and their baselines stay old). */
    readonly conflicts: readonly CoreConflict[];
    /**
     * Records the new templates of reconciled conflicts as their baselines (after Fixer's reconciliation finished), so
     * repeated preparation is a no-op and the same update is never repeated.
     */
    readonly resolve: (files: readonly string[]) => Promise<void>;
    /** A stable fingerprint of the conflicting upstream templates (deduplicates the Fixer repair). */
    readonly fingerprint: string;
};

/**
 * Result of a line-based three-way merge.
 *
 * @private core agent preparation
 */
export type MergeResult = { readonly clean: true; readonly text: string } | { readonly clean: false };

/**
 * Longest-common-subsequence matching of two line lists: `match[i]` is the index in `b` paired with `a[i]`.
 */
function matchLines(a: readonly string[], b: readonly string[]): Array<number | undefined> {
    const lengths: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) lengths[i]![j] = a[i] === b[j] ? lengths[i + 1]![j + 1]! + 1 : Math.max(lengths[i + 1]![j]!, lengths[i]![j + 1]!);
    const match: Array<number | undefined> = new Array(a.length).fill(undefined);
    for (let i = 0, j = 0; i < a.length && j < b.length; ) {
        if (a[i] === b[j]) {
            match[i] = j;
            i++;
            j++;
        } else if (lengths[i + 1]![j]! >= lengths[i]![j + 1]!) i++;
        else j++;
    }
    return match;
}

/**
 * Line-based three-way merge (diff3) of a base text with two independently changed versions. Regions changed on one
 * side only take that side; identical changes are taken once; different changes of the same region (including
 * different insertions at the same position) are a conflict, never silently resolved.
 *
 * @private core agent preparation
 */
export function threeWayMerge(base: string, ours: string, theirs: string): MergeResult {
    if (ours === theirs || theirs === base) return { clean: true, text: ours };
    if (ours === base) return { clean: true, text: theirs };
    const [o, a, b] = [base, ours, theirs].map((text) => text.split('\n')) as [string[], string[], string[]];
    const toOurs = matchLines(o, a);
    const toTheirs = matchLines(o, b);
    const output: string[] = [];
    const same = (left: readonly string[], right: readonly string[]): boolean => left.length === right.length && left.every((line, index) => line === right[index]);
    let [lo, la, lb] = [0, 0, 0];
    for (;;) {
        let stable = lo;
        while (stable < o.length && (toOurs[stable] === undefined || toTheirs[stable] === undefined)) stable++;
        const end = stable < o.length;
        const chunk = { base: o.slice(lo, stable), ours: a.slice(la, end ? toOurs[stable] : a.length), theirs: b.slice(lb, end ? toTheirs[stable] : b.length) };
        if (same(chunk.ours, chunk.base)) output.push(...chunk.theirs);
        else if (same(chunk.theirs, chunk.base) || same(chunk.ours, chunk.theirs)) output.push(...chunk.ours);
        else return { clean: false };
        if (!end) break;
        output.push(o[stable]!);
        [lo, la, lb] = [stable + 1, toOurs[stable]! + 1, toTheirs[stable]! + 1];
    }
    return { clean: true, text: output.join('\n') };
}

/**
 * Path of the persistent baseline metadata.
 */
function baselinesPath(runtimeRoot: string): string {
    return join(runtimeRoot, 'core-templates.json');
}

/**
 * The single MODEL line content of an existing Router (its effective bootstrap input when no baseline is known).
 */
function routerModelOf(source: string): string | undefined {
    const models = source.split(/\r?\n/).filter((line) => /^MODEL\s/.test(line));
    return models.length === 1 ? models[0]!.replace(/^MODEL\s+/, '').trim() : undefined;
}

/**
 * The one shared, idempotent preparation of **all** required core agents, used by both init and start: creates
 * missing roles from small templates and maintains existing ones through a three-way update of old baseline, new
 * engine template and current project Book. Unambiguous upstream changes are applied while independent user/learned
 * changes are preserved; overlaps and unverifiable baselines are returned as conflicts for ordinary Fixer work (the
 * file stays unchanged). It never calls a model, never resets a customized Book and records a new baseline only after
 * a successful update. Repeated preparation against the same templates changes nothing.
 *
 * @private core agent preparation
 */
export async function prepareCoreAgents(
    root: string,
    agentsDirectory: string,
    options: { readonly runtimeRoot: string; readonly routerModel?: () => Promise<string | undefined> },
): Promise<CorePreparation> {
    const metadataPath = baselinesPath(options.runtimeRoot);
    const saved = await readJsonIfExists<CoreBaselines>(metadataPath).catch(() => undefined);
    const baselines: Record<string, CoreBaseline> = { ...(saved?.version === 1 ? saved.baselines : {}) };
    const created: string[] = [];
    const updated: string[] = [];
    const conflicts: CoreConflict[] = [];
    const conflictInputs = new Map<string, CoreBookInput>();
    let changed = false;
    const record = (file: string, template: string, input: CoreBookInput): void => {
        baselines[file] = { template, input, engineVersion: ENGINE_VERSION, recordedAt: new Date().toISOString() };
        changed = true;
    };
    for (const agent of CORE_AGENTS) {
        const catalog = await AgentCatalog.load(root, agentsDirectory);
        const path = join(root, agentsDirectory, agent.file);
        const current = await readTextIfExists(path);
        if (current === undefined) {
            // A role is present when any Book already uses its name or a former name (even one needing conversion).
            if ([agent.name, ...(agent.aliases ?? [])].some((name) => catalog.index.winnerOf(nameKey(name)))) continue;
            const teammates = catalog.index
                .winners('agent')
                .filter((entry) => entry.kind === 'agent' && entry.tier !== 4 && entry.normalized !== nameKey(agent.name))
                .map((entry) => formatAgentReference(entry.name));
            const input: CoreBookInput = { teammates, ...(agent.name === ROUTER_NAME ? { routerModel: await options.routerModel?.() } : {}) };
            const content = agent.content(input);
            await ensureDirectory(join(root, agentsDirectory, '.core'));
            await writeFile(path, content, { flag: 'wx' });
            created.push(path);
            record(agent.file, content, input);
            continue;
        }
        const known = baselines[agent.file];
        const input: CoreBookInput = known?.input ?? {
            teammates: catalog.index
                .winners('agent')
                .filter((entry) => entry.kind === 'agent' && entry.tier !== 4 && entry.normalized !== nameKey(agent.name))
                .map((entry) => formatAgentReference(entry.name)),
            ...(agent.name === ROUTER_NAME ? { routerModel: routerModelOf(current) } : {}),
        };
        const template = agent.content(input);
        if (known?.template === template) continue;
        if (current === template) {
            record(agent.file, template, input);
            continue;
        }
        // Without a recorded baseline only exact earlier engine templates are verifiable bases; an unchanged template
        // needs no update at all.
        const bases = known ? [known.template] : (agent.previous ?? []).map((previous) => previous(input));
        if (!known && !bases.length) {
            record(agent.file, template, input);
            continue;
        }
        const merges = bases.map((base) => ({ base, merged: threeWayMerge(base, current, template) }));
        const clean = merges.find((candidate) => candidate.merged.clean);
        if (clean?.merged.clean) {
            if (clean.merged.text !== current) {
                await writeFile(path, clean.merged.text);
                updated.push(path);
            }
            record(agent.file, template, input);
            continue;
        }
        conflicts.push({ file: agent.file, name: agent.name, path, reason: known ? 'overlap' : 'unknown-baseline', ...(known ? { baseline: known.template } : {}), template });
        conflictInputs.set(agent.file, input);
    }
    const save = async (): Promise<void> => {
        await ensureDirectory(options.runtimeRoot);
        await writeJsonAtomic(metadataPath, { version: 1, baselines } satisfies CoreBaselines);
    };
    if (changed) await save();
    return {
        created,
        updated,
        conflicts,
        fingerprint: shortHash(conflicts.map((conflict) => `${conflict.file}\0${conflict.template}`).join('\0'), 16),
        resolve: async (files) => {
            for (const conflict of conflicts) {
                if (!files.includes(conflict.file)) continue;
                baselines[conflict.file] = { template: conflict.template, input: conflictInputs.get(conflict.file) ?? { teammates: [] }, engineVersion: ENGINE_VERSION, recordedAt: new Date().toISOString() };
            }
            await save();
        },
    };
}

/**
 * The assignment of the one Fixer task reconciling core template updates that could not be applied deterministically.
 *
 * @private core agent preparation
 */
export function coreReconciliationDescription(conflicts: readonly CoreConflict[], agentsDirectory: string): string {
    const parts = conflicts.map((conflict) =>
        [
            `### ${conflict.name} (\`${agentsDirectory}/${conflict.file}\`)`,
            conflict.reason === 'overlap'
                ? 'The project changed the same part of this Book that the new engine template changes.'
                : 'No verifiable template baseline is recorded for this Book (it predates template tracking), and it differs from the engine templates.',
            ...(conflict.baseline ? ['Old engine template (the baseline):', '```book', conflict.baseline.trimEnd(), '```'] : []),
            'New engine template:',
            '```book',
            conflict.template.trimEnd(),
            '```',
        ].join('\n'),
    );
    return [
        'The engine updated its default core agent templates, but these project Books could not be updated automatically. Reconcile each one: adopt the useful upstream changes while preserving every project-specific and learned instruction, customized TEAM membership and consultation policy. Do not duplicate commitments that are already present and do not reset the Book to the template.',
        'Resolve justified overlaps yourself under the current project policy; ask User only when their decision is actually needed. Keeping the project version unchanged is a valid outcome when the upstream change does not fit this project.',
        ...parts,
        `Reference: ${formatAgentReference('Expert')} knows the current Book syntax.`,
    ].join('\n\n');
}
