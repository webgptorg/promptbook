import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { parseAgentSourceWithCommitments } from './parseAgentSourceWithCommitments';
import { validateBook } from './string_book';

describe('parseAgentSourceWithCommitments unknown commitments', () => {
    it('separates unknown commitment blocks from the preceding registered commitment', () => {
        const agentSource = validateBook(spaceTrim(`
            Generic chatter

            GOAL Empathetic and understanding support bot whi
            GOAL Keep your projects up to date

            FOO
            Content of unknown commitment foo

            BAR BZZ
            Content of unknown commitment bar bzz

            CLOSED
        `));

        const result = parseAgentSourceWithCommitments(agentSource);

        expect(result.commitments.map(({ type, content }) => ({ type, content }))).toEqual([
            {
                type: 'GOAL',
                content: 'Empathetic and understanding support bot whi',
            },
            {
                type: 'GOAL',
                content: 'Keep your projects up to date',
            },
            {
                type: 'CLOSED',
                content: '',
            },
        ]);
        expect(result.unknownCommitments).toEqual([
            {
                type: 'FOO',
                originalLine: 'FOO',
                lineNumber: 6,
                source: 'FOO\nContent of unknown commitment foo',
            },
            {
                type: 'BAR BZZ',
                originalLine: 'BAR BZZ',
                lineNumber: 9,
                source: 'BAR BZZ\nContent of unknown commitment bar bzz',
            },
        ]);
    });

    it('keeps uppercase lines inside a code block as commitment content', () => {
        const agentSource = validateBook(spaceTrim(`
            Code Agent

            GOAL Preserve the literal code block.
            \`\`\`
            FOO
            \`\`\`
            CLOSED
        `));

        const result = parseAgentSourceWithCommitments(agentSource);

        expect(result.unknownCommitments).toEqual([]);
        expect(result.commitments[0]).toMatchObject({
            type: 'GOAL',
            content: 'Preserve the literal code block.\n```\nFOO\n```',
        });
    });
});
