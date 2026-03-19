import { describe, expect, it } from '@jest/globals';
import { createAgentModelRequirements } from './createAgentModelRequirements';
import { validateBook } from './string_book';

describe('createAgentModelRequirements writing commitments', () => {
    it('applies WRITING SAMPLE and WRITING RULES in chronological order with explicit precedence guidance', async () => {
        const agentSource = validateBook(`
            Copywriter
            WRITING SAMPLE First voice sample.
            WRITING RULES First writing rules.
            WRITING SAMPLE Second voice sample.
            WRITING RULES Second writing rules.
        `);

        const requirements = await createAgentModelRequirements(agentSource);

        expect(requirements.systemMessage).toContain('## Writing sample');
        expect(requirements.systemMessage).toContain('## Writing rules');
        expect(requirements.systemMessage).toContain('newer samples have higher weight than older ones');
        expect(requirements.systemMessage).toContain('prefer the newer writing-rules blocks');
        expect(requirements.systemMessage.indexOf('First voice sample.')).toBeLessThan(
            requirements.systemMessage.indexOf('Second voice sample.'),
        );
        expect(requirements.systemMessage.indexOf('First writing rules.')).toBeLessThan(
            requirements.systemMessage.indexOf('Second writing rules.'),
        );
    });

    it('keeps SAMPLE and EXAMPLE working as legacy writing-sample aliases', async () => {
        const agentSource = validateBook(`
            Copywriter
            SAMPLE Legacy sample text.
            EXAMPLE Newer legacy sample text.
        `);

        const requirements = await createAgentModelRequirements(agentSource);

        expect(requirements.systemMessage).toContain('## Writing sample');
        expect(requirements.systemMessage).toContain('Legacy sample text.');
        expect(requirements.systemMessage).toContain('Newer legacy sample text.');
        expect(requirements.systemMessage).not.toContain('Example of the writing style:');
    });
});
