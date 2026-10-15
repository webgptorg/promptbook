import { join } from 'node:path';
import { writeFile, rm } from 'node:fs/promises';
import { ensureDirectory } from '../common/fs.js';
import { shortId } from '../common/ids.js';
import { setting, type EffectiveSettings } from '../project/config.js';
import { resolveEffectiveAgent, type AgentCatalog } from '../project/agents.js';
import { EXPERT_DOCUMENTATION_DIRECTORY } from '../project/expert.js';
import type { Project } from '../project/workspace.js';
import { runHarness } from '../harness/run.js';
import { ToolBridge, type BridgeTool, type ToolResult } from './bridge.js';
import type { HarnessPool } from './harnesses.js';
import { renderAgentInstructions } from './prompt.js';
import type { RequestStore, UserRequest } from './requests.js';
import type { TaskTrace } from './task-trace.js';

/**
 * Shared consultation budget of one task.
 *
 * @private TEAM consultations
 */
export type ConsultationBudget = { calls: number };

/**
 * Context of the tools offered to one agent turn.
 *
 * @private TEAM consultations
 */
export type TeamContext = {
    readonly project: Project;
    readonly catalog: AgentCatalog;
    readonly pool: HarnessPool;
    readonly settings: EffectiveSettings;
    readonly requests: RequestStore;
    /** Task reference, stable ID and title. */
    readonly task: { readonly ref: string; readonly id?: string; readonly title: string; readonly occurrence?: string };
    /** The task's audit trail (consultations are recorded in its harness log). */
    readonly trace?: TaskTrace;
    /** Consulting agent. */
    readonly agentName: string;
    /** Harness of the consulting agent. */
    readonly harness: string;
    /** Consultation depth of this turn (0 for the task's own agent). */
    readonly depth: number;
    /** Task-wide budget. */
    readonly budget: ConsultationBudget;
    /** Whether the user may be asked. */
    readonly questionsAllowed: boolean;
    /** Cancellation. */
    readonly signal: AbortSignal;
    /** Records a created user request. */
    readonly onUserRequest: (request: UserRequest) => void;
    /** Activity reporting. */
    readonly onActivity: (text: string) => void;
};

/**
 * Creates a durable user request for a question and returns its reference promptly.
 */
async function askUser(context: TeamContext, question: string, choices: unknown, reason: string, attempted = ''): Promise<ToolResult> {
    if (!context.questionsAllowed) return { text: 'The user is not available for questions in this run (--no-questions). Decide reasonably or report blocked.', isError: true };
    if (!question.trim()) return { text: 'The question is empty.', isError: true };
    const request = await context.requests.create({
        kind: Array.isArray(choices) && choices.length ? 'confirmation' : 'question',
        reason: reason || `${context.agentName} needs your input on "${context.task.title}".`,
        question,
        attempted,
        choices: Array.isArray(choices) ? (choices as string[]) : undefined,
        origin: { kind: 'task', taskRef: context.task.ref, taskId: context.task.id, taskTitle: context.task.title, agent: context.agentName, occurrence: context.task.occurrence },
        blocking: true,
    });
    context.onUserRequest(request);
    context.onActivity(`asked the user (${request.id})`);
    await context.trace?.event('user-request', { requestId: request.id, agent: context.agentName, question, reason: request.reason, attempted: request.attempted, choices: request.choices });
    return {
        text: `Created user request ${request.id}. The user answers asynchronously. End your turn now with PTBK_RESULT {"status":"waiting-for-user","summary":"…"}; the task resumes automatically with the answer.`,
    };
}

/**
 * Runs a read-only consultation of another agent and returns its answer.
 */
