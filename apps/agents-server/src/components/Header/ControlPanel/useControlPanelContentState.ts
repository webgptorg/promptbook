'use client';

import { type ChatVisualMode } from '../../../constants/chatVisualMode';
import { useCallback, useEffect, useId } from 'react';
import { useChatEnterBehaviorPreferences } from '../../ChatEnterBehavior/ChatEnterBehaviorPreferencesProvider';
import { useChatVisualMode } from '../../ChatVisualMode/ChatVisualModeProvider';
import { useMetadataFlags } from '../../MetadataFlags/MetadataFlagsContext';
import { usePrivateModePreferences } from '../../PrivateModePreferences/PrivateModePreferencesProvider';
import { useBrowserPushNotifications } from '../../PushNotifications/BrowserPushNotificationsProvider';
import { useSelfLearningPreferences } from '../../SelfLearningPreferences/SelfLearningPreferencesProvider';
import { useServerLanguage } from '../../ServerLanguage/ServerLanguageProvider';
import type {
    ControlPanelContentState,
    ControlPanelContentStateProps,
    ControlPanelStoredEnterBehavior,
} from './ControlPanelContentState';
import { createControlPanelContentState } from './createControlPanelContentState';
import { toggleControlPanelPrivateMode } from './toggleControlPanelPrivateMode';
import { useControlPanelAudioState } from './useControlPanelAudioState';

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
    const { soundSystem, isVibrationSupported, soundToggle, vibrationToggle } = useControlPanelAudioState();

    const languageSelectId = useId();
    const chatVisualModeSelectId = useId();

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

    return createControlPanelContentState({
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
        onToggleNotifications: toggleNotifications,
        onToggleSelfLearning: toggleSelfLearning,
        onTogglePrivateMode: togglePrivateMode,
        languageSelectId,
        language,
        availableLanguages,
        onLanguageChange: handleLanguageChange,
        chatVisualModeSelectId,
        chatVisualMode,
        onChatVisualModeChange: handleChatVisualModeChange,
        storedEnterBehavior,
        isEnterBehaviorLoading,
        isEnterBehaviorPersisting,
        onEnterBehaviorChange: handleEnterBehaviorChange,
    });
}
