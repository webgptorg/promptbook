import { buildAgentMessagePrompt } from './buildAgentMessagePrompt';

describe('buildAgentMessagePrompt', () => {
    it('builds the message-answering prompt around the compiled local agent system message', () => {
        const prompt = buildAgentMessagePrompt(
            'messages/queued/question.book',
            'You are Support Assistant\n\n## Rules\n\n-   Be concise.',
        );

        expect(prompt).toContain('-   Read `messages/queued/question.book` and answer the most recent `MESSAGE @User`');
        expect(prompt).toContain('You are Support Assistant');
        expect(prompt).toContain('## Rules');
        expect(prompt).toContain('-   Only change the queued message file by appending one new `MESSAGE @Agent` block');
        expect(prompt).not.toContain('Use `agent.book`');
        expect(prompt).not.toContain('docs/book-language-manual.md');
        expect(prompt).not.toContain('# Book Language blueprint');
    });

    it('explains the agent-owned projects convention in every prompt', () => {
        const prompt = buildAgentMessagePrompt('messages/queued/question.book', 'You are Support Assistant');

        expect(prompt).toContain('## Projects');
        expect(prompt).toContain('projects/');
        expect(prompt).toContain(
            '-   Do not modify any other file in the repository, except files inside your own `projects/` directory',
        );
    });

    it('teaches chat links to project files when the projects URL path is known', () => {
        const prompt = buildAgentMessagePrompt('messages/queued/question.book', 'You are Support Assistant', {
            projectsUrlPath: '/agents/agent1234/projects',
        });

        expect(prompt).toContain('[Homepage](/agents/agent1234/projects/my-website/files/index.html)');
    });

    it('falls back to plain project paths when the projects URL path is unknown', () => {
        const prompt = buildAgentMessagePrompt('messages/queued/question.book', 'You are Support Assistant');

        expect(prompt).toContain('`projects/my-website/index.html`');
        expect(prompt).not.toContain('files/index.html)');
    });
});
