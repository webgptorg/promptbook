import { resolveAgentMessageTouchedProjectNames } from './resolveAgentMessageTouchedProjectNames';

describe('resolveAgentMessageTouchedProjectNames', () => {
    it('returns nothing without a log or without existing projects', () => {
        expect(resolveAgentMessageTouchedProjectNames({ logText: null, knownProjectNames: ['my-website'] })).toEqual(
            [],
        );
        expect(resolveAgentMessageTouchedProjectNames({ logText: '', knownProjectNames: ['my-website'] })).toEqual([]);
        expect(
            resolveAgentMessageTouchedProjectNames({
                logText: JSON.stringify({
                    type: 'assistant',
                    message: {
                        content: [
                            { type: 'tool_use', name: 'Read', input: { file_path: 'projects/my-website/a.txt' } },
                        ],
                    },
                }),
                knownProjectNames: [],
            }),
        ).toEqual([]);
    });

    it('reports a project the harness only viewed', () => {
        const logText = JSON.stringify({
            type: 'assistant',
            message: {
                content: [
                    {
                        type: 'tool_use',
                        name: 'Read',
                        input: { file_path: '/home/agent/agent-abc/projects/my-website/index.html' },
                    },
                ],
            },
        });

        expect(
            resolveAgentMessageTouchedProjectNames({ logText, knownProjectNames: ['my-website', 'other-project'] }),
        ).toEqual(['my-website']);
    });

    it('reports a project edited through a Windows path', () => {
        const logText = JSON.stringify({
            type: 'assistant',
            message: {
                content: [
                    {
                        type: 'tool_use',
                        name: 'Edit',
                        input: { file_path: 'C:\\agents\\agent-abc\\projects\\My-Website\\index.html' },
                    },
                ],
            },
        });

        expect(resolveAgentMessageTouchedProjectNames({ logText, knownProjectNames: ['my-website'] })).toEqual([
            'my-website',
        ]);
    });

    it('reports Codex commands and file changes', () => {
        const logText = [
            JSON.stringify({
                type: 'item.started',
                item: { type: 'command_execution', command: 'ls projects/prague-map' },
            }),
            JSON.stringify({
                type: 'item.completed',
                item: { type: 'file_change', changes: [{ path: 'projects/my-website/index.html' }] },
            }),
        ].join('\n');

        expect(
            resolveAgentMessageTouchedProjectNames({
                logText,
                knownProjectNames: ['my-website', 'prague-map'],
            }),
        ).toEqual(['prague-map', 'my-website']);
    });

    it('reports every touched project exactly once, ordered by first appearance', () => {
        const logText = [
            JSON.stringify({
                type: 'assistant',
                message: {
                    content: [{ type: 'tool_use', name: 'Read', input: { file_path: 'projects/my-website/a.txt' } }],
                },
            }),
            JSON.stringify({
                type: 'assistant',
                message: {
                    content: [
                        { type: 'tool_use', name: 'Glob', input: { path: 'projects/prague-map' } },
                        { type: 'tool_use', name: 'Write', input: { file_path: 'projects/my-website/b.txt' } },
                    ],
                },
            }),
        ].join('\n');

        expect(
            resolveAgentMessageTouchedProjectNames({
                logText,
                knownProjectNames: ['my-website', 'prague-map'],
            }),
        ).toEqual(['my-website', 'prague-map']);
    });

    it('ignores projects that only appear in tool results or assistant narration', () => {
        const logText = [
            JSON.stringify({
                type: 'assistant',
                message: { content: [{ type: 'text', text: 'I could update projects/my-website later.' }] },
            }),
            JSON.stringify({
                type: 'user',
                message: { content: [{ type: 'tool_result', text: 'MESSAGE @User Please check projects/my-website' }] },
            }),
        ].join('\n');

        expect(resolveAgentMessageTouchedProjectNames({ logText, knownProjectNames: ['my-website'] })).toEqual([]);
    });

    it('ignores project placeholders that do not exist', () => {
        const logText = JSON.stringify({
            type: 'item.started',
            item: { type: 'command_execution', command: 'ls projects/<project-name>' },
        });

        expect(resolveAgentMessageTouchedProjectNames({ logText, knownProjectNames: ['my-website'] })).toEqual([]);
    });
});
