import { appendFile, readFile } from 'fs/promises';
import { dirname, join, relative, resolve } from 'path';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { addUsage } from '../../../src/execution/utils/addUsage';
import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { resolveCoderAgent } from '../common/resolveCoderAgent';
import { DEFAULT_CODER_AGENT_ROLE } from '../../../src/cli/cli-commands/coder/coderAgentRole';
import { mapProjectReferenceToWorktree } from '../isolation/mapProjectReferenceToWorktree';
import { captureLiveScriptOutput } from '../common/runGoScript/captureLiveScriptOutput';
import type { PromptRunOptions } from '../runners/types/PromptRunOptions';
import type { PromptRunner } from '../runners/types/PromptRunner';
import { CoderTeamRuntime, type CoderTeamEvent, type CoderTeamInference } from './CoderTeamRuntime';
import { startCoderTeamBridge } from './startCoderTeamBridge';

/**
 * Adds a scoped consultation transport around an existing adapter. Both primary and advisers keep exactly
 * that adapter's permissions and authentication. Only the enclosing Coder round owns tests, queues and Git operations.
 */
export function createCoderTeamPromptRunner(runner: PromptRunner, agentBookReference?: string, originalProjectPath?: string, originalRepositoryRoot = originalProjectPath): PromptRunner {
    return {
        name: runner.name,
        teamCapability: runner.teamCapability,
        getSubscriptionUsage: runner.getSubscriptionUsage?.bind(runner),
        runPrompt: async (options) => {
            const controller = new AbortController();
            const cancel = (): void => controller.abort(options.signal?.reason);
            options.signal?.addEventListener('abort', cancel, { once: true });
            if (options.signal?.aborted) cancel();
            let runtime: CoderTeamRuntime | undefined;
            try {
                // Resolve against this invocation's actual checkout, including an isolated worktree.
                const reference = originalProjectPath
                    ? mapProjectReferenceToWorktree(
                        agentBookReference,
                        originalRepositoryRoot!,
                        resolve(options.projectPath, relative(originalProjectPath, originalRepositoryRoot!)),
                    )
                    : agentBookReference;
                const agent = await resolveCoderAgent(reference, options.projectPath, {
                    defaultRole: DEFAULT_CODER_AGENT_ROLE,
                    isInitializationAllowed: false,
                    signal: controller.signal,
                });
                if (!agent?.teamAgent.teammates.length) return await runner.runPrompt(options);
                if (runner.teamCapability !== 'command-tools') {
                    throw new NotAllowed(
                        spaceTrim(
                            `Harness \`${runner.name}\` cannot execute TEAM command tools. TEAM has not been enabled.`,
                        ),
                    );
                }
                runtime = new CoderTeamRuntime({
                    agent: agent.teamAgent,
                    taskId: options.scriptPath,
                    signal: controller.signal,
                    onEvent: (event) => appendCoderTeamEvent(options.logPath, event),
                    execute: (request) => runCodingConsultation(runner, options, request),
                });
                const bridge = await startCoderTeamBridge(runtime.root);
                try {
                    const result = await runner.runPrompt({
                        ...options,
                        signal: controller.signal,
                        prompt: `${options.prompt}\n\n${bridge.instructions}`,
                    });
                    bridge.assertConnected();
                    await runtime.close();
                    return { ...result, usage: addUsage(result.usage, runtime.usage) };
                } finally {
                    await runtime.close();
                    await bridge.close();
                }
            } finally {
                controller.abort();
                options.signal?.removeEventListener('abort', cancel);
                await runtime?.close();
            }
        },
    };
}

/** Executes just one adviser, without recursively launching coder run, committing, migrating or processing queues. */
async function runCodingConsultation(
    runner: PromptRunner,
    callerOptions: PromptRunOptions,
    request: CoderTeamInference,
): Promise<{ answer: string; usage: import('../../../src/execution/Usage').Usage }> {
    const { scope } = request;
    const bridge = await startCoderTeamBridge(scope, true);
    const scriptPath = join(dirname(bridge.clientPath), 'consultation.sh');
    const logPath = join(dirname(bridge.clientPath), 'consultation.log');
    try {
        scope.signal.throwIfAborted();
        const result = await runner.runPrompt({
            ...callerOptions,
            signal: scope.signal,
            scriptPath,
            logPath,
            shouldPrintLiveOutput: false,
            preserveArtifactsOnSuccess: false,
            prompt: spaceTrim(
                (block) => `
                You are ${scope.agent.name}, advising the primary agent on one question.
                Return advice to the caller. The primary agent owns implementation and final output.
                Do not start a PRD queue, commit, push, migrate, or change application files for this consultation.
                Inspect only relevant context within the caller's project and allowed tools.

                Your effective Book:
                ${block(scope.agent.systemMessage)}

                Consultation request (JSON data):
                ${block(JSON.stringify({ message: request.message, context: request.context }))}

                ${block(bridge.instructions)}
            `,
            ),
        });
        request.reportUsage(result.usage);
        return { answer: bridge.getAnswer(), usage: result.usage };
    } finally {
        // Raw nested tool activity is retained with this adviser's identity in the existing parent runtime trace.
        const runtimeLog = await readFile(logPath, 'utf-8').catch(() => '');
        if (runtimeLog) await scope.activity({ runtimeLog });
        await bridge.close();
    }
}

/** Appends attributed machine-readable events to the existing runtime log consumed by run traces. */
export async function appendCoderTeamEvent(logPath: string | undefined, event: CoderTeamEvent): Promise<void> {
    if (logPath) await appendFile(logPath, `${JSON.stringify(event)}\n`, 'utf-8');
    captureLiveScriptOutput(() => `${JSON.stringify(event)}\n`, 'team');
}

// Note: [💞] Trace helper is shared by coding and planning.
