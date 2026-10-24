import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { matchEnum } from '../common/naming.js';
import { formatModelRow, modelOfDocument, parseModelRow, type ModelRow } from '../book/model.js';
import { commitmentsOf, parseBook, singleValue, type BookDocument } from '../book/parse.js';
import { normalizeAgentName } from '../book/references.js';
import { renderCommitment } from '../book/write.js';
import { replaceCommitments } from '../book/edit.js';
import { harnessPlugin } from '../harness/registry.js';
import { LEGACY_EXECUTION_CONTROLS, legacyControlsRow } from '../tasks/book-task.js';
import { HARNESS_VARIANTS, THINKING_LEVELS, harnessPluginId, harnessVariantOf, toolRuntime, type HarnessToolRecord } from '../tools/model.js';
import { parseTools, type ConfigProblem } from '../tools/normalize.js';
import { BookIndex } from './books.js';
import { LEGACY_ROUTER_NAME, ROUTER_NAME, TASKER_BOOK, routerBook } from './defaults.js';
import { applyConfigurationMigration, type MigrationPlan } from './migrations.js';

/**
 * One changed source file of a prepared migration pass (`undefined` content: absent before / removed after).
 *
 * @private project migrations
 */
export type PreparedFile = { readonly path: string; readonly original?: string; readonly prepared?: string };

/**
 * The project's Book sources during one migration pass: read once, transformed in memory, persisted by the
 * coordinator together with the configuration (nothing is visible to work before the whole pass succeeds).
 *
 * @private project migrations
 */
export class BookWorkspace {
    private readonly files = new Map<string, { original?: string; current?: string }>();

    private constructor(public readonly projectRoot: string) {}

    /** Reads every Book of the project outside Git-ignored content (agents, tasks, chats and the rest). */
    public static async load(projectRoot: string, locations: { readonly agents: string; readonly tasks: string }): Promise<BookWorkspace> {
        const workspace = new BookWorkspace(projectRoot);
        const index = await BookIndex.load(projectRoot, locations);
        for (const entry of index.all()) {
            if (entry.tier === 4) continue;
            const text = await readFile(entry.path, 'utf8').catch(() => undefined);
            if (text !== undefined) workspace.files.set(entry.relativePath, { original: text, current: text });
        }
        return workspace;
    }

    /** An empty workspace (configuration-only passes and tests). */
    public static empty(projectRoot: string): BookWorkspace {
        return new BookWorkspace(projectRoot);
    }

    /** Project-relative paths of the Books present now, in a stable order. */
    public paths(): string[] {
        return [...this.files.entries()].filter(([, file]) => file.current !== undefined).map(([path]) => path).sort();
    }

    /** Current content of a Book. */
    public read(path: string): string | undefined {
        return this.files.get(path)?.current;
    }

    /** Whether a path holds a Book now. */
    public exists(path: string): boolean {
        return this.read(path) !== undefined;
    }

    /** Replaces a Book's content. */
    public write(path: string, text: string): void {
        const file = this.files.get(path) ?? {};
        this.files.set(path, { ...file, current: text });
    }

    /** Moves a Book (its content may change in the same pass). */
    public rename(from: string, to: string): void {
        const text = this.read(from);
        if (text === undefined || this.exists(to)) throw new Error(`Cannot move ${from} to ${to}.`);
        this.files.set(from, { ...this.files.get(from)!, current: undefined });
        this.write(to, text);
    }

    /** Files changed by the pass. */
    public changes(): PreparedFile[] {
        return [...this.files.entries()].filter(([, file]) => file.original !== file.current).map(([path, file]) => ({ path, original: file.original, prepared: file.current }));
    }
}

/**
 * Explanations and problems of one Book transformation (problems keep their source for ordinary repair).
 *
 * @private project migrations
 */
export type BookMigrationOutcome = { readonly notes: string[]; readonly problems: ConfigProblem[] };

/**
 * The Book side of a version-targeted step: receives the configuration as it was before the step and the transformed
 * configuration (which it may restore where it could not preserve a value's meaning).
 *
 * @private project migrations
 */
export type BookMigration = (workspace: BookWorkspace, config: { readonly before: Readonly<Record<string, unknown>>; readonly after: Record<string, unknown> }) => BookMigrationOutcome;

/**
 * Lines of the former Manager boilerplate with their Router equivalents (customized lines are kept verbatim).
 */
