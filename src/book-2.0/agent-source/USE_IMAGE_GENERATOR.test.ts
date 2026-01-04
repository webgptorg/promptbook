import { createAgentModelRequirements } from './createAgentModelRequirements';
import { validateBook } from './string_book';

describe('USE IMAGE GENERATOR commitment', () => {
    it('should add image_generator tool to requirements', async () => {
        const agentSource = validateBook(`
            Image Agent
            USE IMAGE GENERATOR
        `);
        const requirements = await createAgentModelRequirements(agentSource);
        const imageTool = requirements.tools?.find((tool) => (tool as any).name === 'image_generator' || (tool as any).type === 'image_generator');
        expect(imageTool).toBeDefined();
        expect(requirements.metadata?.useImageGenerator).toBe(true);
    });

    it('should add image_generator tool with content to requirements', async () => {
        const agentSource = validateBook(`
            Image Agent
            USE IMAGE GENERATOR Create oil paintings
        `);
        const requirements = await createAgentModelRequirements(agentSource);
        const imageTool = requirements.tools?.find((tool) => (tool as any).name === 'image_generator' || (tool as any).type === 'image_generator');
        expect(imageTool).toBeDefined();
        expect(requirements.metadata?.useImageGenerator).toBe('Create oil paintings');
    });
});
