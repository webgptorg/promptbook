import { buildAgentMessagePrompt } from './buildAgentMessagePrompt';

describe('buildAgentMessagePrompt', () => {
    it('builds the message-answering prompt around the local agent files instead of inlining the full blueprint', () => {
        const prompt = buildAgentMessagePrompt('messages/queued/question.book');

        expect(prompt).toContain('-   Read `messages/queued/question.book` and answer the most recent `MESSAGE @User`');
        expect(prompt).toContain('-   Use `agent.book` as the source of truth for the local agent behavior');
        expect(prompt).toContain('-   If `docs/book-language-manual.md` exists, use it as the local Book Language reference instead of guessing syntax');
        expect(buildAgentMessagePrompt('messages/queued/question.book')).toContain(
            '-   Only change the queued message file by appending one new `MESSAGE @Agent` block',
        );
        expect(prompt).not.toContain('# Book Language blueprint');
    });
});
