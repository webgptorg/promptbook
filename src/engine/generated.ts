import { readFile, writeFile } from 'node:fs/promises';
import { PtbkError } from '../common/errors.js';
import { toProjectRelative } from '../common/fs.js';
import { describeModel, formatModelRow, intersectModels, intersectRows, isImpossible, parseModelRow, renderModelLines, type ModelRow } from '../book/model.js';
import { formatAgentReference, normalizeAgentName, toReference } from '../book/references.js';
import { resolveEffectiveAgent, type AgentCatalog, type EffectiveAgent } from '../project/agents.js';
import { LEGACY_ROUTER_NAME, ROUTER_NAME } from '../project/defaults.js';
import { harnessName, harnessPlugin } from '../harness/registry.js';
import { harnessPluginId, toolRuntime, type HarnessVariant, type ThinkingLevel } from '../tools/model.js';
import { LEGACY_EXECUTION_CONTROLS } from '../tasks/book-task.js';
import { newTaskPath, renderTaskBook } from '../tasks/authoring.js';
import { generatedName } from '../tasks/identity.js';
import type { Task } from '../tasks/model.js';
import type { HarnessPool } from './harnesses.js';
import { completeWithDefaults, routeConcrete, type RoutingContext } from './routing.js';
import { taskBookInstructions } from './prompt.js';
import { creationTimestamp } from '../common/time.js';

/**
 * Marker of Router assignment tasks in `TASK ORIGIN`.
 *
 * @private generated work
 */
export const ASSIGNMENT_ORIGIN = 'assignment for';

/**
 * Marker of Teacher learning tasks in `TASK ORIGIN`.
 *
 * @private generated work
 */
export const LEARNING_ORIGIN = 'learning from';

/**
 * Marker of goal-discovery enquiries in `TASK ORIGIN`.
 *
 * @private generated work
 */
export const DISCOVERY_ORIGIN = 'goal discovery';

/**
 * Classifies a task's provenance from `TASK ORIGIN`.
 *
 * @private generated work
 */
export function workKindOf(task: Task): 'assignment' | 'learning' | 'discovery' | 'task' {
    const origin = task.origin?.toLowerCase() ?? '';
    if (origin.startsWith(ASSIGNMENT_ORIGIN)) return 'assignment';
    if (origin.startsWith(LEARNING_ORIGIN)) return 'learning';
    if (origin.startsWith(DISCOVERY_ORIGIN)) return 'discovery';
    return 'task';
}

/**
 * Target reference of an assignment or learning task.
 *
 * @private generated work
 */
export function originTarget(task: Task): string | undefined {
    const origin = task.origin ?? '';
    const match = /^(?:assignment for|learning from(?: chat)?)\s+(\{[^{}]+\}|@\S+|\S+)/i.exec(origin);
    return match?.[1];
}

/**
 * A task created by the engine.
 *
 * @private generated work
 */
export type CreatedTask = { readonly path: string; readonly name: string };

/**
 * The project's routing core agent: Router, or its former name Manager in a project the migration has not converted
 * yet (never both: the migration refuses to merge two identities).
 *
 * @private generated work
 */
export async function routerAgent(catalog: AgentCatalog): Promise<{ readonly name: string; readonly legacy: boolean } | undefined> {
    for (const [name, legacy] of [
        [ROUTER_NAME, false],
        [LEGACY_ROUTER_NAME, true],
    ] as const) {
        const resolution = await catalog.resolve(`@${name}`);
        if (resolution.kind === 'agent') return { name: resolution.definition.name, legacy };
    }
    return undefined;
}

/**
 * Creates Router's prerequisite for a task whose agent or execution is not determined yet. Router's own MODEL is
 * concrete, so the prerequisite never needs routing itself.
 *
 * @private generated work
 */
