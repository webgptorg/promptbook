import { spaceTrim } from 'spacetrim';
import { createAgentModelRequirementsWithCommitments } from '../../book-2.0/agent-source/createAgentModelRequirementsWithCommitments';
import type { string_book } from '../../book-2.0/agent-source/string_book';

describe('createAgentModelRequirementsWithCommitments with USE IMAGE GENERATOR', () => {
    it('should add generate_image tool and system message instructions when USE IMAGE GENERATOR is present', async () => {
        const agentSource = spaceTrim(`
            Image Agent
            USE IMAGE GENERATOR
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.tools).toContainEqual(
            expect.objectContaining({
                name: 'generate_image',
            }),
        );
        expect(requirements.systemMessage).toContain('You have access to an image generator.');
    });

    it('should add generate_image tool and system message instructions when USE IMAGE GENERATION alias is used', async () => {
        const agentSource = spaceTrim(`
            Image Agent
            USE IMAGE GENERATION
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.tools).toContainEqual(
            expect.objectContaining({
                name: 'generate_image',
            }),
        );
        expect(requirements.systemMessage).toContain('You have access to an image generator.');
    });

    it('should add generate_image tool and system message instructions when USE IMAGE alias is used', async () => {
        const agentSource = spaceTrim(`
            Image Agent
            USE IMAGE
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.tools).toContainEqual(
            expect.objectContaining({
                name: 'generate_image',
            }),
        );
        expect(requirements.systemMessage).toContain('You have access to an image generator.');
    });

    /*
    TODO: !!!! Make this work
    it'should add generate_image tool and system message instructions when IMAGE GENERATOR alias is used', async () => {
        const agentSource = spaceTrim(`
            Image Agent
            IMAGE GENERATOR
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.tools).toContainEqual(
            expect.objectContaining({
                name: 'generate_image',
            }),
        );
        expect(requirements.systemMessage).toContain('You have access to an image generator.');
    });
    */

    /*
    TODO: !!!! Make this work
    it('should add generate_image tool and system message instructions when IMAGE GENERATION alias is used', async () => {
        const agentSource = spaceTrim(`
            Image Agent
            IMAGE GENERATION
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.tools).toContainEqual(
            expect.objectContaining({
                name: 'generate_image',
            }),
        );
        expect(requirements.systemMessage).toContain('You have access to an image generator.');
    });
    */
});
