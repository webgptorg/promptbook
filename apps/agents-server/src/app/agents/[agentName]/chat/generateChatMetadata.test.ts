import { describe, expect, it } from '@jest/globals';
import type { ResolvedMetadata } from 'next';
import { generateChatMetadata } from './generateChatMetadata';

describe('generateChatMetadata', () => {
    it('creates a chat-first absolute title while preserving inherited agent and server segments', async () => {
        const metadata = await generateChatMetadata(
            Promise.resolve({
                title: {
                    absolute: 'Helpful Assistant | Promptbook Agents Server',
                    template: null,
                },
            } as unknown as ResolvedMetadata),
        );

        expect(metadata.title).toEqual({
            absolute: 'Chat | Helpful Assistant | Promptbook Agents Server',
        });
    });
});