export async function createAssignmentTask(options: {
    target: Task;
    tasksDirectory: string;
    /** Router's name (Manager in an unconverted project). */
    router: string;
    /** The target's effective priority, at most one numeric step higher for immediate work. */
    priority: number;
    timeZone: string;
    /** Normalized names already used by Books (the new task gets a distinct readable name). */
    taken: ReadonlySet<string>;
}): Promise<CreatedTask & { targetRef: string }> {
    if (!options.target.key) throw new PtbkError('The task needs a usable name before Router assignment.', { kind: 'internal' });
    const ref = options.target.ref;
    const name = generatedName(`Assign routing: ${options.target.title}`, { taken: options.taken, timeZone: options.timeZone });
    const path = await newTaskPath(options.tasksDirectory, `assign ${options.target.title}`, Date.now(), options.timeZone);
    const content = renderTaskBook({
        title: name,
        description: `Choose the responsible agent and the concrete execution (harness, model, thinking level, endpoint) of ${ref}. Promptbook writes the decision into that task's TASK AGENT and single MODEL.`,
        commitments: [`TASK AGENT ${formatAgentReference(options.router)}`, `TASK PRIORITY ${options.priority}`, `TASK PARENT ${ref}`, `TASK ORIGIN ${ASSIGNMENT_ORIGIN} ${ref}`],
    });
    await writeFile(path, content, { flag: 'wx' });
    return { path, name, targetRef: ref };
}

/**
 * One usable execution offer for Router: a harness variant at an endpoint with its known models and thinking levels.
 *
 * @private generated work
 */
export type ExecutionOffer = {
    readonly variant: HarnessVariant;
    readonly runtime: string;
    readonly tools: readonly string[];
    readonly models: readonly string[];
    readonly catalog: 'complete' | 'partial';
    readonly thinkingLevels: readonly ThinkingLevel[];
    readonly defaults: { readonly model?: string; readonly thinkingLevel?: ThinkingLevel };
};

/**
 * The actual execution capabilities of the usable enabled tools, grouped by variant and endpoint (never invented).
 *
 * @private generated work
 */
export async function executionOffers(pool: HarnessPool): Promise<ExecutionOffer[]> {
    const offers = new Map<string, { variant: HarnessVariant; runtime: string; tools: string[] }>();
    for (const tool of pool.instances()) {
        if (!pool.inspectionOf(tool.name)?.usable) continue;
        const key = `${tool.variant} ${toolRuntime(tool)}`;
        const offer = offers.get(key) ?? { variant: tool.variant, runtime: toolRuntime(tool), tools: [] };
        offer.tools.push(tool.name);
        offers.set(key, offer);
    }
    const result: ExecutionOffer[] = [];
    for (const offer of offers.values()) {
        const id = harnessPluginId(offer.variant);
        const plugin = harnessPlugin(id)!;
        const defaults = await pool.defaults(id);
        const catalog = await pool.models(id);
        result.push({ ...offer, models: [...new Set([...(defaults.model ? [defaults.model] : []), ...catalog])], catalog: plugin.modelCatalog, thinkingLevels: plugin.thinkingLevels, defaults });
    }
    return result;
}

/**
 * Candidate agents of an assignment with their effective MODEL and, where one exists, an example combination
 * (plugin defaults within the intersection with the task's MODEL).
 */
async function agentCandidates(target: RoutingTarget, context: RoutingContext): Promise<Array<{ readonly agent: EffectiveAgent; readonly relativePath: string; readonly goal: string; readonly example?: string; readonly impossible: boolean }>> {
    const references = target.routing.agent ? [target.routing.agent] : context.catalog.ordinary().map((definition) => formatAgentReference(definition.name));
    const result = [];
    for (const reference of references) {
        const agent = await resolveEffectiveAgent(context.catalog, toReference(reference));
        if (agent.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) continue;
        const constraint = intersectModels(agent.model, target.routing.model);
        const completed = isImpossible(constraint) ? undefined : await completeWithDefaults(constraint, context, { selectors: target.routing.runners, agentName: agent.name });
        const goal = agent.definition?.document.commitments.find((commitment) => commitment.keyword === 'GOAL')?.body.split('\n')[0] ?? '';
        result.push({ agent, relativePath: agent.definition?.relativePath ?? 'engine', goal, example: completed?.row ? formatModelRow(completed.row) : undefined, impossible: isImpossible(constraint) || Boolean(completed?.impossible) });
    }
    return result;
}

