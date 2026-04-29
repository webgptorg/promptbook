import { describe, expect, it } from '@jest/globals';
import { getGroupedCommitmentDefinitions } from './getGroupedCommitmentDefinitions';

describe('getGroupedCommitmentDefinitions ordering', () => {
    it('puts important commitments first and deprecated commitments last', () => {
        const groupedCommitments = getGroupedCommitmentDefinitions();

        expect(groupedCommitments.slice(0, 4).map(({ primary }) => primary.type)).toEqual([
            'GOAL',
            'RULE',
            'KNOWLEDGE',
            'TEAM',
        ]);

        const deprecatedCommitments = groupedCommitments.filter(({ primary }) => Boolean(primary.deprecation));
        expect(deprecatedCommitments.length).toBeGreaterThan(0);
        expect(groupedCommitments.slice(-deprecatedCommitments.length).every(({ primary }) => Boolean(primary.deprecation))).toBe(
            true,
        );
    });
});
