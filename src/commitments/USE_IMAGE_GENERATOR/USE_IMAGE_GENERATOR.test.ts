import { spaceTrim } from 'spacetrim';
import { createAgentModelRequirementsWithCommitments } from '../../book-2.0/agent-source/createAgentModelRequirementsWithCommitments';
import type { string_book } from '../../book-2.0/agent-source/string_book';

describe('createAgentModelRequirementsWithCommitments with USE IMAGE GENERATOR', () => {
    it('adds markdown placeholder instructions and does not add image tool when USE IMAGE GENERATOR is present', async () => {
        const agentSource = spaceTrim(`
            Image Agent
            USE IMAGE GENERATOR
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.tools?.some((tool) => tool.name === 'generate_image')).toBeFalsy();
        expect(requirements.systemMessage).toContain('![<alt text>](?image-prompt=<prompt>)');
    });

    it('adds instructions when USE IMAGE GENERATION alias is used', async () => {
        const agentSource = spaceTrim(`
            Image Agent
            USE IMAGE GENERATION
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.tools?.some((tool) => tool.name === 'generate_image')).toBeFalsy();
        expect(requirements.systemMessage).toContain('Image generation:');
    });

    it('adds instructions when USE IMAGE alias is used', async () => {
        const agentSource = spaceTrim(`
            Image Agent
            USE IMAGE
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.tools?.some((tool) => tool.name === 'generate_image')).toBeFalsy();
        expect(requirements.systemMessage).toContain('![<alt text>](?image-prompt=<prompt>)');
    });

    it('appends optional style guidance into system message', async () => {
        const agentSource = spaceTrim(`
            Image Agent
            USE IMAGE GENERATOR Paint photorealistic scenes
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.systemMessage).toContain('Image instructions');
        expect(requirements.systemMessage).toContain('Paint photorealistic scenes');
    });
});