/**
 * What Router routes: a task's routing requirements and priority (a chat passes its agent and MODEL).
 *
 * @private generated work
 */
export type RoutingTarget = Pick<Task, 'routing' | 'priority'>;

/**
 * Router instructions for a human-led chat's first reply: the fixed conversational agent, its MODEL and the chat's,
 * and the usable read-only execution offers.
 *
 * @private generated work
 */
export async function chatRoutingPrompt(options: { chat: string; target: RoutingTarget; context: RoutingContext; readOnlyVariants: readonly HarnessVariant[] }): Promise<string> {
    const { target, context } = options;
    const candidates = await agentCandidates(target, context);
    const offers = (await executionOffers(context.pool)).filter((offer) => options.readOnlyVariants.includes(offer.variant));
    return [
        '## Assignment work',
        '',
        `Choose the concrete execution of the conversation {${options.chat}} before its agent's first reply. Its agent is fixed: ${target.routing.agent}. Only read-only-capable harnesses can serve a conversation.`,
        `The chat's MODEL requirement: ${describeModel(target.routing.model)}.`,
        '',
        ...candidates.map((candidate) => `- ${formatAgentReference(candidate.agent.name)}: MODEL ${describeModel(candidate.agent.model)}${candidate.example ? `; for example \`${candidate.example}\`` : ''}`),
        '',
        'Usable execution offers:',
        ...(offers.length ? offers.map((offer) => `- \`harness=${offer.variant} runtime=${offer.runtime}\`: models ${offer.models.slice(0, 30).join(', ') || 'unknown'}; thinking ${offer.thinkingLevels.length ? offer.thinkingLevels.join(', ') : 'not applicable (omit it)'}`) : ['- (none)']),
        '',
        'Choose only from these offers, within every requirement; prefer an appropriate, economical configuration for a conversation. Do not edit files. Report:',
        'PTBK_RESULT {"status":"done","summary":"…","routing":{"harness":"OPENAI_CODEX","model":"<model id>","thinking":"low","runtime":"official"}}',
        'If nothing can satisfy the requirements, report `"routing":{"impossible":"<reason>"}`.',
    ].join('\n');
}

/**
 * Router instructions: the target's requirements, the candidate agents with their MODEL and the actual execution
 * offers (never inventing unavailable ones).
 *
 * @private generated work
 */
