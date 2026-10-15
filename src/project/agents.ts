import { readFile, realpath } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { isPathInside, listDirectory, sha256, toProjectRelative } from '../common/fs.js';
import { commitmentsOf, parseBook, singleValue, type BookDocument } from '../book/parse.js';
import { findAgentReferences, nonAgentOf, normalizeAgentName, parseReferenceValue, type NonAgentName } from '../book/references.js';
import { expertInstructions } from './expert.js';
import { inspectGit, listIgnoredEntries, listProjectFiles } from './git.js';
import { RUNTIME_DIRECTORY_NAME } from './workspace.js';

/**
 * Lookup tier of a project agent definition (tier 1 are the engine non-agents).
 *
 * - 2: the agents directory (recursively, including hidden and ignored content there)
 * - 3: other non-ignored project Books
 * - 4: Git-ignored project content outside the agents directory (e.g. node_modules)
 *
 * @private agent resolution
 */
export type AgentTier = 2 | 3 | 4;

/**
 * One agent Book found in the project.
 *
 * @private agent resolution
 */
export type AgentDefinition = {
    /** Declared display name (first nonempty line). */
    readonly name: string;
    /** Normalized comparison key. */
    readonly normalized: string;
    /** Absolute Book path. */
    readonly path: string;
    /** Project-relative POSIX path. */
    readonly relativePath: string;
    /** Lookup tier. */
    readonly tier: AgentTier;
    /** Inside a hidden directory of the agents directory (supporting definition). */
    readonly hidden: boolean;
    /** Inside `agents/.core/`. */
    readonly core: boolean;
    /** Parsed document. */
    readonly document: BookDocument;
    /** Content hash (for consistent snapshots). */
    readonly hash: string;
};

/**
 * A problem with agent definitions, located in a file.
 *
 * @private agent resolution
 */
export type AgentDiagnostic = {
    /** Project-relative path ('' when not file-specific). */
    readonly path: string;
    /** 1-based line (0 when not line-specific). */
    readonly line: number;
    /** Explanation. */
    readonly message: string;
    /** Errors make the affected agent unusable. */
    readonly severity: 'error' | 'warning';
};

/**
 * Result of resolving an agent reference.
 *
 * @private agent resolution
 */
export type AgentResolution =
    | { readonly kind: 'non-agent'; readonly name: NonAgentName }
    | { readonly kind: 'agent'; readonly definition: AgentDefinition }
    | { readonly kind: 'ambiguous'; readonly tier: AgentTier; readonly candidates: readonly AgentDefinition[] }
    | { readonly kind: 'missing'; readonly incomplete?: string }
    | { readonly kind: 'invalid'; readonly reason: string };

/**
 * Upper bound of files inspected in ignored content (keeps lookup bounded in huge dependency trees).
 */
const MAX_IGNORED_FILES = 60_000;

/**
 * Directories never searched for agents.
 */
const NEVER_SEARCH = new Set(['.git', RUNTIME_DIRECTORY_NAME]);

/**
 * Root-level task audit evidence: tracked or ignored, it is never a source of agent definitions.
 */
const TRACES_DIRECTORY_NAME = 'traces';

/**
 * Whether a path is inside the project's root-level `traces/` evidence directory.
 */
function isTraceEvidence(root: string, path: string): boolean {
    return isPathInside(join(root, TRACES_DIRECTORY_NAME), path);
}

/**
 * Recursively collects `.book` files without following directory symlinks.
 */
async function walkBooks(directory: string, root: string, budget: { files: number }, skipDirectory: (path: string, name: string) => boolean): Promise<string[]> {
    const found: string[] = [];
    const stack = [directory];
    while (stack.length) {
        const current = stack.pop()!;
        for (const entry of await listDirectory(current)) {
            if (--budget.files < 0) return found;
            const path = join(current, entry.name);
            if (entry.isDirectory) {
                if (NEVER_SEARCH.has(entry.name) || skipDirectory(path, entry.name)) continue;
                stack.push(path);
            } else if ((entry.isFile || entry.isSymbolicLink) && entry.name.toLowerCase().endsWith('.book')) {
                if (entry.isSymbolicLink) {
                    try {
                        if (!isPathInside(await realpath(root), await realpath(path))) continue;
                    } catch {
                        continue;
                    }
                }
                found.push(path);
            }
        }
    }
    return found;
}

