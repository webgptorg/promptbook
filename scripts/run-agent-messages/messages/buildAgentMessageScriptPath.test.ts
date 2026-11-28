import type { AgentMessageFile } from './AgentMessageFile';
import { buildAgentMessageRuntimeLogPathFromFileName } from '../../../src/utils/agent-message-runtime/agentMessageRuntimePaths';
import { buildAgentMessageScriptPath } from './buildAgentMessageScriptPath';

describe('buildAgentMessageScriptPath', () => {
    it('places agent message scripts under the Promptbook temporary directory', () => {
        const messageFile: AgentMessageFile = {
            absolutePath: '/project/messages/queued/question.book',
            relativePath: 'messages/queued/question.book',
            fileName: 'question.book',
        };

        expect(buildAgentMessageScriptPath('/project', messageFile)).toBe(
            '/project/.promptbook/agent-messages/question.sh',
        );
        expect(buildAgentMessageRuntimeLogPathFromFileName('/project', messageFile.fileName)).toBe(
            '/project/.promptbook/agent-messages/question.log.txt',
        );
    });
});
