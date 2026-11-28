/** @jest-environment jsdom */

jest.mock('@/src/utils/chatEnterBehaviorClient', () => ({
    fetchChatEnterBehaviorSettings: jest.fn(),
    updateChatEnterBehaviorSettings: jest.fn(),
}));

jest.mock('./ChatEnterBehaviorPrompt', () => ({
    ChatEnterBehaviorPrompt: () => null,
}));

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
    fetchChatEnterBehaviorSettings,
    updateChatEnterBehaviorSettings,
} from '@/src/utils/chatEnterBehaviorClient';
import {
    ChatEnterBehaviorPreferencesProvider,
    useChatEnterBehaviorPreferences,
} from './ChatEnterBehaviorPreferencesProvider';

/**
 * Small deferred-promise helper used to control asynchronous provider loading in tests.
 */
function createDeferredPromise<TValue>() {
    let resolvePromise: (value: TValue) => void = () => {
        throw new Error('Deferred promise resolved before initialization.');
    };

    const promise = new Promise<TValue>((resolve) => {
        resolvePromise = resolve;
    });

    return {
        promise,
        resolve: resolvePromise,
    };
}

/**
 * Minimal harness exposing the provider state needed by the regression test.
 */
function ChatEnterBehaviorPreferencesHarness() {
    const { storedEnterBehavior, isLoading, setStoredEnterBehavior } = useChatEnterBehaviorPreferences();

    return (
        <div>
            <div data-testid="chat-enter-behavior-state">{isLoading ? 'loading' : storedEnterBehavior || 'UNDECIDED'}</div>
            <button
                type="button"
                onClick={() => {
                    void setStoredEnterBehavior(null);
                }}
            >
                Reset to undecided
            </button>
        </div>
    );
}

describe('ChatEnterBehaviorPreferencesProvider', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        window.sessionStorage.clear();
    });

    it('does not let the initial settings load overwrite an explicit reset back to undecided', async () => {
        const deferredSettingsLoad = createDeferredPromise<{ enterBehavior: 'SEND' | null }>();
        const fetchChatEnterBehaviorSettingsMock = jest.mocked(fetchChatEnterBehaviorSettings);
        const updateChatEnterBehaviorSettingsMock = jest.mocked(updateChatEnterBehaviorSettings);

        fetchChatEnterBehaviorSettingsMock.mockReturnValue(deferredSettingsLoad.promise);
        updateChatEnterBehaviorSettingsMock.mockResolvedValue({ enterBehavior: null });

        render(
            <ChatEnterBehaviorPreferencesProvider>
                <ChatEnterBehaviorPreferencesHarness />
            </ChatEnterBehaviorPreferencesProvider>,
        );

        expect(screen.getByTestId('chat-enter-behavior-state').textContent).toBe('loading');

        fireEvent.click(screen.getByRole('button', { name: 'Reset to undecided' }));

        await waitFor(() => {
            expect(screen.getByTestId('chat-enter-behavior-state').textContent).toBe('UNDECIDED');
        });

        await act(async () => {
            deferredSettingsLoad.resolve({ enterBehavior: 'SEND' });
            await deferredSettingsLoad.promise;
        });

        await waitFor(() => {
            expect(screen.getByTestId('chat-enter-behavior-state').textContent).toBe('UNDECIDED');
        });

        expect(updateChatEnterBehaviorSettingsMock).toHaveBeenCalledWith(null);
    });
});