/**
 * The project's agent definitions with lazy loading of the ignored tier.
 *
 * @private agent resolution
 */
export class AgentCatalog {
    /** Definitions by tier (tier 4 only after `loadIgnoredTier`). */
    private readonly definitions: AgentDefinition[] = [];
    /** Problems found while loading. */
    public readonly diagnostics: AgentDiagnostic[] = [];
    /** Whether the ignored tier was searched. */
    private ignoredLoaded = false;
    /** Explanation when the ignored tier search was incomplete. */
    private ignoredIncomplete?: string;

    private constructor(
        /** Absolute project root. */
        public readonly root: string,
        /** Absolute agents directory. */
        public readonly agentsDirectory: string,
        /** Whether the project is in a Git working tree (needed to classify ignored content). */
        private readonly inGit: boolean,
    ) {}

    /**
     * Loads tiers 2 and 3 of a project (read-only; never creates files).
     */
    public static async load(root: string, agentsDirectory = 'agents'): Promise<AgentCatalog> {
        const absoluteAgents = resolve(root, agentsDirectory);
        const gitInfo = await inspectGit(root);
        const catalog = new AgentCatalog(root, absoluteAgents, gitInfo.state === 'repository');
        const budget = { files: MAX_IGNORED_FILES };
        for (const path of await walkBooks(absoluteAgents, root, budget, () => false)) await catalog.add(path, 2);
        let others: string[];
        if (catalog.inGit) {
            others = (await listProjectFiles(root)).filter((path) => path.toLowerCase().endsWith('.book'));
        } else {
            others = await walkBooks(root, root, budget, (path, name) => name === 'node_modules' || isPathInside(absoluteAgents, path) || isTraceEvidence(root, path));
        }
        for (const path of others) {
            if (isPathInside(absoluteAgents, path) || path.split(sep).includes(RUNTIME_DIRECTORY_NAME) || isTraceEvidence(root, path)) continue;
            await catalog.add(path, 3);
        }
        catalog.validateTiers();
        return catalog;
    }

    /**
     * Searches Git-ignored content outside the agents directory (tier 4), once.
     */
    public async loadIgnoredTier(): Promise<void> {
        if (this.ignoredLoaded) return;
        this.ignoredLoaded = true;
        const budget = { files: MAX_IGNORED_FILES };
        try {
            const entries = this.inGit ? await listIgnoredEntries(this.root) : [join(this.root, 'node_modules')];
            for (const entry of entries) {
                if (isPathInside(this.agentsDirectory, entry) || entry.split(sep).includes(RUNTIME_DIRECTORY_NAME) || entry.split(sep).includes('.git') || isTraceEvidence(this.root, entry)) continue;
                if (entry.toLowerCase().endsWith('.book')) {
                    await this.add(entry, 4);
                    continue;
                }
                for (const path of await walkBooks(entry, this.root, budget, (candidate) => isTraceEvidence(this.root, candidate))) await this.add(path, 4);
                if (budget.files < 0) break;
            }
            if (budget.files < 0) this.ignoredIncomplete = `the ignored-content search stopped after ${MAX_IGNORED_FILES} entries`;
        } catch (error) {
            this.ignoredIncomplete = `the ignored-content search failed: ${(error as Error).message}`;
        }
        this.validateTiers();
    }

    /**
     * Reads one Book and records it when it declares an agent.
     */
    private async add(path: string, tier: AgentTier): Promise<void> {
        const absolute = resolve(path);
        if (this.definitions.some((definition) => definition.path === absolute)) return;
        let source: string;
        try {
            source = await readFile(absolute, 'utf8');
        } catch (error) {
            this.diagnostics.push({ path: toProjectRelative(this.root, absolute), line: 0, message: `Unreadable Book: ${(error as Error).message}`, severity: 'warning' });
            return;
        }
        const document = parseBook(source);
        if (document.kind !== 'agent') return;
        const relativePath = toProjectRelative(this.root, absolute);
        const insideAgents = isPathInside(this.agentsDirectory, absolute);
        const segments = insideAgents ? toProjectRelative(this.agentsDirectory, absolute).split('/').slice(0, -1) : [];
        const definition: AgentDefinition = {
            name: document.name,
            normalized: normalizeAgentName(document.name),
            path: absolute,
            relativePath,
            tier,
            hidden: segments.some((segment) => segment.startsWith('.')),
            core: segments[0] === '.core',
            document,
            hash: sha256(source),
        };
        if (!definition.normalized) {
            this.diagnostics.push({ path: relativePath, line: document.headerLine + 1, message: 'The agent name is empty after normalization.', severity: 'error' });
            return;
        }
        const reserved = nonAgentOf(definition.normalized);
        if (reserved) {
            this.diagnostics.push({
                path: relativePath,
                line: document.headerLine + 1,
                message: `"${document.name}" is reserved for the engine-supplied ${reserved}; this file cannot replace it.`,
                severity: 'error',
            });
            return;
        }
        for (const diagnostic of document.diagnostics) this.diagnostics.push({ path: relativePath, line: diagnostic.line, message: diagnostic.message, severity: diagnostic.severity });
        this.definitions.push(definition);
    }