export async function assignmentPrompt(options: { target: Task; context: RoutingContext }): Promise<string> {
    const { target, context } = options;
    const candidates = await agentCandidates(target, context);
    const offers = await executionOffers(context.pool);
    const offerLines = offers.map(
        (offer) =>
            `- \`harness=${offer.variant} runtime=${offer.runtime}\` (${harnessName(harnessPluginId(offer.variant))}; tools ${offer.tools.join(', ')}): models ${offer.models.length ? offer.models.slice(0, 30).join(', ') : 'unknown'}${offer.catalog === 'partial' ? ' (examples/aliases; other IDs the harness accepts are allowed)' : ''}; thinking ${offer.thinkingLevels.length ? `${offer.thinkingLevels.join(', ')} (default ${offer.defaults.thinkingLevel})` : 'not applicable (omit it)'}; plugin default model ${offer.defaults.model ?? 'none'}`,
    );
    const agentLines = candidates.map(
        (candidate) =>
            `- ${formatAgentReference(candidate.agent.name)} (${candidate.relativePath})${candidate.goal ? ` — goal: ${candidate.goal}` : ''}; MODEL: ${describeModel(candidate.agent.model)}${candidate.impossible ? ' — incompatible with this task' : candidate.example ? `; for example \`${candidate.example}\`` : ''}`,
    );
    const lines = [
        '## Assignment work',
        '',
        `Decide who performs the target task ${target.ref} ("${target.title}") and how. Read its source: \`${target.source.relativePath}\`.`,
        target.routing.agent ? `Its responsible agent is fixed by TASK AGENT ${target.routing.agent}; keep it.` : 'It has no TASK AGENT yet: choose one of the agents below.',
        `The task's MODEL requirement: ${describeModel(target.routing.model)}${target.routing.legacyControls ? ' (from former TASK controls)' : ''}. Choose a combination that satisfies both the agent's MODEL and the task's MODEL; fields on one line apply together, lines are alternatives.`,
        target.routing.runners.length ? `Selector hints from the source (any of): ${target.routing.runners.map((selector) => `\`${selector}\``).join(' ')}.` : '',
        target.priority.raw && !target.priority.resolved ? `Its priority is written as "${target.priority.raw}"; interpret it as a nonnegative number (higher runs first, 0 is ordinary).` : '',
        '',
        target.routing.agent ? 'Responsible agent:' : 'Available project agents:',
        ...(agentLines.length ? agentLines : ['- (none usable)']),
        '',
        'Usable execution offers (enabled tools; runtime is the tool\'s endpoint):',
        ...(offerLines.length ? offerLines : ['- (none)']),
        '',
        'Choose only from the lists above and within every explicit requirement; never invent agents, models, capabilities, prices or permissions, and never relax a requirement. Prefer an appropriate, economical configuration.',
        'Do not edit any files. Report the decision in the completion line with an additional `routing` object (thinking only where the harness has one), for example:',
        'PTBK_RESULT {"status":"done","summary":"Developer fits this coding task","routing":{"agent":"@Developer","harness":"OPENAI_CODEX","model":"<model id>","thinking":"medium","runtime":"official"},"priority":null}',
        'If no agent and combination can satisfy the requirements, do not pick one anyway: report `"routing":{"impossible":"<the concrete reason>"}` with status done; the task then stays blocked and Fixer gets a separate repair task.',
    ];
    return lines.filter((line, index, all) => !(line === '' && all[index - 1] === '')).join('\n');
}

/**
 * Validated Router decision: the agent to record (when missing), the single refined MODEL, notes and an interpreted
 * priority; or a judged impossibility.
 *
 * @private generated work
 */
export type AssignmentDecision =
    | { readonly kind: 'route'; readonly agent?: string; readonly model: ModelRow; readonly priority?: number; readonly notes: readonly string[] }
    | { readonly kind: 'impossible'; readonly reason: string };

/**
 * Validates Router's reported routing against the actual catalog, the target's and agent's MODEL and the usable
 * tools. The refined MODEL is the chosen combination intersected with a permitted alternative (it only specializes).
 *
 * Returns feedback for a repair attempt when the decision is not usable.
 *
 * @private generated work
 */
export async function validateAssignment(data: Readonly<Record<string, unknown>>, options: { target: RoutingTarget; context: RoutingContext }): Promise<{ ok: true; decision: AssignmentDecision } | { ok: false; feedback: string }> {
    const routing = (data.routing ?? {}) as Record<string, unknown>;
    const { target, context } = options;
    if (typeof routing.impossible === 'string' && routing.impossible.trim()) return { ok: true, decision: { kind: 'impossible', reason: routing.impossible.trim() } };
    let agentReference = target.routing.agent;
    let recordAgent: string | undefined;
    if (!agentReference) {
        const chosen = typeof routing.agent === 'string' ? routing.agent.trim() : '';
        if (!chosen) return { ok: false, feedback: 'Your completion line must include `routing.agent` (for example "@Developer").' };
        const resolution = await context.catalog.resolve(toReference(chosen));
        if (resolution.kind !== 'agent' || resolution.definition.hidden || resolution.definition.tier === 4) return { ok: false, feedback: `Agent ${chosen} is not one of the available project agents. Choose one from the list.` };
        agentReference = formatAgentReference(resolution.definition.name);
        recordAgent = agentReference;
    }
    const agent = await resolveEffectiveAgent(context.catalog, toReference(agentReference));
    if (agent.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) return { ok: false, feedback: `Agent ${agentReference} cannot be used: ${agent.diagnostics.map((diagnostic) => diagnostic.message).join(' ')}` };
    const constraint = intersectModels(agent.model, target.routing.model);
    if (isImpossible(constraint)) return { ok: false, feedback: `${agent.name}'s MODEL (${describeModel(agent.model)}) contradicts the task's MODEL (${describeModel(target.routing.model)}). Choose another agent, or report routing.impossible.` };
    const value = (key: string): string | undefined => (typeof routing[key] === 'string' && (routing[key] as string).trim() && routing[key] !== '*' ? (routing[key] as string).trim() : undefined);
    const thinkingValue = value('thinking') ?? value('thinkingLevel');
    const parts = [value('harness') ? `harness=${value('harness')}` : '', value('model') ? `model=${value('model')}` : '', thinkingValue ? `thinking=${thinkingValue}` : '', value('runtime') ? `runtime=${value('runtime')}` : ''].filter(Boolean);
    const parsed = parseModelRow(parts.join(' '));
    if (!parsed.row) return { ok: false, feedback: `The routing is not a valid combination: ${parsed.problems.join('; ')}.` };
    const permitted = constraint.rows.map((row) => intersectRows(row, parsed.row!)).filter((row): row is ModelRow => Boolean(row));
    if (!permitted.length) return { ok: false, feedback: `${formatModelRow(parsed.row)} is outside the permitted combinations (${describeModel(constraint)}). Choose within them.` };
    let refined = permitted[0]!;
    if (!refined.harness) return { ok: false, feedback: 'Include `routing.harness` (a harness variant from the offers).' };
    const plugin = harnessPlugin(harnessPluginId(refined.harness))!;
    if (!refined.model) return { ok: false, feedback: `Include \`routing.model\` (a model ${plugin.displayName} offers).` };
    if (!refined.thinking && plugin.thinkingLevels.length) return { ok: false, feedback: `Include \`routing.thinking\` (one of ${plugin.thinkingLevels.join(', ')}).` };
    if (!refined.runtime || refined.runtime === 'default') {
        const tool = context.pool.select(plugin.id, { runtime: refined.runtime });
        if (!tool) return { ok: false, feedback: `No usable ${plugin.displayName} tool serves that endpoint; choose one of the offers.` };
        refined = { ...refined, runtime: toolRuntime(tool) };
    }
    const offered = (await executionOffers(context.pool)).find((offer) => offer.variant === refined.harness && offer.runtime === refined.runtime);
    if (plugin.modelCatalog === 'partial' && offered && !offered.models.includes(refined.model!) && !target.routing.model.rows.some((row) => row.model === refined.model) && !agent.model.rows.some((row) => row.model === refined.model)) {
        return { ok: false, feedback: `Model ${refined.model} is not among the models offered for ${plugin.displayName} (${offered.models.join(', ')}); choose one of them.` };
    }
    const route = await routeConcrete(agent, refined, context);
    if (route.kind === 'incompatible' || route.kind === 'needs-assignment') return { ok: false, feedback: `${formatModelRow(refined)} cannot be used: ${route.reason}` };
    if (target.routing.runners.length && !target.routing.runners.some((selector) => [agent.name, plugin.id, plugin.displayName, refined.model ?? ''].some((text) => text.toLowerCase().includes(selector.toLowerCase())))) {
        return { ok: false, feedback: `The task's selectors ${target.routing.runners.join(', ')} do not match this choice; pick a combination matching one of them.` };
    }
    const notes: string[] = [];
    let priority: number | undefined;
    if (target.priority.raw && !target.priority.resolved) {
        const number = typeof data.priority === 'number' ? data.priority : typeof data.priority === 'string' ? Number(data.priority) : NaN;
        if (!Number.isFinite(number) || number < 0) return { ok: false, feedback: `Include a nonnegative numeric "priority" interpreting "${target.priority.raw}".` };
        priority = number;
        notes.push(`Priority "${target.priority.raw}" interpreted by Router as ${number}.`);
    }
    return { ok: true, decision: { kind: 'route', agent: recordAgent, model: refined, priority, notes } };
}

