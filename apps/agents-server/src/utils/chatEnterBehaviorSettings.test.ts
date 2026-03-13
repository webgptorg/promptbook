jest.mock('./userData', () => ({
    getUserDataValue: jest.fn(),
    upsertUserDataValue: jest.fn(),
}));

import { describe, expect, it, jest } from '@jest/globals';
import {
    invertAgentsServerChatEnterBehavior,
    isAgentsServerChatEnterBehavior,
    normalizeChatEnterBehaviorSettingsRecord,
} from './chatEnterBehaviorSettings';

describe('chatEnterBehaviorSettings', () => {
    it('recognizes supported Enter behaviors', () => {
        expect(isAgentsServerChatEnterBehavior('SEND')).toBe(true);
        expect(isAgentsServerChatEnterBehavior('NEWLINE')).toBe(true);
        expect(isAgentsServerChatEnterBehavior('SHIFT')).toBe(false);
    });

    it('inverts SEND and NEWLINE for the secondary Ctrl+Enter binding', () => {
        expect(invertAgentsServerChatEnterBehavior('SEND')).toBe('NEWLINE');
        expect(invertAgentsServerChatEnterBehavior('NEWLINE')).toBe('SEND');
    });

    it('normalizes only valid persisted keybinding records', () => {
        expect(
            normalizeChatEnterBehaviorSettingsRecord({
                version: 1,
                enterBehavior: 'SEND',
            }),
        ).toEqual({
            version: 1,
            enterBehavior: 'SEND',
        });

        expect(
            normalizeChatEnterBehaviorSettingsRecord({
                version: 2,
                enterBehavior: 'SEND',
            }),
        ).toBeNull();

        expect(
            normalizeChatEnterBehaviorSettingsRecord({
                version: 1,
                enterBehavior: 'SHIFT',
            }),
        ).toBeNull();
    });
});
