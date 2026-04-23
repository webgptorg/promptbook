import { describe, expect, it, jest } from '@jest/globals';
import { CHAT_VISUAL_MODES } from '../../../constants/chatVisualMode';
import { THEME_MODES } from '../../../constants/themeMode';
import type { ControlPanelAvailableLanguages, ControlPanelTranslator } from './ControlPanelContentState';
import { createControlPanelContentState } from './createControlPanelContentState';

/**
 * Translator stub that keeps assertions stable by echoing translation keys.
 */
const translate = ((key) => key) as ControlPanelTranslator;

/**
 * Creates one complete input object for `createControlPanelContentState`.
 *
 * @param overrides - Partial state overrides relevant to the current test.
 * @returns Fully populated state-builder inputs.
 */
function createProps(
    overrides: Partial<Parameters<typeof createControlPanelContentState>[0]> = {},
): Parameters<typeof createControlPanelContentState>[0] {
    const availableLanguages: ControlPanelAvailableLanguages = [
        {
            language: 'en',
            nativeName: 'English',
            englishName: 'English',
            translations: {} as ControlPanelAvailableLanguages[number]['translations'],
        },
        {
            language: 'cs',
            nativeName: 'Cestina',
            englishName: 'Czech',
            translations: {} as ControlPanelAvailableLanguages[number]['translations'],
        },
    ];

    return {
        t: translate,
        controlPanelOptionAvailability: {
            sound: true,
            vibration: true,
            notifications: true,
            selfLearning: true,
            privateMode: true,
            language: true,
            chatVisualMode: true,
        },
        soundSystem: undefined,
        soundToggle: {
            isEnabled: true,
            toggle: jest.fn(),
        },
        isVibrationSupported: true,
        vibrationToggle: {
            isEnabled: false,
            toggle: jest.fn(),
        },
        isPrivateModeEnabled: false,
        isSelfLearningEnabled: true,
        isNotificationsConfigured: true,
        isNotificationsSupported: true,
        isNotificationsEnabled: true,
        notificationPermission: 'granted',
        isNotificationsLoading: false,
        isNotificationsPersisting: false,
        onToggleNotifications: jest.fn(),
        onToggleSelfLearning: jest.fn(),
        onTogglePrivateMode: jest.fn(),
        themeSelectId: 'theme-select',
        themeMode: THEME_MODES.DARK,
        onThemeModeChange: jest.fn(),
        languageSelectId: 'language-select',
        language: 'en',
        availableLanguages,
        onLanguageChange: jest.fn(),
        chatVisualModeSelectId: 'chat-visual-mode-select',
        chatVisualMode: CHAT_VISUAL_MODES.ARTICLE_MODE,
        onChatVisualModeChange: jest.fn(),
        chatEnterBehaviorSelectId: 'chat-enter-behavior-select',
        storedEnterBehavior: 'SEND',
        isEnterBehaviorLoading: false,
        isEnterBehaviorPersisting: false,
        onEnterBehaviorChange: jest.fn(),
        ...overrides,
    };
}

describe('createControlPanelContentState', () => {
    it('builds one unified tile list without the overview summary state', () => {
        const controlPanelState = createControlPanelContentState(createProps());

        expect(controlPanelState).not.toHaveProperty('summaryBadges');
        expect(controlPanelState.tiles.map(({ key, kind }) => ({ key, kind }))).toEqual([
            { key: 'sound', kind: 'toggle' },
            { key: 'vibration', kind: 'toggle' },
            { key: 'notifications', kind: 'toggle' },
            { key: 'self-learning', kind: 'toggle' },
            { key: 'private-mode', kind: 'toggle' },
            { key: 'theme', kind: 'select' },
            { key: 'language', kind: 'select' },
            { key: 'chat-visual-mode', kind: 'select' },
            { key: 'chat-enter-behavior', kind: 'select' },
        ]);

        const privateModeTile = controlPanelState.tiles.find(({ key }) => key === 'private-mode');
        const themeTile = controlPanelState.tiles.find(({ key }) => key === 'theme');
        const enterBehaviorTile = controlPanelState.tiles.find(({ key }) => key === 'chat-enter-behavior');

        expect(privateModeTile).toMatchObject({
            kind: 'toggle',
            stateLabel: 'controlPanel.privateModeStateStandard',
        });
        expect(privateModeTile).not.toHaveProperty('columnSpan');
        expect(themeTile).toMatchObject({
            kind: 'select',
            stateLabel: 'controlPanel.themeOptionDark',
            selectId: 'theme-select',
        });
        expect(enterBehaviorTile).toMatchObject({
            kind: 'select',
            stateLabel: 'chatEnterBehavior.sendTitle',
            selectId: 'chat-enter-behavior-select',
            value: 'SEND',
        });
    });

    it('keeps the compact Enter tile selectable and hides unavailable select tiles', () => {
        const controlPanelState = createControlPanelContentState(
            createProps({
                controlPanelOptionAvailability: {
                    sound: true,
                    vibration: true,
                    notifications: true,
                    selfLearning: true,
                    privateMode: true,
                    language: false,
                    chatVisualMode: false,
                },
                isPrivateModeEnabled: true,
                isSelfLearningEnabled: true,
                storedEnterBehavior: null,
                isEnterBehaviorLoading: true,
            }),
        );

        expect(controlPanelState.tiles.map(({ key }) => key)).toEqual([
            'sound',
            'vibration',
            'notifications',
            'self-learning',
            'private-mode',
            'theme',
            'chat-enter-behavior',
        ]);

        const selfLearningTile = controlPanelState.tiles.find(({ key }) => key === 'self-learning');
        const enterBehaviorTile = controlPanelState.tiles.find(({ key }) => key === 'chat-enter-behavior');

        expect(selfLearningTile).toMatchObject({
            kind: 'toggle',
            isDisabled: true,
            stateLabel: 'controlPanel.selfLearningStateDisabledPrivate',
        });
        expect(enterBehaviorTile).toMatchObject({
            kind: 'select',
            isDisabled: true,
            stateLabel: 'chatEnterBehavior.stateUndecided',
            value: '__CONTROL_PANEL_ENTER_BEHAVIOR_UNDECIDED__',
            helpText: 'chatEnterBehavior.helperLoading',
        });

        if (!enterBehaviorTile || enterBehaviorTile.kind !== 'select') {
            throw new Error('Expected `chat-enter-behavior` tile to be a select tile.');
        }

        expect(enterBehaviorTile.options.map(({ value }) => value)).toEqual([
            '__CONTROL_PANEL_ENTER_BEHAVIOR_UNDECIDED__',
            'SEND',
            'NEWLINE',
        ]);
    });
});