    /**
     * Reports same-tier collisions (they are only errors when the name is resolved at that tier).
     */
    private validateTiers(): void {
        const seen = new Set(this.diagnostics.map((diagnostic) => `${diagnostic.path}:${diagnostic.message}`));
        const groups = new Map<string, AgentDefinition[]>();
        for (const definition of this.definitions) {
            const key = `${definition.tier}:${definition.normalized}`;
            groups.set(key, [...(groups.get(key) ?? []), definition]);
        }
        for (const group of groups.values()) {
            if (group.length < 2) continue;
            const winningTier = this.winningTier(group[0]!.normalized);
            if (winningTier !== group[0]!.tier) continue;
            const message = `Agent name "${group[0]!.name}" is defined ${group.length} times in tier ${group[0]!.tier}: ${group.map((definition) => definition.relativePath).join(', ')}.`;
            if (seen.has(`:${message}`)) continue;
            this.diagnostics.push({ path: '', line: 0, message, severity: 'error' });
        }
    }

    /**
     * Lowest (highest-priority) tier defining a normalized name.
     */
    private winningTier(normalized: string): AgentTier | undefined {
        const tiers = this.definitions.filter((definition) => definition.normalized === normalized).map((definition) => definition.tier);
        return tiers.length ? (Math.min(...tiers) as AgentTier) : undefined;
    }

    /**
     * All loaded definitions.
     */
    public all(): readonly AgentDefinition[] {
        return this.definitions;
    }

    /**
     * Ordinary project roles: candidates for Manager assignment and goal discovery.
     *
     * Hidden/core supporting definitions and dependency-provided (ignored) definitions are excluded.
     */
    public ordinary(): AgentDefinition[] {
        const result: AgentDefinition[] = [];
        for (const definition of this.definitions) {
            if (definition.tier === 4 || definition.hidden) continue;
            const resolution = this.resolveLoaded(definition.normalized);
            if (resolution.kind === 'agent' && resolution.definition === definition) result.push(definition);
        }
        return result;
    }

    /**
     * Resolves among loaded tiers only.
     */
    private resolveLoaded(normalized: string): AgentResolution {
        const nonAgent = nonAgentOf(normalized);
        if (nonAgent) return { kind: 'non-agent', name: nonAgent };
        for (const tier of [2, 3, 4] as const) {
            const matches = this.definitions.filter((definition) => definition.tier === tier && definition.normalized === normalized);
            if (matches.length === 1) return { kind: 'agent', definition: matches[0]! };
            if (matches.length > 1) return { kind: 'ambiguous', tier, candidates: matches };
        }
        return { kind: 'missing' };
    }

    /**
     * Resolves a reference (`@Name`, `{Name}` or a bare name) through the ordered tiers.
     */
    public async resolve(reference: string): Promise<AgentResolution> {
        const parsed = parseReferenceValue(reference);
        if (!parsed) return { kind: 'invalid', reason: `"${reference}" is not a valid agent reference.` };
        const loaded = this.resolveLoaded(parsed.normalized);
        if (loaded.kind !== 'missing') return loaded;
        await this.loadIgnoredTier();
        const withIgnored = this.resolveLoaded(parsed.normalized);
        if (withIgnored.kind === 'missing' && this.ignoredIncomplete) return { kind: 'missing', incomplete: this.ignoredIncomplete };
        return withIgnored;
    }
}

/**
 * Describes a resolution failure for diagnostics.
 *
 * @private agent resolution
 */
