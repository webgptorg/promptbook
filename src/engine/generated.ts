import { readFile, writeFile } from 'node:fs/promises';
import { toProjectRelative } from '../common/fs.js';
import { formatAgentReference, normalizeAgentName } from '../book/references.js';
import { THINKING_LEVELS, type ThinkingLevel } from '../project/config.js';
import type { AgentCatalog, EffectiveAgent } from '../project/agents.js';
import { harnessPlugin } from '../harness/registry.js';
import { setBookControls } from '../tasks/book-task.js';
import { generateTaskId, newTaskPath, renderTaskBook } from '../tasks/authoring.js';
import type { Task } from '../tasks/model.js';
import type { HarnessPool } from './harnesses.js';

/**
 * Marker of Manager assignment tasks in `TASK ORIGIN`.
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
    const match = /^(?:assignment for|learning from)\s+(\S+)/i.exec(origin);
    return match?.[1];
}

/**
 * Ensures a Book task has a stable `TASK ID` (an authoring edit); returns the reference and whether the file changed.
 *
 * @private generated work
 */
export async function ensureTaskId(task: Task): Promise<{ ref: string; changed: boolean }> {
    if (task.id) return { ref: `#${task.id}`, changed: false };
    if (task.source.kind !== 'book') return { ref: task.ref, changed: false };
    const id = generateTaskId(task.title);
    const source = await readFile(task.source.path, 'utf8');
    await writeFile(task.source.path, setBookControls(source, { 'TASK ID': id }));
    return { ref: `#${id}`, changed: true };
}

/**
 * Creates the Manager prerequisite for a task with missing routing.
 *
 * Returns the created file paths (the new task and, if needed, the target with its new TASK ID).
 *
 * @private generated work
 */
export async function createAssignmentTask(options: {
    target: Task;
    tasksDirectory: string;
    bootstrap: { harness: string; model?: string; thinkingLevel?: ThinkingLevel };
    timeZone: string;
}): Promise<{ path: string; paths: string[]; targetRef: string }> {
    const { ref, changed } = await ensureTaskId(options.target);
    const path = await newTaskPath(options.tasksDirectory, `assign ${options.target.title}`, Date.now(), options.timeZone);
    const commitments = [`TASK AGENT @Manager`, `TASK HARNESS ${options.bootstrap.harness}`];
    if (options.bootstrap.model) commitments.push(`TASK MODEL ${options.bootstrap.model}`);
    if (options.bootstrap.thinkingLevel) commitments.push(`TASK THINKING LEVEL ${options.bootstrap.thinkingLevel}`);
    commitments.push(`TASK PRIORITY ${options.target.priority.value}`, `TASK PARENT ${ref}`, `TASK ORIGIN ${ASSIGNMENT_ORIGIN} ${ref}`);
    const content = renderTaskBook({
        title: `Assign routing: ${options.target.title}`,
        description: `Choose the responsible agent and execution configuration for ${ref} ("${options.target.title}"). Promptbook writes the decision into that task.`,
        id: `assign-${generateTaskId(options.target.title)}`,
        commitments,
    });
    await writeFile(path, content, { flag: 'wx' });
    return { path, paths: changed ? [path, options.target.source.path] : [path], targetRef: ref };
}

/**
 * Manager instructions describing available choices (never inventing unavailable ones).
 *
 * @private generated work
 */
