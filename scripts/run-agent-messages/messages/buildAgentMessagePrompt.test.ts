import { buildAgentMessagePrompt } from './buildAgentMessagePrompt';

describe('buildAgentMessagePrompt', () => {
    it('builds the message-answering prompt around the compiled local agent system message', () => {
        const prompt = buildAgentMessagePrompt(
            'messages/queued/question.book',
            'You are Support Assistant\n\n## Rules\n\n-   Be concise.',
        );

        expect(prompt).toContain('-   Read `messages/queued/question.book` and answer the most recent `MESSAGE @User`');
        expect(prompt).toContain('**This is how you should behave:**');
        expect(prompt).toContain('You are Support Assistant');
        expect(prompt).toContain('## Rules');
        expect(prompt).toContain(
            '-   Only change the queued message file by appending one new `MESSAGE @Agent` block',
        );
        expect(prompt).not.toContain('Use `agent.book`');
        expect(prompt).not.toContain('docs/book-language-manual.md');
        expect(prompt).not.toContain('# Book Language blueprint');
    });
});
