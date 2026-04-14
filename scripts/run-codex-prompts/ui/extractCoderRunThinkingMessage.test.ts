import { extractCoderRunThinkingMessage } from './extractCoderRunThinkingMessage';

describe('extractCoderRunThinkingMessage', () => {
    it('returns the latest plain-text thinking line', () => {
        expect(
            extractCoderRunThinkingMessage(`
                Processing prompts/example.md#12
                Thinking about how to refactor the parser safely
            `),
        ).toBe('Thinking about how to refactor the parser safely');
    });

    it('extracts human-readable text from streamed JSON lines', () => {
        expect(
            extractCoderRunThinkingMessage(
                '{"type":"stream","delta":{"message":"Inspecting failing tests before editing the route"}}',
            ),
        ).toBe('Inspecting failing tests before editing the route');
    });

    it('ignores Promptbook status lines and command echoes', () => {
        expect(extractCoderRunThinkingMessage('\u001b[34mProcessing prompts/example.md#12\u001b[39m')).toBeUndefined();
        expect(
            extractCoderRunThinkingMessage('C:\\repo bash "C:/Users/me/AppData/Local/Temp/promptbook-runner.sh"'),
        ).toBeUndefined();
    });

    it('ignores JSON blobs that only contain metadata', () => {
        expect(
            extractCoderRunThinkingMessage('{"type":"result","usage":{"inputTokens":1,"outputTokens":2}}'),
        ).toBeUndefined();
    });
});
