import {
    Bell,
    CornerDownLeft,
    EyeOff,
    Languages,
    MessageSquare,
    Sparkles,
    SpeakerIcon,
    SunMoon,
    Vibrate,
} from 'lucide-react';
import { CHAT_VISUAL_MODES, type ChatVisualMode } from '../../../constants/chatVisualMode';
import { THEME_MODES } from '../../../constants/themeMode';
import {
    getChatEnterBehaviorSettingsHelperText,
    getChatEnterBehaviorStateLabel,
} from '../../ChatEnterBehavior/chatEnterBehaviorTranslations';
import type {
    ControlPanelAvailableLanguages,
    ControlPanelContentState,
    ControlPanelLanguage,
    ControlPanelNotificationPermission,
    ControlPanelNotificationState,
    ControlPanelOptionAvailability,
    ControlPanelPreferenceState,
    ControlPanelSelectTileState,
    ControlPanelSoundSystem,
    ControlPanelStoredEnterBehavior,
    ControlPanelThemeMode,
    ControlPanelToggleTileState,
    ControlPanelTranslator,
} from './ControlPanelContentState';

/**
 * Shared toggle shape accepted by the pure content-state builder.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelBooleanToggleState = {
    readonly isEnabled: boolean;
    readonly toggle: () => void;
};

/**
 * Sentinel value used by the compact Enter-key select tile for the undecided state.
 *
 * @private function of ControlPanelContent
 */
const CONTROL_PANEL_ENTER_BEHAVIOR_UNDECIDED_VALUE = '__CONTROL_PANEL_ENTER_BEHAVIOR_UNDECIDED__';

/**
 * Inputs required to build the final `ControlPanelContentState` view model.
 *
 * @private function of ControlPanelContent
 */
type CreateControlPanelContentStateProps = {
    readonly t: ControlPanelTranslator;
    readonly controlPanelOptionAvailability: ControlPanelOptionAvailability;
    readonly soundSystem: ControlPanelSoundSystem;
    readonly soundToggle: ControlPanelBooleanToggleState;
    readonly isVibrationSupported: boolean;
    readonly vibrationToggle: ControlPanelBooleanToggleState;
    readonly isPrivateModeEnabled: boolean;
    readonly isSelfLearningEnabled: boolean;
    readonly isNotificationsConfigured: boolean;
    readonly isNotificationsSupported: boolean;
    readonly isNotificationsEnabled: boolean;
    readonly notificationPermission: ControlPanelNotificationPermission;
    readonly isNotificationsLoading: boolean;
    readonly isNotificationsPersisting: boolean;
    readonly onToggleNotifications: () => void;
    readonly onToggleSelfLearning: () => void;
    readonly onTogglePrivateMode: () => void;
    readonly themeSelectId: string;
    readonly themeMode: ControlPanelThemeMode;
    readonly onThemeModeChange: (nextValue: string) => void;
    readonly languageSelectId: string;
    readonly language: ControlPanelLanguage;
    readonly availableLanguages: ControlPanelAvailableLanguages;
    readonly onLanguageChange: (nextValue: string) => void;
    readonly chatVisualModeSelectId: string;
    readonly chatVisualMode: ChatVisualMode;
    readonly onChatVisualModeChange: (nextValue: string) => void;
    readonly chatEnterBehaviorSelectId: string;
    readonly storedEnterBehavior: ControlPanelStoredEnterBehavior;
    readonly isEnterBehaviorLoading: boolean;
    readonly isEnterBehaviorPersisting: boolean;
    readonly onEnterBehaviorChange: (behavior: ControlPanelStoredEnterBehavior) => void;
};

/**
 * Creates the final view model consumed by `ControlPanelContent`.
 *
 * @private function of ControlPanelContent
 */
