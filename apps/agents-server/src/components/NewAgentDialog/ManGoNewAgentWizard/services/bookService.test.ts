import { describe, expect, it, jest } from '@jest/globals';

import { generateBook } from './bookService';

describe('generateBook', () => {
    it('sends the assignment directly to the Book endpoint', async () => {
        const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ book: 'Support Helper\n\nCLOSED' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }),
        );

        await expect(
            generateBook({
                agentName: 'Support Helper',
                agentBrief: 'Answers support questions.',
            }),
        ).resolves.toBe('Support Helper\n\nCLOSED');

        expect(fetchSpy).toHaveBeenCalledWith('/api/onboarding/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agentName: 'Support Helper',
                agentBrief: 'Answers support questions.',
            }),
        });

        fetchSpy.mockRestore();
    });
});
