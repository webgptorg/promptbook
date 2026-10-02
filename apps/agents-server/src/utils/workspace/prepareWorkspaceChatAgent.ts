import type { ChatPrompt } from '../../../../../src/types/Prompt';
import { BehaviorSubject } from 'rxjs';
import type { Agent } from '../../../../../src/llm-providers/agent/Agent';
import type { string_prompt } from '../../../../../src/types/string_prompt';
import type { string_date_iso8601 } from '../../../../../src/types/string_token';
import { NotAllowed } from '../../../../../src/errors/NotAllowed';
import {
    executeAgentChatTurn,
    createAgentChatWorkspacePath,
} from '../../../../../scripts/run-agent-chat/executeAgentChatTurn';
import { prepareCoderExecution } from '../../../../../scripts/run-codex-prompts/main/prepareCoderExecution';
import {
    discoverWorkspaceHarnesses,
    loadWorkspaceExecutionConfiguration,
    selectWorkspaceAgentHarness,
} from '../../../../../scripts/run-codex-prompts/workspace/workspaceExecutionSelection';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import { provideWorkspaceAgentCollection } from './workspaceAgentStorage';

import { join, relative } from 'path';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { resolveConfinedWorkspacePath } from '../../../../../scripts/run-codex-prompts/workspace/workspaceAgentFiles';

/** Shared chat surface used by durable, stateless and compatibility API transports. */
export type WorkspaceChatAgent = Pick<Agent, 'callChatModel' | 'callChatModelStream' | 'agentSource'>;

/** Resolves an immutable Book/TEAM snapshot and the configured shared harness for one chat session. */
export async function prepareWorkspaceChatAgent(agentIdentifier: string, sourceOverride?: string_book) {
    const projectPath = process.env.PTBK_AGENTS_SERVER_WORKSPACE!;
    const collection = await provideWorkspaceAgentCollection();
    const definition = (await collection.listWorkspaceAgents()).find(
        (agent) => agent.id === agentIdentifier || agent.name === agentIdentifier,
    );
    if (!definition || definition.error)
        throw new NotAllowed(definition?.error ?? 'This agent no longer has a valid workspace Book.');
    const configuration = await loadWorkspaceExecutionConfiguration(projectPath, {
        harness: process.env.PTBK_HARNESS as Parameters<typeof selectWorkspaceAgentHarness>[1]['harness'],
        model: process.env.PTBK_MODEL,
        thinkingLevel: process.env.PTBK_THINKING_LEVEL as Parameters<
            typeof selectWorkspaceAgentHarness
        >[1]['thinkingLevel'],
    });
    const selection = selectWorkspaceAgentHarness(definition, configuration, await discoverWorkspaceHarnesses());
    if (selection.reason) throw new NotAllowed(selection.reason);
    const unresolvedAgentSource = await collection.getAgentSource(definition.id);
    const execution = await prepareCoderExecution(
        {
            workspace: {
                projectPath,
                repositoryRoot: process.env.PTBK_AGENTS_SERVER_REPOSITORY_ROOT,
                repositoryStatus: 'reused',
            },
            environment: process.env,
            agent: definition.path,
            agentName: selection.harness,
            model: selection.model,
            thinkingLevel: selection.thinkingLevel,
            dryRun: false,
            noUi: true,
            preserveLogs: false,
            waitForUser: false,
            waitAfterPrompt: 0,
            waitBetweenPrompts: 0,
            waitAfterError: 0,
            noCommit: true,
            gitChanges: 'ignore',
            normalizeLineEndings: false,
            allowCredits: process.env.PTBK_ALLOW_CREDITS === 'true',
            autoMigrate: false,
            allowDestructiveAutoMigrate: false,
            autoPull: false,
            autoPush: false,
            priority: 0,
        },
        undefined,
        { isInitializationAllowed: false, agentDirectoryPath: join(projectPath, 'agents') },
    );
    const agentSource = execution.agent!.agentSource;
    const availableTools = execution.agent!.teamAgent.teammates.map((teammate) => teammate.tool);
    const provider = selection.harness!;
    const agent: WorkspaceChatAgent = {
        agentSource: new BehaviorSubject(agentSource),
        callChatModel: async (prompt) => agent.callChatModelStream!(prompt, () => undefined),
        callChatModelStream: async (prompt, onProgress, callOptions) => {
            callOptions?.signal?.throwIfAborted();
            const chatPrompt = prompt as ChatPrompt;
            const start = new Date().toISOString() as string_date_iso8601;
            const messages = [
                ...(chatPrompt.thread ?? []).map((message) => ({
                    sender: message.sender === 'AGENT' ? ('AGENT' as const) : ('USER' as const),
                    content: message.content,
                })),
                { sender: 'USER' as const, content: prompt.content },
            ];
            const workspacePath = createAgentChatWorkspacePath({
                currentWorkingDirectory: projectPath,
                agentPath: definition.path,
            });
            await resolveConfinedWorkspacePath(
                projectPath,
                relative(projectPath, workspacePath).replace(/\\/gu, '/') + '/.probe',
                '.promptbook',
            );
            const result = await executeAgentChatTurn({
                currentWorkingDirectory: projectPath,
                agentPath: definition.path,
                agentName: selection.harness,
                model: selection.model,
                thinkingLevel: selection.thinkingLevel,
                noUi: true,
                isVerbose: false,
                allowCredits: process.env.PTBK_ALLOW_CREDITS === 'true',
                messages,
                workspacePath,
                execution: {
                    runner: execution.runner,
                    agentSource,
                    systemMessage: execution.resolvedAgentSystemMessage!,
                },
                signal: callOptions?.signal,
                environment: process.env,
                context: spaceTrim(
                    (block) => `
                    This is a chat turn, separate from the project's automatic implementation queue.
                    Inspect the project at ${projectPath} when useful; do not mutate that working tree or claim a PRD.
                    Only the isolated thread Book is writable for this turn. TEAM consultations remain advisory.
                    ${block(sourceOverride ? `Request-scoped effective Book/context:\n${sourceOverride}` : '')}
                    Context (JSON data):
                    ${block(JSON.stringify({ parameters: prompt.parameters, attachments: chatPrompt.attachments }))}
                `,
                ),
            });
            const response = {
                content: result.answer,
                usage: result.usage,
                modelName: selection.model ?? 'configured',
                timing: { start, complete: new Date().toISOString() as string_date_iso8601 },
                rawPromptContent: result.prompt as string_prompt,
                rawRequest: {
                    agentId: definition.id,
                    source: agentSource,
                    harness: selection.harness,
                    model: selection.model,
                },
                rawResponse: { answer: result.answer },
            };
            onProgress(response);
            return response;
        },
    };
    return { collection, agent, agentSource, unresolvedAgentSource, definition, provider, availableTools };
}
