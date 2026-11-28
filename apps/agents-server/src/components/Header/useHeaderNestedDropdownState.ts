import type { MouseEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DropdownInteractionMode, OpenSubMenuState } from './HeaderTypes';
import type { SubMenuItem } from './SubMenuItem';
import { updateDropdownInteractionModeState } from './updateDropdownInteractionModeState';

/**
 * Delay before hover opens a nested submenu in preview mode.
 */
const SUBMENU_HOVER_OPEN_DELAY_MS = 140;

/**
 * Delay before nested submenu branches close after pointer leave.
 */
const SUBMENU_CLOSE_DELAY_MS = 240;

/**
 * Inputs required to manage shared header nested-submenu state.
 *
 * @private type of Header
 */
type UseHeaderNestedDropdownStateProps = {
    readonly isTouchInput: boolean;
};

/**
 * Manages shared nested desktop/mobile submenu state, timers, and hover transitions for the header.
 *
 * @private function of Header
 */
export function useHeaderNestedDropdownState({ isTouchInput }: UseHeaderNestedDropdownStateProps) {
    const [mobileOpenSubMenus, setMobileOpenSubMenus] = useState<Record<string, boolean>>({});
    const [openSubMenu, setOpenSubMenu] = useState<OpenSubMenuState | null>(null);
    const [subMenuModes, setSubMenuModes] = useState<Record<string, DropdownInteractionMode>>({});
    const [desktopExpandedSubMenus, setDesktopExpandedSubMenus] = useState<Record<string, boolean>>({});
    const subMenuCloseTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null);
    const subMenuOpenTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null);
    const previousTouchInputRef = useRef(isTouchInput);

    /**
     * Stores one interaction mode for a nested submenu id.
     */
    const setSubMenuMode = useCallback((key: string, mode: DropdownInteractionMode | null) => {
        setSubMenuModes((previous) => updateDropdownInteractionModeState(previous, key, mode));
    }, []);

    /**
     * Resolves whether one nested submenu was explicitly committed via click or tap.
     */
    const isNestedSubMenuInteractive = useCallback(
        (key: string): boolean => isTouchInput || subMenuModes[key] === 'interactive',
        [isTouchInput, subMenuModes],
    );

    /**
     * Resolves whether one nested submenu should capture pointer events.
     */
    const isNestedSubMenuPointerEnabled = useCallback(
        (key: string): boolean => isTouchInput || Boolean(subMenuModes[key]),
        [isTouchInput, subMenuModes],
    );

    /**
     * Cancels the pending close timer for nested submenu branches.
     */
    const cancelSubMenuClose = useCallback(() => {
        if (subMenuCloseTimer.current) {
            clearTimeout(subMenuCloseTimer.current);
            subMenuCloseTimer.current = null;
        }
    }, []);

    /**
     * Cancels the pending hover-open timer for nested submenu branches.
     */
    const cancelSubMenuOpen = useCallback(() => {
        if (subMenuOpenTimer.current) {
            clearTimeout(subMenuOpenTimer.current);
            subMenuOpenTimer.current = null;
        }
    }, []);

    /**
     * Cancels all pending nested-submenu timers.
     */
    const clearNestedSubMenuTimers = useCallback(() => {
        cancelSubMenuClose();
        cancelSubMenuOpen();
    }, [cancelSubMenuClose, cancelSubMenuOpen]);

    /**
     * Clears currently open nested submenu state and interaction modes.
     */
    const resetNestedDropdownState = useCallback(() => {
        clearNestedSubMenuTimers();
        setOpenSubMenu(null);
        setSubMenuModes({});
        setDesktopExpandedSubMenus({});
    }, [clearNestedSubMenuTimers]);

    /**
     * Opens one nested submenu in the provided mode.
     */
    const openNestedSubMenu = useCallback(
        (key: string, items: SubMenuItem[], rect: DOMRect, mode: DropdownInteractionMode) => {
            clearNestedSubMenuTimers();
            setSubMenuMode(key, mode);
            setOpenSubMenu({
                key,
                rect,
                items,
            });
        },
        [clearNestedSubMenuTimers, setSubMenuMode],
    );

    /**
     * Schedules a delayed close for one nested submenu branch.
     */
    const scheduleSubMenuClose = useCallback(
        (key: string) => {
            cancelSubMenuClose();
            cancelSubMenuOpen();
            subMenuCloseTimer.current = setTimeout(() => {
                setOpenSubMenu((current) => (current?.key === key ? null : current));
                setSubMenuMode(key, null);
                subMenuCloseTimer.current = null;
            }, SUBMENU_CLOSE_DELAY_MS);
        },
        [cancelSubMenuClose, cancelSubMenuOpen, setSubMenuMode],
    );

    /**
     * Schedules one nested submenu to open as hover preview.
     */
    const scheduleSubMenuPreviewOpen = useCallback(
        (key: string, items: SubMenuItem[], event: MouseEvent<HTMLDivElement>) => {
            if (isTouchInput) {
                return;
            }

            cancelSubMenuClose();

            if (openSubMenu?.key === key) {
                if (!isNestedSubMenuInteractive(key)) {
                    setSubMenuMode(key, 'preview');
                }

                return;
            }

            cancelSubMenuOpen();
            const rect = event.currentTarget.getBoundingClientRect();
            subMenuOpenTimer.current = setTimeout(() => {
                openNestedSubMenu(key, items, rect, 'preview');
                subMenuOpenTimer.current = null;
            }, SUBMENU_HOVER_OPEN_DELAY_MS);
        },
        [cancelSubMenuClose, cancelSubMenuOpen, isNestedSubMenuInteractive, isTouchInput, openNestedSubMenu, openSubMenu, setSubMenuMode],
    );

    /**
     * Opens one nested submenu immediately in interactive mode.
     */
    const openInteractiveSubMenu = useCallback(
        (key: string, items: SubMenuItem[], rect: DOMRect) => {
            openNestedSubMenu(key, items, rect, 'interactive');
        },
        [openNestedSubMenu],
    );

    /**
     * Keeps the nested submenu open while moving pointer between trigger and panel.
     */
    const keepSubMenuOpen = useCallback(() => {
        clearNestedSubMenuTimers();
    }, [clearNestedSubMenuTimers]);

    /**
     * Handles leaving the floating nested submenu portal.
     */
    const handleSubMenuPortalLeave = useCallback(() => {
        if (openSubMenu) {
            scheduleSubMenuClose(openSubMenu.key);
        }
    }, [openSubMenu, scheduleSubMenuClose]);

    /**
     * Toggles one mobile submenu branch.
     */
    const toggleMobileSubMenu = useCallback((key: string) => {
        setMobileOpenSubMenus((previous) => ({
            ...previous,
            [key]: !previous[key],
        }));
    }, []);

    /**
     * Opens one mobile submenu branch without affecting the other branches.
     */
    const openMobileSubMenu = useCallback((key: string) => {
        setMobileOpenSubMenus((previous) => {
            if (previous[key]) {
                return previous;
            }

            return {
                ...previous,
                [key]: true,
            };
        });
    }, []);

    /**
     * Clears all mobile submenu expansion state.
     */
    const resetMobileSubMenus = useCallback(() => {
        setMobileOpenSubMenus({});
    }, []);

    /**
     * Toggles one desktop submenu branch for touch-based expansion.
     */
    const toggleDesktopSubMenu = useCallback((key: string) => {
        setDesktopExpandedSubMenus((previous) => ({
            ...previous,
            [key]: !previous[key],
        }));
    }, []);

    /**
     * Closes one interactive submenu branch.
     */
    const closeInteractiveSubMenu = useCallback(
        (key: string) => {
            setOpenSubMenu(null);
            setSubMenuMode(key, null);
        },
        [setSubMenuMode],
    );

    useEffect(() => {
        if (previousTouchInputRef.current === isTouchInput) {
            return;
        }

        previousTouchInputRef.current = isTouchInput;
        resetNestedDropdownState();
    }, [isTouchInput, resetNestedDropdownState]);

    useEffect(() => {
        return () => {
            clearNestedSubMenuTimers();
        };
    }, [clearNestedSubMenuTimers]);

    return {
        closeInteractiveSubMenu,
        desktopExpandedSubMenus,
        handleSubMenuPortalLeave,
        isNestedSubMenuInteractive,
        isNestedSubMenuPointerEnabled,
        keepSubMenuOpen,
        mobileOpenSubMenus,
        openInteractiveSubMenu,
        openMobileSubMenu,
        openSubMenu,
        resetMobileSubMenus,
        resetNestedDropdownState,
        scheduleSubMenuClose,
        scheduleSubMenuPreviewOpen,
        toggleDesktopSubMenu,
        toggleMobileSubMenu,
    };
}