const MANAGER_DEFAULT_LINES: ReadonlyMap<string, string> = new Map([
    ['NOTE Fills missing execution choices of tasks: the responsible agent, harness, model and thinking level.', 'NOTE Chooses the responsible agent and the concrete execution (harness, model, thinking level and endpoint) when a task or chat does not determine them yet.'],
    ["PERSONA You are the Manager of this project's agents. You route work; you do not implement it.", "PERSONA You are the Router of this project's agents. You route work; you do not implement it."],
    ['RULE Choose only among the agents, harnesses, models and capabilities you are told are available; never invent any.', 'RULE Choose only among the agents, harnesses, models, thinking levels and endpoints you are told are available; never invent any.'],
    [
        'RULE Respect every explicit requirement of the task and complete missing choices instead of replacing existing ones.',
        'RULE Respect every explicit requirement of the task and of its agent; complete missing choices within them instead of replacing or relaxing existing ones.',
    ],
]);

/**
 * Commitments whose lines may hold agent references (reference updates never touch chat message history).
 */
const REFERENCE_KEYWORDS: Readonly<Record<'agent' | 'task' | 'chat', ReadonlySet<string> | 'all'>> = {
    agent: 'all',
    task: new Set(['TASK AGENT', 'LINK', 'RULE', 'GOAL', 'NOTE', 'TASK NOTE']),
    chat: new Set(['CHAT MEMBER', 'LINK']),
};

/**
 * Replaces `@Manager`/`{Manager}` references in the reference-holding commitments of a Book.
 */
function renameReferences(text: string, document: BookDocument, from: string, to: string): string {
    const kind = document.kind === 'agent' || document.kind === 'task' || document.kind === 'chat' ? document.kind : undefined;
    if (!kind) return text;
    const allowed = REFERENCE_KEYWORDS[kind];
    const lines = [...document.lines];
    const at = new RegExp(`(^|[^\\p{L}\\p{N}_@])@${from}(?![\\p{L}\\p{N}_-])`, 'giu');
    const braced = new RegExp(`\\{\\s*${from}\\s*\\}`, 'gi');
    let changed = false;
    for (const commitment of document.commitments) {
        if (commitment.keyword === 'CHAT MESSAGE' || (allowed !== 'all' && !allowed.has(commitment.keyword))) continue;
        for (let index = commitment.startLine; index < commitment.endLine; index++) {
            const line = lines[index]!;
            const next = line.replace(at, `$1@${to}`).replace(braced, `@${to}`);
            if (next !== line) {
                lines[index] = next;
                changed = true;
            }
        }
    }
    return changed ? `${lines.join(document.newline)}` : text;
}

/**
 * A former per-tool model preference read from a raw tool entry.
 */
type LegacyToolPreference = { readonly tool: HarnessToolRecord; readonly model?: string; readonly thinking?: string; readonly models?: readonly string[] };

/**
 * Former per-tool preferences of enabled and disabled harness tools (from the configuration before the step).
 */
function toolPreferences(before: Readonly<Record<string, unknown>>): LegacyToolPreference[] {
    const raw = Array.isArray(before.tools) ? (before.tools as unknown[]) : [];
    const typed = parseTools(raw).tools.filter((tool): tool is HarnessToolRecord => tool.type === 'HARNESS');
    const result: LegacyToolPreference[] = [];
    for (const tool of typed) {
        const entry = raw.find((candidate) => candidate !== null && typeof candidate === 'object' && (candidate as Record<string, unknown>).name === tool.name) as Record<string, unknown> | undefined;
        if (!entry) continue;
        const model = typeof entry.model === 'string' && entry.model.trim() ? entry.model.trim() : undefined;
        const thinking = entry.thinkingLevel === undefined ? undefined : matchEnum(entry.thinkingLevel, THINKING_LEVELS);
        const models = Array.isArray(entry.models) ? entry.models.filter((value): value is string => typeof value === 'string') : undefined;
        if (model || thinking || models?.length) result.push({ tool, model, thinking, models });
    }
    return result;
}

/**
 * Router's concrete bootstrap MODEL from the former routing defaults or the first enabled harness tool, filling the
 * rest from the plugin's coded defaults (deterministic: no catalog call, no agent call).
 */
