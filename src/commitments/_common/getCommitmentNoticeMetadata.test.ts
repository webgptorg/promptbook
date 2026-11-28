import { describe, expect, it } from '@jest/globals';
import { DeleteCommitmentDefinition } from '../DELETE/DELETE';
import { FormatCommitmentDefinition } from '../FORMAT/FORMAT';
import { ModelCommitmentDefinition } from '../MODEL/MODEL';
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

    it('returns low-visibility notice metadata for unfinished commitments', () => {
        const notice = getCommitmentNoticeMetadata(new DeleteCommitmentDefinition('DELETE'));

        expect(notice).toEqual({
            kind: 'unfinished',
            badgeLabel: 'Low-level',
            detailLabel: 'Low-level commitment',
            message: 'This commitment is unfinished and not ready to use. Be careful when using it.',
        });
        expect(formatCommitmentReplacementText()).toBe('');
    });

    it('returns low-level notice metadata for low-level commitments', () => {
        const notice = getCommitmentNoticeMetadata(new ModelCommitmentDefinition());

        expect(notice).toEqual({
            kind: 'lowLevel',
            badgeLabel: 'Low-level',
            detailLabel: 'Low-level commitment',
            message: 'This commitment is low-level and not used by most of the users. Be careful when using it.',
        });
    });
});
