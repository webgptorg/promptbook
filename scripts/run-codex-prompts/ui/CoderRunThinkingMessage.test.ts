import {
    extractThinkingMessageFromOutputLine,
    isImportantCoderRunOutputLine,
    sanitizeCoderRunOutputLine,
} from './CoderRunThinkingMessage';

describe('CoderRunThinkingMessage', () => {
    it('sanitizes ANSI-colored output before rendering it in Ink', () => {
        expect(sanitizeCoderRunOutputLine('\u001b[31mFailure\u001b[39m')).toBe('Failure');
    });

    it('extracts a thinking summary from structured JSON output', () => {
        expect(
            extractThinkingMessageFromOutputLine('{"type":"reasoning","summary":"Inspecting the repository"}'),
        ).toBe('Inspecting the repository');
    });

    it('extracts nested message content from structured JSON output', () => {
        expect(
            extractThinkingMessageFromOutputLine(
                '{"message":{"content":[{"type":"text","text":"Planning the next edit"}]}}',
            ),
        ).toBe('Planning the next edit');
    });

    it('ignores oversized JSON blobs that do not contain a short message', () => {
        const hugeJsonBlob = `{"files":"${'a'.repeat(600)}"}`;

        expect(extractThinkingMessageFromOutputLine(hugeJsonBlob)).toBeUndefined();
    });

    it('flags stderr-like output as important for the live event log', () => {
        expect(isImportantCoderRunOutputLine('Verification failed hard', 'stderr')).toBe(true);
        expect(isImportantCoderRunOutputLine('Retrying after rate limit', 'stdout')).toBe(true);
        expect(isImportantCoderRunOutputLine('Planning next step', 'stdout')).toBe(false);
    });
});
