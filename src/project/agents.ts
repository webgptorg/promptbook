import { withdrawnKeyword } from '../book/commitments.js';
import { commitmentsOf, singleValue, type BookDocument } from '../book/parse.js';
import { findAgentReferences, normalizeAgentName, parseReferenceValue, type NonAgentName } from '../book/references.js';
import { BookIndex, type BookDiagnostic as BookIndexDiagnostic, type BookEntry, type BookTier } from './books.js';
import { expertInstructions } from './expert.js';

/**
 * Lookup tier of a project agent definition (tier 1 are the engine non-agents); see `BookTier`.
 *
 * @private agent resolution
 */
export type AgentTier = BookTier;

/**
 * One agent Book found in the project (an entry of the shared Book index).
 *
 * @private agent resolution
 */
export type AgentDefinition = BookEntry & { readonly kind: 'agent' };

/**
 * A problem with agent definitions, located in a file.
 *
 * @private agent resolution
 */
export type AgentDiagnostic = BookIndexDiagnostic;

/**
 * Result of resolving an agent reference.
 *
 * Name lookup is shared by agents, tasks and chats: when the winning Book is not an agent, that is a reference error
 * (`wrong-kind`), never a reason to pick a lower-priority agent.
 *
 * @private agent resolution
 */
export type AgentResolution =
    | { readonly kind: 'non-agent'; readonly name: NonAgentName }
    | { readonly kind: 'agent'; readonly definition: AgentDefinition; readonly shadowed: readonly BookEntry[] }
    | { readonly kind: 'wrong-kind'; readonly entry: BookEntry }
    | { readonly kind: 'missing'; readonly incomplete?: string }
    | { readonly kind: 'invalid'; readonly reason: string };

/**
 * Agent view of the project's shared Book index.
 *
 * @private agent resolution
 */
export class AgentCatalog {
    private constructor(public readonly index: BookIndex) {}

    /** Absolute project root. */
    public get root(): string {
        return this.index.projectRoot;
    }

    /** Absolute agents directory. */
    public get agentsDirectory(): string {
        return this.index.rootPath('agents');
    }

    /** Problems of the project's Books (shadowed duplicates, malformed sources, reserved names). */
    public get diagnostics(): readonly AgentDiagnostic[] {
        return this.index.diagnostics;
    }

    /**
     * Loads the project's Books (read-only; never creates files).
     */
    public static async load(root: string, agentsDirectory = 'agents', tasksDirectory = 'tasks'): Promise<AgentCatalog> {
        return new AgentCatalog(await BookIndex.load(root, { agents: agentsDirectory, tasks: tasksDirectory }));
    }

    /** Searches Git-ignored content (tier 4), once. */
    public async loadIgnoredTier(): Promise<void> {
        await this.index.loadIgnoredTier();
    }

    /** All loaded agent definitions in resolution order. */
    public all(): readonly AgentDefinition[] {
        return this.index.all().filter((entry): entry is AgentDefinition => entry.kind === 'agent');
    }

    /**
     * Ordinary project roles: winning, non-hidden agents outside ignored content — candidates for Manager assignment,
     * goal discovery and the default chat picker.
     */
    public ordinary(): AgentDefinition[] {
        return this.index.winners('agent').filter((entry): entry is AgentDefinition => entry.kind === 'agent' && entry.tier !== 4 && !entry.hidden);
    }

    /**
     * Resolves a reference (`@Name`, `{Name}` or a bare name) through the shared ordered resolver.
     */
    public async resolve(reference: string): Promise<AgentResolution> {
        const resolution = await this.index.resolve(reference);
        if (resolution.kind !== 'book') return resolution;
        if (resolution.entry.kind === 'invalid') {
            const error = resolution.entry.document.diagnostics.find((diagnostic) => diagnostic.severity === 'error');
            return { kind: 'invalid', reason: `${resolution.entry.relativePath} is not a valid Book${error ? `: ${error.message}` : '.'}` };
        }
        if (resolution.entry.kind !== 'agent') return { kind: 'wrong-kind', entry: resolution.entry };
        return { kind: 'agent', definition: resolution.entry as AgentDefinition, shadowed: resolution.shadowed };
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
        case 'wrong-kind':
            return `${reference} names the ${resolution.entry.kind} ${resolution.entry.relativePath}, not an agent (the first Book with that name wins).`;
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
    /** For DELETE: the kind of commitment it withdraws (from `DELETE RULE …`). */
    readonly target?: string;
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
const NON_INSTRUCTION_KEYWORDS = new Set(['FROM', 'IMPORT', 'OPEN', 'CLOSED', 'NOTE', 'DELETE', 'ENTITY', 'LINK']);

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
                diagnostics.push({ path: current.relativePath, line: (from.commitment?.startLine ?? 0) + 1, message: 'User cannot be an inheritance parent (FROM @User is invalid).', severity: 'error' });
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
            result.push({ keyword: 'DELETE', text: commitment.body, agent: definition.name, source: definition.relativePath, target: withdrawnKeyword(commitment.written) });
            continue;
        }
        if (NON_INSTRUCTION_KEYWORDS.has(commitment.keyword) || commitment.definition.unknown || commitment.definition.scope === 'task' || commitment.definition.scope === 'chat') continue;
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
        const keyword = instruction.target;
        const text = comparable(instruction.text);
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
        const effective = await resolveEffectiveAgent(catalog, `{{${definition.name}}}`);
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

