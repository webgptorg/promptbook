import { spaceTrim } from 'spacetrim';
import { buildAgentMessagePrompt } from './buildAgentMessagePrompt';

describe('buildAgentMessagePrompt', () => {
    it('builds the message-answering prompt around the compiled local agent system message', () => {
        const prompt = buildAgentMessagePrompt(
            'messages/queued/question.book',
            spaceTrim(`
                You are Support Assistant

                ## Rules

                -   Be concise.
            `),
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

    it('teaches Agents Server runtime API usage when available', () => {
        const prompt = buildAgentMessagePrompt('messages/queued/question.book', 'You are Support Assistant', {
            projectRuntimeApi: {
                agentPermanentId: 'agent1234',
                serverUrlEnvironmentVariableName: 'PTBK_AGENTS_SERVER_URL',
                tokenEnvironmentVariableName: 'PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN',
            },
        });

        expect(prompt).toContain('/api/internal/agent-project-runtimes');
        expect(prompt).toContain('"action":"start"');
        expect(prompt).toContain('"action":"assign_port"');
        expect(prompt).toContain('automatically runs `npm run dev`');
        expect(prompt).toContain('"agentPermanentId":"agent1234"');
        expect(prompt).toContain('$PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN');
    });

    it('explains the single-run TEAM transcript contract when a teammate workspace is prepared', () => {
        const prompt = buildAgentMessagePrompt('messages/queued/question.book', 'You are Support Assistant', {
            teamWorkspace: {
                relativeWorkspacePath: 'messages/team/question',
                manifest: {
                    version: 1,
                    primaryAgent: {
                        permanentId: 'support-agent',
                        agentName: 'Support Assistant',
                    },
                    teammates: [
                        {
                            permanentId: 'legal-agent',
                            agentName: 'Legal Advisor',
                            url: 'https://agents.example.com/agents/legal-agent',
                            instructions: 'Check legal risk before publishing.',
                            sourceFileName: 'legal-agent.book',
                        },
                    ],
                },
            },
        });

        expect(prompt).toContain('## Team consultations');
        expect(prompt).toContain('Legal Advisor');
        expect(prompt).toContain('exactly once');
        expect(prompt).toContain('messages/team/question/legal-agent--01.book');
        expect(prompt).toContain('MESSAGE @Support Assistant');
    });

    it('falls back to plain project paths when the projects URL path is unknown', () => {
        const prompt = buildAgentMessagePrompt('messages/queued/question.book', 'You are Support Assistant');

        expect(prompt).toContain('`projects/my-website/index.html`');
        expect(prompt).not.toContain('files/index.html)');
        expect(prompt).not.toContain('/api/internal/agent-project-runtimes');
    });
});
