import { useCallback, useEffect, useRef, useState } from 'react';
import type { DropdownInteractionMode } from './HeaderTypes';
import { updateDropdownInteractionModeState } from './updateDropdownInteractionModeState';

/**
 * Delay before hover opens a top-level desktop dropdown in preview mode.
 */
const HEADER_DROPDOWN_HOVER_OPEN_DELAY_MS = 140;

/**
 * Delay used when the user leaves a header dropdown so it stays open long enough to reach the panel.
 */
const HEADER_DROPDOWN_CLOSE_DELAY_MS = 280;

/**
 * Inputs required to manage shared top-level desktop dropdown state.
 *
 * @private type of Header
 */
type UseHeaderDesktopDropdownStateProps = {
    readonly isTouchInput: boolean;
    readonly resetNestedDropdownState: () => void;
};

/**
 * Manages top-level desktop dropdown interaction modes plus delayed preview/open/close timers.
 *
 * @private function of Header
 */
export function useHeaderDesktopDropdownState({
    isTouchInput,
    resetNestedDropdownState,
}: UseHeaderDesktopDropdownStateProps) {
    const [desktopDropdownModes, setDesktopDropdownModes] = useState<Record<string, DropdownInteractionMode>>({});
    const menuOpenTimers = useRef<Record<string, ReturnType<typeof window.setTimeout> | null>>({});
    const menuCloseTimers = useRef<Record<string, ReturnType<typeof window.setTimeout> | null>>({});
    const previousTouchInputRef = useRef(isTouchInput);

    /**
     * Stores one interaction mode for a desktop dropdown id.
     */
    const setDesktopDropdownMode = useCallback((menuId: string, mode: DropdownInteractionMode | null) => {
        setDesktopDropdownModes((previous) => updateDropdownInteractionModeState(previous, menuId, mode));
    }, []);

    /**
     * Cancels the pending hover-open timer of a header dropdown.
     */
    const cancelMenuOpen = useCallback((menuId: string) => {
        const pendingTimer = menuOpenTimers.current[menuId];
        if (pendingTimer) {
            clearTimeout(pendingTimer);
            menuOpenTimers.current[menuId] = null;
        }
    }, []);

    /**
     * Cancels the pending close timer of a header dropdown.
     */
    const cancelMenuClose = useCallback((menuId: string) => {
        const pendingTimer = menuCloseTimers.current[menuId];
        if (pendingTimer) {
            clearTimeout(pendingTimer);
            menuCloseTimers.current[menuId] = null;
        }
    }, []);

    /**
     * Cancels all pending open/close timers for the top-level dropdowns.
     */
    const clearMenuTimers = useCallback(() => {
        Object.values(menuOpenTimers.current).forEach((timer) => {
            if (timer) {
                clearTimeout(timer);
            }
        });
        menuOpenTimers.current = {};

        Object.values(menuCloseTimers.current).forEach((timer) => {
            if (timer) {
                clearTimeout(timer);
            }
        });
        menuCloseTimers.current = {};
    }, []);

    /**
     * Clears all desktop interaction modes and timers.
     */
    const resetDesktopDropdownState = useCallback(() => {
        setDesktopDropdownModes({});
        clearMenuTimers();
    }, [clearMenuTimers]);

    /**
     * Resolves whether one desktop dropdown was explicitly committed via click or tap.
     */
    const isDesktopDropdownInteractive = useCallback(
        (menuId: string): boolean => isTouchInput || desktopDropdownModes[menuId] === 'interactive',
        [desktopDropdownModes, isTouchInput],
    );

    /**
     * Resolves whether one desktop dropdown should keep pointer events enabled while open.
     */
    const isDesktopDropdownPointerEnabled = useCallback(
        (menuId: string): boolean => isTouchInput || Boolean(desktopDropdownModes[menuId]),
        [desktopDropdownModes, isTouchInput],
    );

    /**
     * Schedules one header dropdown to open as hover preview.
     */
    const scheduleMenuPreviewOpen = useCallback(
        (menuId: string, open: () => void) => {
            if (isTouchInput) {
                return;
            }

            cancelMenuOpen(menuId);
            menuOpenTimers.current[menuId] = setTimeout(() => {
                setDesktopDropdownMode(menuId, 'preview');
                open();
                menuOpenTimers.current[menuId] = null;
            }, HEADER_DROPDOWN_HOVER_OPEN_DELAY_MS);
        },
        [cancelMenuOpen, isTouchInput, setDesktopDropdownMode],
    );

    /**
     * Opens one desktop dropdown immediately in interactive mode.
     */
    const openInteractiveDesktopDropdown = useCallback(
        (menuId: string, open: () => void) => {
            cancelMenuOpen(menuId);
            cancelMenuClose(menuId);
            setDesktopDropdownMode(menuId, 'interactive');
            open();
        },
        [cancelMenuClose, cancelMenuOpen, setDesktopDropdownMode],
    );

    /**
     * Closes one desktop dropdown immediately and clears interaction state.
     */
    const closeDesktopDropdownNow = useCallback(
        (menuId: string, close: () => void) => {
            cancelMenuOpen(menuId);
            cancelMenuClose(menuId);
            setDesktopDropdownMode(menuId, null);
            close();
            resetNestedDropdownState();
        },
        [cancelMenuClose, cancelMenuOpen, resetNestedDropdownState, setDesktopDropdownMode],
    );

    /**
     * Begins hover-based preview opening for one desktop dropdown.
     */
    const startDesktopDropdownPreview = useCallback(
        (menuId: string, isOpen: boolean, open: () => void) => {
            if (isTouchInput) {
                return;
            }

            cancelMenuClose(menuId);

            if (isOpen) {
                if (!isDesktopDropdownInteractive(menuId)) {
                    setDesktopDropdownMode(menuId, 'preview');
                }

                return;
            }

            scheduleMenuPreviewOpen(menuId, open);
        },
        [cancelMenuClose, isDesktopDropdownInteractive, isTouchInput, scheduleMenuPreviewOpen, setDesktopDropdownMode],
    );

    /**
     * Schedules a delayed close for a header dropdown.
     */
    const scheduleMenuClose = useCallback(
        (menuId: string, close: () => void) => {
            if (isTouchInput) {
                return;
            }

            cancelMenuOpen(menuId);
            cancelMenuClose(menuId);
            menuCloseTimers.current[menuId] = setTimeout(() => {
                close();
                setDesktopDropdownMode(menuId, null);
                resetNestedDropdownState();
                menuCloseTimers.current[menuId] = null;
            }, HEADER_DROPDOWN_CLOSE_DELAY_MS);
        },
        [cancelMenuClose, cancelMenuOpen, isTouchInput, resetNestedDropdownState, setDesktopDropdownMode],
    );

    useEffect(() => {
        if (previousTouchInputRef.current === isTouchInput) {
            return;
        }

        previousTouchInputRef.current = isTouchInput;
        resetDesktopDropdownState();
    }, [isTouchInput, resetDesktopDropdownState]);

    useEffect(() => {
        return () => {
            clearMenuTimers();
        };
    }, [clearMenuTimers]);

    return {
        cancelMenuClose,
        closeDesktopDropdownNow,
        isDesktopDropdownInteractive,
        isDesktopDropdownPointerEnabled,
        openInteractiveDesktopDropdown,
        resetDesktopDropdownState,
        scheduleMenuClose,
        startDesktopDropdownPreview,
    };
}
