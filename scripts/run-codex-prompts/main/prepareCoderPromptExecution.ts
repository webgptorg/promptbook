import { DEFAULT_CODER_AGENT_ROLE } from '../../../src/cli/cli-commands/coder/coderAgentRole';
import type { RunOptions } from '../cli/RunOptions';
import { resolveCoderAgent } from '../common/resolveCoderAgent';
import { commitInitializedAgentBooks } from '../git/commitInitializedAgentBooks';
import { createCoderTeamPromptRunner } from '../team/createCoderTeamPromptRunner';
import { resolvePromptRunner, type PromptRunnerSelectionOptions } from './resolvePromptRunner';

/** Resolves the same Book, harness, team bridge and attribution for queued and check-repair rounds. */
export async function prepareCoderPromptExecution(
    options: Pick<RunOptions, 'agent' | 'noCommit' | 'dryRun' | 'workspace'> &
        PromptRunnerSelectionOptions & { readonly projectPath: string },
    preparation: { readonly isCommittingInitializedBooks?: boolean; readonly signal?: AbortSignal } = {},
) {
    preparation.signal?.throwIfAborted();
    const resolvedCoderAgent = await resolveCoderAgent(options.agent, options.projectPath, {
        defaultRole: DEFAULT_CODER_AGENT_ROLE,
        isInitializationAllowed: !options.dryRun,
        signal: preparation.signal,
    });
    if (!options.noCommit && resolvedCoderAgent && preparation.isCommittingInitializedBooks !== false) {
        await commitInitializedAgentBooks(
            options.projectPath,
            resolvedCoderAgent.createdAgentBookPaths,
            options.workspace,
        );
    }
    preparation.signal?.throwIfAborted();
    const resolution = resolvePromptRunner(options);
    const runner = createCoderTeamPromptRunner(
        resolution.runner,
        options.agent,
        options.projectPath,
        options.workspace?.repositoryRoot,
    );
    return {
        ...resolution,
        runner,
        resolvedCoderAgent,
        runnerMetadata: { ...resolution.runnerMetadata, agentName: resolvedCoderAgent?.agentName },
    };
}
