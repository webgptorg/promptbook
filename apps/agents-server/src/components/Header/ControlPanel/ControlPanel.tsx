'use client';

import { ChatSoundAndVibrationPanel } from '@promptbook-local/components';
import { ChevronDown, Settings2, SpeakerIcon, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useSoundSystem } from '../../SoundSystemProvider/SoundSystemProvider';
import { useSelfLearningPreferences } from '../../SelfLearningPreferences/SelfLearningPreferencesProvider';

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
    title = 'Feedback',
    subtitle = 'Control sounds and vibration globally',
    isMobile = false,
}: ControlPanelContentProps) {
    const { soundSystem } = useSoundSystem();
    const { isSelfLearningEnabled, setIsSelfLearningEnabled } = useSelfLearningPreferences();
    const toggleSelfLearning = useCallback(() => {
        setIsSelfLearningEnabled((value) => !value);
    }, [setIsSelfLearningEnabled]);

    const audioSection = soundSystem ? (
        <div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                    <SpeakerIcon className="w-4 h-4 text-blue-600" />
                    <span>{title}</span>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Audio</span>
            </div>
            <p className="text-xs text-gray-500 leading-snug">{subtitle}</p>
            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-3 shadow-inner">
                <ChatSoundAndVibrationPanel soundSystem={soundSystem} />
            </div>
        </div>
    ) : (
        <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                <SpeakerIcon className="w-4 h-4 text-blue-600" />
                <span>{title}</span>
            </div>
            <p className="text-xs text-gray-500">{subtitle}</p>
            <p className="text-xs text-gray-500">Loading audio settings…</p>
        </div>
    );

    const stateLabel = isSelfLearningEnabled ? 'Learning' : 'Paused';
    const description = isSelfLearningEnabled
        ? 'Agent appends new commitments to the book after each chat.'
        : 'Agent respects the existing book until learning is enabled again.';
    const detail = 'Chats and memories still persist even when learning is paused.';

    return (
        <div className={`space-y-3 ${isMobile ? 'pt-1' : ''}`}>
            {audioSection}
            <div className="rounded-2xl border border-gray-100 bg-white/80 p-3 shadow-inner">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span>Self-learning</span>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Book</span>
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
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition ${
                            isSelfLearningEnabled
                                ? 'border-blue-500 bg-blue-500/10 text-blue-700 hover:bg-blue-500/20'
                                : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
                        }`}
                    >
                        {isSelfLearningEnabled ? 'Pause learning' : 'Enable learning'}
                    </button>
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
                aria-label="Open global control panel"
                className="p-2 rounded-full border border-transparent bg-white/70 text-gray-600 shadow-sm shadow-black/5 transition hover:bg-white hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
                <Settings2 className="w-5 h-5" />
                <span className="sr-only">Control panel</span>
            </button>

            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="absolute right-0 top-full mt-3 w-64 rounded-3xl border border-gray-100 bg-white p-0.5 shadow-2xl shadow-black/10"
                >
                    <div className="rounded-2xl bg-white p-3">
                        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-gray-500">
                            <span>Control panel</span>
                            <ChevronDown className="w-3 h-3 rotate-180 text-gray-400" />
                        </div>
                        <ControlPanelContent />
                        <div className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
                            <p>More toggles (theme, language, accessibility) coming soon.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
