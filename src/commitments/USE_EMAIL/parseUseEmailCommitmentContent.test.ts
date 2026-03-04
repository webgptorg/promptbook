import { describe, expect, it } from '@jest/globals';
import { parseUseEmailCommitmentContent } from './parseUseEmailCommitmentContent';

describe('parseUseEmailCommitmentContent', () => {
    it('parses sender email from the beginning of commitment content', () => {
        const parsed = parseUseEmailCommitmentContent('agent@example.com Keep emails concise.');

        expect(parsed.senderEmail).toBe('agent@example.com');
        expect(parsed.instructions).toBe('Keep emails concise.');
    });

    it('parses commitment content without sender email', () => {
        const parsed = parseUseEmailCommitmentContent('Keep emails concise and formal.');

        expect(parsed.senderEmail).toBeNull();
        expect(parsed.instructions).toBe('Keep emails concise and formal.');
    });

    it('supports multiline instructions', () => {
        const parsed = parseUseEmailCommitmentContent(`
            agent@example.com
            Keep emails concise.
            Greet recipients by name.
        `);

        expect(parsed.senderEmail).toBe('agent@example.com');
        expect(parsed.instructions).toBe('Keep emails concise.\nGreet recipients by name.');
    });
});
