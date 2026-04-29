import { describe, expect, it } from '@jest/globals';
import { DeleteCommitmentDefinition } from '../DELETE/DELETE';
import { FormatCommitmentDefinition } from '../FORMAT/FORMAT';
import { formatCommitmentReplacementText, getCommitmentNoticeMetadata } from './getCommitmentNoticeMetadata';

describe('getCommitmentNoticeMetadata', () => {
    it('returns deprecated notice metadata for legacy commitments', () => {
        const notice = getCommitmentNoticeMetadata(new FormatCommitmentDefinition());

        expect(notice).toEqual({
            kind: 'deprecated',
            badgeLabel: 'Deprecated',
            detailLabel: 'Deprecated commitment',
            message: 'Use `WRITING SAMPLE` and `WRITING RULES` instead.',
        });
        expect(formatCommitmentReplacementText(['WRITING SAMPLE', 'WRITING RULES'])).toBe(
            ' Preferred replacement: `WRITING SAMPLE`, `WRITING RULES`.',
        );
    });

    it('returns low-level notice metadata for unfinished commitments', () => {
        const notice = getCommitmentNoticeMetadata(new DeleteCommitmentDefinition('DELETE'));

        expect(notice).toEqual({
            kind: 'unfinished',
            badgeLabel: 'Low-level',
            detailLabel: 'Low-level commitment',
            message: 'This commitment is unfinished and not ready to use. Be careful when using it.',
        });
        expect(formatCommitmentReplacementText()).toBe('');
    });
});
