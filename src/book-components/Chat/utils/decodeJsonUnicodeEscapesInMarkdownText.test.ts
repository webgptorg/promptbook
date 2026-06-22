import { decodeJsonUnicodeEscapesInMarkdownText } from './decodeJsonUnicodeEscapesInMarkdownText';

describe('decodeJsonUnicodeEscapesInMarkdownText', () => {
    it('decodes non-ASCII JSON Unicode escapes in chat prose', () => {
        expect(
            decodeJsonUnicodeEscapesInMarkdownText(
                'A resume\\u00e9 reply with source\\u016f and quoted \\u201cwords\\u201d.',
            ),
        ).toBe('A resume\u00e9 reply with source\u016f and quoted \u201cwords\u201d.');
    });

    it('keeps ASCII escapes unchanged to avoid rewriting JSON and security examples', () => {
        expect(decodeJsonUnicodeEscapesInMarkdownText('Keep \\u003Cscript\\u003E escaped.')).toBe(
            'Keep \\u003Cscript\\u003E escaped.',
        );
    });

    it('does not decode escapes inside inline code or fenced code blocks', () => {
        expect(
            decodeJsonUnicodeEscapesInMarkdownText(
                [
                    'Text\\u00e9 outside and `code\\u00e9 inside`.',
                    '',
                    '```json',
                    '{ "value": "code\\u00e9 inside" }',
                    '```',
                    '',
                    'More\\u00e9 outside.',
                ].join('\n'),
            ),
        ).toBe(
            [
                'Text\u00e9 outside and `code\\u00e9 inside`.',
                '',
                '```json',
                '{ "value": "code\\u00e9 inside" }',
                '```',
                '',
                'More\u00e9 outside.',
            ].join('\n'),
        );
    });
});
