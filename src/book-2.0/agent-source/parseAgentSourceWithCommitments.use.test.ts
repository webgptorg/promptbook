import { spaceTrim } from 'spacetrim';
import { describe, expect, it } from '@jest/globals';
import { parseAgentSourceWithCommitments } from './parseAgentSourceWithCommitments';
import { validateBook } from './string_book';

describe('parseAgentSourceWithCommitments USE commitments', () => {
    it('keeps bare or unknown USE-prefixed lines as unknown commitment blocks', () => {
        const agentSource = validateBook(
            spaceTrim(`
            API Agent
            USE
            USE API Experimental API access
            USE PRIVACY
        `),
        );

        const result = parseAgentSourceWithCommitments(agentSource);

        expect(result.commitments).toEqual([
            expect.objectContaining({
                type: 'USE PRIVACY',
                content: '',
            }),
        ]);
        expect(result.unknownCommitments).toEqual([
            expect.objectContaining({
                type: 'USE',
                source: 'USE',
                lineNumber: 2,
            }),
            expect.objectContaining({
                type: 'USE API',
                source: 'USE API Experimental API access',
                lineNumber: 3,
            }),
        ]);
        expect(result.nonCommitmentLines.map((line) => line.trim())).toEqual(['API Agent']);
    });
});
