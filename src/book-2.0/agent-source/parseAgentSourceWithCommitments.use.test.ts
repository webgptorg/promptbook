import { describe, expect, it } from '@jest/globals';
import { parseAgentSourceWithCommitments } from './parseAgentSourceWithCommitments';
import { validateBook } from './string_book';

describe('parseAgentSourceWithCommitments USE commitments', () => {
    it('does not parse bare or unknown USE-prefixed lines as commitments', () => {
        const agentSource = validateBook(`
            API Agent
            USE
            USE API Experimental API access
            USE BROWSER
        `);

        const result = parseAgentSourceWithCommitments(agentSource);

        expect(result.commitments).toEqual([
            expect.objectContaining({
                type: 'USE BROWSER',
                content: '',
            }),
        ]);
        expect(result.nonCommitmentLines.map((line) => line.trim())).toEqual([
            'API Agent',
            'USE',
            'USE API Experimental API access',
        ]);
    });
});
