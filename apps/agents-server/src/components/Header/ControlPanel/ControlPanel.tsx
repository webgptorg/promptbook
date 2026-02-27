'use client';

import { ChatSoundAndVibrationPanel } from '@promptbook-local/components';
import { EyeOff, Languages, Settings2, SpeakerIcon, Sparkles, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { confirmPrivateModeEnable } from '../../PrivateModePreferences/confirmPrivateModeEnable';
import { usePrivateModePreferences } from '../../PrivateModePreferences/PrivateModePreferencesProvider';
import { useSelfLearningPreferences } from '../../SelfLearningPreferences/SelfLearningPreferencesProvider';
import { useServerLanguage } from '../../ServerLanguage/ServerLanguageProvider';
import { useSoundSystem } from '../../SoundSystemProvider/SoundSystemProvider';
import { ArrowIcon } from '../../_utils/ArrowIcon';

/**
 * Shared props used by every control panel presentation.
 */
type ControlPanelContentProps = {
    readonly title?: string;
    readonly subtitle?: string;
    readonly isMobile?: boolean;
};

/**
 * Visual emphasis variants for compact control-panel status chips.
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
 * Props for one compact status chip in the control panel header.
 */
type ControlPanelStatusBadgeProps = {
    readonly label: string;
    readonly tone: ControlPanelStatusTone;
};

/**
 * Renders one compact status chip summarizing key panel state.
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
 * Shared card shell used by each control panel section.
 */
type ControlPanelSectionCardProps = {
    readonly icon: LucideIcon;
    readonly title: string;
    readonly sectionLabel: string;
    readonly description: string;
    readonly children: ReactNode;
};

/**
 * Renders one visually consistent settings section card.
 *
 * @private
 */
function ControlPanelSectionCard({
    icon: Icon,
    title,
    sectionLabel,
    description,
    children,
}: ControlPanelSectionCardProps) {
    return (
        <section className="rounded-2xl border border-gray-100 bg-white/90 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-gray-900">
                    <Icon className="h-4 w-4 shrink-0 text-blue-600" />
                    <span className="truncate">{title}</span>
                </div>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    {sectionLabel}
                </span>
            </div>
            <p className="mt-1 text-xs leading-snug text-gray-500">{description}</p>
            <div className="mt-3">{children}</div>
        </section>
    );
}

/**
 * Props for one toggle action button used in settings rows.
 */
type ControlPanelToggleActionProps = {
    readonly isPressed: boolean;
    readonly activeLabel: string;
    readonly inactiveLabel: string;
    readonly onClick: () => void;
    readonly isDisabled?: boolean;
    readonly isDangerTone?: boolean;
};

/**
 * Renders a pill-like toggle button with shared interaction styling.
 *
 * @private
 */
function ControlPanelToggleAction({
    isPressed,
    activeLabel,
    inactiveLabel,
    onClick,
    isDisabled = false,
    isDangerTone = false,
}: ControlPanelToggleActionProps) {
    const activeClasses = isDangerTone
        ? 'border-rose-500 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20'
        : 'border-blue-500 bg-blue-500/10 text-blue-700 hover:bg-blue-500/20';

    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={isPressed}
            disabled={isDisabled}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                isPressed
                    ? activeClasses
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
            } ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
        >
            {isPressed ? activeLabel : inactiveLabel}
        </button>
    );
}

/**
 * Renders the sound and vibration toggles with contextual labels.
 *
 * @private
 */
