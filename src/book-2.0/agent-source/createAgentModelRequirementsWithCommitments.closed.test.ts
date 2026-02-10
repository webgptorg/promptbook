import { describe, expect, it } from '@jest/globals';
import { book } from '../../_packages/core.index';
import { createAgentModelRequirementsWithCommitments } from './createAgentModelRequirementsWithCommitments';

describe('CLOSED commitment only works if it is the last commitment', () => {
    it('is undefined when OPEN/CLOSED not specified', async () => {
        const agentSource = book`
            Agent

            PERSONA You are a bot
            KNOWLEDGE https://example.com
        `;

        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        // isClosed remains undefined *(which means open)*
        expect(requirements.isClosed).toBe(undefined);
        expect(requirements.isClosed).not.toBe(true);
        expect(requirements.isClosed).not.toBe(false);
    });

    it('is closed when CLOSED is at the end', async () => {
        const agentSource = book`
            Agent

            PERSONA You are a bot
            CLOSED
        `;

        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.isClosed).toBe(true);
    });

    it('is open when CLOSED is followed by KNOWLEDGE', async () => {
        const agentSource = book`
            Agent

            PERSONA You are a bot
            CLOSED
            KNOWLEDGE https://example.com
        `;

        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        // CLOSED is skipped, so isClosed remains undefined *(which means open)*
        expect(requirements.isClosed).toBe(undefined);
        expect(requirements.isClosed).not.toBe(true);
        expect(requirements.isClosed).not.toBe(false);
    });

    it('is open when CLOSED is followed by OPEN', async () => {
        const agentSource = book`
            Agent

            PERSONA You are a bot
            CLOSED
            OPEN
        `;

        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.isClosed).toBe(false);
    });

    it('is closed when OPEN is followed by CLOSED', async () => {
        const agentSource = book`
            Agent

            PERSONA You are a bot
            OPEN
            CLOSED
        `;

        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.isClosed).toBe(true);
    });
});
