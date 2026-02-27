'use client';

import { ChatSoundAndVibrationPanel } from '@promptbook-local/components';
import { EyeOff, Languages, Settings2, SpeakerIcon, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { ArrowIcon } from '../../_utils/ArrowIcon';
import { useSoundSystem } from '../../SoundSystemProvider/SoundSystemProvider';
import { confirmPrivateModeEnable } from '../../PrivateModePreferences/confirmPrivateModeEnable';
import { usePrivateModePreferences } from '../../PrivateModePreferences/PrivateModePreferencesProvider';
import { useSelfLearningPreferences } from '../../SelfLearningPreferences/SelfLearningPreferencesProvider';
import { useServerLanguage } from '../../ServerLanguage/ServerLanguageProvider';

/**
 * Shared props used by every control panel presentation.
 */
type ControlPanelContentProps = {
    readonly title?: string;
    readonly subtitle?: string;
    readonly isMobile?: boolean;
};

/**
 * Renders the sound and vibration toggles with contextual labels.
 *
 * @private
 */
function ControlPanelContent({
    title,
    subtitle,
    isMobile = false,
}: ControlPanelContentProps) {
    const { soundSystem } = useSoundSystem();
    const { language, setLanguage, availableLanguages, t } = useServerLanguage();
    const { isSelfLearningEnabled, setIsSelfLearningEnabled } = useSelfLearningPreferences();
    const { isPrivateModeEnabled, setIsPrivateModeEnabled } = usePrivateModePreferences();
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

    const audioSection = soundSystem ? (
        <div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                    <SpeakerIcon className="w-4 h-4 text-blue-600" />
                    <span>{title || t('controlPanel.feedbackTitle')}</span>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {t('controlPanel.audioLabel')}
                </span>
            </div>
            <p className="text-xs text-gray-500 leading-snug">{subtitle || t('controlPanel.feedbackSubtitle')}</p>
            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-3 shadow-inner">
                <ChatSoundAndVibrationPanel soundSystem={soundSystem} />
            </div>
        </div>
    ) : (
        <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                <SpeakerIcon className="w-4 h-4 text-blue-600" />
                <span>{title || t('controlPanel.feedbackTitle')}</span>
            </div>
            <p className="text-xs text-gray-500">{subtitle || t('controlPanel.feedbackSubtitle')}</p>
            <p className="text-xs text-gray-500">{t('controlPanel.audioLoading')}</p>
        </div>
    );

    useEffect(() => {
        if (isPrivateModeEnabled && isSelfLearningEnabled) {
            setIsSelfLearningEnabled(false);
        }
    }, [isPrivateModeEnabled, isSelfLearningEnabled, setIsSelfLearningEnabled]);

    const stateLabel = isPrivateModeEnabled
        ? t('controlPanel.selfLearningStateDisabledPrivate')
        : isSelfLearningEnabled
            ? t('controlPanel.selfLearningStateLearning')
            : t('controlPanel.selfLearningStatePaused');
    const description = isPrivateModeEnabled
        ? t('controlPanel.selfLearningDescriptionPrivate')
        : isSelfLearningEnabled
            ? t('controlPanel.selfLearningDescriptionLearning')
            : t('controlPanel.selfLearningDescriptionPaused');
    const detail = isPrivateModeEnabled
        ? t('controlPanel.selfLearningDetailPrivate')
        : t('controlPanel.selfLearningDetailPaused');
    const privateStateLabel = isPrivateModeEnabled
        ? t('controlPanel.privateModeStatePrivate')
        : t('controlPanel.privateModeStateStandard');
    const privateDescription = isPrivateModeEnabled
        ? t('controlPanel.privateModeDescriptionPrivate')
        : t('controlPanel.privateModeDescriptionStandard');
    const privateDetail = t('controlPanel.privateModeDetail');

    return (
        <div className={`space-y-3 ${isMobile ? 'pt-1' : ''}`}>
            {audioSection}
            <div className="rounded-2xl border border-gray-100 bg-white/80 p-3 shadow-inner">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span>{t('controlPanel.selfLearningTitle')}</span>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                        {t('controlPanel.selfLearningSection')}
                    </span>
                </div>
                <p className="text-xs text-gray-500 leading-snug">{description}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{stateLabel}</p>
                        <p className="text-xs text-gray-500">{detail}</p>
                    </div>
                    <button
                        type="button"
                        onClick={toggleSelfLearning}
                        aria-pressed={isSelfLearningEnabled}
                        disabled={isPrivateModeEnabled}
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition ${
                            isSelfLearningEnabled
                                ? 'border-blue-500 bg-blue-500/10 text-blue-700 hover:bg-blue-500/20'
                                : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
                        } ${isPrivateModeEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isSelfLearningEnabled
                            ? t('controlPanel.selfLearningPauseAction')
                            : t('controlPanel.selfLearningEnableAction')}
                    </button>
                </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white/80 p-3 shadow-inner">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                        <EyeOff className="w-4 h-4 text-blue-600" />
                        <span>{t('controlPanel.privateModeTitle')}</span>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                        {t('controlPanel.privateModeSection')}
                    </span>
                </div>
                <p className="text-xs text-gray-500 leading-snug">{privateDescription}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{privateStateLabel}</p>
                        <p className="text-xs text-gray-500">{privateDetail}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            void togglePrivateMode();
                        }}
                        aria-pressed={isPrivateModeEnabled}
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition ${
                            isPrivateModeEnabled
                                ? 'border-rose-500 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20'
                                : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
                        }`}
                    >
                        {isPrivateModeEnabled
                            ? t('controlPanel.privateModeDisableAction')
                            : t('controlPanel.privateModeEnableAction')}
                    </button>
                </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white/80 p-3 shadow-inner">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                        <Languages className="w-4 h-4 text-blue-600" />
                        <span>{t('controlPanel.languageTitle')}</span>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                        {t('controlPanel.languageSection')}
                    </span>
                </div>
                <p className="text-xs text-gray-500 leading-snug">{t('controlPanel.languageSubtitle')}</p>
                <div className="mt-3 space-y-2">
                    <label htmlFor="control-panel-language" className="text-xs font-medium text-gray-600">
                        {t('controlPanel.languageSelectLabel')}
                    </label>
                    <select
                        id="control-panel-language"
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
            </div>
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
                className="p-2 rounded-full border border-transparent bg-white/70 text-gray-600 shadow-sm shadow-black/5 transition hover:bg-white hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
                <Settings2 className="w-5 h-5" />
                <span className="sr-only">{t('controlPanel.label')}</span>
            </button>

            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="absolute right-0 top-full mt-3 w-64 rounded-3xl border border-gray-100 bg-white p-0.5 shadow-2xl shadow-black/10"
                >
                    <div className="rounded-2xl bg-white p-3">
                        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-gray-500">
                            <span>{t('controlPanel.label')}</span>
                            <ArrowIcon direction="DOWN" className="w-3 h-3 rotate-180 text-gray-400" />
                        </div>
                        <ControlPanelContent />
                    </div>
                </div>
            )}
        </div>
    );
}