async function consultAgent(context: TeamContext, reference: string, question: string): Promise<ToolResult> {
    const maxDepth = setting<number>(context.settings, 'team.maxDepth');
    const maxCalls = setting<number>(context.settings, 'team.maxCalls');
    if (context.depth + 1 > maxDepth) return { text: `Consultation depth limit (${maxDepth}) reached; answer without further consultation.`, isError: true };
    if (context.budget.calls >= maxCalls) return { text: `Consultation limit (${maxCalls} per task) reached.`, isError: true };
    const advisor = await resolveEffectiveAgent(context.catalog, reference);
    const errors = advisor.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    if (errors.length) return { text: `Cannot consult ${reference}: ${errors.map((error) => error.message).join(' ')}`, isError: true };
    const harnessId = [context.harness, ...context.pool.usable()].find((id) => context.pool.plugin(id)?.capabilities.readOnly && context.pool.inspection(id)?.usable);
    if (!harnessId) return { text: 'No usable harness supports read-only consultations.', isError: true };
    const plugin = context.pool.plugin(harnessId)!;
    context.budget.calls++;
    context.onActivity(`consulting ${advisor.name} (${context.budget.calls}/${maxCalls})`);
    const nestedTools = teamTools({ ...context, agentName: advisor.name, harness: harnessId, depth: context.depth + 1 }, { includeUser: false });
    const bridge = await ToolBridge.start(nestedTools);
    const promptDirectory = await ensureDirectory(context.project.runtime.temporary);
    const promptFile = join(promptDirectory, `consultation-${shortId()}.md`);
    const prompt = [
        `# Consultation\n\nYou are **${advisor.name}**, consulted by ${context.agentName} who is working on the task "${context.task.title}" in the project at \`${context.project.root}\`.`,
        `## Your role\n\n${renderAgentInstructions(advisor)}`,
        `## Question\n\n${question}`,
        '## Rules\n\n- You are read-only: inspect files if useful, but never modify anything or run write operations.\n- Answer directly and concisely within your own role. You cannot grant permissions beyond the task.\n- No completion line is needed.',
    ].join('\n\n');
    await writeFile(promptFile, prompt);
    await context.trace?.section(`Consultation · ${context.agentName} asks ${advisor.name} (depth ${context.depth + 1})`, [`Harness: ${plugin.displayName} ${context.pool.inspection(harnessId)?.version ?? ''}`.trim(), `Question:\n${question}`]);
    await context.trace?.event('consultation-started', { advisor: advisor.name, by: context.agentName, depth: context.depth + 1, harness: harnessId });
    const controller = new AbortController();
    const abort = (): void => controller.abort();
    context.signal.addEventListener('abort', abort, { once: true });
    try {
        const result = await runHarness(
            plugin,
            {
                projectRoot: context.project.root,
                cwd: context.project.root,
                prompt,
                promptFile,
                readOnly: true,
                mcp: plugin.capabilities.mcp ? bridge.launch() : undefined,
                env: process.env,
                timeoutMs: setting<number>(context.settings, 'team.timeout'),
                signal: controller.signal,
                allowCredits: setting<boolean>(context.settings, 'execution.allowCredits'),
                authentication: context.pool.inspection(harnessId)?.authentication ?? 'unknown',
                readableDirectories: advisor.name === 'Expert' ? [EXPERT_DOCUMENTATION_DIRECTORY] : [],
                onEvent: (event) => {
                    if (event.type === 'activity') context.onActivity(`${advisor.name}: ${event.text}`);
                },
                onOutput: (stream, line) => context.trace?.output(stream, line),
            },
            context.pool.inspection(harnessId)?.executablePath ?? plugin.executable,
        );
        await context.trace?.event('consultation-finished', { advisor: advisor.name, outcome: result.outcome, diagnostic: result.diagnostic });
        if (result.outcome !== 'completed') return { text: `Consultation of ${advisor.name} ended without an answer: ${result.diagnostic}`, isError: true };
        const limit = setting<number>(context.settings, 'team.maxResponseChars');
        const answer = result.finalMessage.trim() || '(no answer)';
        return { text: answer.length > limit ? `${answer.slice(0, limit)}\n[… response truncated at ${limit} characters]` : answer };
    } finally {
        context.signal.removeEventListener('abort', abort);
        await bridge.close();
        await rm(promptFile, { force: true });
    }
}

/**
 * Tools offered to an agent turn: `consult` (TEAM, Expert, User, Void) and `ask_user`.
 *
 * @private TEAM consultations
 */
export function teamTools(context: TeamContext, options: { includeUser?: boolean } = {}): BridgeTool[] {
    const includeUser = options.includeUser ?? true;
    const tools: BridgeTool[] = [
        {
            name: 'consult',
            description:
                'Consult another agent of this project (reference like "@Lawyer" or "{Frontend Developer}"), "@Expert" for Promptbook expertise, or "@User" to ask the human (only for a genuine blocker, see ask_user). Returns the advisor\'s answer; for @User it returns a pending request reference.',
            inputSchema: {
                type: 'object',
                properties: { agent: { type: 'string', description: 'Agent reference, e.g. @Lawyer' }, question: { type: 'string' }, choices: { type: 'array', items: { type: 'string' }, description: 'Optional predefined answers (only for @User)' } },
                required: ['agent', 'question'],
            },
            handler: async (input) => {
                const reference = String(input.agent ?? '').trim();
                const question = String(input.question ?? '');
                const normalized = reference.replace(/^@|^\{|\}$/g, '').toLowerCase().replace(/[\s_-]/g, '');
                if (['void', 'null', '0'].includes(normalized)) return { text: 'Void/Null is a no-op reference; no consultation happened.' };
                if (normalized === 'user') {
                    if (!includeUser) return { text: 'Advisors cannot ask the user; answer with what you know.', isError: true };
                    return await askUser(context, question, input.choices, '');
                }
                return await consultAgent(context, reference.startsWith('@') || reference.startsWith('{') ? reference : `{${reference}}`, question);
            },
        },
    ];
    if (includeUser) {
        tools.push({
            name: 'ask_user',
            description:
                'Exceptional: ask the human only when the work is genuinely blocked on something you cannot safely resolve (required login/2FA, missing authority, a consequential ambiguity the task and project do not settle). Never ask to confirm an already authorized or routine action, to choose ordinary implementation details, or to repeat the task. Returns a pending request reference immediately; then end your turn with status waiting-for-user.',
            inputSchema: {
                type: 'object',
                properties: {
                    question: { type: 'string', description: 'The minimal question or action needed' },
                    choices: { type: 'array', items: { type: 'string' }, description: 'Optional predefined answers' },
                    reason: { type: 'string', description: 'What is blocked and why only the user can resolve it' },
                    attempted: { type: 'string', description: 'What you already tried to resolve it safely' },
                },
                required: ['question', 'reason'],
            },
            handler: async (input) => await askUser(context, String(input.question ?? ''), input.choices, String(input.reason ?? ''), String(input.attempted ?? '')),
        });
    }
    return tools;
}