export function describeResolution(reference: string, resolution: AgentResolution): string | undefined {
    switch (resolution.kind) {
        case 'agent':
        case 'non-agent':
            return undefined;
        case 'ambiguous':
            return `Agent reference ${reference} is ambiguous in tier ${resolution.tier}: ${resolution.candidates.map((candidate) => candidate.relativePath).join(', ')}.`;
        case 'missing':
            return `Agent ${reference} was not found${resolution.incomplete ? ` (lookup incomplete: ${resolution.incomplete})` : ''}.`;
        case 'invalid':
            return resolution.reason;
    }
}

/**
 * One instruction of an effective agent, attributed to its source.
 *
 * @private agent resolution
 */
export type EffectiveInstruction = {
    /** Canonical keyword, or `PROSE` for natural text. */
    readonly keyword: string;
    /** Instruction text. */
    readonly text: string;
    /** Agent name supplying it. */
    readonly agent: string;
    /** Project-relative path, or `engine` for Expert. */
    readonly source: string;
};

/**
 * Learning permission of an agent's own Book.
 *
 * @private agent resolution
 */
export type LearningPolicy = { readonly open: true; readonly limits?: string } | { readonly open: false };

/**
 * An agent with its inherited and imported instructions resolved.
 *
 * @private agent resolution
 */
export type EffectiveAgent = {
    /** Display name. */
    readonly name: string;
    /** Normalized identity (stable across moves). */
    readonly normalized: string;
    /** Definition for project agents; undefined for Expert. */
    readonly definition?: AgentDefinition;
    /** Inheritance chain from the agent to its foundation. */
    readonly chain: readonly string[];
    /** Instructions in effective order (foundation first). */
    readonly instructions: readonly EffectiveInstruction[];
    /** Local GOAL texts. */
    readonly goals: readonly string[];
    /** TEAM texts (local and inherited). */
    readonly team: readonly string[];
    /** Agent's own learning permission. */
    readonly learning: LearningPolicy;
    /** MODEL preferences (local first). */
    readonly modelPreferences: readonly string[];
    /** Problems; any error makes the agent unusable. */
    readonly diagnostics: readonly AgentDiagnostic[];
};

/**
 * Keywords that are not instructions for the model.
 */
const NON_INSTRUCTION_KEYWORDS = new Set(['FROM', 'IMPORT', 'OPEN', 'CLOSED', 'NOTE', 'DELETE']);

/**
 * Determines the learning permission declared by an agent's own Book.
 *
 * @private agent resolution
 */
export function learningPolicyOf(document: BookDocument): LearningPolicy {
    const last = [...document.commitments].reverse().find((commitment) => commitment.keyword === 'OPEN' || commitment.keyword === 'CLOSED');
    if (!last || last.keyword === 'OPEN') return { open: true, limits: last?.body || undefined };
    return { open: false };
}

/**
 * Resolves the effective definition of an agent (inheritance, imports, deletions).
 *
 * @private agent resolution
 */
