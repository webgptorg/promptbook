import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { parseAgentSourceWithCommitments } from './parseAgentSourceWithCommitments';
import { validateBook } from './string_book';

describe('parseAgentSourceWithCommitments with code blocks in commitments', () => {
    it('should assign code blocks to the current commitment', () => {
        const agentSource = validateBook(
            spaceTrim(`
                AI Agent

                FROM VOID
                NOTE This is a note


                \`\`\`
                Test nested text in the note
                \`\`\`


                NOTE And another note
                RULE Write poems.

                \`\`\`
                Roses are red,
                Violets are blue,
                Sugar is sweet,
                And so are you.
                \`\`\`
            `),
        );

        const result = parseAgentSourceWithCommitments(agentSource);

        expect(result.commitments).toHaveLength(4);

        // 1. FROM VOID
        expect(result.commitments[0]).toMatchObject({
            type: 'FROM',
            content: 'VOID',
        });

        // 2. NOTE with nested code block
        expect(result.commitments[1]?.type).toBe('NOTE');
        expect(result.commitments[1]?.content).toBe(
            'This is a note\n' + '\n' + '\n' + '```\n' + 'Test nested text in the note\n' + '```',
        );

        // 3. NOTE And another note
        expect(result.commitments[2]).toMatchObject({
            type: 'NOTE',
            content: 'And another note',
        });

        // 4. RULE with poem code block
        expect(result.commitments[3]?.type).toBe('RULE');
        expect(result.commitments[3]?.content).toBe(
            'Write poems.\n' +
                '\n' +
                '```\n' +
                'Roses are red,\n' +
                'Violets are blue,\n' +
                'Sugar is sweet,\n' +
                'And so are you.\n' +
                '```',
        );
    });

    it('should keep code blocks in non-commitment lines if no commitment is active', () => {
        const agentSource = validateBook(
            spaceTrim(`
            AI Agent

            \`\`\`
            Non-commitment code block
            \`\`\`

            NOTE A note
        `),
        );

        const result = parseAgentSourceWithCommitments(agentSource);

        expect(result.commitments).toHaveLength(1);
        expect(result.commitments[0]).toMatchObject({
            type: 'NOTE',
            content: 'A note',
        });

        expect(result.nonCommitmentLines).toContain('```');
        expect(result.nonCommitmentLines).toContain('Non-commitment code block');
    });
});
