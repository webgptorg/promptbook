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

        expect(prompt).toContain('-   Read `messages/queued/question.book` and answer the most recent `MESSAGE` block');
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

    it('teaches every managed invocation to plan goal-chat messages through the prepared sidecar', () => {
        const prompt = buildAgentMessagePrompt('messages/queued/question.book', 'You are Support Assistant', {
            plannedMessagesSidecar: {
                relativeSidecarPath: 'messages/planned/question.json',
                currentPlannedMessages: [],
            },
        });

        expect(prompt).toContain('## Planned goal-chat messages');
        expect(prompt).toContain('You currently have no planned messages waiting.');
        expect(prompt).toContain('Editing `messages/planned/question.json` is the **only** way');
        expect(prompt).toContain('{"action":"set","milliseconds":<repeat interval>');
        expect(prompt).toContain('{"action":"update","timeoutId":"<timeout id>","<field>":<new value>}');
        expect(prompt).toContain('{"action":"cancel","timeoutId":"<timeout id>"}');
        // Note: The whole schedule vocabulary has to reach the harness, otherwise it can only plan endless repetitions
        expect(prompt).toContain('`cronExpression`');
        expect(prompt).toContain('`maxRunCount`');
        expect(prompt).toContain('`startsAt` and `endsAt`');
        expect(prompt).toContain(
            '-   Do not modify any other file in the repository, except files inside your own `projects/` directory and the `commands` array of `messages/planned/question.json`',
        );
    });

    it('lists the whole schedule of every planned message so the harness can keep or replace it', () => {
        const prompt = buildAgentMessagePrompt('messages/queued/question.book', 'You are Support Assistant', {
            plannedMessagesSidecar: {
                relativeSidecarPath: 'messages/planned/question.json',
                currentPlannedMessages: [
                    {
                        timeoutId: 'timeout-1',
                        dueAt: '2026-08-14T10:00:00.000Z',
                        message: 'Re-check the stale projects.',
                        intervalMs: 300_000,
                        cronExpression: null,
                        startsAt: null,
                        endsAt: null,
                        maxRunCount: null,
                        runCount: 0,
                    },
                    {
                        timeoutId: 'timeout-2',
                        dueAt: '2026-08-15T10:00:00.000Z',
                        message: null,
                        intervalMs: null,
                        cronExpression: null,
                        startsAt: null,
                        endsAt: null,
                        maxRunCount: null,
                        runCount: 0,
                    },
                    {
                        timeoutId: 'timeout-3',
                        dueAt: '2026-08-16T07:00:00.000Z',
                        message: 'Send the daily report.',
                        intervalMs: null,
                        cronExpression: '0 9 * * 1-5',
                        startsAt: null,
                        endsAt: '2026-09-16T07:00:00.000Z',
                        maxRunCount: 10,
                        runCount: 3,
                    },
                ],
            },
        });

        expect(prompt).toContain(
            'These planned messages are already waiting for you, so keep them unless they stopped matching your goal:',
        );
        expect(prompt).toContain(
            '-   `timeout-1` repeats every 5 minutes, next at 2026-08-14T10:00:00.000Z: Re-check the stale projects.',
        );
        expect(prompt).toContain(
            '-   `timeout-2` wakes you once at 2026-08-15T10:00:00.000Z: Continue working towards the current goal.',
        );
        // Note: A bounded plan has to show how much of it is left, otherwise the agent cannot compare it with its goal
        expect(prompt).toContain(
            '-   `timeout-3` repeats on cron `0 9 * * 1-5`, until 2026-09-16T07:00:00.000Z, 3 of 10 runs done, next at 2026-08-16T07:00:00.000Z: Send the daily report.',
        );
        expect(prompt).not.toContain('You currently have no planned messages waiting.');
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
        expect(prompt).not.toContain('## Planned goal-chat messages');
    });
});
