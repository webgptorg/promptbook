import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { validateBook } from '../../book-2.0/agent-source/string_book';
import { createUnknownCommitmentDiagnostics } from './createUnknownCommitmentDiagnostics';

describe('createUnknownCommitmentDiagnostics', () => {
    it('creates error diagnostics for unknown commitment keywords only', () => {
        const diagnostics = createUnknownCommitmentDiagnostics(
            validateBook(spaceTrim(`
                Generic chatter

                GOAL Keep your projects up to date

                FOO
                Content of unknown commitment foo

                BAR BZZ
                Content of unknown commitment bar bzz

                CLOSED
            `)),
        );

        expect(diagnostics).toEqual([
            {
                startLineNumber: 5,
                startColumn: 1,
                endLineNumber: 5,
                endColumn: 4,
                message: 'Unknown commitment `FOO` is added to the system message as extra context.',
                source: 'Promptbook',
                severity: 'error',
            },
            {
                startLineNumber: 8,
                startColumn: 1,
                endLineNumber: 8,
                endColumn: 8,
                message: 'Unknown commitment `BAR BZZ` is added to the system message as extra context.',
                source: 'Promptbook',
                severity: 'error',
            },
        ]);
    });

    it('does not report uppercase content inside a code block', () => {
        const diagnostics = createUnknownCommitmentDiagnostics(
            validateBook(spaceTrim(`
                Code Agent

                GOAL Preserve the literal code block.
                \`\`\`
                FOO
                \`\`\`
                CLOSED
            `)),
        );

        expect(diagnostics).toEqual([]);
    });
});