export async function resolveEffectiveAgent(catalog: AgentCatalog, reference: string): Promise<EffectiveAgent> {
    const diagnostics: AgentDiagnostic[] = [];
    const resolution = await catalog.resolve(reference);
    if (resolution.kind === 'non-agent') {
        if (resolution.name === 'Expert') {
            return {
                name: 'Expert',
                normalized: 'expert',
                chain: ['Expert'],
                instructions: [{ keyword: 'PERSONA', text: await expertInstructions(), agent: 'Expert', source: 'engine' }],
                goals: [],
                team: [],
                learning: { open: false },
                modelPreferences: [],
                diagnostics,
            };
        }
        diagnostics.push({ path: '', line: 0, message: `${resolution.name} is an engine non-agent and cannot perform tasks.`, severity: 'error' });
        return { name: resolution.name, normalized: normalizeAgentName(resolution.name), chain: [], instructions: [], goals: [], team: [], learning: { open: false }, modelPreferences: [], diagnostics };
    }
    if (resolution.kind !== 'agent') {
        diagnostics.push({ path: '', line: 0, message: describeResolution(reference, resolution)!, severity: 'error' });
        const parsed = parseReferenceValue(reference);
        return {
            name: parsed?.name ?? reference,
            normalized: parsed?.normalized ?? normalizeAgentName(reference),
            chain: [],
            instructions: [],
            goals: [],
            team: [],
            learning: { open: false },
            modelPreferences: [],
            diagnostics,
        };
    }
    const target = resolution.definition;
    const chain: string[] = [];
    const layers: EffectiveInstruction[][] = [];
    const teams: string[] = [];
    const visited = new Set<string>();
    let current: AgentDefinition | 'Expert' | undefined = target;
    while (current) {
        if (current === 'Expert') {
            chain.push('Expert');
            layers.push([{ keyword: 'KNOWLEDGE', text: await expertInstructions(), agent: 'Expert', source: 'engine' }]);
            break;
        }
        if (visited.has(current.normalized)) {
            diagnostics.push({ path: current.relativePath, line: 0, message: `Inheritance cycle: ${[...chain, current.name].join(' → ')}.`, severity: 'error' });
            break;
        }
        visited.add(current.normalized);
        chain.push(current.name);
        layers.push(await localInstructions(catalog, current, diagnostics, new Set([current.normalized])));
        for (const team of commitmentsOf(current.document, 'TEAM')) teams.push(team.body);
        const from = singleValue(current.document, 'FROM');
        if (from.conflict) diagnostics.push({ path: current.relativePath, line: from.conflict.line, message: from.conflict.message, severity: 'error' });
        const parentReference = from.value ?? 'Adam';
        const parentParsed = parseReferenceValue(parentReference);
        if (!parentParsed) {
            diagnostics.push({ path: current.relativePath, line: (from.commitment?.startLine ?? 0) + 1, message: `FROM "${parentReference}" is not a valid reference.`, severity: 'error' });
            break;
        }
        const parent = await catalog.resolve(parentReference);
        if (parent.kind === 'non-agent') {
            if (parent.name === 'Void') break;
            if (parent.name === 'User') {
                diagnostics.push({ path: current.relativePath, line: (from.commitment?.startLine ?? 0) + 1, message: 'User cannot be an inheritance parent (FROM User is invalid).', severity: 'error' });
                break;
            }
            current = 'Expert';
            continue;
        }
        if (parent.kind !== 'agent') {
            diagnostics.push({
                path: current.relativePath,
                line: (from.commitment?.startLine ?? 0) + 1,
                message: `${describeResolution(parentReference, parent)}${from.value ? '' : ' (implicit parent of every agent without FROM)'}`,
                severity: 'error',
            });
            break;
        }
        current = parent.definition;
    }
    const instructions = applyDeletions(layers.reverse().flat(), target, diagnostics);
    return {
        name: target.name,
        normalized: target.normalized,
        definition: target,
        chain,
        instructions,
        goals: commitmentsOf(target.document, 'GOAL').map((goal) => goal.body),
        team: teams,
        learning: learningPolicyOf(target.document),
        modelPreferences: commitmentsOf(target.document, 'MODEL').map((model) => model.body),
        diagnostics,
    };
}

/**
 * Collects one Book's own instructions, inlining IMPORTs at their position.
 */
async function localInstructions(catalog: AgentCatalog, definition: AgentDefinition, diagnostics: AgentDiagnostic[], importing: Set<string>): Promise<EffectiveInstruction[]> {
    const result: EffectiveInstruction[] = [];
    if (definition.document.intro) result.push({ keyword: 'PROSE', text: definition.document.intro, agent: definition.name, source: definition.relativePath });
    for (const commitment of definition.document.commitments) {
        if (commitment.keyword === 'IMPORT') {
            const imported = await catalog.resolve(commitment.value);
            if (imported.kind !== 'agent') {
                diagnostics.push({
                    path: definition.relativePath,
                    line: commitment.startLine + 1,
                    message: `IMPORT ${commitment.value}: ${describeResolution(commitment.value, imported) ?? 'only project agents can be imported.'}`,
                    severity: 'error',
                });
                continue;
            }
            if (importing.has(imported.definition.normalized)) {
                diagnostics.push({ path: definition.relativePath, line: commitment.startLine + 1, message: `IMPORT cycle through ${imported.definition.name}.`, severity: 'error' });
                continue;
            }
            result.push(...(await localInstructions(catalog, imported.definition, diagnostics, new Set([...importing, imported.definition.normalized]))));
            continue;
        }
        if (commitment.keyword === 'DELETE') {
            result.push({ keyword: 'DELETE', text: commitment.body, agent: definition.name, source: definition.relativePath });
            continue;
        }
        if (NON_INSTRUCTION_KEYWORDS.has(commitment.keyword) || commitment.definition.scope === 'task') {
            if (commitment.definition.kind === 'control' && commitment.continuation) {
                result.push({ keyword: 'PROSE', text: commitment.continuation, agent: definition.name, source: definition.relativePath });
            }
            continue;
        }
        if (commitment.body) result.push({ keyword: commitment.keyword, text: commitment.body, agent: definition.name, source: definition.relativePath });
    }
    return result;
}

