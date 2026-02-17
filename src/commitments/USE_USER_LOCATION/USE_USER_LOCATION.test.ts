import { spaceTrim } from 'spacetrim';
import { createAgentModelRequirementsWithCommitments } from '../../book-2.0/agent-source/createAgentModelRequirementsWithCommitments';
import type { string_book } from '../../book-2.0/agent-source/string_book';

describe('createAgentModelRequirementsWithCommitments with USE USER LOCATION', () => {
    it('should add the get_user_location tool when USE USER LOCATION is present', async () => {
        const agentSource = spaceTrim(
            Location Agent
            USE USER LOCATION
        ) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.tools).toContainEqual(
            expect.objectContaining({
                name: 'get_user_location',
            }),
        );
    });

    it('should include location instructions when provided', async () => {
        const agentSource = spaceTrim(
            Location Agent
            USE USER LOCATION You need my city
        ) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.systemMessage).toContain('Location context:');
        expect(requirements.systemMessage).toContain('You need my city');
    });

    it('should add the tool when LOCATION alias is used', async () => {
        const agentSource = spaceTrim(
            Location Agent
            LOCATION
        ) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.tools).toContainEqual(
            expect.objectContaining({
                name: 'get_user_location',
            }),
        );
    });

    it('should not add the tool when the commitment is absent', async () => {
        const agentSource = spaceTrim(
            Simple Agent
            PERSONA You do not need location.
        ) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.tools || []).not.toContainEqual(
            expect.objectContaining({
                name: 'get_user_location',
            }),
        );
    });
});
