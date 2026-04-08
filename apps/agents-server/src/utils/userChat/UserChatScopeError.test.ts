import { describe, expect, it } from '@jest/globals';
import {
    isUserChatNotFoundScopeError,
    isUserChatScopeError,
    UserChatScopeError,
    type UserChatScopeErrorDetails,
} from './UserChatScopeError';

/**
 * Map of base details.
 */
const BASE_DETAILS: UserChatScopeErrorDetails = {
    operation: 'mutate_chat',
    requestedScope: {
        userId: 3,
        agentPermanentId: 'agent-123',
        chatId: 'chat-123',
    },
    locatedScope: null,
    likelyCause: 'Chat row was deleted.',
};

describe('UserChatScopeError', () => {
    it('detects branded scope errors', () => {
        const error = new UserChatScopeError('USER_CHAT_SCOPE_INCONSISTENT', 'Scope inconsistent.', BASE_DETAILS);

        expect(isUserChatScopeError(error)).toBe(true);
        expect(isUserChatScopeError(new Error('Plain error'))).toBe(false);
    });

    it('detects missing-chat scope errors specifically', () => {
        const missingChatError = new UserChatScopeError('USER_CHAT_NOT_FOUND', 'Chat missing.', BASE_DETAILS);
        const mismatchedScopeError = new UserChatScopeError(
            'USER_CHAT_SCOPE_USER_MISMATCH',
            'Wrong user.',
            BASE_DETAILS,
        );

        expect(isUserChatNotFoundScopeError(missingChatError)).toBe(true);
        expect(isUserChatNotFoundScopeError(mismatchedScopeError)).toBe(false);
        expect(isUserChatNotFoundScopeError(new Error('Plain error'))).toBe(false);
    });
});
