import { describe, expect, it } from '@jest/globals';
import { getAllCommitmentDefinitions } from './getAllCommitmentDefinitions';

describe('getAllCommitmentDefinitions', () => {
    it('puts low-level commitments at the end of the completion catalogue', () => {
        const commitmentDefinitions = getAllCommitmentDefinitions();
        const lowLevelCommitments = commitmentDefinitions.filter(({ isLowLevel }) => isLowLevel);
        const ruleIndex = commitmentDefinitions.findIndex(({ type }) => type === 'RULE');
        const rulesIndex = commitmentDefinitions.findIndex(({ type }) => type === 'RULES');
        const languageIndex = commitmentDefinitions.findIndex(({ type }) => type === 'LANGUAGE');
        const languagesIndex = commitmentDefinitions.findIndex(({ type }) => type === 'LANGUAGES');

        expect(commitmentDefinitions.slice(0, 4).map(({ type }) => type)).toEqual([
            'GOAL',
            'RULE',
            'KNOWLEDGE',
            'TEAM',
        ]);
        expect(ruleIndex).toBeLessThan(rulesIndex);
        expect(languageIndex).toBeLessThan(languagesIndex);
        expect(lowLevelCommitments.length).toBeGreaterThan(0);
        expect(commitmentDefinitions.slice(-lowLevelCommitments.length).every(({ isLowLevel }) => isLowLevel)).toBe(
            true,
        );
    });
});
