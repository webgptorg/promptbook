import { describe, expect, it } from '@jest/globals';
import { parseMessageButtons } from './parseMessageButtons';

describe('parseMessageButtons', () => {
    it('parses message quick buttons without changing existing syntax', () => {
        const result = parseMessageButtons('Hello\n\n[Ask](?message=Hello%20there)');

        expect(result.contentWithoutButtons).toBe('Hello');
        expect(result.buttons).toEqual([
            {
                type: 'message',
                text: 'Ask',
                message: 'Hello there',
            },
        ]);
    });

    it('parses action quick buttons and keeps only non-button content', () => {
        const result = parseMessageButtons(
            'Hello\n\n[Print](?action=window.print%28%29)\n[Copy](?action=navigator.clipboard.writeText%28%27hi%27%29)',
        );

        expect(result.contentWithoutButtons).toBe('Hello');
        expect(result.buttons).toEqual([
            {
                type: 'action',
                text: 'Print',
                code: 'window.print()',
            },
            {
                type: 'action',
                text: 'Copy',
                code: "navigator.clipboard.writeText('hi')",
            },
        ]);
    });

    it('leaves unsupported query links in message content', () => {
        const result = parseMessageButtons('Hello\n\n[Regular](?foo=bar)');

        expect(result.contentWithoutButtons).toBe('Hello\n\n[Regular](?foo=bar)');
        expect(result.buttons).toEqual([]);
    });
});
