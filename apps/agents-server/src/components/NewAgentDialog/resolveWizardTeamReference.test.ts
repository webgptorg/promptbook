import { describe, expect, it } from '@jest/globals';
import { resolveWizardTeamReference } from './resolveWizardTeamReference';

describe('resolveWizardTeamReference', () => {
    it('emits canonical URLs for local agents', () => {
        expect(
            resolveWizardTeamReference(
                {
                    agentName: 'Legal Reviewer',
                    serverUrl: 'https://local.example/',
                    url: 'https://local.example/agents/legal-reviewer-123',
                },
                'https://local.example',
            ),
        ).toBe('https://local.example/agents/legal-reviewer-123');
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