export function createControlPanelContentState({
    t,
    controlPanelOptionAvailability,
    soundSystem,
    soundToggle,
    isVibrationSupported,
    vibrationToggle,
    isPrivateModeEnabled,
    isSelfLearningEnabled,
    isNotificationsConfigured,
    isNotificationsSupported,
    isNotificationsEnabled,
    notificationPermission,
    isNotificationsLoading,
    isNotificationsPersisting,
    onToggleNotifications,
    onToggleSelfLearning,
    onTogglePrivateMode,
    themeSelectId,
    themeMode,
    onThemeModeChange,
    languageSelectId,
    language,
    availableLanguages,
    onLanguageChange,
    chatVisualModeSelectId,
    chatVisualMode,
    onChatVisualModeChange,
    chatEnterBehaviorSelectId,
    storedEnterBehavior,
    isEnterBehaviorLoading,
    isEnterBehaviorPersisting,
    onEnterBehaviorChange,
}: CreateControlPanelContentStateProps): ControlPanelContentState {
    const selfLearningState = resolveControlPanelSelfLearningState(t, {
        isPrivateModeEnabled,
        isSelfLearningEnabled,
    });
    const privateModeState = resolveControlPanelPrivateModeState(t, isPrivateModeEnabled);
    const notificationState = resolveControlPanelNotificationState(t, {
        isConfigured: isNotificationsConfigured,
        isSupported: isNotificationsSupported,
        isEnabled: isNotificationsEnabled,
        permission: notificationPermission,
        isLoading: isNotificationsLoading,
        isPersisting: isNotificationsPersisting,
    });
    const soundStateLabel = resolveControlPanelToggleStateLabel(t, soundToggle.isEnabled);
    const vibrationStateLabel = resolveControlPanelToggleStateLabel(t, vibrationToggle.isEnabled);
    const activeThemeModeLabel = resolveControlPanelThemeModeLabel(t, themeMode);
    const activeLanguageName = resolveControlPanelActiveLanguageName(availableLanguages, language);
    const activeChatVisualModeLabel = resolveControlPanelChatVisualModeLabel(t, chatVisualMode);
    const chatEnterBehaviorStateLabel = getChatEnterBehaviorStateLabel(t, storedEnterBehavior);

    return {
        tiles: [
            ...createControlPanelToggleTiles({
                controlPanelOptionAvailability,
                soundSystem,
                soundStateLabel,
                soundToggle,
                isVibrationSupported,
                vibrationStateLabel,
                vibrationToggle,
                notificationState,
                onToggleNotifications,
                selfLearningState,
                onToggleSelfLearning,
                privateModeState,
                onTogglePrivateMode,
                t,
            }),
            ...createControlPanelSelectTiles({
                controlPanelOptionAvailability,
                themeSelectId,
                themeMode,
                activeThemeModeLabel,
                onThemeModeChange,
                languageSelectId,
                language,
                availableLanguages,
                activeLanguageName,
                onLanguageChange,
                chatVisualModeSelectId,
                chatVisualMode,
                activeChatVisualModeLabel,
                onChatVisualModeChange,
                chatEnterBehaviorSelectId,
                storedEnterBehavior,
                isEnterBehaviorLoading,
                isEnterBehaviorPersisting,
                chatEnterBehaviorStateLabel,
                onEnterBehaviorChange,
                t,
            }),
        ],
        isAudioLoadingHintVisible:
            (controlPanelOptionAvailability.sound || controlPanelOptionAvailability.vibration) && !soundSystem,
        audioLoadingLabel: t('controlPanel.audioLoading'),
    };
}

/**
 * Resolves the translated enabled/disabled label shared by binary toggles.
 *
 * @private function of ControlPanelContent
 */
function resolveControlPanelToggleStateLabel(t: ControlPanelTranslator, isEnabled: boolean): string {
    return isEnabled ? t('controlPanel.notificationsStateEnabled') : t('controlPanel.notificationsStateDisabled');
}

/**
 * Resolves the current self-learning label, description, tone, and availability state.
 *
 * @private function of ControlPanelContent
 */
