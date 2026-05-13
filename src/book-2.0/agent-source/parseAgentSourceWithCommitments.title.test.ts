import { describe, expect, it } from '@jest/globals';
import { COMMITMENT_REGISTRY } from '../../commitments/index';
import { parseAgentSourceWithCommitments } from './parseAgentSourceWithCommitments';
import { validateBook } from './string_book';

/**
 * Returns all supported commitment keywords including aliases.
 */
function getSupportedCommitmentKeywords(): Array<string> {
    const supportedCommitmentKeywords = new Set<string>();

    for (const definition of COMMITMENT_REGISTRY) {
        supportedCommitmentKeywords.add(definition.type);

        const aliases = (definition as { readonly aliases?: ReadonlyArray<string> }).aliases || [];
        for (const alias of aliases) {
            supportedCommitmentKeywords.add(alias);
        }
    }

    return Array.from(supportedCommitmentKeywords).sort();
}

describe('parseAgentSourceWithCommitments title prelude', () => {
    it('treats the first non-empty line as the agent name when there is no description block', () => {
        const agentSource = validateBook(`Persona John

PERSONA This is the first real commitment`);

        const result = parseAgentSourceWithCommitments(agentSource);

        expect(result.agentName).toBe('Persona John');
        expect(result.agentNameLineNumber).toBe(1);
        expect(result.commitments).toEqual([
            expect.objectContaining({
                type: 'PERSONA',
                content: 'This is the first real commitment',
                lineNumber: 3,
            }),
        ]);
        expect(result.nonCommitmentLines[0]).toBe('Persona John');
    });

    it('treats the first non-empty line as plain text even when another commitment keyword appears later in the line', () => {
        const agentSource = validateBook(`I don't know, Goal Generator

GOAL This is the first real commitment`);

        const result = parseAgentSourceWithCommitments(agentSource);

        expect(result.agentName).toBe(`I don't know, Goal Generator`);
        expect(result.commitments).toEqual([
            expect.objectContaining({
                type: 'GOAL',
                content: 'This is the first real commitment',
            }),
        ]);
    });

    it.each([
        {
            newline: '\n',
            variant: 'Unix',
        },
        {
            newline: '\r\n',
            variant: 'Windows',
        },
    ])(
        'keeps leading whitespace-only lines and description parsing consistent for $variant newlines',
        ({ newline }) => {
            const agentSource = validateBook(
                [
                    '',
                    '   ',
                    'Goal maker',
                    '',
                    'Short description',
                    'Still description',
                    'GOAL This is the first real commitment',
                ].join(newline),
            );

            const result = parseAgentSourceWithCommitments(agentSource);

            expect(result.agentName).toBe('Goal maker');
            expect(result.agentNameLineNumber).toBe(3);
            expect(result.nonCommitmentLines).toEqual(['Goal maker', '', 'Short description', 'Still description']);
            expect(result.commitments).toEqual([
                expect.objectContaining({
                    type: 'GOAL',
                    content: 'This is the first real commitment',
                    lineNumber: 7,
                }),
            ]);
        },
    );

    it.each(getSupportedCommitmentKeywords())(
        'never classifies the first non-empty line as `%s` commitment syntax',
        (commitmentKeyword) => {
            const agentSource = validateBook(`${commitmentKeyword} Title

NOTE This is the first real commitment`);

            const result = parseAgentSourceWithCommitments(agentSource);

            expect(result.agentName).toBe(`${commitmentKeyword} Title`);
            expect(result.commitments).toEqual([
                expect.objectContaining({
                    type: 'NOTE',
                    content: 'This is the first real commitment',
                    lineNumber: 3,
                }),
            ]);
        },
    );
});
