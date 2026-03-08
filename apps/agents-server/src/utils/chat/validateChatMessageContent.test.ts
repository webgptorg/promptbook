import { describe, expect, it } from '@jest/globals';
import {
    DEFAULT_CHAT_MESSAGE_CONTENT,
    MAX_CHAT_MESSAGE_CHARACTERS,
    resolveChatMessageContentForApiRequest,
    resolveChatMessageValidationIssue,
} from './validateChatMessageContent';

const ONE_CHARACTER_OVER_LIMIT = 1;

describe('validateChatMessageContent', () => {
    it('uses fallback message when payload is missing or blank', () => {
        const missingMessageResult = resolveChatMessageContentForApiRequest(undefined);
        const blankMessageResult = resolveChatMessageContentForApiRequest('   ');

        expect(missingMessageResult).toEqual({
            isValid: true,
            message: DEFAULT_CHAT_MESSAGE_CONTENT,
        });
        expect(blankMessageResult).toEqual({
            isValid: true,
            message: DEFAULT_CHAT_MESSAGE_CONTENT,
        });
    });

    it('rejects non-string message payloads', () => {
        const result = resolveChatMessageContentForApiRequest({ message: 'Hello' });

        expect(result).toEqual({
            isValid: false,
            issue: {
                code: 'CHAT_MESSAGE_INVALID_TYPE',
                message: 'Message must be a string.',
                status: 400,
            },
        });
    });

    it('rejects too-long messages with 413 status', () => {
        const tooLongMessage = 'x'.repeat(MAX_CHAT_MESSAGE_CHARACTERS + ONE_CHARACTER_OVER_LIMIT);
        const result = resolveChatMessageContentForApiRequest(tooLongMessage);

        expect(result.isValid).toBe(false);
        if (result.isValid) {
            throw new Error('Expected invalid validation result for oversized message.');
        }

        expect(result.issue.code).toBe('CHAT_MESSAGE_TOO_LONG');
        expect(result.issue.status).toBe(413);
    });

    it('returns null validation issue for message exactly at limit', () => {
        const maxLengthMessage = 'x'.repeat(MAX_CHAT_MESSAGE_CHARACTERS);
        const issue = resolveChatMessageValidationIssue(maxLengthMessage);

        expect(issue).toBeNull();
    });
});
