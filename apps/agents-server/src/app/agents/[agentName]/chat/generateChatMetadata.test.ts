import { describe, expect, it } from '@jest/globals';
import { CHAT_PAGE_TITLE, generateChatMetadata } from './generateChatMetadata';

describe('generateChatMetadata', () => {
    it('sets title to "Chat"', () => {
        const metadata = generateChatMetadata();
        expect(metadata.title).toBe(CHAT_PAGE_TITLE);
    });

    it('does not include any agent name in the title', () => {
        const metadata = generateChatMetadata();
        // The title must be a plain non-empty string with no agent-specific content
        expect(typeof metadata.title).toBe('string');
        expect(String(metadata.title).length).toBeGreaterThan(0);
        // Verify the title is exactly the generic chat label, not an agent display name
        expect(metadata.title).toBe('Chat');
    });

    it('returns consistent title across multiple calls (navigation between chats)', () => {
        const first = generateChatMetadata();
        const second = generateChatMetadata();
        expect(first.title).toBe(second.title);
    });
});
