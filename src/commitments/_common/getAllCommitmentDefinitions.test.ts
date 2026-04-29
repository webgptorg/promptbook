import { describe, expect, it } from '@jest/globals';
import { getAllCommitmentDefinitions } from './getAllCommitmentDefinitions';

describe('getAllCommitmentDefinitions', () => {
    it('puts low-level commitments at the end of the completion catalogue', () => {
        const commitmentDefinitions = getAllCommitmentDefinitions();
        const lowLevelCommitments = commitmentDefinitions.filter(({ isLowLevel }) => isLowLevel);

        expect(commitmentDefinitions.slice(0, 4).map(({ type }) => type)).toEqual([
            'GOAL',
            'RULE',
            'KNOWLEDGE',
            'TEAM',
        ]);
        expect(lowLevelCommitments.length).toBeGreaterThan(0);
        expect(commitmentDefinitions.slice(-lowLevelCommitments.length).every(({ isLowLevel }) => isLowLevel)).toBe(
            true,
        );
    });
});
