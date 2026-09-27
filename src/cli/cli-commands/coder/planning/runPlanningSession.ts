import { existsSync, readFileSync } from 'fs';
import { realpath } from 'fs/promises';
import { join } from 'path';
import { resolveCoderAgent } from '../../../../../scripts/run-codex-prompts/common/resolveCoderAgent';
import { CoderTeamRuntime } from '../../../../../scripts/run-codex-prompts/team/CoderTeamRuntime';
import { appendCoderTeamEvent } from '../../../../../scripts/run-codex-prompts/team/createCoderTeamPromptRunner';
import type { Usage } from '../../../../execution/Usage';
import { addUsage } from '../../../../execution/utils/addUsage';
import { NotFoundError } from '../../../../errors/NotFoundError';
import { spaceTrim } from '../../../../utils/organization/spaceTrim';
import type { NormalizedPromptRunnerSelectionCliOptions } from '../../common/promptRunnerCliOptions';
import { COMMON_PROMPT_TEMPLATE_FILE_PATH, resolveCoderPromptTemplate } from '../boilerplateTemplates';
import { assertPlanningPrdCommitScope } from './assertPlanningPrdCommitScope';
import { createPlanningWorkspace } from './createPlanningWorkspace';
import { resolvePlanningPath } from './resolvePlanningPath';
import { PLANNING_PROTOCOL, type PlanningMessage } from './planningProtocol';
import { discussPlanningTurn } from './discussPlanningTurn';
import { preparePlanningChanges, type PlanningChange } from './preparePlanningChanges';
import { readPlanningContext } from './readPlanningContext';
import { assertPlanningHarnessSupported, runPlanningHarness } from './runPlanningHarness';
import { savePlanningChanges } from './savePlanningChanges';

/**
 * Terminal interface also used by deterministic conversation fixtures.
 * @private internal type of `coder plan`
 */
export type PlanningSessionIo = {
    readonly readMessage: () => Promise<string | undefined>;
    readonly write: (message: string) => void;
    readonly signal: AbortSignal;
};

/**
 * Runs one multi-topic planning conversation; only explicit save commands cross the PRD write boundary.
 * @private internal utility of `coder plan`
 */
