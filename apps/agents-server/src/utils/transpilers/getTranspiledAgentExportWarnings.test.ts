import { describe, expect, it } from '@jest/globals';
import { validateBook } from '../../../../../src/book-2.0/agent-source/string_book';
import { getTranspiledAgentExportWarnings } from './getTranspiledAgentExportWarnings';

describe('getTranspiledAgentExportWarnings', () => {
    it('warns when the agent is open by default because CLOSED is missing', () => {
        const agentSource = validateBook(`
            Open Agent
            PERSONA Helpful assistant
        `);

        expect(getTranspiledAgentExportWarnings(agentSource)).toEqual([
            expect.objectContaining({
                commitmentName: 'OPEN',
            }),
        ]);
    });

    it('does not warn for a closed agent without other non-transpilable commitments', () => {
        const agentSource = validateBook(`
            Closed Agent
            PERSONA Helpful assistant
            CLOSED
        `);

        expect(getTranspiledAgentExportWarnings(agentSource)).toEqual([]);
    });

    it('lists each non-transpilable commitment only once', () => {
        const agentSource = validateBook(`
            Mixed Agent
            OPEN
            MODELS gpt-4
            USE USER LOCATION
            USE PRIVACY
            CLOSED
        `);

        expect(
            getTranspiledAgentExportWarnings(agentSource).map((warning) => warning.commitmentName),
        ).toEqual(['OPEN', 'MODEL', 'USE USER LOCATION', 'USE PRIVACY']);
    });
});
