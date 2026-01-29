import { spaceTrim } from 'spacetrim';
import { createAgentModelRequirementsWithCommitments } from '../../book-2.0/agent-source/createAgentModelRequirementsWithCommitments';
import type { string_book } from '../../book-2.0/agent-source/string_book';

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
        expect(requirements.systemMessage).toContain(
            'If you need more precise current time information, use the tool "get_current_time"',
        );
    });

    it('should include extra time instructions in the system message when provided', async () => {
        const agentSource = spaceTrim(`
            Time Agent
            USE TIME Prefer the user locale
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.systemMessage).toContain('Time instructions');
        expect(requirements.systemMessage).toContain('Prefer the user locale');
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
    });
});