/**
 * Normalizes text for DELETE matching.
 */
function comparable(text: string): string {
    return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Applies DELETE instructions to earlier instructions.
 */
function applyDeletions(instructions: EffectiveInstruction[], target: AgentDefinition, diagnostics: AgentDiagnostic[]): EffectiveInstruction[] {
    const result: EffectiveInstruction[] = [];
    for (const instruction of instructions) {
        if (instruction.keyword !== 'DELETE') {
            result.push(instruction);
            continue;
        }
        const match = /^([A-Z][A-Z ]*?)\s+(.*)$/s.exec(instruction.text);
        const keyword = match && /^[A-Z ]+$/.test(match[1]!) ? match[1]!.trim() : undefined;
        const text = comparable(keyword ? match![2]! : instruction.text);
        const candidates = result
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => (!keyword || item.keyword === keyword) && comparable(item.text) === text);
        if (candidates.length === 0) {
            diagnostics.push({ path: target.relativePath, line: 0, message: `DELETE "${instruction.text}" matches no earlier commitment.`, severity: 'warning' });
        } else if (new Set(candidates.map(({ item }) => item.keyword)).size > 1) {
            diagnostics.push({ path: target.relativePath, line: 0, message: `DELETE "${instruction.text}" is ambiguous; prefix it with the commitment keyword.`, severity: 'error' });
        } else {
            for (const { index } of candidates.reverse()) result.splice(index, 1);
        }
    }
    return result;
}

/**
 * Agent references found in TEAM texts.
 *
 * @private agent resolution
 */
export function teamReferences(agent: EffectiveAgent): string[] {
    return [...new Set(agent.team.flatMap((text) => findAgentReferences(text).map((reference) => reference.raw)))];
}

/**
 * Validates every loaded agent (inheritance termination, reserved names, Teacher closure) for `lint`/`fix`/init.
 *
 * @private agent resolution
 */
export async function validateAgents(catalog: AgentCatalog): Promise<AgentDiagnostic[]> {
    const diagnostics: AgentDiagnostic[] = [...catalog.diagnostics];
    for (const definition of catalog.all()) {
        if (definition.tier === 4) continue;
        const effective = await resolveEffectiveAgent(catalog, `{${definition.name}}`);
        if (effective.definition !== definition) continue;
        for (const diagnostic of effective.diagnostics) {
            if (!diagnostics.some((existing) => existing.message === diagnostic.message && existing.path === diagnostic.path)) diagnostics.push(diagnostic);
        }
        if (definition.normalized === 'teacher' && effective.learning.open) {
            diagnostics.push({
                path: definition.relativePath,
                line: 0,
                message: 'Teacher must end with CLOSED; an open Teacher would teach itself in an endless loop. Learning tasks are not run until this is fixed.',
                severity: 'error',
            });
        }
        const openOrClosed = definition.document.commitments.filter((commitment) => commitment.keyword === 'OPEN' || commitment.keyword === 'CLOSED');
        const lastCommitment = definition.document.commitments[definition.document.commitments.length - 1];
        if (openOrClosed.length && lastCommitment && lastCommitment.keyword !== 'OPEN' && lastCommitment.keyword !== 'CLOSED') {
            diagnostics.push({ path: definition.relativePath, line: openOrClosed[0]!.startLine + 1, message: 'OPEN/CLOSED should be the final declaration.', severity: 'warning' });
        }
        if (new Set(openOrClosed.map((commitment) => commitment.keyword)).size > 1) {
            diagnostics.push({ path: definition.relativePath, line: openOrClosed[0]!.startLine + 1, message: 'OPEN and CLOSED conflict; the final declaration wins.', severity: 'warning' });
        }
    }
    return diagnostics;
}

