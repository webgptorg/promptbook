import { describe, expect, it } from '@jest/globals';
import { BookEditorMonacoTokenization } from './BookEditorMonacoTokenization';

describe('BookEditorMonacoTokenization', () => {
    it('extracts all supported teammate reference notations inside TEAM commitments', () => {
        const source = `Noah Brown

PERSONA Curious and inquisitive AI explorer.
RULE Respond in a friendly and approachable manner.
TEAM
{a}
{a a}
@b
https://example.com/c
{https://example.com/d}

CLOSED`;

        const matches = BookEditorMonacoTokenization.extractAgentReferenceMatches(source);

        expect(matches.map(({ value }) => value)).toEqual([
            'a',
            'a a',
            'b',
            'https://example.com/c',
            'https://example.com/d',
        ]);
    });

    it('does not treat non-reference commitments as teammate-reference links', () => {
        const source = `Noah Brown

RULE Mention {a} @b and https://example.com/c.
TEAM {x}
CLOSED`;

        const matches = BookEditorMonacoTokenization.extractAgentReferenceMatches(source);

        expect(matches.map(({ value }) => value)).toEqual(['x']);
    });

    it('ignores reference-looking tokens inside code blocks of TEAM commitment', () => {
        const source = `Noah Brown

TEAM
\`\`\`markdown
{a}
@b
https://example.com/c
\`\`\`
{d}
CLOSED`;

        const matches = BookEditorMonacoTokenization.extractAgentReferenceMatches(source);

        expect(matches.map(({ value }) => value)).toEqual(['d']);
    });
});