export async function assignmentPrompt(options: { target: Task; catalog: AgentCatalog; pool: HarnessPool; preferences?: string }): Promise<string> {
    const agents = options.catalog.ordinary();
    const agentLines = agents.map((agent) => {
        const goal = agent.document.commitments.find((commitment) => commitment.keyword === 'GOAL')?.body.split('\n')[0] ?? '';
        return `- ${formatAgentReference(agent.name)} (${agent.relativePath})${goal ? ` — goal: ${goal}` : ''}`;
    });
    const harnessLines: string[] = [];
    for (const id of options.pool.usable()) {
        const plugin = harnessPlugin(id)!;
        const models = await options.pool.models(id);
        harnessLines.push(
            `- \`${id}\` (${plugin.displayName}); models: ${models.length ? models.slice(0, 30).join(', ') : 'unknown (use null for the harness default)'}; thinking levels: ${plugin.thinkingLevels.length ? plugin.thinkingLevels.join(', ') : 'not supported'}`,
        );
    }
    const routing = options.target.routing;
    const existing = [
        routing.agent ? `agent ${routing.agent}` : undefined,
        routing.harness ? `harness ${routing.harness}` : undefined,
        routing.model ? `model ${routing.model}` : undefined,
        routing.thinkingLevel ? `thinking level ${routing.thinkingLevel}` : undefined,
    ].filter(Boolean);
    const lines = [
        '## Assignment work',
        '',
        `Decide who performs the target task ${options.target.ref} ("${options.target.title}") and how. Read its source: \`${options.target.source.relativePath}\`.`,
        existing.length ? `It already requires ${existing.join(', ')}; keep these and only fill what is missing.` : 'It has no routing yet.',
        options.target.priority.raw && !options.target.priority.resolved ? `Its priority is written as "${options.target.priority.raw}"; interpret it as a nonnegative number (higher runs first, 0 is ordinary).` : '',
        '',
        'Available project agents:',
        ...(agentLines.length ? agentLines : ['- (none besides core agents)']),
        '',
        'Enabled, usable harnesses:',
        ...(harnessLines.length ? harnessLines : ['- (none)']),
        options.preferences ? `\nRouting preferences of the project owner: ${options.preferences}` : '',
        '',
        'Choose only from the lists above; never invent agents, models, capabilities, prices or permissions. Prefer an appropriate, economical configuration.',
        'Do not edit any files. Report your decision in the completion line with an additional `routing` object, for example:',
        'PTBK_RESULT {"status":"done","summary":"Developer fits this coding task","routing":{"agent":"@Developer","harness":"openai-codex","model":null,"thinkingLevel":"high"},"priority":null}',
    ];
    return lines.filter((line, index, all) => !(line === '' && all[index - 1] === '')).join('\n');
}

/**
 * Validated Manager decision.
 *
 * @private generated work
 */
export type AssignmentDecision = { readonly controls: Record<string, string>; readonly notes: string[] };

/**
 * Validates Manager's reported routing against the actual catalog and fills only missing target fields.
 *
 * Returns feedback for a repair attempt when the decision is not usable.
 *
 * @private generated work
 */
export async function validateAssignment(
    data: Readonly<Record<string, unknown>>,
    options: { target: Task; catalog: AgentCatalog; pool: HarnessPool },
): Promise<{ ok: true; decision: AssignmentDecision } | { ok: false; feedback: string }> {
    const routing = (data.routing ?? {}) as Record<string, unknown>;
    const controls: Record<string, string> = {};
    const notes: string[] = [];
    const target = options.target;
    if (!target.routing.agent) {
        const agent = typeof routing.agent === 'string' ? routing.agent.trim() : '';
        if (!agent) return { ok: false, feedback: 'Your completion line must include `routing.agent` (for example "@Developer").' };
        const resolution = await options.catalog.resolve(agent.startsWith('@') || agent.startsWith('{') ? agent : `{${agent}}`);
        if (resolution.kind !== 'agent' || resolution.definition.hidden || resolution.definition.tier === 4) {
            return { ok: false, feedback: `Agent ${agent} is not one of the available project agents. Choose one from the list.` };
        }
        controls['TASK AGENT'] = formatAgentReference(resolution.definition.name);
    }
    const harness = target.routing.harness ?? (typeof routing.harness === 'string' && routing.harness ? routing.harness : undefined);
    if (!target.routing.harness && harness) {
        if (!options.pool.usable().includes(harness)) return { ok: false, feedback: `Harness ${harness} is not enabled and usable. Choose one of: ${options.pool.usable().join(', ')}.` };
        controls['TASK HARNESS'] = harness;
    }
    if (!target.routing.model && typeof routing.model === 'string' && routing.model) {
        const effectiveHarness = harness ?? options.pool.usable()[0];
        const models = effectiveHarness ? await options.pool.models(effectiveHarness) : [];
        if (models.length && !models.includes(routing.model)) return { ok: false, feedback: `Model ${routing.model} is not offered by ${effectiveHarness}. Use one of ${models.slice(0, 20).join(', ')} or null.` };
        if (!harness) return { ok: false, feedback: 'A model requires a harness; include `routing.harness`.' };
        controls['TASK MODEL'] = routing.model;
    }
    if (!target.routing.thinkingLevel && typeof routing.thinkingLevel === 'string' && routing.thinkingLevel) {
        const level = routing.thinkingLevel as ThinkingLevel;
        const plugin = harnessPlugin(harness ?? options.pool.usable()[0] ?? '');
        if (!THINKING_LEVELS.includes(level) || (plugin && !plugin.thinkingLevels.includes(level))) {
            return { ok: false, feedback: `Thinking level ${routing.thinkingLevel} is not supported${plugin ? ` by ${plugin.displayName}` : ''}; use one of ${plugin?.thinkingLevels.join(', ') || 'none (null)'}.` };
        }
        if (harness) controls['TASK THINKING LEVEL'] = level;
    }
    if (target.priority.raw && !target.priority.resolved) {
        const value = typeof data.priority === 'number' ? data.priority : typeof data.priority === 'string' ? Number(data.priority) : NaN;
        if (!Number.isFinite(value) || value < 0) return { ok: false, feedback: `Include a nonnegative numeric "priority" interpreting "${target.priority.raw}".` };
        controls['TASK PRIORITY'] = String(value);
        notes.push(`Priority "${target.priority.raw}" interpreted by Manager as ${value}.`);
    }
    if (!Object.keys(controls).length && !target.routing.agent) return { ok: false, feedback: 'No routing was decided.' };
    return { ok: true, decision: { controls, notes } };
}

