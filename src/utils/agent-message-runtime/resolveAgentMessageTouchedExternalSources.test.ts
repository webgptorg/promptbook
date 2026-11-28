import { resolveAgentMessageTouchedExternalSources } from './resolveAgentMessageTouchedExternalSources';

describe('resolveAgentMessageTouchedExternalSources', () => {
    it('returns nothing without a log', () => {
        expect(resolveAgentMessageTouchedExternalSources({ logText: null })).toEqual([]);
        expect(resolveAgentMessageTouchedExternalSources({ logText: '' })).toEqual([]);
    });

    it('returns nothing for an answer which only worked inside the agent', () => {
        const logText = [
            JSON.stringify({
                type: 'assistant',
                message: {
                    content: [
                        { type: 'tool_use', name: 'Edit', input: { file_path: 'projects/my-website/index.html' } },
                    ],
                },
            }),
            JSON.stringify({
                type: 'item.completed',
                item: { type: 'command_execution', command: 'npm run build' },
            }),
        ].join('\n');

        expect(resolveAgentMessageTouchedExternalSources({ logText })).toEqual([]);
    });

    it('reports the integration behind one harness tool call', () => {
        const logText = JSON.stringify({
            type: 'assistant',
            message: {
                content: [
                    {
                        type: 'tool_use',
                        name: 'mcp__gmail__create_draft',
                        input: { to: 'manager@ptbk.io', subject: 'Daily email summary' },
                    },
                ],
            },
        });

        expect(resolveAgentMessageTouchedExternalSources({ logText })).toEqual([
            { kind: 'integration', name: 'Gmail' },
        ]);
    });

    it('humanizes a multi-word integration name', () => {
        const logText = JSON.stringify({
            type: 'assistant',
            message: {
                content: [{ type: 'tool_use', name: 'mcp__google-calendar__list_events', input: {} }],
            },
        });

        expect(resolveAgentMessageTouchedExternalSources({ logText })).toEqual([
            { kind: 'integration', name: 'Google Calendar' },
        ]);
    });

    it('reports a fetched website by its hostname', () => {
        const logText = JSON.stringify({
            type: 'assistant',
            message: {
                content: [{ type: 'tool_use', name: 'WebFetch', input: { url: 'https://Ptbk.io/pricing?utm=1' } }],
            },
        });

        expect(resolveAgentMessageTouchedExternalSources({ logText })).toEqual([
            { kind: 'website', name: 'ptbk.io', url: 'https://ptbk.io/pricing?utm=1' },
        ]);
    });

    it('reports a website only when the shell command really reaches it', () => {
        const fetchingLogText = JSON.stringify({
            type: 'assistant',
            message: {
                content: [
                    { type: 'tool_use', name: 'Bash', input: { command: 'curl -s https://api.ptbk.io/v1/status' } },
                ],
            },
        });
        const writingLogText = JSON.stringify({
            type: 'assistant',
            message: {
                content: [
                    {
                        type: 'tool_use',
                        name: 'Write',
                        input: { file_path: 'index.html', content: '<a href="https://api.ptbk.io/v1/status">Docs</a>' },
                    },
                ],
            },
        });

        expect(resolveAgentMessageTouchedExternalSources({ logText: fetchingLogText })).toEqual([
            { kind: 'website', name: 'api.ptbk.io', url: 'https://api.ptbk.io/v1/status' },
        ]);
        expect(resolveAgentMessageTouchedExternalSources({ logText: writingLogText })).toEqual([]);
    });

    it('ignores addresses of the machine the agent runs on', () => {
        const logText = JSON.stringify({
            type: 'assistant',
            message: {
                content: [
                    { type: 'tool_use', name: 'WebFetch', input: { url: 'http://localhost:4000/preview' } },
                    { type: 'tool_use', name: 'Bash', input: { command: 'curl http://127.0.0.1:4000/health' } },
                ],
            },
        });

        expect(resolveAgentMessageTouchedExternalSources({ logText })).toEqual([]);
    });

    it('reports the query of one web search', () => {
        const logText = JSON.stringify({
            type: 'assistant',
            message: {
                content: [{ type: 'tool_use', name: 'WebSearch', input: { query: '  promptbook   pricing ' } }],
            },
        });

        expect(resolveAgentMessageTouchedExternalSources({ logText })).toEqual([
            { kind: 'search', name: 'promptbook pricing' },
        ]);
    });

    it('reports Codex integration calls, web searches and network commands', () => {
        const logText = [
            JSON.stringify({
                type: 'item.completed',
                item: { type: 'mcp_tool_call', server: 'gmail', tool: 'create_draft' },
            }),
            JSON.stringify({ type: 'item.completed', item: { type: 'web_search', query: 'promptbook pricing' } }),
            JSON.stringify({
                type: 'item.completed',
                item: { type: 'command_execution', command: 'wget https://ptbk.io/robots.txt' },
            }),
        ].join('\n');

        expect(resolveAgentMessageTouchedExternalSources({ logText })).toEqual([
            { kind: 'integration', name: 'Gmail' },
            { kind: 'search', name: 'promptbook pricing' },
            { kind: 'website', name: 'ptbk.io', url: 'https://ptbk.io/robots.txt' },
        ]);
    });

    it('reports every touched source exactly once, ordered by first appearance', () => {
        const logText = [
            JSON.stringify({
                type: 'assistant',
                message: {
                    content: [{ type: 'tool_use', name: 'mcp__gmail__search_emails', input: { query: 'today' } }],
                },
            }),
            JSON.stringify({
                type: 'assistant',
                message: {
                    content: [
                        { type: 'tool_use', name: 'WebFetch', input: { url: 'https://ptbk.io/a' } },
                        { type: 'tool_use', name: 'mcp__gmail__create_draft', input: {} },
                        { type: 'tool_use', name: 'WebFetch', input: { url: 'https://ptbk.io/b' } },
                    ],
                },
            }),
        ].join('\n');

        expect(resolveAgentMessageTouchedExternalSources({ logText })).toEqual([
            { kind: 'integration', name: 'Gmail' },
            { kind: 'website', name: 'ptbk.io', url: 'https://ptbk.io/a' },
        ]);
    });

    it('ignores sources that only appear in assistant narration', () => {
        const logText = JSON.stringify({
            type: 'assistant',
            message: { content: [{ type: 'text', text: 'I could look at https://ptbk.io and Gmail later.' }] },
        });

        expect(resolveAgentMessageTouchedExternalSources({ logText })).toEqual([]);
    });
});