/**
 * Writes a validated Router decision into the target Book: TASK AGENT where missing and one refined MODEL replacing
 * the less specific one (and any former TASK HARNESS/MODEL/THINKING LEVEL); earlier values stay in Git only.
 *
 * @private generated work
 */
export async function applyAssignment(target: Task, decision: Extract<AssignmentDecision, { kind: 'route' }>): Promise<void> {
    const { appendCommitment, replaceCommitments, setControlCommitment } = await import('../book/edit.js');
    let source = await readFile(target.source.path, 'utf8');
    if (decision.agent) source = setControlCommitment(source, 'TASK AGENT', decision.agent);
    source = replaceCommitments(source, ['MODEL', ...LEGACY_EXECUTION_CONTROLS], renderModelLines({ rows: [decision.model], explicit: true }), { after: 'TASK AGENT' });
    if (decision.priority !== undefined) source = setControlCommitment(source, 'TASK PRIORITY', String(decision.priority));
    for (const note of decision.notes) source = appendCommitment(source, 'TASK NOTE', note);
    await writeFile(target.source.path, source);
}

/**
 * Creates an ordinary Fixer repair task for a problem that blocks other work (no compatible execution, problematic
 * Book content, a Router bootstrap problem). Repair work for routing problems carries a concrete MODEL from plugin
 * defaults so it never depends on the routing it repairs. The caller deduplicates by `origin`.
 *
 * @private generated work
 */
