import { describe, expect, it } from '@jest/globals';
import { ClosedCommitmentDefinition } from './CLOSED';
import { parseAgentSourceWithCommitments } from '../../book-2.0/agent-source/parseAgentSourceWithCommitments';
import { spaceTrim } from 'spacetrim';
import { string_book } from '../../book-2.0/agent-source/string_book';

describe('CLOSED commitment', () => {
    const commitment = new ClosedCommitmentDefinition();

    it('has correct type', () => {
        expect(commitment.type).toBe('CLOSED');
    });

    it('should create regex that matches standalone CLOSED', () => {
        expect(commitment.createRegex().test('CLOSED')).toBe(true);
    });

    it('should parse standalone CLOSED', () => {
        const source = spaceTrim(`
            AGENT Name

            CLOSED
        `) as string_book;

        const result = parseAgentSourceWithCommitments(source);
        const parsedCommitment = result.commitments.find(c => c.type === 'CLOSED');
        
        expect(parsedCommitment).toBeDefined();
        expect(parsedCommitment?.content).toBe('');
    });
});
