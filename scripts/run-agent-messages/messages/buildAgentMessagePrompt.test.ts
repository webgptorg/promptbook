import { buildAgentMessagePrompt } from './buildAgentMessagePrompt';

describe('buildAgentMessagePrompt', () => {
    it('builds the message-answering prompt with the selected message link', () => {
        expect(buildAgentMessagePrompt('messages/queued/question.book')).toContain(
            '-   Look at folder [user question](messages/queued/question.book) and answer it',
        );
        expect(buildAgentMessagePrompt('messages/queued/question.book')).toContain(
            '-   Start your answer with line containing "MESSAGE @Agent"',
        );
    });
});
