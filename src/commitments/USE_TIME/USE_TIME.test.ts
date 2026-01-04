import { spaceTrim } from 'spacetrim';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { createAgentModelRequirementsWithCommitments } from '../../book-2.0/agent-source/createAgentModelRequirementsWithCommitments';

describe('createAgentModelRequirementsWithCommitments with USE TIME', () => {
    it('should add current time tool when USE TIME is present', async () => {
        const agentSource = spaceTrim(`
            Time Agent
            USE TIME
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.tools).toContainEqual(
            expect.objectContaining({
                name: 'get_current_time',
            }),
        );
        expect(requirements.metadata?.useTime).toBe(true);
    });

    it('should add current time tool when CURRENT TIME alias is used', async () => {
        const agentSource = spaceTrim(`
            Time Agent
            CURRENT TIME
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.tools).toContainEqual(
            expect.objectContaining({
                name: 'get_current_time',
            }),
        );
    });

    it('should add current time tool when DATE alias is used', async () => {
        const agentSource = spaceTrim(`
            Time Agent
            DATE
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.tools).toContainEqual(
            expect.objectContaining({
                name: 'get_current_time',
            }),
        );
    });

    it('should add current time tool when TIME alias is used', async () => {
        const agentSource = spaceTrim(`
            Time Agent
            TIME
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.tools).toContainEqual(
            expect.objectContaining({
                name: 'get_current_time',
            }),
        );
    });

    it('should not add current time tool when USE TIME is not present', async () => {
        const agentSource = spaceTrim(`
            Simple Agent
            PERSONA You are a simple agent.
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.tools || []).not.toContainEqual(
            expect.objectContaining({
                name: 'get_current_time',
            }),
        );
        expect(requirements.metadata?.useTime).toBeUndefined();
    });
});
