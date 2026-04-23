import type { LucideIcon } from 'lucide-react';
import type { useChatEnterBehaviorPreferences } from '../../ChatEnterBehavior/ChatEnterBehaviorPreferencesProvider';
import type { useMetadataFlags } from '../../MetadataFlags/MetadataFlagsContext';
import type { useBrowserPushNotifications } from '../../PushNotifications/BrowserPushNotificationsProvider';
import type { useServerLanguage } from '../../ServerLanguage/ServerLanguageProvider';
import type { useSoundSystem } from '../../SoundSystemProvider/SoundSystemProvider';
import type { useThemeMode } from '../../ThemeMode/ThemeModeProvider';

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
 * One selectable option displayed inside a compact control-panel tile.
 *
 * @private function of ControlPanelContent
 */
export type ControlPanelSelectOptionState = {
    readonly value: string;
    readonly label: string;
};

/**
 * Shared base state rendered by every tile inside the control-panel grid.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelTileStateBase = {
    readonly key: string;
    readonly icon: LucideIcon;
    readonly title: string;
    readonly description: string;
    readonly tone: ControlPanelStatusTone;
    readonly columnSpan?: 1 | 2;
};

/**
 * One toggle tile rendered inside the compact control-center grid.
 *
 * @private function of ControlPanelContent
 */
export type ControlPanelToggleTileState = ControlPanelTileStateBase & {
    readonly kind: 'toggle';
    readonly stateLabel: string;
    readonly isActive: boolean;
    readonly onToggle: () => void;
    readonly isDisabled?: boolean;
    readonly auxiliaryDetail?: string;
};

/**
 * One select-based tile used by appearance, language, and keybinding controls.
 *
 * @private function of ControlPanelContent
 */
export type ControlPanelSelectTileState = ControlPanelTileStateBase & {
    readonly kind: 'select';
    readonly stateLabel: string;
    readonly selectId: string;
    readonly selectLabel: string;
    readonly value: string;
    readonly options: ReadonlyArray<ControlPanelSelectOptionState>;
    readonly helpText: string;
    readonly onChange: (nextValue: string) => void;
    readonly isDisabled?: boolean;
};

/**
 * One tile rendered by the unified control-panel grid.
 *
 * @private function of ControlPanelContent
 */
export type ControlPanelTileState = ControlPanelToggleTileState | ControlPanelSelectTileState;

/**
 * Aggregated presentation state returned to `ControlPanelContent`.
 *
 * @private function of ControlPanelContent
 */
export type ControlPanelContentState = {
    readonly tiles: ReadonlyArray<ControlPanelTileState>;
    readonly isAudioLoadingHintVisible: boolean;
    readonly audioLoadingLabel: string;
};
