import { resolveAgentMessageRuntimeActivity } from './resolveAgentMessageRuntimeActivity';

describe('resolveAgentMessageRuntimeActivity', () => {
    it('returns null for empty or missing log content', () => {
        expect(resolveAgentMessageRuntimeActivity('')).toBeNull();
        expect(resolveAgentMessageRuntimeActivity(null)).toBeNull();
        expect(resolveAgentMessageRuntimeActivity(undefined)).toBeNull();
    });

    it('returns null when the log has no structured assistant text', () => {
        const logText = [
            '+ claude --output-format stream-json',
            'some plain shell noise',
            'Traceback (most recent call last)',
        ].join('\n');

        expect(resolveAgentMessageRuntimeActivity(logText)).toBeNull();
    });

    it('extracts the natural-language assistant narration from a stream-json line', () => {
        const logText = JSON.stringify({
            type: 'assistant',
            message: { content: [{ type: 'text', text: 'Looking up the latest AI news for you.' }] },
        });

        expect(resolveAgentMessageRuntimeActivity(logText)).toBe('Looking up the latest AI news for you.');
    });

    it('keeps the latest assistant narration when multiple turns are streamed', () => {
        const logText = [
            JSON.stringify({
                type: 'assistant',
                message: { content: [{ type: 'text', text: 'First I will search.' }] },
            }),
            JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', text: 'result' }] } }),
            JSON.stringify({
                type: 'assistant',
                message: { content: [{ type: 'text', text: 'Now I am writing the summary.' }] },
            }),
        ].join('\n');

        expect(resolveAgentMessageRuntimeActivity(logText)).toBe('Now I am writing the summary.');
    });

    it('ignores assistant turns that only contain tool calls', () => {
        const logText = [
            JSON.stringify({
                type: 'assistant',
                message: { content: [{ type: 'text', text: 'Checking the website.' }] },
            }),
            JSON.stringify({
                type: 'assistant',
                message: { content: [{ type: 'tool_use', text: undefined }] },
            }),
        ].join('\n');

        expect(resolveAgentMessageRuntimeActivity(logText)).toBe('Checking the website.');
    });

    it('collapses whitespace and truncates long narrations', () => {
        const longText = `${'a'.repeat(200)}`;
        const logText = JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: longText }] } });

        const activity = resolveAgentMessageRuntimeActivity(logText);
        expect(activity).not.toBeNull();
        expect(activity!.endsWith('…')).toBe(true);
        expect(activity!.length).toBeLessThanOrEqual(161);
    });

    it('tolerates shell prefixes before the JSON payload', () => {
        const logText =
            '2026-07-07T00:00:00Z {"type":"assistant","message":{"content":[{"type":"text","text":"Thinking about your request."}]}}';

        expect(resolveAgentMessageRuntimeActivity(logText)).toBe('Thinking about your request.');
    });

    it('maps a Codex command start to a concise user-facing action', () => {
        const logText = JSON.stringify({
            type: 'item.started',
            item: {
                type: 'command_execution',
                command: "rg -n 'progressCard' apps/agents-server",
            },
        });

        expect(resolveAgentMessageRuntimeActivity(logText)).toBe('Inspecting relevant files.');
    });

    it('keeps generic thinking visible while Codex has only private reasoning', () => {
        const logText = [
            JSON.stringify({
                type: 'item.started',
                item: { type: 'reasoning', text: 'I should inspect the chat implementation.' },
            }),
            JSON.stringify({
                type: 'item.completed',
                item: { type: 'reasoning', text: 'I will begin by checking the repository.' },
            }),
        ].join('\n');

        expect(resolveAgentMessageRuntimeActivity(logText)).toBeNull();
    });

    it('keeps the latest concrete action when Codex resumes private reasoning', () => {
        const logText = [
            JSON.stringify({
                type: 'item.started',
                item: { type: 'command_execution', command: 'Get-Content apps/agents-server/src/app/page.tsx' },
            }),
            JSON.stringify({
                type: 'item.completed',
                item: { type: 'reasoning', text: 'Now I know where the chat state lives.' },
            }),
        ].join('\n');

        expect(resolveAgentMessageRuntimeActivity(logText)).toBe('Inspecting relevant files.');
    });

    it('maps a file update command to a concise user-facing action', () => {
        const logText = JSON.stringify({
            type: 'item.started',
            item: { type: 'command_execution', command: 'apply_patch <<\'PATCH\'' },
        });

        expect(resolveAgentMessageRuntimeActivity(logText)).toBe('Updating relevant files.');
    });

    it('keeps generic thinking visible for an unclassified Codex command', () => {
        const logText = JSON.stringify({
            type: 'item.started',
            item: { type: 'command_execution', command: 'custom-project-helper --synchronize' },
        });

        expect(resolveAgentMessageRuntimeActivity(logText)).toBeNull();
    });

    it('maps a completed Codex test command without showing its technical payload', () => {
        const logText = JSON.stringify({
            type: 'item.completed',
            item: {
                type: 'command_execution',
                command: 'npm test -- createUserChatHarnessProgressCard',
                exit_code: 0,
            },
        });

        expect(resolveAgentMessageRuntimeActivity(logText)).toBe('Finished running tests.');
    });

    it('keeps failed Codex commands concise', () => {
        const logText = JSON.stringify({
            type: 'item.completed',
            item: {
                type: 'command_execution',
                command: 'npm test',
                exit_code: 1,
            },
        });

        expect(resolveAgentMessageRuntimeActivity(logText)).toBe('A command needs attention.');
    });
});
