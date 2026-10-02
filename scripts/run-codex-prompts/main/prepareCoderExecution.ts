import type { RunOptions } from '../cli/RunOptions';
import { resolveCoderAgent, type ResolvedCoderAgent } from '../common/resolveCoderAgent';
import { resolveCoderContext } from '../common/resolveCoderContext';
import { createCoderTeamPromptRunner } from '../team/createCoderTeamPromptRunner';
import { resolvePromptRunner } from './resolvePromptRunner';

/**
 * Prepares one finite or supervised execution with an explicit workspace and session-scoped Book/TEAM snapshot.
 * Selection, compilation and context resolution are shared; daemon scheduling policy stays outside this service.
 */
export async function prepareCoderExecution(
    options: RunOptions,
    resolvedAgent?: ResolvedCoderAgent,
    contextSnapshot?: {
        readonly context?: string;
        readonly isInitializationAllowed?: boolean;
        readonly agentDirectoryPath?: string;
    },
) {
    const projectPath = options.workspace?.projectPath ?? process.cwd();
    const agent =
        resolvedAgent ??
        (await resolveCoderAgent(options.agent, projectPath, {
            defaultRole: 'developer',
            isInitializationAllowed: contextSnapshot?.isInitializationAllowed ?? !options.dryRun,
            agentDirectoryPath: contextSnapshot?.agentDirectoryPath,
            signal: options.signal,
        }));
    const resolvedCoderContext =
        contextSnapshot && 'context' in contextSnapshot
            ? contextSnapshot.context
            : await resolveCoderContext(options.context, projectPath);
    const resolution = resolvePromptRunner(options);
    return {
        ...resolution,
        runner: createCoderTeamPromptRunner(resolution.runner, options.agent, agent),
        runnerMetadata: { ...resolution.runnerMetadata, agentName: agent?.agentName },
        resolvedCoderContext,
        resolvedAgentSystemMessage: agent?.systemMessage,
        agent,
        promptRunnerIdentity: {
            harnessName: options.agentName,
            modelName: resolution.actualRunnerModel,
            agentReferences: agent?.agentReferences,
        },
    };
}

// Note: [🟡] Shared Coder execution preparation is only published in `@promptbook/cli`.
