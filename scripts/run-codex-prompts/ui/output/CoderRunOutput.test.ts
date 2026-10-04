import { readFileSync } from 'fs';
import { join } from 'path';
import moment from 'moment';
import { CoderRunUiState } from '../CoderRunUiState';
import { stripAnsi, visibleLength } from '../coderRunUiText';
import { buildCoderOutputLines } from './buildCoderOutputLines';
import { CoderRunOutput } from './CoderRunOutput';
import * as outputNormalizer from './normalizeCoderOutputRecord';

/** Loads deterministic harness recordings without starting a model or external service. */
function fixture(name: string): string {
    return readFileSync(join(__dirname, 'fixtures', name), 'utf8');
}

/** Adds one structured record exactly as a harness would write it. */
function appendRecord(output: CoderRunOutput, record: unknown): void {
    output.append(`${JSON.stringify(record)}\n`, 'stdout', 'fixture', false);
}

describe('CoderRunOutput', () => {
    it.each(['claude-code.jsonl', 'openai-codex.jsonl', 'openai-codex.txt'])(
        'assembles arbitrary chunk boundaries for %s, preserving original chunks',
        (name) => {
            const text = fixture(name);
            const complete = new CoderRunOutput();
            complete.append(text, 'stdout', name, false);
            for (const size of [1, 7, 113]) {
                const fragmented = new CoderRunOutput();
                for (let offset = 0; offset < text.length; offset += size) {
                    fragmented.append(text.slice(offset, offset + size), 'stdout', name, false);
                    if (offset % 1000 < size) fragmented.getPendingEvents();
                }
                expect(fragmented.events).toEqual(complete.events);
                if (size > 1) expect(fragmented.rawChunks.map((chunk) => chunk.text).join('')).toBe(text);
                expect(
                    fragmented.events.filter((event) => event.kind === 'agent' && event.text.includes('I’ll inspect')),
                ).toHaveLength(1);
                expect(fragmented.events.some((event) => event.text.includes('src/世界.ts 👩‍💻.'))).toBe(true);
                expect(
                    fragmented.events.some(
                        (event) => ['tool', 'error'].includes(event.kind) && event.text.includes('npm test'),
                    ),
                ).toBe(true);
            }
        },
    );

    it('keeps mixed stdout/stderr fragments separate and never treats partial JSON as agent text', () => {
        const output = new CoderRunOutput();
        output.append('{"type":"assistant","message":', 'stdout', 'claude-code', false);
        output.append('warning: credential ', 'stderr', 'claude-code', false);
        expect(output.events).toHaveLength(0);
        expect(output.getPendingEvents().map((event) => event.kind)).toEqual(['status', 'unknown']);
        output.append('{"id":"one","content":[{"type":"text","text":"Hello"}]}}\n', 'stdout', 'claude-code', false);
        output.append('expires soon\n', 'stderr', 'claude-code', false);
        expect(output.events.map((event) => event.text)).toEqual(['Hello', 'warning: credential expires soon']);
        expect(output.events[1]!.kind).toBe('warning');
        output.append('{"broken":', 'stdout', 'claude-code', false);
        output.flush();
        expect(output.events.at(-1)).toMatchObject({ kind: 'unknown', text: '{"broken":' });
    });

    it('keeps commands, paths, tool errors, results and unknown records distinct', () => {
        const output = new CoderRunOutput();
        output.append(fixture('claude-code.jsonl'), 'stdout', 'claude-code', false);
        expect(output.events.some((event) => event.title.includes('Read') && event.text.includes('src/世界.ts'))).toBe(
            true,
        );
        expect(
            output.events.some((event) => event.kind === 'error' && event.text.includes('FAIL missing assertion')),
        ).toBe(true);
        expect(
            output.events.some(
                (event) => event.kind === 'unknown' && event.text.includes('Keep this unfamiliar message'),
            ),
        ).toBe(true);
        expect(output.events.filter((event) => event.text === 'The tests need attention.')).toHaveLength(1);
        expect(output.events.at(-1)).toMatchObject({ kind: 'result', text: 'Response complete' });
    });

    it('does not render streamed tool input JSON as conversation text', () => {
        const output = new CoderRunOutput();
        appendRecord(output, {
            type: 'stream_event',
            event: {
                type: 'content_block_start',
                index: 1,
                content_block: { type: 'tool_use', name: 'Edit', id: 'edit-one' },
            },
        });
        appendRecord(output, {
            type: 'stream_event',
            event: {
                type: 'content_block_delta',
                index: 1,
                delta: { type: 'input_json_delta', partial_json: '{"file_' },
            },
        });
        expect(output.events).toHaveLength(1);
        expect(output.events[0]!.title).toContain('Edit');
        expect(output.events[0]!.text).not.toContain('{"file_');
        expect(output.rawChunks.map((chunk) => chunk.text).join('')).toContain('partial_json');
    });

    it('retains repeated identical deltas while deduplicating complete Codex snapshots', () => {
        const output = new CoderRunOutput();
        const delta = {
            type: 'item.delta',
            uuid: 'reply-envelope',
            item: { id: 'reply', type: 'agent_message' },
            delta: 'ha',
        };
        appendRecord(output, delta);
        appendRecord(output, delta);
        expect(output.events[0]!.text).toBe('haha');
        const completed = { type: 'item.completed', item: { id: 'reply', type: 'agent_message', text: 'haha' } };
        appendRecord(output, completed);
        appendRecord(output, completed);
        expect(output.events).toHaveLength(1);
        expect(output.events[0]!.text).toBe('haha');
        expect(output.rawChunks).toHaveLength(4);
    });

    it('flushes unterminated agent, check and diagnostic text with its original attribution', () => {
        const output = new CoderRunOutput();
        output.append('codex\nI will inspect the file.', 'stderr', 'OpenAI Codex', false);
        expect(output.getPendingEvents()).toEqual([
            { kind: 'agent', title: 'Agent', text: 'I will inspect the file.' },
        ]);
        output.flush();
        output.append('PASS example.test.ts', 'stdout', 'OpenAI Codex', true);
        output.append('Error: could not write the report', 'stderr', 'OpenAI Codex', true);
        output.flush();
        expect(output.events).toEqual([
            expect.objectContaining({ kind: 'agent', text: 'I will inspect the file.' }),
            expect.objectContaining({ kind: 'check', text: 'PASS example.test.ts' }),
            expect.objectContaining({ kind: 'error', text: 'Error: could not write the report' }),
        ]);
    });

    it('defers projection across capture and check boundaries until the display reads it', () => {
        const normalize = jest.spyOn(outputNormalizer, 'normalizeCoderOutputRecord');
        try {
            const output = new CoderRunOutput();
            appendRecord(output, { type: 'result', result: 'Done' });
            output.flush();
            expect(normalize).not.toHaveBeenCalled();
            expect(output.events[0]!.text).toBe('Done');
            expect(normalize).toHaveBeenCalledTimes(1);
        } finally {
            normalize.mockRestore();
        }
    });

    it('preserves diagnostic fields in recognized envelopes and incomplete JSON prefixes', () => {
        const output = new CoderRunOutput();
        appendRecord(output, { type: 'result', is_error: true, error: { message: 'Authentication failed' } });
        appendRecord(output, {
            type: 'system',
            subtype: 'init',
            model: 'fixture',
            error: 'Initialization warning as error',
        });
        appendRecord(output, {
            type: 'stream_event',
            event: { type: 'message_stop', error: { message: 'Stream interrupted' } },
        });
        for (const message of ['Authentication failed', 'Initialization warning as error', 'Stream interrupted']) {
            expect(
                output.events.filter((event) => event.kind === 'error' && event.text.includes(message)),
            ).toHaveLength(1);
        }
        output.append('[wrapper] {"type":"assistant",', 'stdout', 'claude-code', false);
        expect(output.getPendingEvents()).toEqual([
            { kind: 'status', title: 'Receiving structured output · stdout', text: '' },
        ]);
        output.flush();
        expect(output.events.at(-1)).toMatchObject({ kind: 'unknown', text: '[wrapper] {"type":"assistant",' });
        output.append('[ERROR] An unterminated logger diagnostic', 'stderr', 'fixture', false);
        expect(output.getPendingEvents()[0]).toMatchObject({
            kind: 'unknown',
            text: '[ERROR] An unterminated logger diagnostic',
        });
    });

    it('keeps file paths and tool attribution after repeated completion envelopes', () => {
        const output = new CoderRunOutput();
        appendRecord(output, {
            type: 'assistant',
            message: {
                id: 'edit',
                content: [{ type: 'tool_use', id: 'edit-one', name: 'Edit', input: { file_path: 'src/example.ts' } }],
            },
        });
        const result = {
            type: 'user',
            message: { content: [{ type: 'tool_result', tool_use_id: 'edit-one', content: 'File updated' }] },
        };
        appendRecord(output, result);
        appendRecord(output, result);
        expect(output.events).toHaveLength(1);
        expect(output.events[0]).toMatchObject({
            kind: 'files',
            title: 'Reported file changes · Edit · completed',
            text: 'src/example.ts\nFile updated',
        });
    });

    it.each(['gemini', 'qwen-code', 'cline', 'github-copilot', 'opencode'])(
        'retains plain and unfamiliar %s output with an honest fallback',
        (name) => {
            const output = new CoderRunOutput();
            output.append('Text without speaker metadata\n', 'stdout', name, false);
            appendRecord(output, { type: 'unknown', nested: { error: 'Do not lose this' } });
            expect(output.events.every((event) => event.kind === 'unknown')).toBe(true);
            expect(output.events[1]!.text).toContain('Do not lose this');
        },
    );

    it('falls back when a familiar record type carries an unfamiliar payload shape', () => {
        const output = new CoderRunOutput();
        appendRecord(output, { type: 'result', content: { answer: 'An answer in a newer protocol' } });
        expect(output.events[0]).toMatchObject({ kind: 'unknown' });
        expect(output.events[0]!.text).toContain('An answer in a newer protocol');
    });

    it('does not invent a failure or warning from unstructured prose about diagnostics', () => {
        const output = new CoderRunOutput();
        output.append('I fixed the error handling and removed deprecated imports.\n', 'stdout', 'gemini', false);
        expect(output.events[0]).toMatchObject({
            kind: 'unknown',
            text: 'I fixed the error handling and removed deprecated imports.',
        });
    });

    it.each(['__proto__', 'constructor', 'toString'])(
        'treats %s as unstructured text instead of a Codex heading',
        (text) => {
            const output = new CoderRunOutput();
            output.append(`${text}\n`, 'stdout', 'OpenAI Codex', false);
            expect(output.events[0]).toMatchObject({ kind: 'unknown', text });
            expect(() =>
                buildCoderOutputLines({
                    mode: 'normal',
                    events: output.events,
                    rawChunks: output.rawChunks,
                    width: 40,
                    height: 8,
                    scrollOffset: 0,
                    isHistoryTruncated: false,
                }),
            ).not.toThrow();
        },
    );

    it('projects OpenCode, Copilot and existing TEAM events with supplied identities', () => {
        const output = new CoderRunOutput();
        appendRecord(output, { type: 'text', part: { id: 'one', text: 'OpenCode response' } });
        appendRecord(output, { type: 'assistant.message', data: { content: 'Copilot response' } });
        appendRecord(output, {
            type: 'team_result',
            agent: 'Lawyer',
            taskId: 'task-one',
            data: { response: 'Preserve attribution.' },
        });
        expect(output.events.map((event) => event.text)).toEqual([
            'OpenCode response',
            'Copilot response',
            'Preserve attribution.',
        ]);
        expect(output.events[2]!.title).toContain('Lawyer');
    });

    it('labels check output only from the runner check phase', () => {
        const output = new CoderRunOutput();
        output.append('PASS example.test.ts\n', 'stdout', 'codex', true);
        expect(output.events[0]).toMatchObject({ kind: 'check', text: 'PASS example.test.ts' });

        const state = new CoderRunUiState(moment());
        state.setPhase('checking');
        state.addAgentOutput('Check started');
        state.addAgentOutput('Warning: report upload unavailable', 'warning');
        expect(state.output.events.map((event) => event.kind)).toEqual(['check', 'warning']);
    });

    it('bounds long lines, pending records, messages and large volumes, with visible truncation', () => {
        const output = new CoderRunOutput();
        output.append('界'.repeat(1_000_000), 'stdout', 'codex', false);
        for (let index = 0; index < 3000; index++)
            appendRecord(output, {
                type: 'assistant',
                message: { id: String(index), content: [{ type: 'text', text: `message ${index}` }] },
            });
        expect(output.events.length).toBeLessThanOrEqual(160);
        expect(output.events.every((event) => event.text.length <= 8000)).toBe(true);
        expect(output.rawChunks.length).toBeLessThanOrEqual(2048);
        expect(output.rawChunks.reduce((length, chunk) => length + chunk.text.length, 0)).toBeLessThanOrEqual(256_000);
        expect(output.getPendingEvents().every((event) => event.text.length <= 32_000)).toBe(true);
        expect(output.isHistoryTruncated).toBe(true);
        expect(output.events.at(-1)!.text).toBe('message 2999');
    });

    it('retains command identity as well as the tail of long tool output', () => {
        const output = new CoderRunOutput();
        appendRecord(output, {
            type: 'item.completed',
            item: {
                id: 'long-command',
                type: 'command_execution',
                command: 'npm test',
                status: 'completed',
                exit_code: 0,
                aggregated_output: 'test details '.repeat(1500) + '\nPASS final test',
            },
        });
        expect(output.events[0]!.text).toContain('npm test');
        expect(output.events[0]!.text).toContain('PASS final test');
        expect(output.events[0]!.text.length).toBeLessThanOrEqual(8000);
    });

    it('wraps Unicode and long lines, neutralizes terminal commands and scrolls both projections', () => {
        const output = new CoderRunOutput();
        output.append(`\u001b[2Jhello\u0007\u009b\t世界 👩‍💻 café ${'long'.repeat(100)}\n`, 'stdout', 'fixture', false);
        for (const mode of ['normal', 'raw'] as const) {
            const options = {
                mode,
                events: output.events,
                rawChunks: output.rawChunks,
                width: 19,
                height: 8,
                scrollOffset: 0,
                isHistoryTruncated: false,
            };
            const tail = buildCoderOutputLines(options);
            const head = buildCoderOutputLines({ ...options, scrollOffset: 1000 });
            expect(tail.maxScrollOffset).toBeGreaterThan(0);
            expect(head.lines).not.toEqual(tail.lines);
            expect(head.lines.every((line) => visibleLength(line) <= 19)).toBe(true);
            expect(head.lines.join('\n')).not.toContain('\u001b[2J');
            expect(head.lines.join('\n')).not.toContain('\u009b');
            expect(head.lines.map(stripAnsi).join('\n')).toContain('世界 👩‍💻');
        }
    });

    it('keeps linked text and diagnostics between terminal hyperlink escape sequences', () => {
        expect(
            stripAnsi('\u001b]8;;https://example.com\u001b\\read the report\u001b]8;;\u001b\\ - Error: unavailable'),
        ).toBe('read the report - Error: unavailable');
    });

    it('keeps mode selection across tasks and starts each invocation in normal mode', () => {
        const state = new CoderRunUiState(moment());
        state.addScriptOutput(fixture('openai-codex.jsonl'), 'stdout');
        const entries = [...state.output.events];
        for (let index = 0; index < 20; index++) state.toggleOutputMode();
        expect(state.outputMode).toBe('normal');
        expect(state.output.events).toEqual(entries);
        state.toggleOutputMode();
        state.setCurrentPrompt('Next task');
        expect(state.outputMode).toBe('raw');
        expect(state.output.events).toHaveLength(0);
        expect(new CoderRunUiState(moment()).outputMode).toBe('normal');
    });
});
