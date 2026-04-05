'use client';

import {
    Bell,
    EyeOff,
    Languages,
    MessageSquare,
    Settings2,
    Sparkles,
    SpeakerIcon,
    Vibrate,
    X,
    type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type RefObject } from 'react';
import { CHAT_VISUAL_MODES, type ChatVisualMode } from '../../../constants/chatVisualMode';
import { useChatVisualMode } from '../../ChatVisualMode/ChatVisualModeProvider';
import { confirmPrivateModeEnable } from '../../PrivateModePreferences/confirmPrivateModeEnable';
import { usePrivateModePreferences } from '../../PrivateModePreferences/PrivateModePreferencesProvider';
import { useBrowserPushNotifications } from '../../PushNotifications/BrowserPushNotificationsProvider';
import { useSelfLearningPreferences } from '../../SelfLearningPreferences/SelfLearningPreferencesProvider';
import { useMetadataFlags } from '../../MetadataFlags/MetadataFlagsContext';
import { useServerLanguage } from '../../ServerLanguage/ServerLanguageProvider';
import { useSoundSystem } from '../../SoundSystemProvider/SoundSystemProvider';

/**
 * Shared props used by every control panel presentation.
 */
type ControlPanelContentProps = {
    readonly title?: string;
    readonly subtitle?: string;
    readonly isMobile?: boolean;
};

/**
 * Visual emphasis variants shared by control-panel chips and tiles.
 */
type ControlPanelStatusTone = 'neutral' | 'informative' | 'positive' | 'danger';

/**
 * Tailwind classes used by status chips for each visual tone.
 */
const CONTROL_PANEL_STATUS_TONE_CLASS_MAP: Record<ControlPanelStatusTone, string> = {
    neutral: 'border-gray-200 bg-gray-50 text-gray-700',
    informative: 'border-blue-200 bg-blue-50 text-blue-700',
    positive: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    danger: 'border-rose-200 bg-rose-50 text-rose-700',
};

/**
 * Tone-specific styles used by compact control-center toggle tiles.
 */
type ControlPanelToggleToneClasses = {
    readonly activeSurface: string;
    readonly iconWrap: string;
    readonly switchTrack: string;
    readonly stateBadge: string;
};

/**
 * Lookup map of all tone-specific class groups for toggle tiles.
 */
const CONTROL_PANEL_TOGGLE_TONE_CLASS_MAP: Record<ControlPanelStatusTone, ControlPanelToggleToneClasses> = {
    neutral: {
        activeSurface: 'border-slate-300 bg-gradient-to-br from-slate-100 to-white text-slate-700',
        iconWrap: 'bg-slate-200 text-slate-700',
        switchTrack: 'bg-slate-500',
        stateBadge: 'border-slate-300 bg-white/85 text-slate-700',
    },
    informative: {
        activeSurface: 'border-blue-200 bg-gradient-to-br from-blue-100 via-white to-blue-50 text-blue-800',
        iconWrap: 'bg-blue-100 text-blue-700',
        switchTrack: 'bg-blue-500',
        stateBadge: 'border-blue-200 bg-blue-50 text-blue-700',
    },
    positive: {
        activeSurface:
            'border-emerald-200 bg-gradient-to-br from-emerald-100 via-white to-emerald-50 text-emerald-800',
        iconWrap: 'bg-emerald-100 text-emerald-700',
        switchTrack: 'bg-emerald-500',
        stateBadge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    danger: {
        activeSurface: 'border-rose-200 bg-gradient-to-br from-rose-100 via-white to-rose-50 text-rose-800',
        iconWrap: 'bg-rose-100 text-rose-700',
        switchTrack: 'bg-rose-500',
        stateBadge: 'border-rose-200 bg-rose-50 text-rose-700',
    },
};

/**
 * Props for one compact status chip in the control panel summary.
 */
type ControlPanelStatusBadgeProps = {
    readonly label: string;
    readonly tone: ControlPanelStatusTone;
};

/**
 * Renders one compact status chip summarizing current panel state.
 *
 * @private
 */
function ControlPanelStatusBadge({ label, tone }: ControlPanelStatusBadgeProps) {
    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${CONTROL_PANEL_STATUS_TONE_CLASS_MAP[tone]}`}
        >
            {label}
        </span>
    );
}

/**
 * Props for the visual switch displayed in each toggle tile.
 */
type ControlPanelToggleSwitchProps = {
    readonly isOn: boolean;
    readonly tone: ControlPanelStatusTone;
    readonly isDisabled?: boolean;
};

/**
 * Renders the compact switch indicator used by tile toggles.
 *
 * @private
 */
function ControlPanelToggleSwitch({ isOn, tone, isDisabled = false }: ControlPanelToggleSwitchProps) {
    const toneClasses = CONTROL_PANEL_TOGGLE_TONE_CLASS_MAP[tone];

    return (
        <span
            className={`inline-flex h-5 w-9 items-center rounded-full border p-[1px] transition ${
                isOn
                    ? `${toneClasses.switchTrack} border-transparent`
                    : 'border-gray-300 bg-gray-200'
            } ${isDisabled ? 'opacity-70' : ''}`}
            aria-hidden="true"
        >
            <span
                className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    isOn ? 'translate-x-4' : 'translate-x-0'
                }`}
            />
        </span>
    );
}