function resolveControlPanelSelfLearningState(
    t: ControlPanelTranslator,
    {
        isPrivateModeEnabled,
        isSelfLearningEnabled,
    }: {
        readonly isPrivateModeEnabled: boolean;
        readonly isSelfLearningEnabled: boolean;
    },
): ControlPanelPreferenceState {
    if (isPrivateModeEnabled) {
        return {
            description: t('controlPanel.selfLearningDescriptionPrivate'),
            isActive: false,
            isDisabled: true,
            stateLabel: t('controlPanel.selfLearningStateDisabledPrivate'),
            tone: 'neutral',
        };
    }

    if (isSelfLearningEnabled) {
        return {
            description: t('controlPanel.selfLearningDescriptionLearning'),
            isActive: true,
            stateLabel: t('controlPanel.selfLearningStateLearning'),
            tone: 'positive',
        };
    }

    return {
        description: t('controlPanel.selfLearningDescriptionPaused'),
        isActive: false,
        stateLabel: t('controlPanel.selfLearningStatePaused'),
        tone: 'informative',
    };
}

/**
 * Resolves the translated private-mode label, description, and tone.
 *
 * @private function of ControlPanelContent
 */
function resolveControlPanelPrivateModeState(
    t: ControlPanelTranslator,
    isPrivateModeEnabled: boolean,
): ControlPanelPreferenceState {
    if (isPrivateModeEnabled) {
        return {
            description: t('controlPanel.privateModeDescriptionPrivate'),
            isActive: true,
            stateLabel: t('controlPanel.privateModeStatePrivate'),
            tone: 'danger',
        };
    }

    return {
        description: t('controlPanel.privateModeDescriptionStandard'),
        isActive: false,
        stateLabel: t('controlPanel.privateModeStateStandard'),
        tone: 'positive',
    };
}

/**
 * Resolves the translated browser-notification permission label.
 *
 * @private function of ControlPanelContent
 */
function resolveControlPanelNotificationPermissionLabel(
    t: ControlPanelTranslator,
    {
        isConfigured,
        permission,
    }: {
        readonly isConfigured: boolean;
        readonly permission: ControlPanelNotificationPermission;
    },
): string {
    if (!isConfigured) {
        return t('controlPanel.notificationsPermissionUnavailable');
    }

    switch (permission) {
        case 'granted':
            return t('controlPanel.notificationsPermissionGranted');
        case 'denied':
            return t('controlPanel.notificationsPermissionDenied');
        case 'unsupported':
            return t('controlPanel.notificationsPermissionUnsupported');
        default:
            return t('controlPanel.notificationsPermissionDefault');
    }
}

/**
 * Resolves the translated notification tile presentation state.
 *
 * @private function of ControlPanelContent
 */
function resolveControlPanelNotificationState(
    t: ControlPanelTranslator,
    {
        isConfigured,
        isSupported,
        isEnabled,
        permission,
        isLoading,
        isPersisting,
    }: {
        readonly isConfigured: boolean;
        readonly isSupported: boolean;
        readonly isEnabled: boolean;
        readonly permission: ControlPanelNotificationPermission;
        readonly isLoading: boolean;
        readonly isPersisting: boolean;
    },
): ControlPanelNotificationState {
    const permissionLabel = resolveControlPanelNotificationPermissionLabel(t, { isConfigured, permission });
    const isAvailable = isSupported && isConfigured;

    if (!isAvailable) {
        return {
            description: t('controlPanel.notificationsDescriptionUnavailable'),
            isActive: isEnabled,
            isAvailable,
            isDisabled: isLoading || isPersisting || !isEnabled,
            permissionDetail: `${t('controlPanel.notificationsPermissionLabel')} ${permissionLabel}`,
            stateLabel: resolveControlPanelToggleStateLabel(t, isEnabled),
            tone: 'neutral',
        };
    }

    if (permission === 'denied') {
        return {
            description: isEnabled
                ? t('controlPanel.notificationsDescriptionEnabled')
                : t('controlPanel.notificationsDescriptionDisabled'),
            isActive: isEnabled,
            isAvailable,
            isDisabled: isLoading || isPersisting,
            permissionDetail: `${t('controlPanel.notificationsPermissionLabel')} ${permissionLabel}`,
            stateLabel: resolveControlPanelToggleStateLabel(t, isEnabled),
            tone: 'danger',
        };
    }

    return {
        description: isEnabled
            ? t('controlPanel.notificationsDescriptionEnabled')
            : t('controlPanel.notificationsDescriptionDisabled'),
        isActive: isEnabled,
        isAvailable,
        isDisabled: isLoading || isPersisting,
        permissionDetail: `${t('controlPanel.notificationsPermissionLabel')} ${permissionLabel}`,
        stateLabel: resolveControlPanelToggleStateLabel(t, isEnabled),
        tone: isEnabled ? 'positive' : 'informative',
    };
}

