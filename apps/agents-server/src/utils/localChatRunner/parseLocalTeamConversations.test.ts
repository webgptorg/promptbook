import type { AgentTeamConversationWorkspaceManifest } from '../../../../../src/book-3.0/AgentTeamConversationWorkspace';
import { parseLocalTeamConversationBook } from './parseLocalTeamConversations';

/**
 * Shared local TEAM roster used by transcript-parser regression cases.
 */
const TEAM_WORKSPACE_MANIFEST: AgentTeamConversationWorkspaceManifest = {
    version: 1,
    primaryAgent: {
        permanentId: 'primary-agent',
        agentName: 'Primary Agent',
    },
    teammates: [
        {
            permanentId: 'legal-advisor',
            agentName: 'Legal Advisor',
            url: 'https://agents.example.com/agents/legal-advisor',
            instructions: 'Review legal risks.',
            sourceFileName: 'legal-advisor.book',
        },
    ],
};

describe('parseLocalTeamConversationBook', () => {
    it('turns a valid harness TEAM transcript into the standard TEAM tool-call shape', () => {
        const parsedConversation = parseLocalTeamConversationBook({
            transcriptFileName: 'legal-advisor--01.book',
            transcriptContent:
                'MESSAGE @Primary Agent\nCan we publish this claim?\n\nMESSAGE @Legal Advisor\nOnly after substantiating it.\n',
            manifest: TEAM_WORKSPACE_MANIFEST,
            job: {
                id: 'job-123',
                queuedAt: '2026-08-08T12:00:00.000Z',
            },
        });

        expect(parsedConversation).toMatchObject({
            transcriptFileName: 'legal-advisor--01.book',
            teammate: {
                agentName: 'Legal Advisor',
            },
            conversation: [
                {
                    sender: 'AGENT',
                    name: 'Primary Agent',
                    content: 'Can we publish this claim?',
                },
                {
                    sender: 'TEAMMATE',
                    name: 'Legal Advisor',
                    content: 'Only after substantiating it.',
                },
            ],
            toolCall: {
                name: 'team_chat_legal_advisor',
                arguments: {
                    message: 'Can we publish this claim?',
                },
                state: 'COMPLETE',
                idempotencyKey: 'local-team:job-123:legal-advisor--01.book',
            },
        });
    });

    it('ignores a transcript that does not alternate from the primary agent to its teammate', () => {
        const parsedConversation = parseLocalTeamConversationBook({
            transcriptFileName: 'legal-advisor--01.book',
            transcriptContent:
                'MESSAGE @Legal Advisor\nThis starts with the wrong speaker.\n\nMESSAGE @Primary Agent\nOkay.\n',
            manifest: TEAM_WORKSPACE_MANIFEST,
            job: {
                id: 'job-123',
                queuedAt: '2026-08-08T12:00:00.000Z',
            },
        });

        expect(parsedConversation).toBeNull();
    });

    it('ignores an invalid Book sidecar without preventing the primary answer from completing', () => {
        const parsedConversation = parseLocalTeamConversationBook({
            transcriptFileName: 'legal-advisor--01.book',
            transcriptContent: 'This is not a TEAM conversation transcript.',
            manifest: TEAM_WORKSPACE_MANIFEST,
            job: {
                id: 'job-123',
                queuedAt: '2026-08-08T12:00:00.000Z',
            },
        });

        expect(parsedConversation).toBeNull();
    });
});
