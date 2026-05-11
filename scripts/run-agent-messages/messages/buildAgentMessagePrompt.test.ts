import { buildAgentMessagePrompt } from './buildAgentMessagePrompt';

describe('buildAgentMessagePrompt', () => {
    it('builds the message-answering prompt with the selected message link', () => {
        expect(buildAgentMessagePrompt('messages/queued/question.md')).toContain(
            '-   Look at folder [user question](messages/queued/question.md) and answer it',
        );
        expect(buildAgentMessagePrompt('messages/queued/question.md')).toContain(
            '-   Start your answer with line containing "MESSAGE @Agent"',
        );
    });
});