/**
 * Resolves the label shown for the currently active server language.
 *
 * @private function of ControlPanelContent
 */
function resolveControlPanelActiveLanguageName(
    availableLanguages: ControlPanelAvailableLanguages,
    language: ControlPanelLanguage,
): string {
    return availableLanguages.find((languagePack) => languagePack.language === language)?.nativeName || language;
}

/**
 * Resolves the label shown for the currently active chat visual mode.
 *
 * @private function of ControlPanelContent
 */
function resolveControlPanelChatVisualModeLabel(
    t: ControlPanelTranslator,
    chatVisualMode: ChatVisualMode,
): string {
    return chatVisualMode === CHAT_VISUAL_MODES.ARTICLE_MODE
        ? t('controlPanel.chatVisualModeOptionArticle')
        : t('controlPanel.chatVisualModeOptionBubble');
}

/**
 * Resolves the label shown for the currently active theme mode.
 *
 * @private function of ControlPanelContent
 */
function resolveControlPanelThemeModeLabel(t: ControlPanelTranslator, themeMode: ControlPanelThemeMode): string {
    switch (themeMode) {
        case THEME_MODES.DARK:
            return t('controlPanel.themeOptionDark');
        case THEME_MODES.LIGHT:
            return t('controlPanel.themeOptionLight');
        default:
            return t('controlPanel.themeOptionSystem');
    }
}

/**
 * Builds the compact toggle tiles shown in the control-panel grid.
 *
 * @private function of ControlPanelContent
 */
