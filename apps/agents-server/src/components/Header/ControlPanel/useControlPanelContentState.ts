'use client';

import { Bell, EyeOff, Sparkles, SpeakerIcon, Vibrate, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';
import { CHAT_VISUAL_MODES, type ChatVisualMode } from '../../../constants/chatVisualMode';
import { useChatEnterBehaviorPreferences } from '../../ChatEnterBehavior/ChatEnterBehaviorPreferencesProvider';
import { getChatEnterBehaviorStateLabel } from '../../ChatEnterBehavior/chatEnterBehaviorTranslations';
import { useChatVisualMode } from '../../ChatVisualMode/ChatVisualModeProvider';
import { useMetadataFlags } from '../../MetadataFlags/MetadataFlagsContext';
import { confirmPrivateModeEnable } from '../../PrivateModePreferences/confirmPrivateModeEnable';
import { usePrivateModePreferences } from '../../PrivateModePreferences/PrivateModePreferencesProvider';
import { useBrowserPushNotifications } from '../../PushNotifications/BrowserPushNotificationsProvider';
import { useSelfLearningPreferences } from '../../SelfLearningPreferences/SelfLearningPreferencesProvider';
import { useServerLanguage } from '../../ServerLanguage/ServerLanguageProvider';
import { useSoundSystem } from '../../SoundSystemProvider/SoundSystemProvider';

/**
 * Props accepted by `useControlPanelContentState`.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelContentStateProps = {
    readonly title?: string;
    readonly subtitle?: string;
};

/**
 * Shared sound-system type used by the control-panel sound helpers.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelSoundSystem = ReturnType<typeof useSoundSystem>['soundSystem'];

/**
 * Translation helper used across control-panel state builders.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelTranslator = ReturnType<typeof useServerLanguage>['t'];

/**
 * Stored Enter-key preference shape used by the control panel.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelStoredEnterBehavior = ReturnType<typeof useChatEnterBehaviorPreferences>['storedEnterBehavior'];

/**
 * Visibility flags for individual control-panel options.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelOptionAvailability = ReturnType<typeof useMetadataFlags>['controlPanelOptionAvailability'];

/**
 * Visual emphasis variants shared by control-panel chips and tiles.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelStatusTone = 'neutral' | 'informative' | 'positive' | 'danger';

/**
 * Shared presentation state for a binary control-panel preference.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelPreferenceState = {
    readonly description: string;
    readonly isActive: boolean;
    readonly isDisabled?: boolean;
    readonly stateLabel: string;
    readonly tone: ControlPanelStatusTone;
};

/**
 * Presentation state for the notifications control, including permission detail.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelNotificationState = ControlPanelPreferenceState & {
    readonly isAvailable: boolean;
    readonly permissionDetail: string;
};

/**
 * Summary chip state rendered in the control-panel hero card.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelSummaryBadge = {
    readonly key: string;
    readonly label: string;
    readonly tone: ControlPanelStatusTone;
};

/**
 * One toggle tile rendered inside the compact control-center grid.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelToggleTileState = {
    readonly key: string;
    readonly icon: LucideIcon;
    readonly label: string;
    readonly description: string;
    readonly stateLabel: string;
    readonly isActive: boolean;
    readonly onToggle: () => void;
    readonly tone: ControlPanelStatusTone;
    readonly isDisabled?: boolean;
    readonly auxiliaryDetail?: string;
    readonly columnSpan?: 1 | 2;
};

/**
 * Shared select-card state used by the language and chat-visual-mode sections.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelSelectSectionState = {
    readonly title: string;
    readonly subtitle: string;
    readonly selectId: string;
    readonly selectLabel: string;
    readonly value: string;
    readonly options: ReadonlyArray<{
        readonly value: string;
        readonly label: string;
    }>;
    readonly helpText: string;
    readonly onChange: (nextValue: string) => void;
};

/**
 * Enter-key picker state consumed by `ChatEnterBehaviorSettingsPanel`.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelEnterBehaviorSectionState = {
    readonly title: string;
    readonly subtitle: string;
    readonly storedEnterBehavior: ControlPanelStoredEnterBehavior;
    readonly isLoading: boolean;
    readonly isPersisting: boolean;
    readonly onSelectBehavior: (behavior: ControlPanelStoredEnterBehavior) => void;
};

/**
 * Aggregated presentation state returned to `ControlPanelContent`.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelContentState = {
    readonly feedbackTitle: string;
    readonly feedbackSubtitle: string;
    readonly summaryBadges: ReadonlyArray<ControlPanelSummaryBadge>;
    readonly toggleTiles: ReadonlyArray<ControlPanelToggleTileState>;
    readonly languageSection: ControlPanelSelectSectionState | null;
    readonly chatVisualModeSection: ControlPanelSelectSectionState | null;
    readonly chatEnterBehaviorSection: ControlPanelEnterBehaviorSectionState;
    readonly isAudioLoadingHintVisible: boolean;
    readonly audioLoadingLabel: string;
};

/**
 * Arguments accepted by the shared local toggle-state hook.
 *
 * @private function of ControlPanelContent
 */
type UseControlPanelBooleanToggleProps = {
    readonly isAvailable: boolean;
    readonly resolveValue: () => boolean;
    readonly toggleValue: () => boolean;
};

/**
 * Local reactive state for one external boolean preference.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelBooleanToggleState = {
    readonly isEnabled: boolean;
    readonly toggle: () => void;
};

/**
 * Bridges mutable external boolean preferences (sound/vibration) into React state.
 *
 * @private function of ControlPanelContent
 */
function useControlPanelBooleanToggle({
    isAvailable,
    resolveValue,
    toggleValue,
}: UseControlPanelBooleanToggleProps): ControlPanelBooleanToggleState {
    const [isEnabled, setIsEnabled] = useState<boolean>(() => (isAvailable ? resolveValue() : false));

    useEffect(() => {
        setIsEnabled(isAvailable ? resolveValue() : false);
    }, [isAvailable, resolveValue]);

    const toggle = useCallback(() => {
        if (!isAvailable) {
            return;
        }

        const nextValue = toggleValue();
        setIsEnabled(nextValue);
    }, [isAvailable, toggleValue]);

    return { isEnabled, toggle };
}

/**
 * Determines whether the active sound system exposes vibration controls.
 *
 * @private function of ControlPanelContent
 */
function isControlPanelVibrationSupported(soundSystem: ControlPanelSoundSystem): boolean {
    return (
        typeof soundSystem?.isVibrationEnabled === 'function' &&
        (typeof soundSystem.toggleVibration === 'function' || typeof soundSystem.setVibrationEnabled === 'function')
    );
}

/**
 * Toggles vibration using whichever sound-system API is available.
 *
 * @private function of ControlPanelContent
 */
function toggleControlPanelVibration(soundSystem: ControlPanelSoundSystem): boolean {
    if (typeof soundSystem?.toggleVibration === 'function') {
        return soundSystem.toggleVibration();
    }

    if (
        typeof soundSystem?.isVibrationEnabled === 'function' &&
        typeof soundSystem.setVibrationEnabled === 'function'
    ) {
        const nextState = !soundSystem.isVibrationEnabled();
        soundSystem.setVibrationEnabled(nextState);
        return nextState;
    }

    return false;
}

/**
 * Prompts once before enabling private mode and disables it immediately when toggled off.
 *
 * @private function of ControlPanelContent
 */
async function toggleControlPanelPrivateMode({
    isPrivateModeEnabled,
    setIsPrivateModeEnabled,
    t,
}: {
    readonly isPrivateModeEnabled: boolean;
    readonly setIsPrivateModeEnabled: (isEnabled: boolean) => void;
    readonly t: ControlPanelTranslator;
}) {
    if (isPrivateModeEnabled) {
        setIsPrivateModeEnabled(false);
        return;
    }

    const isConfirmed = await confirmPrivateModeEnable(t);
    if (!isConfirmed) {
        return;
    }

    setIsPrivateModeEnabled(true);
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
        readonly permission: ReturnType<typeof useBrowserPushNotifications>['permission'];
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
        readonly permission: ReturnType<typeof useBrowserPushNotifications>['permission'];
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
    availableLanguages: ReturnType<typeof useServerLanguage>['availableLanguages'],
    language: ReturnType<typeof useServerLanguage>['language'],
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
    readonly language: ReturnType<typeof useServerLanguage>['language'];
    readonly availableLanguages: ReturnType<typeof useServerLanguage>['availableLanguages'];
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
}): ControlPanelEnterBehaviorSectionState {
    return {
        title: t('chatEnterBehavior.sectionTitle'),
        subtitle: t('chatEnterBehavior.sectionDescription'),
        storedEnterBehavior,
        isLoading,
        isPersisting,
        onSelectBehavior,
    };
}

