import type { LucideIcon } from 'lucide-react';
import type { useChatEnterBehaviorPreferences } from '../../ChatEnterBehavior/ChatEnterBehaviorPreferencesProvider';
import type { useMetadataFlags } from '../../MetadataFlags/MetadataFlagsContext';
import type { useBrowserPushNotifications } from '../../PushNotifications/BrowserPushNotificationsProvider';
import type { useServerLanguage } from '../../ServerLanguage/ServerLanguageProvider';
import type { useSoundSystem } from '../../SoundSystemProvider/SoundSystemProvider';
import type { useThemeMode } from '../../ThemeMode/ThemeModeProvider';

/**
 * Props accepted by `useControlPanelContentState`.
 *
 * @private function of ControlPanelContent
 */
export type ControlPanelContentStateProps = {
    readonly title?: string;
    readonly subtitle?: string;
};

/**
 * Shared sound-system type used by the control-panel sound helpers.
 *
 * @private function of ControlPanelContent
 */
export type ControlPanelSoundSystem = ReturnType<typeof useSoundSystem>['soundSystem'];

/**
 * Translation helper used across control-panel state builders.
 *
 * @private function of ControlPanelContent
 */
export type ControlPanelTranslator = ReturnType<typeof useServerLanguage>['t'];

/**
 * Stored Enter-key preference shape used by the control panel.
 *
 * @private function of ControlPanelContent
 */
export type ControlPanelStoredEnterBehavior = ReturnType<typeof useChatEnterBehaviorPreferences>['storedEnterBehavior'];

/**
 * Visibility flags for individual control-panel options.
 *
 * @private function of ControlPanelContent
 */
export type ControlPanelOptionAvailability = ReturnType<typeof useMetadataFlags>['controlPanelOptionAvailability'];

/**
 * Browser notification permission shape used by the control panel.
 *
 * @private function of ControlPanelContent
 */
export type ControlPanelNotificationPermission = ReturnType<typeof useBrowserPushNotifications>['permission'];

/**
 * Shared language identifier shape used by the control panel.
 *
 * @private function of ControlPanelContent
 */
export type ControlPanelLanguage = ReturnType<typeof useServerLanguage>['language'];

/**
 * Shared list of language options exposed by the server-language provider.
 *
 * @private function of ControlPanelContent
 */
export type ControlPanelAvailableLanguages = ReturnType<typeof useServerLanguage>['availableLanguages'];

/**
 * Shared theme-mode identifier shape used by the control panel.
 *
 * @private function of ControlPanelContent
 */
export type ControlPanelThemeMode = ReturnType<typeof useThemeMode>['themeMode'];

/**
 * Visual emphasis variants shared by control-panel chips and tiles.
 *
 * @private function of ControlPanelContent
 */
export type ControlPanelStatusTone = 'neutral' | 'informative' | 'positive' | 'danger';

/**
 * Shared presentation state for a binary control-panel preference.
 *
 * @private function of ControlPanelContent
 */
export type ControlPanelPreferenceState = {
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
export type ControlPanelNotificationState = ControlPanelPreferenceState & {
    readonly isAvailable: boolean;
    readonly permissionDetail: string;
};

/**
 * Summary chip state rendered in the control-panel hero card.
 *
 * @private function of ControlPanelContent
 */
export type ControlPanelSummaryBadge = {
    readonly key: string;
    readonly label: string;
    readonly tone: ControlPanelStatusTone;
};

/**
 * One toggle tile rendered inside the compact control-center grid.
 *
 * @private function of ControlPanelContent
 */
export type ControlPanelToggleTileState = {
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
export type ControlPanelSelectSectionState = {
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
export type ControlPanelEnterBehaviorSectionState = {
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
export type ControlPanelContentState = {
    readonly feedbackTitle: string;
    readonly feedbackSubtitle: string;
    readonly summaryBadges: ReadonlyArray<ControlPanelSummaryBadge>;
    readonly toggleTiles: ReadonlyArray<ControlPanelToggleTileState>;
    readonly themeSection: ControlPanelSelectSectionState;
    readonly languageSection: ControlPanelSelectSectionState | null;
    readonly chatVisualModeSection: ControlPanelSelectSectionState | null;
    readonly chatEnterBehaviorSection: ControlPanelEnterBehaviorSectionState;
    readonly isAudioLoadingHintVisible: boolean;
    readonly audioLoadingLabel: string;
};
