import { sanitizeStreamingMessageContent } from './sanitizeStreamingMessageContent';

describe('sanitizeStreamingMessageContent', () => {
    it('keeps the original content when streaming has finished', () => {
        const message = 'Hello world $$unmatched but we are complete';
        expect(sanitizeStreamingMessageContent(message, { isComplete: true })).toBe(message);
    });

    it('trims an unclosed code fence while streaming', () => {
        const message = 'Here is a map:\n```geojson\n{"type":"Feature"}\n';
        expect(sanitizeStreamingMessageContent(message, { isComplete: false })).toBe('Here is a map:');
    });

    it('does not trim when the code fence is closed', () => {
        const message = 'Done:\n```geojson\n{}\n```\nExtra text';
        expect(sanitizeStreamingMessageContent(message, { isComplete: false })).toBe(message);
    });

    it('drops an incomplete image-prompt markup', () => {
        const message = 'Generating image: ![Preview](?image-prompt=landscape';
        expect(sanitizeStreamingMessageContent(message, { isComplete: false })).toBe('Generating image:');
    });

    it('removes trailing unmatched double dollars', () => {
        const message = 'Equation: $$E=mc^2';
        expect(sanitizeStreamingMessageContent(message, { isComplete: false })).toBe('Equation:');
    });
});