function ControlPanelContent({ title, subtitle, isMobile = false }: ControlPanelContentProps) {
    const { soundSystem } = useSoundSystem();
    const { language, setLanguage, availableLanguages, t } = useServerLanguage();
    const { isSelfLearningEnabled, setIsSelfLearningEnabled } = useSelfLearningPreferences();
    const { isPrivateModeEnabled, setIsPrivateModeEnabled } = usePrivateModePreferences();
    const languageSelectId = useId();

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
    const selfLearningDetail = isPrivateModeEnabled
        ? t('controlPanel.selfLearningDetailPrivate')
        : t('controlPanel.selfLearningDetailPaused');
    const privateStateLabel = isPrivateModeEnabled
        ? t('controlPanel.privateModeStatePrivate')
        : t('controlPanel.privateModeStateStandard');
    const privateDescription = isPrivateModeEnabled
        ? t('controlPanel.privateModeDescriptionPrivate')
        : t('controlPanel.privateModeDescriptionStandard');
    const privateDetail = t('controlPanel.privateModeDetail');
    const activeLanguageName =
        availableLanguages.find((languagePack) => languagePack.language === language)?.nativeName || language;

    return (
        <div className={`space-y-3 ${isMobile ? 'pt-1' : ''}`}>
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700/80">{t('controlPanel.label')}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                    <ControlPanelStatusBadge tone={isPrivateModeEnabled ? 'danger' : 'positive'} label={privateStateLabel} />
                    <ControlPanelStatusBadge
                        tone={isPrivateModeEnabled ? 'neutral' : isSelfLearningEnabled ? 'positive' : 'informative'}
                        label={selfLearningStateLabel}
                    />
                    <ControlPanelStatusBadge tone="neutral" label={activeLanguageName} />
                </div>
            </div>

            <ControlPanelSectionCard
                icon={SpeakerIcon}
                title={title || t('controlPanel.feedbackTitle')}
                sectionLabel={t('controlPanel.audioLabel')}
                description={subtitle || t('controlPanel.feedbackSubtitle')}
            >
                {soundSystem ? (
                    <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 shadow-inner">
                        <ChatSoundAndVibrationPanel soundSystem={soundSystem} />
                    </div>
                ) : (
                    <p className="text-xs text-gray-500">{t('controlPanel.audioLoading')}</p>
                )}
            </ControlPanelSectionCard>

            <ControlPanelSectionCard
                icon={Sparkles}
                title={t('controlPanel.selfLearningTitle')}
                sectionLabel={t('controlPanel.selfLearningSection')}
                description={selfLearningDescription}
            >
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{selfLearningStateLabel}</p>
                        <p className="text-xs text-gray-500">{selfLearningDetail}</p>
                    </div>
                    <ControlPanelToggleAction
                        isPressed={isSelfLearningEnabled}
                        activeLabel={t('controlPanel.selfLearningPauseAction')}
                        inactiveLabel={t('controlPanel.selfLearningEnableAction')}
                        onClick={toggleSelfLearning}
                        isDisabled={isPrivateModeEnabled}
                    />
                </div>
            </ControlPanelSectionCard>

            <ControlPanelSectionCard
                icon={EyeOff}
                title={t('controlPanel.privateModeTitle')}
                sectionLabel={t('controlPanel.privateModeSection')}
                description={privateDescription}
            >
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{privateStateLabel}</p>
                        <p className="text-xs text-gray-500">{privateDetail}</p>
                    </div>
                    <ControlPanelToggleAction
                        isPressed={isPrivateModeEnabled}
                        activeLabel={t('controlPanel.privateModeDisableAction')}
                        inactiveLabel={t('controlPanel.privateModeEnableAction')}
                        onClick={() => {
                            void togglePrivateMode();
                        }}
                        isDangerTone
                    />
                </div>
            </ControlPanelSectionCard>

            <ControlPanelSectionCard
                icon={Languages}
                title={t('controlPanel.languageTitle')}
                sectionLabel={t('controlPanel.languageSection')}
                description={t('controlPanel.languageSubtitle')}
            >
                <div className="space-y-2">
                    <label htmlFor={languageSelectId} className="text-xs font-medium text-gray-600">
                        {t('controlPanel.languageSelectLabel')}
                    </label>
                    <select
                        id={languageSelectId}
                        value={language}
                        onChange={(event) => setLanguage(event.target.value as typeof language)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                        {availableLanguages.map((languagePack) => (
                            <option key={languagePack.language} value={languagePack.language}>
                                {languagePack.nativeName} ({languagePack.englishName})
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500">{t('controlPanel.languageHelp')}</p>
                </div>
            </ControlPanelSectionCard>
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
                aria-label={t('controlPanel.openAriaLabel')}
                className={`rounded-full border p-2 text-gray-600 shadow-sm shadow-black/5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                    isOpen
                        ? 'border-gray-200 bg-white text-gray-900'
                        : 'border-transparent bg-white/70 hover:bg-white hover:text-gray-900'
                }`}
            >
                <Settings2 className="h-5 w-5" />
                <span className="sr-only">{t('controlPanel.label')}</span>
            </button>

            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="absolute right-0 top-full z-50 mt-3 w-[22rem] max-w-[calc(100vw-1rem)] rounded-3xl border border-gray-100 bg-gradient-to-b from-white to-slate-50 p-1 shadow-2xl shadow-black/10"
                >
                    <div className="rounded-[1.35rem] bg-white/95 p-2">
                        <div className="flex items-center justify-between px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-widest text-gray-500">
                            <span>{t('controlPanel.label')}</span>
                            <ArrowIcon direction="DOWN" className="h-3 w-3 rotate-180 text-gray-400" />
                        </div>
                        <div className="max-h-[min(76vh,38rem)] overflow-y-auto overscroll-contain px-2 pb-2 pr-1.5 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                            <ControlPanelContent />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