function createControlPanelToggleTiles({
    controlPanelOptionAvailability,
    soundSystem,
    soundStateLabel,
    soundToggle,
    isVibrationSupported,
    vibrationStateLabel,
    vibrationToggle,
    notificationState,
    onToggleNotifications,
    selfLearningState,
    onToggleSelfLearning,
    privateModeState,
    onTogglePrivateMode,
    t,
}: {
    readonly controlPanelOptionAvailability: ControlPanelOptionAvailability;
    readonly soundSystem: ControlPanelSoundSystem;
    readonly soundStateLabel: string;
    readonly soundToggle: ControlPanelBooleanToggleState;
    readonly isVibrationSupported: boolean;
    readonly vibrationStateLabel: string;
    readonly vibrationToggle: ControlPanelBooleanToggleState;
    readonly notificationState: ControlPanelNotificationState;
    readonly onToggleNotifications: () => void;
    readonly selfLearningState: ControlPanelPreferenceState;
    readonly onToggleSelfLearning: () => void;
    readonly privateModeState: ControlPanelPreferenceState;
    readonly onTogglePrivateMode: () => void;
    readonly t: ControlPanelTranslator;
}): ReadonlyArray<ControlPanelToggleTileState> {
    return (
        [
            {
                key: 'sound',
                kind: 'toggle',
                isAvailable: controlPanelOptionAvailability.sound,
                icon: SpeakerIcon,
                title: t('controlPanel.soundTitle'),
                description: t('controlPanel.soundDescription'),
                stateLabel: soundStateLabel,
                isActive: soundToggle.isEnabled,
                onToggle: soundToggle.toggle,
                tone: soundToggle.isEnabled ? 'positive' : 'neutral',
                isDisabled: !soundSystem,
            },
            {
                key: 'vibration',
                kind: 'toggle',
                isAvailable: controlPanelOptionAvailability.vibration,
                icon: Vibrate,
                title: t('controlPanel.vibrationTitle'),
                description: isVibrationSupported
                    ? t('controlPanel.vibrationDescription')
                    : t('controlPanel.vibrationDescriptionUnsupported'),
                stateLabel: vibrationStateLabel,
                isActive: vibrationToggle.isEnabled,
                onToggle: vibrationToggle.toggle,
                tone: vibrationToggle.isEnabled ? 'informative' : 'neutral',
                isDisabled: !isVibrationSupported,
            },
            {
                key: 'notifications',
                kind: 'toggle',
                isAvailable: controlPanelOptionAvailability.notifications,
                icon: Bell,
                title: t('controlPanel.notificationsTitle'),
                description: notificationState.description,
                auxiliaryDetail: notificationState.permissionDetail,
                stateLabel: notificationState.stateLabel,
                isActive: notificationState.isActive,
                onToggle: onToggleNotifications,
                tone: notificationState.tone,
                isDisabled: notificationState.isDisabled,
            },
            {
                key: 'self-learning',
                kind: 'toggle',
                isAvailable: controlPanelOptionAvailability.selfLearning,
                icon: Sparkles,
                title: t('controlPanel.selfLearningTitle'),
                description: selfLearningState.description,
                stateLabel: selfLearningState.stateLabel,
                isActive: selfLearningState.isActive,
                onToggle: onToggleSelfLearning,
                tone: selfLearningState.tone,
                isDisabled: selfLearningState.isDisabled,
            },
            {
                key: 'private-mode',
                kind: 'toggle',
                isAvailable: controlPanelOptionAvailability.privateMode,
                icon: EyeOff,
                title: t('controlPanel.privateModeTitle'),
                description: privateModeState.description,
                stateLabel: privateModeState.stateLabel,
                isActive: privateModeState.isActive,
                onToggle: onTogglePrivateMode,
                tone: privateModeState.tone,
            },
        ] satisfies Array<ControlPanelToggleTileState & { readonly isAvailable: boolean }>
    ).flatMap(({ isAvailable, ...tile }) => (isAvailable ? [tile] : []));
}

/**
 * Builds the select-based tiles shown in the control-panel grid.
 *
 * @private function of ControlPanelContent
 */
function createControlPanelSelectTiles({
    controlPanelOptionAvailability,
    themeSelectId,
    themeMode,
    activeThemeModeLabel,
    onThemeModeChange,
    languageSelectId,
    language,
    availableLanguages,
    activeLanguageName,
    onLanguageChange,
    chatVisualModeSelectId,
    chatVisualMode,
    activeChatVisualModeLabel,
    onChatVisualModeChange,
    chatEnterBehaviorSelectId,
    storedEnterBehavior,
    isEnterBehaviorLoading,
    isEnterBehaviorPersisting,
    chatEnterBehaviorStateLabel,
    onEnterBehaviorChange,
    t,
}: {
    readonly controlPanelOptionAvailability: ControlPanelOptionAvailability;
    readonly themeSelectId: string;
    readonly themeMode: ControlPanelThemeMode;
    readonly activeThemeModeLabel: string;
    readonly onThemeModeChange: (nextValue: string) => void;
    readonly languageSelectId: string;
    readonly language: ControlPanelLanguage;
    readonly availableLanguages: ControlPanelAvailableLanguages;
    readonly activeLanguageName: string;
    readonly onLanguageChange: (nextValue: string) => void;
    readonly chatVisualModeSelectId: string;
    readonly chatVisualMode: ChatVisualMode;
    readonly activeChatVisualModeLabel: string;
    readonly onChatVisualModeChange: (nextValue: string) => void;
    readonly chatEnterBehaviorSelectId: string;
    readonly storedEnterBehavior: ControlPanelStoredEnterBehavior;
    readonly isEnterBehaviorLoading: boolean;
    readonly isEnterBehaviorPersisting: boolean;
    readonly chatEnterBehaviorStateLabel: string;
    readonly onEnterBehaviorChange: (behavior: ControlPanelStoredEnterBehavior) => void;
    readonly t: ControlPanelTranslator;
}): ReadonlyArray<ControlPanelSelectTileState> {
    return [
        createControlPanelThemeTile({
            selectId: themeSelectId,
            themeMode,
            stateLabel: activeThemeModeLabel,
            onChange: onThemeModeChange,
            t,
        }),
        ...createControlPanelLanguageTile({
            isAvailable: controlPanelOptionAvailability.language,
            selectId: languageSelectId,
            language,
            availableLanguages,
            stateLabel: activeLanguageName,
            onChange: onLanguageChange,
            t,
        }),
        ...createControlPanelChatVisualModeTile({
            isAvailable: controlPanelOptionAvailability.chatVisualMode,
            selectId: chatVisualModeSelectId,
            chatVisualMode,
            stateLabel: activeChatVisualModeLabel,
            onChange: onChatVisualModeChange,
            t,
        }),
        createControlPanelChatEnterBehaviorTile({
            storedEnterBehavior,
            isLoading: isEnterBehaviorLoading,
            isPersisting: isEnterBehaviorPersisting,
            stateLabel: chatEnterBehaviorStateLabel,
            onChange: onEnterBehaviorChange,
            selectId: chatEnterBehaviorSelectId,
            t,
        }),
    ];
}

