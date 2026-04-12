import { describe, expect, it } from '@jest/globals';
import {
    addUniqueTeamReference,
    hasTeamReference,
    normalizeTeamReferenceInput,
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

    it('detects existing teammates using normalized comparisons', () => {
        const teamReferences = ['{Legal Reviewer}', 'https://remote.example/agents/reviewer'];

        expect(hasTeamReference(teamReferences, '@legal reviewer')).toBe(true);
        expect(hasTeamReference(teamReferences, 'https://remote.example/agents/reviewer')).toBe(true);
        expect(hasTeamReference(teamReferences, '{User}')).toBe(false);
    });

    it('toggles teammate references using normalized comparisons', () => {
        expect(toggleTeamReferenceSelection([], 'Legal Reviewer')).toEqual(['{Legal Reviewer}']);
        expect(toggleTeamReferenceSelection(['{Legal Reviewer}'], '@legal reviewer')).toEqual([]);
    });
});
