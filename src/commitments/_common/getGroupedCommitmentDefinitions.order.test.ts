import { describe, expect, it } from '@jest/globals';
import { getGroupedCommitmentDefinitions } from './getGroupedCommitmentDefinitions';

describe('getGroupedCommitmentDefinitions ordering', () => {
    it('puts important commitments first, deprecated commitments before unfinished commitments, and unfinished commitments last', () => {
        const groupedCommitments = getGroupedCommitmentDefinitions();

        expect(groupedCommitments.slice(0, 4).map(({ primary }) => primary.type)).toEqual([
            'GOAL',
            'RULE',
            'KNOWLEDGE',
            'TEAM',
        ]);

        const deprecatedCommitments = groupedCommitments.filter(({ primary }) => Boolean(primary.deprecation));
        const unfinishedCommitments = groupedCommitments.filter(({ primary }) => primary.isUnfinished);

        expect(deprecatedCommitments.length).toBeGreaterThan(0);
        expect(unfinishedCommitments.length).toBeGreaterThan(0);

        expect(groupedCommitments.slice(-unfinishedCommitments.length).every(({ primary }) => primary.isUnfinished)).toBe(
            true,
        );
        expect(
            groupedCommitments
                .slice(-(deprecatedCommitments.length + unfinishedCommitments.length), -unfinishedCommitments.length)
                .every(({ primary }) => Boolean(primary.deprecation)),
        ).toBe(true);
    });
});