/**
 * Builds the theme-mode tile.
 *
 * @private function of ControlPanelContent
 */
function createControlPanelThemeTile({
    selectId,
    themeMode,
    stateLabel,
    onChange,
    t,
}: {
    readonly selectId: string;
    readonly themeMode: ControlPanelThemeMode;
    readonly stateLabel: string;
    readonly onChange: (nextValue: string) => void;
    readonly t: ControlPanelTranslator;
}): ControlPanelSelectTileState {
    return {
        key: 'theme',
        kind: 'select',
        icon: SunMoon,
        title: t('controlPanel.themeTitle'),
        description: t('controlPanel.themeSubtitle'),
        tone: 'informative',
        stateLabel,
        selectId,
        selectLabel: t('controlPanel.themeSelectLabel'),
        value: themeMode,
        options: [
            {
                value: THEME_MODES.SYSTEM,
                label: t('controlPanel.themeOptionSystem'),
            },
            {
                value: THEME_MODES.LIGHT,
                label: t('controlPanel.themeOptionLight'),
            },
            {
                value: THEME_MODES.DARK,
                label: t('controlPanel.themeOptionDark'),
            },
        ],
        helpText: t('controlPanel.themeHelp'),
        onChange,
    };
}

/**
 * Builds the language tile when the server allows local language overrides.
 *
 * @private function of ControlPanelContent
 */
function createControlPanelLanguageTile({
    isAvailable,
    selectId,
    language,
    availableLanguages,
    stateLabel,
    onChange,
    t,
}: {
    readonly isAvailable: boolean;
    readonly selectId: string;
    readonly language: ControlPanelLanguage;
    readonly availableLanguages: ControlPanelAvailableLanguages;
    readonly stateLabel: string;
    readonly onChange: (nextValue: string) => void;
    readonly t: ControlPanelTranslator;
}): ReadonlyArray<ControlPanelSelectTileState> {
    if (!isAvailable) {
        return [];
    }

    return [
        {
            key: 'language',
            kind: 'select',
            icon: Languages,
            title: t('controlPanel.languageTitle'),
            description: t('controlPanel.languageSubtitle'),
            tone: 'neutral',
            stateLabel,
            selectId,
            selectLabel: t('controlPanel.languageSelectLabel'),
            value: language,
            options: availableLanguages.map((languagePack) => ({
                value: languagePack.language,
                label: `${languagePack.nativeName} (${languagePack.englishName})`,
            })),
            helpText: t('controlPanel.languageHelp'),
            onChange,
        },
    ];
}

/**
 * Builds the chat visual-mode tile when that override is enabled.
 *
 * @private function of ControlPanelContent
 */
