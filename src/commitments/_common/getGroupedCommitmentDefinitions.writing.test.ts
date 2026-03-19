import { describe, expect, it } from '@jest/globals';
import { getGroupedCommitmentDefinitions } from './getGroupedCommitmentDefinitions';

describe('getGroupedCommitmentDefinitions writing commitments', () => {
    it('exposes WRITING SAMPLE / WRITING RULES and keeps SAMPLE / EXAMPLE deprecated as one grouped legacy entry', () => {
        const groupedCommitments = getGroupedCommitmentDefinitions();
        const writingSampleGroup = groupedCommitments.find((group) => group.primary.type === 'WRITING SAMPLE');
        const writingRulesGroup = groupedCommitments.find((group) => group.primary.type === 'WRITING RULES');
        const sampleGroup = groupedCommitments.find((group) => group.primary.type === 'SAMPLE');

        expect(writingSampleGroup).toBeDefined();
        expect(writingRulesGroup).toBeDefined();
        expect(sampleGroup).toBeDefined();
        expect(sampleGroup?.aliases).toEqual(['EXAMPLE']);
        expect(sampleGroup?.primary.deprecation).toEqual({
            message: 'Use `WRITING SAMPLE` for explicit voice exemplars.',
            replacedBy: ['WRITING SAMPLE'],
        });
    });
});
