import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { validateBook } from '../../book-2.0/agent-source/string_book';
import { createDuplicateFromCommitmentDiagnostics } from './createDuplicateFromCommitmentDiagnostics';

describe('createDuplicateFromCommitmentDiagnostics', () => {
    it('does not report a book which declares its parent once', () => {
        const diagnostics = createDuplicateFromCommitmentDiagnostics(
            validateBook(
                spaceTrim(`
                Generic chatter

                FROM @Adam
                GOAL Keep your projects up to date
                CLOSED
            `),
            ),
        );

        expect(diagnostics).toEqual([]);
    });

    it('does not report a book which declares no parent at all', () => {
        const diagnostics = createDuplicateFromCommitmentDiagnostics(
            validateBook(
                spaceTrim(`
                Generic chatter

                GOAL Keep your projects up to date
                CLOSED
            `),
            ),
        );

        expect(diagnostics).toEqual([]);
    });

    it('warns on every `FROM` and points to the last one which is actually used', () => {
        const diagnostics = createDuplicateFromCommitmentDiagnostics(
            validateBook(
                spaceTrim(`
                Generic chatter

                FROM @Adam
                GOAL Keep your projects up to date
                FROM {Local Parent}
                CLOSED
            `),
            ),
        );

        expect(diagnostics).toEqual([
            {
                startLineNumber: 3,
                startColumn: 1,
                endLineNumber: 3,
                endColumn: 5,
                message:
                    '`FROM` is written 2 times in this book. Only the last one on line 5 is used, so this one is ignored.',
                source: 'Promptbook',
                severity: 'warning',
            },
            {
                startLineNumber: 5,
                startColumn: 1,
                endLineNumber: 5,
                endColumn: 5,
                message:
                    '`FROM` is written 2 times in this book. Only this last one is used, the earlier ones are ignored.',
                source: 'Promptbook',
                severity: 'warning',
            },
        ]);
    });

    it('does not report a `FROM` written inside a code block', () => {
        const diagnostics = createDuplicateFromCommitmentDiagnostics(
            validateBook(
                spaceTrim(`
                Code Agent

                FROM @Adam
                GOAL Explain inheritance.
                \`\`\`book
                FROM @Null
                \`\`\`
                CLOSED
            `),
            ),
        );

        expect(diagnostics).toEqual([]);
    });
});