function createControlPanelChatVisualModeTile({
    isAvailable,
    selectId,
    chatVisualMode,
    stateLabel,
    onChange,
    t,
}: {
    readonly isAvailable: boolean;
    readonly selectId: string;
    readonly chatVisualMode: ChatVisualMode;
    readonly stateLabel: string;
    readonly onChange: (nextValue: string) => void;
    readonly t: ControlPanelTranslator;
}): ReadonlyArray<ControlPanelSelectTileState> {
    if (!isAvailable) {
        return [];
    }

    return [
        {
            key: 'chat-visual-mode',
            kind: 'select',
            icon: MessageSquare,
            title: t('controlPanel.chatVisualModeTitle'),
            description: t('controlPanel.chatVisualModeSubtitle'),
            tone: 'informative',
            stateLabel,
            selectId,
            selectLabel: t('controlPanel.chatVisualModeSelectLabel'),
            value: chatVisualMode,
            options: [
                {
                    value: CHAT_VISUAL_MODES.BUBBLE_MODE,
                    label: t('controlPanel.chatVisualModeOptionBubble'),
                },
                {
                    value: CHAT_VISUAL_MODES.ARTICLE_MODE,
                    label: t('controlPanel.chatVisualModeOptionArticle'),
                },
            ],
            helpText: t('controlPanel.chatVisualModeHelp'),
            onChange,
        },
    ];
}

/**
 * Builds the compact Enter-key preference tile used in the dropdown.
 *
 * @private function of ControlPanelContent
 */
function createControlPanelChatEnterBehaviorTile({
    storedEnterBehavior,
    isLoading,
    isPersisting,
    stateLabel,
    onChange,
    selectId,
    t,
}: {
    readonly storedEnterBehavior: ControlPanelStoredEnterBehavior;
    readonly isLoading: boolean;
    readonly isPersisting: boolean;
    readonly stateLabel: string;
    readonly onChange: (behavior: ControlPanelStoredEnterBehavior) => void;
    readonly selectId: string;
    readonly t: ControlPanelTranslator;
}): ControlPanelSelectTileState {
    return {
        key: 'chat-enter-behavior',
        kind: 'select',
        icon: CornerDownLeft,
        title: t('chatEnterBehavior.sectionTitle'),
        description: t('chatEnterBehavior.sectionDescription'),
        tone: storedEnterBehavior === null ? 'informative' : 'positive',
        stateLabel,
        selectId,
        selectLabel: t('chatEnterBehavior.sectionTitle'),
        value: encodeControlPanelEnterBehaviorValue(storedEnterBehavior),
        options: [
            {
                value: CONTROL_PANEL_ENTER_BEHAVIOR_UNDECIDED_VALUE,
                label: t('chatEnterBehavior.stateUndecided'),
            },
            {
                value: 'SEND',
                label: t('chatEnterBehavior.sendTitle'),
            },
            {
                value: 'NEWLINE',
                label: t('chatEnterBehavior.newlineTitle'),
            },
        ],
        helpText: getChatEnterBehaviorSettingsHelperText(t, {
            isLoading,
            isPersisting,
            storedEnterBehavior,
        }),
        onChange: (nextValue) => {
            onChange(decodeControlPanelEnterBehaviorValue(nextValue));
        },
        isDisabled: isLoading || isPersisting,
    };
}

/**
 * Encodes the stored Enter-key preference into the compact select control value.
 *
 * @private function of ControlPanelContent
 */
function encodeControlPanelEnterBehaviorValue(
    storedEnterBehavior: ControlPanelStoredEnterBehavior,
): string {
    return storedEnterBehavior === null ? CONTROL_PANEL_ENTER_BEHAVIOR_UNDECIDED_VALUE : storedEnterBehavior;
}

/**
 * Decodes the compact select value back into the stored Enter-key preference shape.
 *
 * @private function of ControlPanelContent
 */
function decodeControlPanelEnterBehaviorValue(
    nextValue: string,
): ControlPanelStoredEnterBehavior {
    return nextValue === CONTROL_PANEL_ENTER_BEHAVIOR_UNDECIDED_VALUE
        ? null
        : (nextValue as Exclude<ControlPanelStoredEnterBehavior, null>);
}