/**
 * Collects all control-panel state and precomputes the view model used by `ControlPanelContent`.
 *
 * @private function of ControlPanelContent
 */
export function useControlPanelContentState({
    title,
    subtitle,
}: ControlPanelContentStateProps): ControlPanelContentState {
    const { controlPanelOptionAvailability } = useMetadataFlags();
    const { soundSystem } = useSoundSystem();
    const { chatVisualMode, setChatVisualMode } = useChatVisualMode();
    const {
        storedEnterBehavior,
        isLoading: isEnterBehaviorLoading,
        isPersisting: isEnterBehaviorPersisting,
        setStoredEnterBehavior,
    } = useChatEnterBehaviorPreferences();
    const { language, setLanguage, availableLanguages, t } = useServerLanguage();
    const { isSelfLearningEnabled, setIsSelfLearningEnabled } = useSelfLearningPreferences();
    const { isPrivateModeEnabled, setIsPrivateModeEnabled } = usePrivateModePreferences();
    const {
        isConfigured: isNotificationsConfigured,
        isLoading: isNotificationsLoading,
        isPersisting: isNotificationsPersisting,
        isSupported: isNotificationsSupported,
        isEnabled: isNotificationsEnabled,
        permission: notificationPermission,
        setNotificationsEnabled,
    } = useBrowserPushNotifications();

    const languageSelectId = useId();
    const chatVisualModeSelectId = useId();
    const isVibrationSupported = isControlPanelVibrationSupported(soundSystem);

    const soundToggle = useControlPanelBooleanToggle({
        isAvailable: Boolean(soundSystem),
        resolveValue: useCallback(() => soundSystem?.isEnabled() ?? false, [soundSystem]),
        toggleValue: useCallback(() => soundSystem?.toggle() ?? false, [soundSystem]),
    });

    const vibrationToggle = useControlPanelBooleanToggle({
        isAvailable: isVibrationSupported,
        resolveValue: useCallback(() => soundSystem?.isVibrationEnabled?.() ?? false, [soundSystem]),
        toggleValue: useCallback(() => toggleControlPanelVibration(soundSystem), [soundSystem]),
    });

    const handleLanguageChange = useCallback(
        (nextLanguage: string) => {
            setLanguage(nextLanguage as typeof language);
        },
        [setLanguage],
    );

    const handleChatVisualModeChange = useCallback(
        (nextChatVisualMode: string) => {
            setChatVisualMode(nextChatVisualMode as ChatVisualMode);
        },
        [setChatVisualMode],
    );

    const handleEnterBehaviorChange = useCallback(
        (behavior: ControlPanelStoredEnterBehavior) => {
            void setStoredEnterBehavior(behavior);
        },
        [setStoredEnterBehavior],
    );

    const toggleSelfLearning = useCallback(() => {
        setIsSelfLearningEnabled((value) => !value);
    }, [setIsSelfLearningEnabled]);

    const togglePrivateMode = useCallback(() => {
        void toggleControlPanelPrivateMode({
            isPrivateModeEnabled,
            setIsPrivateModeEnabled,
            t,
        });
    }, [isPrivateModeEnabled, setIsPrivateModeEnabled, t]);

    const toggleNotifications = useCallback(() => {
        void setNotificationsEnabled(!isNotificationsEnabled);
    }, [isNotificationsEnabled, setNotificationsEnabled]);

    useEffect(() => {
        if (isPrivateModeEnabled && isSelfLearningEnabled) {
            setIsSelfLearningEnabled(false);
        }
    }, [isPrivateModeEnabled, isSelfLearningEnabled, setIsSelfLearningEnabled]);

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
            onToggleNotifications: toggleNotifications,
            selfLearningState,
            onToggleSelfLearning: toggleSelfLearning,
            privateModeState,
            onTogglePrivateMode: togglePrivateMode,
            t,
        }),
        languageSection: createControlPanelLanguageSection({
            isAvailable: controlPanelOptionAvailability.language,
            selectId: languageSelectId,
            t,
            language,
            availableLanguages,
            onChange: handleLanguageChange,
        }),
        chatVisualModeSection: createControlPanelChatVisualModeSection({
            isAvailable: controlPanelOptionAvailability.chatVisualMode,
            selectId: chatVisualModeSelectId,
            t,
            chatVisualMode,
            onChange: handleChatVisualModeChange,
        }),
        chatEnterBehaviorSection: createControlPanelChatEnterBehaviorSection({
            t,
            storedEnterBehavior,
            isLoading: isEnterBehaviorLoading,
            isPersisting: isEnterBehaviorPersisting,
            onSelectBehavior: handleEnterBehaviorChange,
        }),
        isAudioLoadingHintVisible:
            (controlPanelOptionAvailability.sound || controlPanelOptionAvailability.vibration) && !soundSystem,
        audioLoadingLabel: t('controlPanel.audioLoading'),
    };
}