function bootstrapRow(before: Readonly<Record<string, unknown>>): ModelRow | undefined {
    const routing = before.routing !== null && typeof before.routing === 'object' && !Array.isArray(before.routing) ? (before.routing as Record<string, unknown>) : {};
    const tools = parseTools(before.tools).tools.filter((tool): tool is HarnessToolRecord => tool.type === 'HARNESS' && tool.isEnabled);
    const preferences = toolPreferences(before);
    const preferredVariant = typeof routing.harness === 'string' ? (matchEnum(routing.harness, HARNESS_VARIANTS) ?? harnessVariantOf(routing.harness.toLowerCase())) : undefined;
    const tool = (preferredVariant ? tools.find((candidate) => candidate.variant === preferredVariant) : undefined) ?? tools[0];
    const variant = preferredVariant ?? tool?.variant;
    const plugin = variant ? harnessPlugin(harnessPluginId(variant)) : undefined;
    if (!plugin) return undefined;
    const fromTool = preferences.find((preference) => preference.tool.name === tool?.name);
    const model = (preferredVariant && typeof routing.model === 'string' && routing.model.trim() ? routing.model.trim() : undefined) ?? fromTool?.model ?? plugin.defaultModel;
    const wanted = (preferredVariant && routing.thinkingLevel !== undefined ? matchEnum(routing.thinkingLevel, THINKING_LEVELS) : undefined) ?? fromTool?.thinking;
    const thinking = plugin.thinkingLevels.length ? (wanted && plugin.thinkingLevels.includes(wanted as never) ? wanted : (plugin.defaultThinkingLevel ?? plugin.thinkingLevels[0])) : undefined;
    const row = parseModelRow([`harness=${plugin.variant}`, `model=${model}`, thinking ? `thinking=${thinking}` : '', `runtime=${tool ? toolRuntime(tool) : 'official'}`].filter(Boolean).join(' '));
    return row.row;
}

/**
 * Inserts commitment lines before a final OPEN/CLOSED declaration (which stays last), otherwise at the end.
 */
function insertBeforeLearningPolicy(text: string, lines: readonly string[]): string {
    if (!lines.length) return text;
    const document = parseBook(text);
    const last = document.commitments[document.commitments.length - 1];
    const source = [...document.lines];
    while (source.length && source[source.length - 1]!.trim() === '') source.pop();
    if (last && (last.keyword === 'OPEN' || last.keyword === 'CLOSED')) source.splice(last.startLine, 0, ...lines);
    else source.push(...lines);
    return `${source.join(document.newline)}${document.newline}`;
}

/**
 * The 0.119.0-32 project step: Manager becomes Router (customization, learned content and unambiguous references
 * preserved; never merged with an existing Router), Router gets a concrete bootstrap MODEL and the former routing
 * preferences, a missing Tasker/Router gets its minimal default, former task controls consolidate into one MODEL,
 * unambiguous legacy agent MODEL values get the shared syntax, and superseded configuration is removed only where
 * its meaning was preserved (otherwise restored for repair).
 */
