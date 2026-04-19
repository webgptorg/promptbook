import { describe, expect, it } from '@jest/globals';
import {
    addUniqueTeamReference,
    buildWizardSourceOptions,
    createInitialWizardState,
    hasTeamReference,
    normalizeTeamReferenceInput,
    toggleTeamReferenceSelection,
} from './NewAgentWizardState';

describe('NewAgentWizardState', () => {
    it('defaults new wizard drafts to closed learning mode', () => {
        expect(createInitialWizardState('UNLISTED', 'Starter Agent').isOpenToLearning).toBe(false);
    });

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

    it('builds configured USE commitments from the wizard setup state', () => {
        const state = {
            ...createInitialWizardState('UNLISTED', 'Starter Agent'),
            selectedCapabilityIds: ['project', 'email', 'calendar', 'mcp'],
            capabilitySetupByCommitment: {
                'USE CALENDAR': {
                    calendarUrl: 'calendar.google.com/calendar/u/0/r?cid=team%40example.com',
                    instructions: 'Prefer the shared team calendar.',
                },
                'USE EMAIL': {
                    senderEmail: 'agent@example.com',
                    instructions: 'Keep emails concise.',
                },
                'USE MCP': {
                    serverUrl: 'https://mcp.example.com/server',
                    instructions: 'Use the legal tools only for compliance questions.',
                },
                'USE PROJECT': {
                    repositoryReference: 'example/project',
                    instructions: 'Work only in the docs folder.',
                },
            },
        };

        expect(buildWizardSourceOptions(state).capabilityCommitments).toEqual([
            {
                keyword: 'USE CALENDAR',
                content: 'calendar.google.com/calendar/u/0/r?cid=team%40example.com\nPrefer the shared team calendar.',
            },
            {
                keyword: 'USE EMAIL',
                content: 'agent@example.com\nKeep emails concise.',
            },
            {
                keyword: 'USE PROJECT',
                content: 'example/project\nWork only in the docs folder.',
            },
            {
                keyword: 'USE MCP',
                content: 'https://mcp.example.com/server\nUse the legal tools only for compliance questions.',
            },
        ]);
    });
});