export async function createRepairTask(options: {
    tasksDirectory: string;
    title: string;
    description: string;
    origin: string;
    links: readonly string[];
    model?: ModelRow;
    timeZone: string;
    taken: ReadonlySet<string>;
}): Promise<CreatedTask> {
    const path = await newTaskPath(options.tasksDirectory, options.title, Date.now(), options.timeZone);
    const name = generatedName(options.title, { taken: options.taken, timeZone: options.timeZone });
    const commitments = ['TASK AGENT @Fixer', ...(options.model ? renderModelLines({ rows: [options.model], explicit: true }) : []), `TASK ORIGIN ${options.origin}`, ...options.links.map((link) => `LINK ${link}`)];
    await writeFile(path, renderTaskBook({ title: name, description: options.description, commitments }), { flag: 'wx' });
    return { path, name };
}

/**
 * Creates the Teacher follow-up of a completed task by an open agent (deduplicated by the caller).
 *
 * @private generated work
 */
export async function createLearningTask(options: {
    projectRoot: string;
    tasksDirectory: string;
    task: Task;
    taskRef: string;
    agent: EffectiveAgent;
    trace?: string;
    occurrence?: string;
    timeZone: string;
    taken: ReadonlySet<string>;
}): Promise<CreatedTask> {
    const path = await newTaskPath(options.tasksDirectory, `learn ${options.task.title}`, Date.now(), options.timeZone);
    const name = generatedName(`Learn from: ${options.task.title}`, { taken: options.taken, timeZone: options.timeZone });
    const agentPath = options.agent.definition ? toProjectRelative(options.projectRoot, options.agent.definition.path) : '(engine)';
    const commitments = ['TASK AGENT @Teacher', `TASK PARENT ${options.taskRef}`, `TASK ORIGIN ${LEARNING_ORIGIN} ${options.taskRef} by ${formatAgentReference(options.agent.name)}`];
    if (options.trace) commitments.push(`TASK NOTE Evidence: ${options.trace}${options.occurrence ? ` (occurrence ${options.occurrence})` : ''}`);
    await writeFile(
        path,
        renderTaskBook({
            title: name,
            description: `Review how ${options.agent.name} performed ${options.taskRef} and improve \`${agentPath}\` where the available evidence justifies it and its learning permission allows. Making no change is a valid result.`,
            commitments,
        }),
        { flag: 'wx' },
    );
    return { path, name };
}

/**
 * Creates the Teacher task for a correction or lasting preference stated in a committed human↔agent chat.
 *
 * @private generated work
 */