const ROUTER_MODEL_BOOKS: BookMigration = (workspace, { before, after }) => {
    const notes: string[] = [];
    const problems: ConfigProblem[] = [];
    const agentsDirectory = typeof (before.paths as Record<string, unknown> | undefined)?.agents === 'string' ? ((before.paths as Record<string, string>).agents as string).replace(/\/+$/, '') : 'agents';
    const parsed = (): Array<{ path: string; document: BookDocument }> => workspace.paths().map((path) => ({ path, document: parseBook(workspace.read(path)!) }));
    const agentsNamed = (name: string): string[] => parsed().filter(({ document }) => document.kind === 'agent' && normalizeAgentName(document.name) === normalizeAgentName(name)).map(({ path }) => path);

    // 1. Manager → Router.
    const managers = agentsNamed(LEGACY_ROUTER_NAME);
    const routers = agentsNamed(ROUTER_NAME);
    let routerPath: string | undefined;
    let converted = false;
    if (managers.length && routers.length) {
        problems.push({ location: managers[0]!, message: `both ${managers[0]} (Manager) and ${routers[0]} (Router) exist; they are not merged — Router is used and Manager is kept for repair`, severity: 'warning' });
        routerPath = routers[0];
    } else if (managers.length > 1) {
        problems.push({ location: managers.join(', '), message: 'several Books are named Manager; none is converted by guesswork (kept for repair)', severity: 'error' });
    } else if (managers.length === 1) {
        const from = managers[0]!;
        const target = /(^|\/)manager\.book$/i.test(from) ? from.replace(/manager\.book$/i, 'router.book') : from;
        const document = parseBook(workspace.read(from)!);
        const lines = [...document.lines];
        lines[document.headerLine] = lines[document.headerLine]!.replace(/^AGENT\s+Manager\s*$/i, `AGENT ${ROUTER_NAME}`);
        for (let index = 0; index < lines.length; index++) {
            const replacement = MANAGER_DEFAULT_LINES.get(lines[index]!.trim());
            if (replacement) lines[index] = replacement;
        }
        workspace.write(from, lines.join(document.newline));
        if (target !== from && !workspace.exists(target)) workspace.rename(from, target);
        routerPath = workspace.exists(target) ? target : from;
        converted = true;
        notes.push(`Manager (${from}) → Router (${routerPath}), keeping its customized and learned content`);
    } else if (routers.length === 1) {
        routerPath = routers[0];
    } else if (!routers.length) {
        routerPath = `${agentsDirectory}/.core/router.book`;
        if (workspace.exists(routerPath)) routerPath = undefined;
        else {
            workspace.write(routerPath, routerBook());
            notes.push(`added the missing core agent Router (${routerPath})`);
        }
    }
    if (converted) {
        let updated = 0;
        for (const { path, document } of parsed()) {
            const text = workspace.read(path)!;
            const next = renameReferences(text, document, LEGACY_ROUTER_NAME, ROUTER_NAME);
            if (next !== text) {
                workspace.write(path, next.endsWith(document.newline) || !text.endsWith(document.newline) ? next : `${next}${document.newline}`);
                updated++;
            }
        }
        if (updated) notes.push(`updated @Manager references to @Router in ${updated} Book(s)`);
    }

    // 2. Router: a concrete bootstrap MODEL and the former routing preferences.
    const routing = before.routing !== null && typeof before.routing === 'object' && !Array.isArray(before.routing) ? (before.routing as Record<string, unknown>) : {};
    const preferences = toolPreferences(before);
    const preferenceRules: string[] = [];
    if (typeof routing.preferences === 'string' && routing.preferences.trim()) preferenceRules.push(...renderCommitment('RULE', routing.preferences));
    for (const preference of preferences) {
        const plugin = harnessPlugin(harnessPluginId(preference.tool.variant));
        const parts = [preference.model ? `prefer model ${preference.model}` : '', preference.thinking ? `thinking ${preference.thinking}` : '', preference.models?.length ? `models known for it: ${preference.models.join(', ')}` : ''].filter(Boolean);
        preferenceRules.push(`RULE Former ptbk.json preference of the harness tool "${preference.tool.name}" (${plugin?.displayName ?? preference.tool.variant}): ${parts.join('; ')}.`);
    }
    const routingKeys = ['harness', 'model', 'thinkingLevel', 'preferences'].filter((key) => routing[key] !== undefined);
    if (routerPath) {
        let text = workspace.read(routerPath)!;
        const document = parseBook(text);
        const own = modelOfDocument(document);
        const bootstrap = bootstrapRow(before);
        const lines = [...preferenceRules.filter((rule) => !text.includes(rule)), ...(!own.commitment && bootstrap ? [`MODEL ${formatModelRow(bootstrap)}`] : [])];
        if (lines.length) {
            text = insertBeforeLearningPolicy(text, lines);
            workspace.write(routerPath, text);
        }
        if (!own.commitment && bootstrap) notes.push(`Router MODEL ${formatModelRow(bootstrap)} (from ${routing.harness !== undefined ? 'routing.harness/model/thinkingLevel' : 'the first enabled harness tool'} and plugin defaults)`);
        if (!own.commitment && !bootstrap) problems.push({ location: routerPath, message: 'Router has no concrete MODEL because no harness tool is enabled; it is repaired once one exists', severity: 'warning' });
        if (preferenceRules.length) notes.push(`moved ${routingKeys.includes('preferences') ? 'routing.preferences and ' : ''}${preferences.length} per-tool model preference(s) into Router's instructions`);
    }
    // Superseded configuration is removed only where its meaning was preserved; otherwise it is restored for repair.
    const afterRouting = after.routing !== null && typeof after.routing === 'object' && !Array.isArray(after.routing) ? (after.routing as Record<string, unknown>) : undefined;
    if (!routerPath && (routingKeys.length || preferences.length)) {
        if (routingKeys.length) {
            const restored = { ...(afterRouting ?? {}) };
            for (const key of routingKeys) restored[key] = routing[key];
            after.routing = restored;
        }
        if (preferences.length) after.tools = before.tools;
        problems.push({ location: 'ptbk.json › routing/tools', message: 'the former routing preferences were kept because no unambiguous Router Book could receive them (repair needed)', severity: 'error' });
    }

    // 3. A missing Tasker.
    if (!agentsNamed('Tasker').length) {
        const path = `${agentsDirectory}/.core/tasker.book`;
        if (!workspace.exists(path)) {
            workspace.write(path, TASKER_BOOK);
            notes.push(`added the missing core agent Tasker (${path})`);
        }
    }

    // 4. Former separate task execution controls → one MODEL (never widened, never bound to an account).
    let tasks = 0;
    for (const { path, document } of parsed()) {
        if (document.kind === 'task') {
            const legacy = LEGACY_EXECUTION_CONTROLS.filter((keyword) => commitmentsOf(document, keyword).length);
            if (!legacy.length) continue;
            if (commitmentsOf(document, 'MODEL').length) {
                problems.push({ location: path, message: `${legacy.join(', ')} compete with an existing MODEL; kept for repair`, severity: 'error' });
                continue;
            }
            const values = { harness: singleValue(document, 'TASK HARNESS').value, model: singleValue(document, 'TASK MODEL').value, thinking: singleValue(document, 'TASK THINKING LEVEL').value };
            const row = legacyControlsRow(values);
            if (!row.row) {
                problems.push({ location: path, message: `${row.problem}; kept for repair`, severity: 'error' });
                continue;
            }
            workspace.write(path, replaceCommitments(workspace.read(path)!, LEGACY_EXECUTION_CONTROLS, [`MODEL ${row.row}`]));
            tasks++;
        } else if (document.kind === 'agent') {
            // 5. An unambiguous legacy agent MODEL value (a single model identifier) gets the shared syntax.
            const found = commitmentsOf(document, 'MODEL');
            if (found.length !== 1 || !modelOfDocument(document).diagnostics.length) continue;
            const content = found[0]!.body.trim();
            if (/^[^\s=*]+$/.test(content) && parseModelRow(`model=${content}`).row) {
                workspace.write(path, replaceCommitments(workspace.read(path)!, ['MODEL'], [`MODEL model=${content}`]));
                notes.push(`${path}: MODEL ${content} → MODEL model=${content}`);
            } else problems.push({ location: path, message: `the former MODEL "${content.split('\n')[0]}" has no unambiguous MODEL form; kept for repair`, severity: 'warning' });
        }
    }
    if (tasks) notes.push(`consolidated TASK HARNESS/TASK MODEL/TASK THINKING LEVEL into MODEL in ${tasks} task(s)`);
    return { notes, problems };
};