/**
 * Props for one compact toggle tile rendered inside the control-center grid.
 */
type ControlPanelToggleTileProps = {
    readonly icon: LucideIcon;
    readonly label: string;
    readonly description: string;
    readonly stateLabel: string;
    readonly isActive: boolean;
    readonly onToggle: () => void;
    readonly tone?: ControlPanelStatusTone;
    readonly isDisabled?: boolean;
    readonly auxiliaryDetail?: string;
    readonly columnSpan?: 1 | 2;
};

/**
 * Renders one visual toggle tile inspired by mobile control-center patterns.
 *
 * @private
 */
function ControlPanelToggleTile({
    icon: Icon,
    label,
    description,
    stateLabel,
    isActive,
    onToggle,
    tone = 'neutral',
    isDisabled = false,
    auxiliaryDetail,
    columnSpan = 1,
}: ControlPanelToggleTileProps) {
    const toneClasses = CONTROL_PANEL_TOGGLE_TONE_CLASS_MAP[tone];

    return (
        <button
            type="button"
            onClick={onToggle}
            aria-pressed={isActive}
            disabled={isDisabled}
            className={`flex min-h-[8.4rem] flex-col rounded-2xl border p-3 text-left shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                isActive
                    ? toneClasses.activeSurface
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            } ${isDisabled ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-[1px] hover:shadow-md'} ${
                columnSpan === 2 ? 'col-span-2' : ''
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${
                        isActive ? toneClasses.iconWrap : 'bg-gray-100 text-gray-500'
                    }`}
                >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                </span>

                <ControlPanelToggleSwitch isOn={isActive} tone={tone} isDisabled={isDisabled} />
            </div>

            <div className="mt-2 min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-gray-600">{description}</p>
                {auxiliaryDetail && <p className="mt-1 text-[10px] text-gray-500">{auxiliaryDetail}</p>}
            </div>

            <div className="mt-auto pt-2">
                <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
                        isActive ? toneClasses.stateBadge : 'border-gray-200 bg-gray-50 text-gray-500'
                    }`}
                >
                    {stateLabel}
                </span>
            </div>
        </button>
    );
}

/**
 * Arguments accepted by the shared local toggle-state hook.
 */
type UseControlPanelBooleanToggleProps = {
    readonly isAvailable: boolean;
    readonly resolveValue: () => boolean;
    readonly toggleValue: () => boolean;
};

/**
 * Local reactive state for one external boolean preference.
 */
type ControlPanelBooleanToggleState = {
    readonly isEnabled: boolean;
    readonly toggle: () => void;
};

/**
 * Bridges mutable external boolean preferences (sound/vibration) into React state.
 *
 * @private
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
 * Renders the compact control-center content used by desktop and mobile wrappers.
 *
 * @private
 */
function ControlPanelContent({ title, subtitle, isMobile = false }: ControlPanelContentProps) {
    const { controlPanelOptionAvailability } = useMetadataFlags();
    const { soundSystem } = useSoundSystem();
    const { chatVisualMode, setChatVisualMode } = useChatVisualMode();
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

    const isVibrationSupported =
        Boolean(soundSystem?.isVibrationEnabled) &&
        (Boolean(soundSystem?.toggleVibration) || Boolean(soundSystem?.setVibrationEnabled));

    const soundToggle = useControlPanelBooleanToggle({
        isAvailable: Boolean(soundSystem),
        resolveValue: useCallback(() => soundSystem?.isEnabled() ?? false, [soundSystem]),
        toggleValue: useCallback(() => soundSystem?.toggle() ?? false, [soundSystem]),
    });

    const vibrationToggle = useControlPanelBooleanToggle({
        isAvailable: isVibrationSupported,
        resolveValue: useCallback(() => soundSystem?.isVibrationEnabled?.() ?? false, [soundSystem]),
        toggleValue: useCallback(() => {
            if (typeof soundSystem?.toggleVibration === 'function') {
                return soundSystem.toggleVibration();
            }

            if (
                typeof soundSystem?.isVibrationEnabled === 'function' &&
                typeof soundSystem?.setVibrationEnabled === 'function'
            ) {
                const nextState = !soundSystem.isVibrationEnabled();
                soundSystem.setVibrationEnabled(nextState);
                return nextState;
            }

            return false;
        }, [soundSystem]),
    });

    const toggleSelfLearning = useCallback(() => {
        setIsSelfLearningEnabled((value) => !value);
    }, [setIsSelfLearningEnabled]);

    const togglePrivateMode = useCallback(async () => {
        if (isPrivateModeEnabled) {
            setIsPrivateModeEnabled(false);
            return;
        }

        const isConfirmed = await confirmPrivateModeEnable(t);
        if (!isConfirmed) {
            return;
        }

        setIsPrivateModeEnabled(true);
    }, [isPrivateModeEnabled, setIsPrivateModeEnabled, t]);

    useEffect(() => {
        if (isPrivateModeEnabled && isSelfLearningEnabled) {
            setIsSelfLearningEnabled(false);
        }
    }, [isPrivateModeEnabled, isSelfLearningEnabled, setIsSelfLearningEnabled]);

    const selfLearningStateLabel = isPrivateModeEnabled
        ? t('controlPanel.selfLearningStateDisabledPrivate')
        : isSelfLearningEnabled
          ? t('controlPanel.selfLearningStateLearning')
          : t('controlPanel.selfLearningStatePaused');
    const selfLearningDescription = isPrivateModeEnabled
        ? t('controlPanel.selfLearningDescriptionPrivate')
        : isSelfLearningEnabled
          ? t('controlPanel.selfLearningDescriptionLearning')
          : t('controlPanel.selfLearningDescriptionPaused');
    const privateStateLabel = isPrivateModeEnabled
        ? t('controlPanel.privateModeStatePrivate')
        : t('controlPanel.privateModeStateStandard');
    const privateDescription = isPrivateModeEnabled
        ? t('controlPanel.privateModeDescriptionPrivate')
        : t('controlPanel.privateModeDescriptionStandard');
    const activeLanguageName =
        availableLanguages.find((languagePack) => languagePack.language === language)?.nativeName || language;
    const activeChatVisualModeLabel =
        chatVisualMode === CHAT_VISUAL_MODES.ARTICLE_MODE
            ? t('controlPanel.chatVisualModeOptionArticle')
            : t('controlPanel.chatVisualModeOptionBubble');
    const areNotificationsAvailable = isNotificationsSupported && isNotificationsConfigured;
    const notificationsPermissionLabel = !isNotificationsConfigured
        ? t('controlPanel.notificationsPermissionUnavailable')
        : notificationPermission === 'granted'
          ? t('controlPanel.notificationsPermissionGranted')
          : notificationPermission === 'denied'
            ? t('controlPanel.notificationsPermissionDenied')
            : notificationPermission === 'unsupported'
              ? t('controlPanel.notificationsPermissionUnsupported')
              : t('controlPanel.notificationsPermissionDefault');
    const notificationsStateLabel = isNotificationsEnabled
        ? t('controlPanel.notificationsStateEnabled')
        : t('controlPanel.notificationsStateDisabled');
    const notificationsDescription = !areNotificationsAvailable
        ? t('controlPanel.notificationsDescriptionUnavailable')
        : isNotificationsEnabled
          ? t('controlPanel.notificationsDescriptionEnabled')
          : t('controlPanel.notificationsDescriptionDisabled');
    const notificationsStateTone: ControlPanelStatusTone = !areNotificationsAvailable
        ? 'neutral'
        : notificationPermission === 'denied'
          ? 'danger'
          : isNotificationsEnabled
            ? 'positive'
            : 'informative';

    const feedbackTitle = title || t('controlPanel.feedbackTitle');
    const feedbackSubtitle = subtitle || t('controlPanel.feedbackSubtitle');
    const genericEnabledLabel = t('controlPanel.notificationsStateEnabled');
    const genericDisabledLabel = t('controlPanel.notificationsStateDisabled');
    const soundStateLabel = soundToggle.isEnabled ? genericEnabledLabel : genericDisabledLabel;
    const vibrationStateLabel = vibrationToggle.isEnabled ? genericEnabledLabel : genericDisabledLabel;
    const summaryBadges = (
        [
            {
                key: 'private-mode',
                isAvailable: controlPanelOptionAvailability.privateMode,
                tone: isPrivateModeEnabled ? 'danger' : 'positive',
                label: privateStateLabel,
            },
            {
                key: 'self-learning',
                isAvailable: controlPanelOptionAvailability.selfLearning,
                tone: isPrivateModeEnabled ? 'neutral' : isSelfLearningEnabled ? 'positive' : 'informative',
                label: selfLearningStateLabel,
            },
            {
                key: 'notifications',
                isAvailable: controlPanelOptionAvailability.notifications,
                tone: notificationsStateTone,
                label: notificationsStateLabel,
            },
            {
                key: 'sound',
                isAvailable: controlPanelOptionAvailability.sound,
                tone: soundToggle.isEnabled ? 'positive' : 'neutral',
                label: soundStateLabel,
            },
            {
                key: 'language',
                isAvailable: controlPanelOptionAvailability.language,
                tone: 'neutral',
                label: activeLanguageName,
            },
            {
                key: 'chat-visual-mode',
                isAvailable: controlPanelOptionAvailability.chatVisualMode,
                tone: 'informative',
                label: activeChatVisualModeLabel,
            },
        ] satisfies Array<ControlPanelStatusBadgeProps & { key: string; isAvailable: boolean }>
    ).flatMap(({ isAvailable, ...badge }) => (isAvailable ? [badge] : []));
    const toggleTiles = (
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
                description: notificationsDescription,
                auxiliaryDetail: `${t('controlPanel.notificationsPermissionLabel')} ${notificationsPermissionLabel}`,
                stateLabel: notificationsStateLabel,
                isActive: isNotificationsEnabled,
                onToggle: () => {
                    void setNotificationsEnabled(!isNotificationsEnabled);
                },
                tone: notificationsStateTone,
                isDisabled:
                    isNotificationsLoading ||
                    isNotificationsPersisting ||
                    (!areNotificationsAvailable && !isNotificationsEnabled),
            },
            {
                key: 'self-learning',
                isAvailable: controlPanelOptionAvailability.selfLearning,
                icon: Sparkles,
                label: t('controlPanel.selfLearningTitle'),
                description: selfLearningDescription,
                stateLabel: selfLearningStateLabel,
                isActive: isSelfLearningEnabled && !isPrivateModeEnabled,
                onToggle: toggleSelfLearning,
                tone: isPrivateModeEnabled ? 'neutral' : isSelfLearningEnabled ? 'positive' : 'informative',
                isDisabled: isPrivateModeEnabled,
            },
            {
                key: 'private-mode',
                isAvailable: controlPanelOptionAvailability.privateMode,
                icon: EyeOff,
                label: t('controlPanel.privateModeTitle'),
                description: privateDescription,
                stateLabel: privateStateLabel,
                isActive: isPrivateModeEnabled,
                onToggle: () => {
                    void togglePrivateMode();
                },
                tone: isPrivateModeEnabled ? 'danger' : 'positive',
                columnSpan: 2,
            },
        ] satisfies Array<ControlPanelToggleTileProps & { key: string; isAvailable: boolean }>
    ).flatMap(({ isAvailable, ...tile }) => (isAvailable ? [tile] : []));
    const isAudioLoadingHintVisible =
        (controlPanelOptionAvailability.sound || controlPanelOptionAvailability.vibration) && !soundSystem;

    return (
        <div className={`space-y-2 ${isMobile ? 'pt-0.5' : ''}`}>
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-100/90 via-white to-blue-50 p-2.5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className="text-xs font-semibold text-slate-700">{feedbackTitle}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">{feedbackSubtitle}</p>
                    </div>
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/95 text-blue-600 shadow-sm">
                        <Settings2 className="h-4 w-4" aria-hidden="true" />
                    </span>
                </div>

                {summaryBadges.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {summaryBadges.map(({ key, tone, label }) => (
                            <ControlPanelStatusBadge key={key} tone={tone} label={label} />
                        ))}
                    </div>
                )}
            </div>

            {toggleTiles.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                    {toggleTiles.map(({ key, ...tileProps }) => (
                        <ControlPanelToggleTile key={key} {...tileProps} />
                    ))}
                </div>
            )}

            {controlPanelOptionAvailability.language && (
                <section className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{t('controlPanel.languageTitle')}</p>
                            <p className="mt-0.5 text-[11px] text-gray-600">{t('controlPanel.languageSubtitle')}</p>
                        </div>
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                            <Languages className="h-4 w-4" aria-hidden="true" />
                        </span>
                    </div>

                    <div className="mt-2.5 space-y-1.5">
                        <label htmlFor={languageSelectId} className="text-xs font-medium text-gray-600">
                            {t('controlPanel.languageSelectLabel')}
                        </label>
                        <select
                            id={languageSelectId}
                            value={language}
                            onChange={(event) => setLanguage(event.target.value as typeof language)}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                            {availableLanguages.map((languagePack) => (
                                <option key={languagePack.language} value={languagePack.language}>
                                    {languagePack.nativeName} ({languagePack.englishName})
                                </option>
                            ))}
                        </select>
                        <p className="text-[11px] text-gray-500">{t('controlPanel.languageHelp')}</p>
                    </div>
                </section>
            )}

            {controlPanelOptionAvailability.chatVisualMode && (
                <section className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">
                                {t('controlPanel.chatVisualModeTitle')}
                            </p>
                            <p className="mt-0.5 text-[11px] text-gray-600">{t('controlPanel.chatVisualModeSubtitle')}</p>
                        </div>
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                            <MessageSquare className="h-4 w-4" aria-hidden="true" />
                        </span>
                    </div>

                    <div className="mt-2.5 space-y-1.5">
                        <label htmlFor={chatVisualModeSelectId} className="text-xs font-medium text-gray-600">
                            {t('controlPanel.chatVisualModeSelectLabel')}
                        </label>
                        <select
                            id={chatVisualModeSelectId}
                            value={chatVisualMode}
                            onChange={(event) => setChatVisualMode(event.target.value as ChatVisualMode)}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                            <option value={CHAT_VISUAL_MODES.BUBBLE_MODE}>
                                {t('controlPanel.chatVisualModeOptionBubble')}
                            </option>
                            <option value={CHAT_VISUAL_MODES.ARTICLE_MODE}>
                                {t('controlPanel.chatVisualModeOptionArticle')}
                            </option>
                        </select>
                        <p className="text-[11px] text-gray-500">{t('controlPanel.chatVisualModeHelp')}</p>
                    </div>
                </section>
            )}

            {isAudioLoadingHintVisible && <p className="px-1 text-[11px] text-gray-500">{t('controlPanel.audioLoading')}</p>}
        </div>
    );
}

/**
 * Closes the dropdown when the user clicks outside or presses Escape.
 *
 * @private
 */
function useHideOnClickOutside(
    ref: RefObject<HTMLElement | null>,
    toggleRef: RefObject<HTMLElement | null>,
    onClose: () => void,
) {
    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            if (
                ref.current &&
                !ref.current.contains(event.target as Node) &&
                toggleRef.current &&
                !toggleRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        };

        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleEsc);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [ref, toggleRef, onClose]);
}

/**
 * Dropdown button next to the profile controls that exposes the global panel.
 *
 * @private
 */
export function HeaderControlPanelDropdown() {
    const { t } = useServerLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const panelId = useId();

    const handleClose = useCallback(() => {
        setIsOpen(false);
    }, []);

    useHideOnClickOutside(dropdownRef, buttonRef, handleClose);

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen((value) => !value)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                aria-haspopup="dialog"
                aria-label={t('controlPanel.openAriaLabel')}
                className={`rounded-full border p-2 text-gray-600 shadow-sm shadow-black/5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                    isOpen
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-transparent bg-white/70 hover:bg-white hover:text-gray-900'
                }`}
            >
                <Settings2 className="h-5 w-5" />
                <span className="sr-only">{t('controlPanel.label')}</span>
            </button>

            {isOpen && (
                <div
                    id={panelId}
                    ref={dropdownRef}
                    role="dialog"
                    aria-label={t('controlPanel.label')}
                    className="absolute right-0 top-full z-50 mt-2 w-[22rem] max-w-[calc(100vw-0.75rem)] rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-100/80 p-2 shadow-2xl shadow-black/10"
                >
                    <div className="flex items-center justify-between px-1 pb-2 pt-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {t('controlPanel.label')}
                        </p>
                        <button
                            type="button"
                            onClick={handleClose}
                            aria-label={t('common.close')}
                            className="rounded-full border border-transparent p-1 text-gray-400 transition hover:border-gray-200 hover:bg-white hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    <div className="max-h-[min(74vh,34rem)] overflow-y-auto overscroll-contain px-0.5 pb-0.5 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                        <ControlPanelContent />
                    </div>
                </div>
            )}
        </div>
    );
}