/**
 * Writes a validated Manager decision into the target Book.
 *
 * @private generated work
 */
export async function applyAssignment(target: Task, decision: AssignmentDecision): Promise<void> {
    const { appendCommitment } = await import('../book/edit.js');
    let source = await readFile(target.source.path, 'utf8');
    source = setBookControls(source, decision.controls);
    for (const note of decision.notes) source = appendCommitment(source, 'TASK NOTE', note);
    await writeFile(target.source.path, source);
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
}): Promise<string> {
    const path = await newTaskPath(options.tasksDirectory, `learn ${options.task.title}`, Date.now(), options.timeZone);
    const agentPath = options.agent.definition ? toProjectRelative(options.projectRoot, options.agent.definition.path) : '(engine)';
    const commitments = ['TASK AGENT @Teacher', `TASK PARENT ${options.taskRef}`, `TASK ORIGIN ${LEARNING_ORIGIN} ${options.taskRef} by ${formatAgentReference(options.agent.name)}`];
    if (options.trace) commitments.push(`TASK NOTE Evidence: ${options.trace}${options.occurrence ? ` (occurrence ${options.occurrence})` : ''}`);
    await writeFile(
        path,
        renderTaskBook({
            title: `Learn from: ${options.task.title}`,
            description: `Review how ${options.agent.name} performed ${options.taskRef} and improve \`${agentPath}\` where the available evidence justifies it and its learning permission allows. Making no change is a valid result.`,
            commitments,
        }),
        { flag: 'wx' },
    );
    return path;
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
export async function createDiscoveryTask(options: { tasksDirectory: string; agentName: string; timeZone: string }): Promise<string> {
    const path = await newTaskPath(options.tasksDirectory, `goals ${options.agentName}`, Date.now(), options.timeZone);
    await writeFile(
        path,
        renderTaskBook({
            title: `Goal enquiry: ${options.agentName}`,
            description: `Decide whether ${options.agentName}'s goals justify new work now, and record any useful tasks.`,
            commitments: [`TASK AGENT ${formatAgentReference(options.agentName)}`, `TASK ORIGIN ${DISCOVERY_ORIGIN}`],
        }),
        { flag: 'wx' },
    );
    return path;
}

/**
 * Instructions of a goal-discovery enquiry.
 *
 * @private generated work
 */
export function discoveryPrompt(options: { agent: EffectiveAgent; tasksDirectory: string; recentTitles: readonly string[] }): string {
    return [
        '## Goal enquiry',
        '',
        `The project has no unfinished tasks. As ${options.agent.name}, review the project against your lasting goals:`,
        ...options.agent.goals.map((goal) => `- ${goal}`),
        '',
        options.recentTitles.length ? `Recently completed work: ${options.recentTitles.slice(0, 15).join('; ')}.` : '',
        `If useful, authorized work follows from your goals, create one or more task Books at the top level of \`${options.tasksDirectory}/\` (immediate, or future-dated with \`TASK AFTER <ISO date>\`). Assign them with \`TASK AGENT\` when obvious.`,
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

