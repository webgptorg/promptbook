import { describe, expect, it } from '@jest/globals';
import { createBasicAgentModelRequirements } from '../_base/createEmptyAgentModelRequirements';
import { UseEmailCommitmentDefinition } from './USE_EMAIL';

describe('UseEmailCommitmentDefinition', () => {
    const commitment = new UseEmailCommitmentDefinition();
    const basicRequirements = createBasicAgentModelRequirements('test-agent');

    it('adds send_email tool and metadata when applied', () => {
        const result = commitment.applyToAgentModelRequirements(
            basicRequirements,
            'agent@example.com Keep emails concise.',
        );

        expect(result.tools).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'send_email',
                }),
            ]),
        );
        expect(result._metadata?.useEmail).toBe(true);
        expect(result._metadata?.useEmailSender).toBe('agent@example.com');
        expect(result.systemMessage).toContain('send_email');
        expect(result.systemMessage).toContain('use-email-smtp-credentials');
    });

    it('does not duplicate send_email tool', () => {
        const base = {
            ...basicRequirements,
            tools: [
                {
                    name: 'send_email',
                    description: 'Existing',
                    parameters: {
                        type: 'object' as const,
                        properties: {},
                    },
                },
            ],
        };

        const result = commitment.applyToAgentModelRequirements(base, '');
        expect(result.tools?.filter((tool) => tool.name === 'send_email').length).toBe(1);
    });
});