/**
 * Book sides of registered steps, by target version (sparse; most steps change only the configuration).
 *
 * @private project migrations
 */
export const BOOK_MIGRATIONS: Readonly<Record<string, BookMigration>> = { '0.119.0-32': ROUTER_MODEL_BOOKS };

/**
 * Result of preparing one complete migration pass in memory.
 *
 * @private project migrations
 */
export type PreparedPass = {
    /** The migrated configuration (version advanced). */
    readonly raw: Record<string, unknown>;
    /** Changed Book files. */
    readonly files: readonly PreparedFile[];
    /** Notes per applied step. */
    readonly notes: Array<{ target: string; title: string; notes: readonly string[] }>;
    /** Problems kept for repair. */
    readonly problems: ConfigProblem[];
};

/**
 * Prepares a whole pass: each step's configuration transformation, then its Book side with the configuration as it
 * was before that step. Nothing is written; the coordinator persists and commits the prepared result once.
 *
 * @private project migrations
 */
export function prepareMigrationPass(raw: Readonly<Record<string, unknown>>, plan: Extract<MigrationPlan, { kind: 'migrate' }>, workspace: BookWorkspace): PreparedPass {
    let current = structuredClone(raw) as Record<string, unknown>;
    const notes: PreparedPass['notes'] = [];
    const problems: ConfigProblem[] = [];
    for (const step of plan.steps) {
        const before = structuredClone(current);
        const single = applyConfigurationMigration(current, { ...plan, steps: [step] });
        const after = single.raw;
        const stepNotes = [...(single.notes[0]?.notes ?? [])];
        problems.push(...single.problems);
        const books = BOOK_MIGRATIONS[step.target];
        if (books) {
            const outcome = books(workspace, { before, after });
            stepNotes.push(...outcome.notes);
            problems.push(...outcome.problems);
        }
        notes.push({ target: step.target, title: step.title, notes: stepNotes });
        current = after;
    }
    const { promptbookVersion: _previous, ...rest } = current;
    void _previous;
    return { raw: { promptbookVersion: plan.to, ...rest }, files: workspace.changes(), notes, problems };
}

/**
 * Absolute path of a prepared file.
 *
 * @private project migrations
 */
export function preparedPath(projectRoot: string, file: PreparedFile): string {
    return join(projectRoot, file.path);
}

/**
 * Directory a prepared file needs.
 *
 * @private project migrations
 */
export function preparedDirectory(projectRoot: string, file: PreparedFile): string {
    return dirname(preparedPath(projectRoot, file));
}
