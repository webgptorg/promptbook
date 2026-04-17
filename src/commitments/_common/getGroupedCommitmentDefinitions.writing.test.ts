import { describe, expect, it } from '@jest/globals';
import { getGroupedCommitmentDefinitions } from './getGroupedCommitmentDefinitions';

describe('getGroupedCommitmentDefinitions writing commitments', () => {
    it('exposes WRITING SAMPLE / WRITING RULES and keeps SAMPLE / EXAMPLE and STYLE / STYLES as deprecated legacy entries', () => {
        const groupedCommitments = getGroupedCommitmentDefinitions();
        const writingSampleGroup = groupedCommitments.find((group) => group.primary.type === 'WRITING SAMPLE');
        const writingRulesGroup = groupedCommitments.find((group) => group.primary.type === 'WRITING RULES');
        const sampleGroup = groupedCommitments.find((group) => group.primary.type === 'SAMPLE');
        const styleGroup = groupedCommitments.find((group) => group.primary.type === 'STYLE');

        expect(writingSampleGroup).toBeDefined();
        expect(writingRulesGroup).toBeDefined();
        expect(sampleGroup).toBeDefined();
        expect(styleGroup).toBeDefined();
        expect(sampleGroup?.aliases).toEqual(['EXAMPLE']);
        expect(sampleGroup?.primary.deprecation).toEqual({
            message: 'Use `WRITING SAMPLE` for explicit voice exemplars.',
            replacedBy: ['WRITING SAMPLE'],
        });
        expect(styleGroup?.aliases).toEqual(['STYLES']);
        expect(styleGroup?.primary.deprecation).toEqual({
            message: 'Use `WRITING RULES` for writing-only constraints such as tone, length, formatting, or emoji usage.',
            replacedBy: ['WRITING RULES'],
        });
    });
});
