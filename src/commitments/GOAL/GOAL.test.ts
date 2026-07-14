import { spaceTrim } from 'spacetrim';
import { createAgentModelRequirementsWithCommitments } from '../../book-2.0/agent-source/createAgentModelRequirementsWithCommitments';
import type { string_book } from '../../book-2.0/agent-source/string_book';

describe('createAgentModelRequirementsWithCommitments with GOAL', () => {
    it('adds goal-driven timeout scheduling tools and instructions', async () => {
        const agentSource = spaceTrim(`
            Social Media Agent

            GOAL Keep the Facebook page updated with new posts every day
        `) as string_book;

        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        const toolNames = (requirements.tools || []).map((tool) => tool.name);

        expect(toolNames).toContain('set_timeout');
        expect(toolNames).toContain('cancel_timeout');
        expect(toolNames).toContain('list_timeouts');
        expect(toolNames).toContain('update_timeout');
        expect(requirements.systemMessage).toContain('## Goal-driven scheduling');
        expect(requirements.systemMessage).toContain('Keep the Facebook page updated with new posts every day');
    });

    it('does not duplicate timeout tools when USE TIMEOUT is also present', async () => {
        const agentSource = spaceTrim(`
            Follow-up Agent

            GOAL Follow up with customers every weekday
            USE TIMEOUT Keep follow-ups during business hours.
        `) as string_book;

        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        const toolNames = (requirements.tools || []).map((tool) => tool.name);

        expect(toolNames.filter((toolName) => toolName === 'set_timeout')).toHaveLength(1);
        expect(toolNames.filter((toolName) => toolName === 'cancel_timeout')).toHaveLength(1);
        expect(toolNames.filter((toolName) => toolName === 'list_timeouts')).toHaveLength(1);
        expect(toolNames.filter((toolName) => toolName === 'update_timeout')).toHaveLength(1);
        expect(requirements.systemMessage).toContain('## Goal-driven scheduling');
        expect(requirements.systemMessage).toContain('## Timeout scheduling');
    });
});
