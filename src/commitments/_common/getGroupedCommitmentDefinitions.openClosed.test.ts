import { describe, expect, it } from '@jest/globals';
import { getGroupedCommitmentDefinitions } from './getGroupedCommitmentDefinitions';

describe('getGroupedCommitmentDefinitions OPEN/CLOSED family', () => {
    it('groups OPEN and CLOSED into one documentation entry', () => {
        const groupedCommitments = getGroupedCommitmentDefinitions();
        const openGroup = groupedCommitments.find((group) => group.primary.type === 'OPEN');

        expect(openGroup).toBeDefined();
        expect(openGroup?.aliases).toEqual(['CLOSED']);
        expect(groupedCommitments.some((group) => group.primary.type === 'CLOSED')).toBe(false);
    });
});
