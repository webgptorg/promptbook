import { Bell, EyeOff, Sparkles, SpeakerIcon, Vibrate } from 'lucide-react';
import { CHAT_VISUAL_MODES, type ChatVisualMode } from '../../../constants/chatVisualMode';
import { THEME_MODES } from '../../../constants/themeMode';
import { getChatEnterBehaviorStateLabel } from '../../ChatEnterBehavior/chatEnterBehaviorTranslations';
import type {
    ControlPanelAvailableLanguages,
    ControlPanelContentState,
    ControlPanelLanguage,
    ControlPanelNotificationPermission,
    ControlPanelNotificationState,
    ControlPanelOptionAvailability,
    ControlPanelPreferenceState,
    ControlPanelSelectSectionState,
    ControlPanelSoundSystem,
    ControlPanelStoredEnterBehavior,
    ControlPanelSummaryBadge,
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
 * Inputs required to build the final `ControlPanelContentState` view model.
 *
 * @private function of ControlPanelContent
 */
type CreateControlPanelContentStateProps = {
    readonly title?: string;
    readonly subtitle?: string;
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
    title,
    subtitle,
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
    const chatEnterBehaviorStateLabel = getChatEnterBehaviorStateLabel(t, storedEnterBehavior);
    const activeChatVisualModeLabel = resolveControlPanelChatVisualModeLabel(t, chatVisualMode);

    return {
        feedbackTitle: title || t('controlPanel.feedbackTitle'),
        feedbackSubtitle: subtitle || t('controlPanel.feedbackSubtitle'),
        summaryBadges: createControlPanelSummaryBadges({
            controlPanelOptionAvailability,
            privateModeState,
            selfLearningState,
            notificationState,
            soundStateLabel,
            isSoundEnabled: soundToggle.isEnabled,
            activeThemeModeLabel,
            activeLanguageName,
            chatEnterBehaviorStateLabel,
            isEnterBehaviorLoading,
            storedEnterBehavior,
            activeChatVisualModeLabel,
        }),
        toggleTiles: createControlPanelToggleTiles({
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
        themeSection: createControlPanelThemeSection({
            selectId: themeSelectId,
            t,
            themeMode,
            onChange: onThemeModeChange,
        }),
        languageSection: createControlPanelLanguageSection({
            isAvailable: controlPanelOptionAvailability.language,
            selectId: languageSelectId,
            t,
            language,
            availableLanguages,
            onChange: onLanguageChange,
        }),
        chatVisualModeSection: createControlPanelChatVisualModeSection({
            isAvailable: controlPanelOptionAvailability.chatVisualMode,
            selectId: chatVisualModeSelectId,
            t,
            chatVisualMode,
            onChange: onChatVisualModeChange,
        }),
        chatEnterBehaviorSection: createControlPanelChatEnterBehaviorSection({
            t,
            storedEnterBehavior,
            isLoading: isEnterBehaviorLoading,
            isPersisting: isEnterBehaviorPersisting,
            onSelectBehavior: onEnterBehaviorChange,
        }),
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
 * Resolves the translated notification tile and summary presentation state.
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
 * Builds the summary badge list shown in the control-panel hero card.
 *
 * @private function of ControlPanelContent
 */
function createControlPanelSummaryBadges({
    controlPanelOptionAvailability,
    privateModeState,
    selfLearningState,
    notificationState,
    soundStateLabel,
    isSoundEnabled,
    activeThemeModeLabel,
    activeLanguageName,
    chatEnterBehaviorStateLabel,
    isEnterBehaviorLoading,
    storedEnterBehavior,
    activeChatVisualModeLabel,
}: {
    readonly controlPanelOptionAvailability: ControlPanelOptionAvailability;
    readonly privateModeState: ControlPanelPreferenceState;
    readonly selfLearningState: ControlPanelPreferenceState;
    readonly notificationState: ControlPanelNotificationState;
    readonly soundStateLabel: string;
    readonly isSoundEnabled: boolean;
    readonly activeThemeModeLabel: string;
    readonly activeLanguageName: string;
    readonly chatEnterBehaviorStateLabel: string;
    readonly isEnterBehaviorLoading: boolean;
    readonly storedEnterBehavior: ControlPanelStoredEnterBehavior;
    readonly activeChatVisualModeLabel: string;
}): ControlPanelContentState['summaryBadges'] {
    return (
        [
            {
                key: 'private-mode',
                isAvailable: controlPanelOptionAvailability.privateMode,
                label: privateModeState.stateLabel,
                tone: privateModeState.tone,
            },
            {
                key: 'self-learning',
                isAvailable: controlPanelOptionAvailability.selfLearning,
                label: selfLearningState.stateLabel,
                tone: selfLearningState.tone,
            },
            {
                key: 'notifications',
                isAvailable: controlPanelOptionAvailability.notifications,
                label: notificationState.stateLabel,
                tone: notificationState.tone,
            },
            {
                key: 'sound',
                isAvailable: controlPanelOptionAvailability.sound,
                label: soundStateLabel,
                tone: isSoundEnabled ? 'positive' : 'neutral',
            },
            {
                key: 'theme',
                isAvailable: true,
                label: activeThemeModeLabel,
                tone: 'informative',
            },
            {
                key: 'language',
                isAvailable: controlPanelOptionAvailability.language,
                label: activeLanguageName,
                tone: 'neutral',
            },
            {
                key: 'chat-enter-behavior',
                isAvailable: !isEnterBehaviorLoading,
                label: chatEnterBehaviorStateLabel,
                tone: storedEnterBehavior === null ? 'informative' : 'neutral',
            },
            {
                key: 'chat-visual-mode',
                isAvailable: controlPanelOptionAvailability.chatVisualMode,
                label: activeChatVisualModeLabel,
                tone: 'informative',
            },
        ] satisfies Array<ControlPanelSummaryBadge & { readonly isAvailable: boolean }>
    ).flatMap(({ isAvailable, ...badge }) => (isAvailable ? [badge] : []));
}

/**
 * Builds the compact toggle-tile list shown at the top of the control panel.
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
}): ControlPanelContentState['toggleTiles'] {
    return (
        [
            {
                key: 'sound',
                isAvailable: controlPanelOptionAvailability.sound,
                icon: SpeakerIcon,
                label: t('controlPanel.soundTitle'),
                description: t('controlPanel.soundDescription'),
                stateLabel: soundStateLabel,
                isActive: soundToggle.isEnabled,
                onToggle: soundToggle.toggle,
                tone: soundToggle.isEnabled ? 'positive' : 'neutral',
                isDisabled: !soundSystem,
            },
            {
                key: 'vibration',
                isAvailable: controlPanelOptionAvailability.vibration,
                icon: Vibrate,
                label: t('controlPanel.vibrationTitle'),
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
                isAvailable: controlPanelOptionAvailability.notifications,
                icon: Bell,
                label: t('controlPanel.notificationsTitle'),
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
                isAvailable: controlPanelOptionAvailability.selfLearning,
                icon: Sparkles,
                label: t('controlPanel.selfLearningTitle'),
                description: selfLearningState.description,
                stateLabel: selfLearningState.stateLabel,
                isActive: selfLearningState.isActive,
                onToggle: onToggleSelfLearning,
                tone: selfLearningState.tone,
                isDisabled: selfLearningState.isDisabled,
            },
            {
                key: 'private-mode',
                isAvailable: controlPanelOptionAvailability.privateMode,
                icon: EyeOff,
                label: t('controlPanel.privateModeTitle'),
                description: privateModeState.description,
                stateLabel: privateModeState.stateLabel,
                isActive: privateModeState.isActive,
                onToggle: onTogglePrivateMode,
                tone: privateModeState.tone,
                columnSpan: 2,
            },
        ] satisfies Array<ControlPanelToggleTileState & { readonly isAvailable: boolean }>
    ).flatMap(({ isAvailable, ...tile }) => (isAvailable ? [tile] : []));
}

/**
 * Builds the state for the theme-mode select card.
 *
 * @private function of ControlPanelContent
 */
function createControlPanelThemeSection({
    selectId,
    t,
    themeMode,
    onChange,
}: {
    readonly selectId: string;
    readonly t: ControlPanelTranslator;
    readonly themeMode: ControlPanelThemeMode;
    readonly onChange: (nextValue: string) => void;
}): ControlPanelSelectSectionState {
    return {
        title: t('controlPanel.themeTitle'),
        subtitle: t('controlPanel.themeSubtitle'),
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
 * Builds the state for the language select card when that option is enabled.
 *
 * @private function of ControlPanelContent
 */
function createControlPanelLanguageSection({
    isAvailable,
    selectId,
    t,
    language,
    availableLanguages,
    onChange,
}: {
    readonly isAvailable: boolean;
    readonly selectId: string;
    readonly t: ControlPanelTranslator;
    readonly language: ControlPanelLanguage;
    readonly availableLanguages: ControlPanelAvailableLanguages;
    readonly onChange: (nextValue: string) => void;
}): ControlPanelSelectSectionState | null {
    if (!isAvailable) {
        return null;
    }

    return {
        title: t('controlPanel.languageTitle'),
        subtitle: t('controlPanel.languageSubtitle'),
        selectId,
        selectLabel: t('controlPanel.languageSelectLabel'),
        value: language,
        options: availableLanguages.map((languagePack) => ({
            value: languagePack.language,
            label: `${languagePack.nativeName} (${languagePack.englishName})`,
        })),
        helpText: t('controlPanel.languageHelp'),
        onChange,
    };
}

/**
 * Builds the state for the chat-visual-mode select card when that option is enabled.
 *
 * @private function of ControlPanelContent
 */
function createControlPanelChatVisualModeSection({
    isAvailable,
    selectId,
    t,
    chatVisualMode,
    onChange,
}: {
    readonly isAvailable: boolean;
    readonly selectId: string;
    readonly t: ControlPanelTranslator;
    readonly chatVisualMode: ChatVisualMode;
    readonly onChange: (nextValue: string) => void;
}): ControlPanelSelectSectionState | null {
    if (!isAvailable) {
        return null;
    }

    return {
        title: t('controlPanel.chatVisualModeTitle'),
        subtitle: t('controlPanel.chatVisualModeSubtitle'),
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
    };
}

/**
 * Builds the state consumed by the shared Enter-key settings panel.
 *
 * @private function of ControlPanelContent
 */
function createControlPanelChatEnterBehaviorSection({
    t,
    storedEnterBehavior,
    isLoading,
    isPersisting,
    onSelectBehavior,
}: {
    readonly t: ControlPanelTranslator;
    readonly storedEnterBehavior: ControlPanelStoredEnterBehavior;
    readonly isLoading: boolean;
    readonly isPersisting: boolean;
    readonly onSelectBehavior: (behavior: ControlPanelStoredEnterBehavior) => void;
}): ControlPanelContentState['chatEnterBehaviorSection'] {
    return {
        title: t('chatEnterBehavior.sectionTitle'),
        subtitle: t('chatEnterBehavior.sectionDescription'),
        storedEnterBehavior,
        isLoading,
        isPersisting,
        onSelectBehavior,
    };
}
