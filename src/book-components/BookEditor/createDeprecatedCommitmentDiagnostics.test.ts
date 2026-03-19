import { describe, expect, it } from '@jest/globals';
import { validateBook } from '../../book-2.0/agent-source/string_book';
import { createDeprecatedCommitmentDiagnostics } from './createDeprecatedCommitmentDiagnostics';

describe('createDeprecatedCommitmentDiagnostics', () => {
    it('creates warning diagnostics for deprecated SAMPLE and EXAMPLE commitments', () => {
        const diagnostics = createDeprecatedCommitmentDiagnostics(
            validateBook(`Copywriter

SAMPLE Legacy sample
RULE Stay accurate
EXAMPLE Newer legacy sample`),
        );

        expect(diagnostics).toEqual([
            expect.objectContaining({
                startLineNumber: 3,
                message: '`SAMPLE` is deprecated. Use `WRITING SAMPLE` for explicit voice exemplars.',
                severity: 'warning',
                source: 'Promptbook',
            }),
            expect.objectContaining({
                startLineNumber: 5,
                message: '`EXAMPLE` is deprecated. Use `WRITING SAMPLE` for explicit voice exemplars.',
                severity: 'warning',
                source: 'Promptbook',
            }),
        ]);
    });

    it('does not create warnings for WRITING SAMPLE, WRITING RULES, or RULE', () => {
        const diagnostics = createDeprecatedCommitmentDiagnostics(
            validateBook(`Copywriter

WRITING SAMPLE Fresh sample
WRITING RULES Keep it short
RULE Stay accurate`),
        );

        expect(diagnostics).toEqual([]);
    });
});
