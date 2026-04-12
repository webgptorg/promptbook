import { describe, expect, it } from '@jest/globals';
import { resolveWizardTeamReference } from './resolveWizardTeamReference';

describe('resolveWizardTeamReference', () => {
    it('emits compact references for local agents', () => {
        expect(
            resolveWizardTeamReference(
                {
                    agentName: 'Legal Reviewer',
                    serverUrl: 'https://local.example/',
                    url: 'https://local.example/agents/Legal%20Reviewer',
                },
                'https://local.example',
            ),
        ).toBe('{Legal Reviewer}');
    });

    it('keeps absolute URLs for federated agents', () => {
        expect(
            resolveWizardTeamReference(
                {
                    agentName: 'Remote Reviewer',
                    serverUrl: 'https://remote.example/',
                    url: 'https://remote.example/agents/remote-reviewer',
                },
                'https://local.example',
            ),
        ).toBe('https://remote.example/agents/remote-reviewer');
    });
});
