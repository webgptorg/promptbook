import { describe, expect, it } from '@jest/globals';
import { addUniqueTeamReference, normalizeTeamReferenceInput } from './NewAgentWizardState';

describe('NewAgentWizardState', () => {
    it('wraps plain teammate names into compact TEAM references', () => {
        expect(normalizeTeamReferenceInput('Legal Reviewer')).toBe('{Legal Reviewer}');
        expect(normalizeTeamReferenceInput('@User')).toBe('{User}');
        expect(normalizeTeamReferenceInput('{Implementation Reviewer}')).toBe('{Implementation Reviewer}');
    });

    it('keeps absolute teammate URLs intact', () => {
        expect(normalizeTeamReferenceInput('https://remote.example/agents/legal-reviewer')).toBe(
            'https://remote.example/agents/legal-reviewer',
        );
    });

    it('deduplicates normalized teammate references', () => {
        const afterFirstAdd = addUniqueTeamReference([], 'Legal Reviewer');
        const afterDuplicateAdd = addUniqueTeamReference(afterFirstAdd, '{legal reviewer}');

        expect(afterFirstAdd).toEqual(['{Legal Reviewer}']);
        expect(afterDuplicateAdd).toEqual(['{Legal Reviewer}']);
    });
});
