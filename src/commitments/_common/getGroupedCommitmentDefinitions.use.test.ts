import { describe, expect, it } from '@jest/globals';
import { getAllCommitmentTypes } from './getAllCommitmentTypes';
import { getGroupedCommitmentDefinitions } from './getGroupedCommitmentDefinitions';

describe('getGroupedCommitmentDefinitions USE commitments', () => {
    it('does not expose bare USE as a concrete commitment while keeping concrete USE commitments', () => {
        const commitmentTypes = getAllCommitmentTypes();
        const groupedCommitments = getGroupedCommitmentDefinitions();
        const concreteUseCommitmentTypes = groupedCommitments
            .map(({ primary }) => primary.type)
            .filter((type) => type.startsWith('USE '));

        expect(commitmentTypes).not.toContain('USE');
        expect(groupedCommitments.map(({ primary }) => primary.type)).not.toContain('USE');
        expect(concreteUseCommitmentTypes).toEqual(
            expect.arrayContaining([
                'USE BROWSER',
                'USE CALENDAR',
                'USE EMAIL',
                'USE PRIVACY',
                'USE PROJECT',
                'USE SEARCH ENGINE',
            ]),
        );
    });
});
