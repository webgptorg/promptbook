import { describe, expect, it } from '@jest/globals';
import {
    addUniqueTeamReference,
    normalizeTeamReferenceInput,
    summarizeTeamReference,
    toggleTeamReferenceSelection,
} from './NewAgentWizardState';

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

    it('summarizes teammate references into readable labels', () => {
        expect(summarizeTeamReference('{Legal Reviewer}')).toBe('Legal Reviewer');
        expect(summarizeTeamReference('https://remote.example/agents/legal-reviewer')).toBe('legal reviewer');
    });

    it('toggles teammate selections across equivalent reference variants', () => {
        const selectedCompactReference = toggleTeamReferenceSelection([], '{Legal Reviewer}', ['{legal reviewer}']);
        const removedRemoteReference = toggleTeamReferenceSelection(
            ['https://remote.example/agents/legal-reviewer'],
            'https://remote.example/agents/legal-reviewer',
            ['https://remote.example/agents/legal-reviewer'],
        );

        expect(selectedCompactReference).toEqual(['{Legal Reviewer}']);
        expect(removedRemoteReference).toEqual([]);
    });
});
