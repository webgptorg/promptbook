import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { parseAgentSourceWithCommitments } from '../../book-2.0/agent-source/parseAgentSourceWithCommitments';
import { string_book } from '../../book-2.0/agent-source/string_book';
import { ClosedCommitmentDefinition } from './CLOSED';

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
        const parsedCommitment = result.commitments.find((c) => c.type === 'CLOSED');

        expect(parsedCommitment).toBeDefined();
        expect(parsedCommitment?.content).toBe('');
    });
});

/**
 * TODO: !!!! Must be last commitment to take effect
 */