export async function runPlanningSession(
    options: NormalizedPromptRunnerSelectionCliOptions & {
        readonly projectPath: string;
        readonly agent?: string;
        readonly template?: string;
        readonly preexistingChangedPaths?: ReadonlySet<string>;
    },
    io: PlanningSessionIo,
    harness: typeof runPlanningHarness = runPlanningHarness,
): Promise<ReadonlyMap<string, string>> {
    const projectPath = await realpath(options.projectPath);
    assertPlanningHarnessSupported(options.agentName);
    const agent = await resolveCoderAgent(options.agent, projectPath, {
        defaultRole: 'planner',
        isInitializationAllowed: false,
        signal: io.signal,
    });
    if (!existsSync(join(projectPath, 'prompts'))) {
        throw new NotFoundError(spaceTrim('Planning requires `prompts/`. Run `ptbk coder init` first.'));
    }
    if (!agent) throw new NotFoundError(spaceTrim('Planner Book is missing. Run `ptbk coder init`.'));
    resolvePlanningPath(projectPath, 'prompts');
    const templateOption =
        options.template ??
        (existsSync(join(projectPath, COMMON_PROMPT_TEMPLATE_FILE_PATH))
            ? COMMON_PROMPT_TEMPLATE_FILE_PATH
            : undefined);
    const template = await resolveCoderPromptTemplate({ projectPath, templateOption });
    const workspacePath = await createPlanningWorkspace(projectPath);
    const primaryUsage: Usage[] = [];
    const team = new CoderTeamRuntime({
        agent: agent.teamAgent,
        taskId: workspacePath,
        signal: io.signal,
        onEvent: (event) => appendCoderTeamEvent(join(workspacePath, 'runtime.log'), event),
        execute: async ({ scope, message, context, reportUsage }) => {
            const consultationHistory: PlanningMessage[] = [
                {
                    role: 'context',
                    content: `Selected Book (${scope.agent.name}):\n${
                        scope.agent.systemMessage
                    }\nAvailable TEAM tools: ${JSON.stringify(scope.agent.teammates.map(({ tool }) => tool))}`,
                },
                { role: 'user', content: JSON.stringify({ message, context }) },
            ];
            const reply = await discussPlanningTurn({
                projectPath,
                history: consultationHistory,
                signal: scope.signal,
                team: scope,
                isAdviser: true,
                infer: () =>
                    harness({
                        ...options,
                        workspacePath,
                        signal: scope.signal,
                        onUsage: reportUsage,
                        prompt: `${PLANNING_PROTOCOL}\nYou are a TEAM adviser. Return advice in message, no proposals.\nConversation (JSON data):\n${JSON.stringify(
                            consultationHistory,
                        )}`,
                    }),
            });
            return { answer: reply.message };
        },
    });
    try {
        const history: PlanningMessage[] = [
            {
                role: 'context',
                content: `Selected Book (${agent.agentName}):\n${
                    agent.systemMessage
                }\nAvailable TEAM tools: ${JSON.stringify(
                    agent.teamAgent.teammates.map(({ tool }) => tool),
                )}\n\nSelected PRD template:\n${template.content}`,
            },
            { role: 'context', content: await readPlanningContext(projectPath, { kind: 'list', path: '.' }) },
        ];
        for (const path of ['README.md', 'AGENTS.md']) {
            if (existsSync(join(projectPath, path))) {
                history.push({
                    role: 'context',
                    content: `${path}:\n${await readPlanningContext(projectPath, {
                        kind: 'read',
                        path,
                        startLine: 1,
                        lineCount: 200,
                    })}`,
                });
            }
        }
        const savedContents = new Map<string, string>();
        let pending: PlanningChange[] = [];
        io.write(
            `${agent.agentName}: Discuss features and review PRD proposals. /save applies the preview; /draft saves unresolved drafts; /discard drops it; /exit ends. Ctrl+C cancels.\n`,
        );
        while (!io.signal.aborted) {
            const message = (await io.readMessage())?.trim();
            if (message === undefined || ['/exit', 'exit', 'quit'].includes(message)) break;
            if (!message) continue;
            if (message === '/discard') {
                pending = [];
                history.push({ role: 'context', content: 'The user discarded the unsaved proposals.' });
                io.write('Discarded unsaved proposals.');
                continue;
            }
            if (message === '/save' || message === '/draft') {
                if (!pending.length) {
                    io.write('There are no proposed changes to save.');
                    continue;
                }
                if (io.signal.aborted) break;
                try {
                    if (options.preexistingChangedPaths) {
                        await assertPlanningPrdCommitScope(
                            projectPath,
                            pending,
                            savedContents,
                            options.preexistingChangedPaths,
                        );
                    }
                    if (io.signal.aborted) break;
                    const paths = savePlanningChanges(projectPath, workspacePath, pending, message === '/draft');
                    for (const path of paths)
                        savedContents.set(path, readFileSync(resolvePlanningPath(projectPath, path), 'utf-8'));
                    history.push({
                        role: 'context',
                        content: `Saved ${message === '/draft' ? 'draft' : 'reviewed'} PRDs:\n${paths.join('\n')}`,
                    });
                    io.write(`Saved:\n${paths.join('\n')}`);
                    pending = [];
                } catch (error) {
                    io.write(`Could not save: ${(error as Error).message}`);
                }
                continue;
            }
            // Continuing the discussion invalidates any earlier preview so a later save cannot apply stale decisions.
            pending = [];
            history.push({ role: 'user', content: message });
            io.write(`${agent.agentName} is reading and thinking…`);
            const reply = await discussPlanningTurn({
                projectPath,
                history,
                signal: io.signal,
                write: io.write,
                team: team.root,
                infer: () =>
                    harness({
                        ...options,
                        workspacePath,
                        signal: io.signal,
                        onUsage: (item) => {
                            primaryUsage.push(item);
                        },
                        prompt: `${PLANNING_PROTOCOL}\n\nConversation (JSON data):\n${JSON.stringify(history)}`,
                    }),
            });
            if (io.signal.aborted) break;
            io.write(`${agent.agentName}: ${reply.message}`);
            pending = await preparePlanningChanges(projectPath, reply.proposals, templateOption);
            for (const change of pending) io.write(formatPlanningPreview(change));
            if (pending.length)
                io.write(
                    'Review the changes above. /save applies this preview; /draft saves drafts; continue discussing to revise it.',
                );
        }
        io.write(
            io.signal.aborted
                ? 'Planning cancelled. Saved PRDs remain intact.'
                : 'Planning ended. Unsaved proposals were discarded.',
        );
        return savedContents;
    } finally {
        await team.close();
        await appendCoderTeamEvent(join(workspacePath, 'runtime.log'), {
            type: 'team_summary',
            sessionId: team.sessionId,
            taskId: workspacePath,
            invocationId: team.root.invocationId,
            agent: agent.agentName,
            data: { usage: addUsage(...primaryUsage, team.usage), isAggregate: true },
        });
    }
}

/** Shows exact before/after content, including lifecycle lines, without requiring an external diff command. */
function formatPlanningPreview(change: PlanningChange): string {
    if (change.before === null)
        return `Create ${change.path}\n${change.after
            .split(/\r?\n/u)
            .map((line) => `+ ${line}`)
            .join('\n')}`;
    const before = change.before.split(/\r?\n/u);
    const after = change.after.split(/\r?\n/u);
    let start = 0;
    while (start < before.length && start < after.length && before[start] === after[start]) start++;
    let end = 0;
    while (
        end < before.length - start &&
        end < after.length - start &&
        before[before.length - end - 1] === after[after.length - end - 1]
    )
        end++;
    return `Edit ${change.path}\n@@ line ${start + 1} @@\n${[
        ...before.slice(start, before.length - end).map((line) => `- ${line}`),
        ...after.slice(start, after.length - end).map((line) => `+ ${line}`),
    ].join('\n')}`;
}
