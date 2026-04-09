jest.mock('./userData', () => ({
    deleteUserDataByKeysForUser: jest.fn(),
    getUserDataValue: jest.fn(),
    upsertUserDataValue: jest.fn(),
}));

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
    invertAgentsServerChatEnterBehavior,
    isAgentsServerChatEnterBehavior,
    normalizeChatEnterBehaviorSettingsRecord,
    updateChatEnterBehaviorSettingsForUser,
} from './chatEnterBehaviorSettings';
import { deleteUserDataByKeysForUser, upsertUserDataValue } from './userData';

describe('chatEnterBehaviorSettings', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

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

    it('persists explicit Enter behavior selections for the current user', async () => {
        await updateChatEnterBehaviorSettingsForUser(17, 'SEND');

        expect(upsertUserDataValue).toHaveBeenCalledWith({
            userId: 17,
            key: 'settings:keybindings',
            value: {
                version: 1,
                enterBehavior: 'SEND',
            },
        });
    });

    it('clears stored keybindings when the user returns to the undecided default', async () => {
        await expect(updateChatEnterBehaviorSettingsForUser(17, null)).resolves.toEqual({
            enterBehavior: null,
        });

        expect(deleteUserDataByKeysForUser).toHaveBeenCalledWith({
            userId: 17,
            keys: ['settings:keybindings'],
        });
    });
});
