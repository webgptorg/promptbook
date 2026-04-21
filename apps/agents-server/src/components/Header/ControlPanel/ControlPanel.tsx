'use client';

import { Settings2, X } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type RefObject } from 'react';
import { useAppearance } from '../../Appearance/AppearanceProvider';
import { useServerLanguage } from '../../ServerLanguage/ServerLanguageProvider';
import { ControlPanelContent } from './ControlPanelContent';

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
    const { resolvedAppearance } = useAppearance();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const panelId = useId();
    const isDarkMode = resolvedAppearance === 'dark';

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
                className={`rounded-full border p-2 shadow-sm shadow-black/5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                    isOpen
                        ? isDarkMode
                            ? 'border-sky-500/40 bg-sky-500/15 text-sky-100'
                            : 'border-blue-200 bg-blue-50 text-blue-700'
                        : isDarkMode
                        ? 'border-slate-700 bg-slate-900/75 text-slate-300 hover:bg-slate-800/90 hover:text-white'
                        : 'border-transparent bg-white/70 text-gray-600 hover:bg-white hover:text-gray-900'
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
                    className={`absolute right-0 top-full z-50 mt-2 w-[22rem] max-w-[calc(100vw-0.75rem)] rounded-3xl border p-2 shadow-2xl shadow-black/10 ${
                        isDarkMode
                            ? 'border-slate-700/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900/95'
                            : 'border-slate-200/90 bg-gradient-to-b from-white to-slate-100/80'
                    }`}
                >
                    <div className="flex items-center justify-between px-1 pb-2 pt-1">
                        <p
                            className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                isDarkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}
                        >
                            {t('controlPanel.label')}
                        </p>
                        <button
                            type="button"
                            onClick={handleClose}
                            aria-label={t('common.close')}
                            className={`rounded-full border border-transparent p-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                                isDarkMode
                                    ? 'text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-100'
                                    : 'text-gray-400 hover:border-gray-200 hover:bg-white hover:text-gray-600'
                            }`}
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
