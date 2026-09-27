import { createAgentModelRequirements } from '../../book-2.0/agent-source/createAgentModelRequirements';
import { validateBook } from '../../book-2.0/agent-source/string_book';
import { RemoteAgent } from '../../llm-providers/agent/RemoteAgent';
import { TEAM_INTERNAL_AGENT_ACCESS_HEADER } from '../_common/teamInternalAgentAccess';
import { TOOL_RUNTIME_CONTEXT_ARGUMENT, TOOL_RUNTIME_CONTEXT_PARAMETER } from '../_common/toolRuntimeContext';
import { TeamCommitmentDefinition } from './TEAM';

jest.mock('../../llm-providers/agent/RemoteAgent', () => ({ RemoteAgent: { connect: jest.fn() } }));

describe('Agents Server TEAM execution remains available beside scoped Coder tools', () => {
    it.each(['same-origin', 'other-origin', 'denied'])('preserves remote access handling for %s', async (kind) => {
        const agentUrl = `https://${kind === 'other-origin' ? 'remote' : 'local'}.example/agents/${kind}`;
        const callChatModel = jest.fn().mockResolvedValue({ content: 'The server adviser answered.' });
        jest.mocked(RemoteAgent.connect).mockReset();
        if (kind === 'denied') jest.mocked(RemoteAgent.connect).mockRejectedValue(new Error('403 private agent'));
        else jest.mocked(RemoteAgent.connect).mockResolvedValue({ callChatModel } as unknown as RemoteAgent);
        const requirements = await createAgentModelRequirements(validateBook(`Caller\nTEAM ${agentUrl}`));
        const tool = requirements.tools!.find(({ name }) => name.startsWith('team_chat_'))!;
        const result = JSON.parse(
            (await new TeamCommitmentDefinition().getToolFunctions()[tool.name]!({
                message: 'Review the relevant context.',
                [TOOL_RUNTIME_CONTEXT_ARGUMENT]: {
                    agentsServer: {
                        localServerUrl: 'https://local.example',
                        teamInternalAccessToken: 'fixture-only-token',
                    },
                    projects: { githubToken: 'fixture-project-secret', repositories: ['private/project'] },
                    memory: { enabled: true },
                },
            })) as string,
        );
        expect(RemoteAgent.connect).toHaveBeenCalledWith({
            agentUrl,
            requestHeaders:
                kind === 'other-origin' ? {} : { [TEAM_INTERNAL_AGENT_ACCESS_HEADER]: 'fixture-only-token' },
        });
        if (kind === 'denied') {
            expect(result.error).toContain('403 private agent');
            expect(callChatModel).not.toHaveBeenCalled();
        } else {
            expect(result.response).toBe('The server adviser answered.');
            const context = JSON.parse(callChatModel.mock.calls[0]![0].parameters[TOOL_RUNTIME_CONTEXT_PARAMETER]);
            expect(context.projects).toBeUndefined();
            expect(context.memory).toMatchObject({ enabled: false, isTeamConversation: true });
        }
    });
});

// Note: [💞] TEAM implementation and access regression tests share the commitment keyword.