export async function createChatLearningTask(options: { tasksDirectory: string; chat: string; agent: string; agentPath: string; note: string; timeZone: string; taken: ReadonlySet<string> }): Promise<CreatedTask> {
    const path = await newTaskPath(options.tasksDirectory, `learn chat ${options.chat}`, Date.now(), options.timeZone);
    const name = generatedName(`Learn from chat: ${options.chat}`, { taken: options.taken, timeZone: options.timeZone });
    await writeFile(
        path,
        renderTaskBook({
            title: name,
            description: `In the chat {${options.chat}}, the user corrected ${options.agent} or stated a lasting project-specific preference: "${options.note.replace(/\s+/g, ' ').slice(0, 500)}". Review the chat and improve \`${options.agentPath}\` where the conversation justifies it and its learning permission allows. Making no change is a valid result.`,
            commitments: ['TASK AGENT @Teacher', `TASK ORIGIN ${LEARNING_ORIGIN} chat {${options.chat}} by ${formatAgentReference(options.agent)}`, `LINK {${options.chat}}`],
        }),
        { flag: 'wx' },
    );
    return { path, name };
}

/**
 * Teacher-specific instructions.
 *
 * @private generated work
 */
export function learningPrompt(options: { learner: EffectiveAgent; agentPath: string; evidence?: string }): string {
    const policy = options.learner.learning.open ? (options.learner.learning.limits ? `OPEN with limits: ${options.learner.learning.limits}` : 'OPEN (ordinary permitted learning)') : 'CLOSED';
    return [
        '## Learning work',
        '',
        `You improve the Book of **${options.learner.name}** at \`${options.agentPath}\`. Its learning permission: ${policy}.`,
        'Use only the evidence actually available: the original task, its result commit, the trace below and the current files. Never turn an inference or missing evidence into a learned fact.',
        'Edit only that Book. Do not change its OPEN/CLOSED declaration or limits, do not broaden its permissions, and do not edit inherited or core definitions.',
        'Keep improvements concise (knowledge, rules or style that would have helped). If nothing is justified, change nothing and say why in the summary.',
        options.evidence ? `\nEvidence:\n\n\`\`\`\`text\n${options.evidence}\n\`\`\`\`` : '',
    ].join('\n');
}

/**
 * Creates a goal-discovery enquiry for one ordinary agent.
 *
 * @private generated work
 */
export async function createDiscoveryTask(options: { tasksDirectory: string; agentName: string; timeZone: string; taken: ReadonlySet<string>; now?: number }): Promise<CreatedTask> {
    const at = options.now ?? Date.now();
    const path = await newTaskPath(options.tasksDirectory, `goals ${options.agentName}`, at, options.timeZone);
    const name = generatedName(`Goal enquiry: ${options.agentName}`, { taken: options.taken, timeZone: options.timeZone, now: at });
    await writeFile(
        path,
        renderTaskBook({
            title: name,
            description: `Decide whether ${options.agentName}'s goals justify new work now, and record any useful tasks.`,
            commitments: [`TASK AGENT ${formatAgentReference(options.agentName)}`, `TASK ORIGIN ${DISCOVERY_ORIGIN}`],
        }),
        { flag: 'wx' },
    );
    return { path, name };
}

/**
 * Instructions of a goal-discovery enquiry.
 *
 * @private generated work
 */
export function discoveryPrompt(options: { agent: EffectiveAgent; tasksDirectory: string; recentTitles: readonly string[]; creationStamp?: string }): string {
    return [
        '## Goal enquiry',
        '',
        `The project has no unfinished tasks. As ${options.agent.name}, review the project against your lasting goals:`,
        ...options.agent.goals.map((goal) => `- ${goal}`),
        '',
        options.recentTitles.length ? `Recently completed work: ${options.recentTitles.slice(0, 15).join('; ')}.` : '',
        `If useful, authorized work follows from your goals, create one or more tasks (immediate, or future-dated with \`TASK AFTER <ISO date>\`) and assign them with \`TASK AGENT\` when obvious: ${taskBookInstructions(options.tasksDirectory, options.creationStamp ?? creationTimestamp())}`,
        'Do not implement the work in this enquiry and do not manufacture busywork. If nothing useful is needed now, create nothing and report `done` with a summary explaining why.',
    ].join('\n');
}

/**
 * Whether a normalized agent is Teacher (never taught automatically).
 *
 * @private generated work
 */
export function isTeacher(agentName: string): boolean {
    return normalizeAgentName(agentName) === 'teacher';
}

