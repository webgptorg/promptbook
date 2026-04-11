import type { MouseEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createHeaderDropdownRenderers } from './createHeaderDropdownRenderers';
import type { DropdownInteractionMode, OpenSubMenuState } from './HeaderTypes';
import type { SubMenuItem } from './SubMenuItem';
import { useHeaderDropdownPortalContainer } from './useHeaderDropdownPortalContainer';
import { useHeaderTouchInput } from './useHeaderTouchInput';

/**
 * Delay before hover opens a top-level desktop dropdown in preview mode.
 */
const HEADER_DROPDOWN_HOVER_OPEN_DELAY_MS = 140;

/**
 * Delay before hover opens a nested submenu in preview mode.
 */
const SUBMENU_HOVER_OPEN_DELAY_MS = 140;

/**
 * Delay before nested submenu branches close after pointer leave.
 */
const SUBMENU_CLOSE_DELAY_MS = 240;

/**
 * Delay used when the user leaves a header dropdown so it stays open long enough to reach the panel.
 */
const HEADER_DROPDOWN_CLOSE_DELAY_MS = 280;

/**
 * Maximum horizontal distance from the left viewport edge that can start an "open drawer" swipe.
 */
const MOBILE_MENU_EDGE_SWIPE_START_X_PX = 24;

/**
 * Minimum horizontal swipe distance required to trigger open/close drawer gestures.
 */
const MOBILE_MENU_SWIPE_TRIGGER_DISTANCE_PX = 58;

/**
 * Maximum vertical drift allowed while recognizing horizontal drawer swipes.
 */
const MOBILE_MENU_SWIPE_MAX_VERTICAL_DRIFT_PX = 44;

/**
 * Maximum gesture duration considered a deliberate drawer swipe.
 */
const MOBILE_MENU_SWIPE_MAX_DURATION_MS = 700;

/**
 * Menu key opened by default for hoisted mobile sections on the first drawer open.
 */
const DEFAULT_HOISTED_MOBILE_MENU_KEY = 'mobile-hoisted-menu-0';

/**
 * Tracks one in-progress touch gesture for mobile drawer swipe interactions.
 *
 * @private type of Header
 */
type MobileMenuSwipeGesture = {
    /**
     * Gesture mode describing whether the swipe tries to open or close the drawer.
     */
    readonly mode: 'open' | 'close';

    /**
     * Horizontal gesture origin in viewport coordinates.
     */
    readonly startX: number;

    /**
     * Vertical gesture origin in viewport coordinates.
     */
    readonly startY: number;

    /**
     * Epoch timestamp in milliseconds at touch start.
     */
    readonly startedAt: number;
};

/**
 * Inputs required to assemble the shared header dropdown state.
 *
 * @private type of Header
 */
type UseHeaderDropdownStateProps = {
    readonly fallbackNavigateToHref: (href: string) => void;
    readonly hasHoistedMobileMenuItems: boolean;
    readonly isHeadless: boolean;
};

/**
 * Stores one interaction mode for one keyed desktop or submenu branch.
 *
 * @private function of Header
 */
function updateDropdownInteractionModeState(
    previous: Record<string, DropdownInteractionMode>,
    key: string,
    mode: DropdownInteractionMode | null,
): Record<string, DropdownInteractionMode> {
    if (mode === null) {
        if (!(key in previous)) {
            return previous;
        }

        const next = { ...previous };
        delete next[key];
        return next;
    }

    if (previous[key] === mode) {
        return previous;
    }

    return {
        ...previous,
        [key]: mode,
    };
}

/**
 * Manages shared desktop/mobile dropdown state, timers, and swipe interactions for the header.
 *
 * @private function of Header
 */
export function useHeaderDropdownState({
    fallbackNavigateToHref,
    hasHoistedMobileMenuItems,
    isHeadless,
}: UseHeaderDropdownStateProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAgentsOpen, setIsAgentsOpen] = useState(false);
    const [isAgentViewOpen, setIsAgentViewOpen] = useState(false);
    const [isDocsOpen, setIsDocsOpen] = useState(false);
    const [isSystemOpen, setIsSystemOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isFederatedOpen, setIsFederatedOpen] = useState(false);
    const [isMobileAgentsOpen, setIsMobileAgentsOpen] = useState(false);
    const [isMobileAgentViewOpen, setIsMobileAgentViewOpen] = useState(false);
    const [isMobileDocsOpen, setIsMobileDocsOpen] = useState(false);
    const [isMobileSystemOpen, setIsMobileSystemOpen] = useState(false);
    const [mobileOpenSubMenus, setMobileOpenSubMenus] = useState<Record<string, boolean>>({});
    const [openSubMenu, setOpenSubMenu] = useState<OpenSubMenuState | null>(null);
    const [desktopDropdownModes, setDesktopDropdownModes] = useState<Record<string, DropdownInteractionMode>>({});
    const [subMenuModes, setSubMenuModes] = useState<Record<string, DropdownInteractionMode>>({});
    const [desktopExpandedSubMenus, setDesktopExpandedSubMenus] = useState<Record<string, boolean>>({});
    const dropdownPortalContainer = useHeaderDropdownPortalContainer();
    const isTouchInput = useHeaderTouchInput();
    const headerRef = useRef<HTMLElement | null>(null);
    const mobileMenuDrawerRef = useRef<HTMLDivElement | null>(null);
    const subMenuCloseTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null);
    const subMenuOpenTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null);
    const menuOpenTimers = useRef<Record<string, ReturnType<typeof window.setTimeout> | null>>({});
    const menuCloseTimers = useRef<Record<string, ReturnType<typeof window.setTimeout> | null>>({});
    const mobileMenuSwipeGestureRef = useRef<MobileMenuSwipeGesture | null>(null);
    const hasInitializedMobileDrawerRef = useRef(false);

    useEffect(() => {
        if (!isMenuOpen) {
            setMobileOpenSubMenus({});
            setIsMobileAgentsOpen(false);
            setIsMobileAgentViewOpen(false);
            setIsMobileDocsOpen(false);
            setIsMobileSystemOpen(false);
        }
    }, [isMenuOpen]);

    useEffect(() => {
        if (!isDocsOpen && !isSystemOpen && !isAgentViewOpen) {
            setOpenSubMenu(null);
            setSubMenuModes({});
            setDesktopExpandedSubMenus({});
        }
    }, [isAgentViewOpen, isDocsOpen, isSystemOpen]);

    useEffect(() => {
        setDesktopExpandedSubMenus({});
        setOpenSubMenu(null);
        setSubMenuModes({});
        setDesktopDropdownModes({});

        if (subMenuCloseTimer.current) {
            clearTimeout(subMenuCloseTimer.current);
            subMenuCloseTimer.current = null;
        }

        if (subMenuOpenTimer.current) {
            clearTimeout(subMenuOpenTimer.current);
            subMenuOpenTimer.current = null;
        }

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
    }, [isTouchInput]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const isDesktopViewport = (): boolean => window.matchMedia('(min-width: 1024px)').matches;

        const handleTouchStart = (event: TouchEvent) => {
            if (event.touches.length !== 1 || isDesktopViewport()) {
                mobileMenuSwipeGestureRef.current = null;
                return;
            }

            const touch = event.touches[0];
            if (!touch) {
                mobileMenuSwipeGestureRef.current = null;
                return;
            }

            if (!isMenuOpen) {
                if (touch.clientX > MOBILE_MENU_EDGE_SWIPE_START_X_PX) {
                    mobileMenuSwipeGestureRef.current = null;
                    return;
                }

                mobileMenuSwipeGestureRef.current = {
                    mode: 'open',
                    startX: touch.clientX,
                    startY: touch.clientY,
                    startedAt: Date.now(),
                };
                return;
            }

            const drawerRight = mobileMenuDrawerRef.current?.getBoundingClientRect().right;
            if (drawerRight === undefined || touch.clientX > drawerRight) {
                mobileMenuSwipeGestureRef.current = null;
                return;
            }

            mobileMenuSwipeGestureRef.current = {
                mode: 'close',
                startX: touch.clientX,
                startY: touch.clientY,
                startedAt: Date.now(),
            };
        };

        const handleTouchEnd = (event: TouchEvent) => {
            const gesture = mobileMenuSwipeGestureRef.current;
            mobileMenuSwipeGestureRef.current = null;

            if (!gesture || event.changedTouches.length === 0 || isDesktopViewport()) {
                return;
            }

            const touch = event.changedTouches[0];
            if (!touch) {
                return;
            }

            const deltaX = touch.clientX - gesture.startX;
            const deltaY = touch.clientY - gesture.startY;
            const durationMs = Date.now() - gesture.startedAt;

            if (
                Math.abs(deltaY) > MOBILE_MENU_SWIPE_MAX_VERTICAL_DRIFT_PX ||
                durationMs > MOBILE_MENU_SWIPE_MAX_DURATION_MS
            ) {
                return;
            }

            if (gesture.mode === 'open' && deltaX >= MOBILE_MENU_SWIPE_TRIGGER_DISTANCE_PX) {
                setIsMenuOpen(true);
                return;
            }

            if (gesture.mode === 'close' && deltaX <= -MOBILE_MENU_SWIPE_TRIGGER_DISTANCE_PX) {
                setIsMenuOpen(false);
            }
        };

        const handleTouchCancel = () => {
            mobileMenuSwipeGestureRef.current = null;
        };

        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchend', handleTouchEnd, { passive: true });
        window.addEventListener('touchcancel', handleTouchCancel, { passive: true });

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('touchcancel', handleTouchCancel);
        };
    }, [isMenuOpen]);

    useEffect(() => {
        if (typeof window === 'undefined' || !isMenuOpen) {
            return;
        }

        const desktopMediaQuery = window.matchMedia('(min-width: 1024px)');

        if (desktopMediaQuery.matches) {
            setIsMenuOpen(false);
            return;
        }

        const handleViewportChange = (event: MediaQueryListEvent) => {
            if (event.matches) {
                setIsMenuOpen(false);
            }
        };

        desktopMediaQuery.addEventListener('change', handleViewportChange);
        return () => {
            desktopMediaQuery.removeEventListener('change', handleViewportChange);
        };
    }, [isMenuOpen]);

    useEffect(() => {
        if (typeof window === 'undefined' || !isMenuOpen) {
            return;
        }

        const originalBodyOverflow = document.body.style.overflow;
        const originalBodyOverscrollBehavior = document.body.style.overscrollBehavior;
        const originalRootOverflow = document.documentElement.style.overflow;
        const originalRootOverscrollBehavior = document.documentElement.style.overscrollBehavior;

        document.body.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'contain';
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.overscrollBehavior = 'contain';

        return () => {
            document.body.style.overflow = originalBodyOverflow;
            document.body.style.overscrollBehavior = originalBodyOverscrollBehavior;
            document.documentElement.style.overflow = originalRootOverflow;
            document.documentElement.style.overscrollBehavior = originalRootOverscrollBehavior;
        };
    }, [isMenuOpen]);

    useEffect(() => {
        return () => {
            if (subMenuCloseTimer.current) {
                clearTimeout(subMenuCloseTimer.current);
                subMenuCloseTimer.current = null;
            }

            if (subMenuOpenTimer.current) {
                clearTimeout(subMenuOpenTimer.current);
                subMenuOpenTimer.current = null;
            }

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
        };
    }, []);

    /**
     * Stores one interaction mode for a desktop dropdown id.
     */
    const setDesktopDropdownMode = (menuId: string, mode: DropdownInteractionMode | null) => {
        setDesktopDropdownModes((previous) => updateDropdownInteractionModeState(previous, menuId, mode));
    };

    /**
     * Stores one interaction mode for a nested submenu id.
     */
    const setSubMenuMode = (key: string, mode: DropdownInteractionMode | null) => {
        setSubMenuModes((previous) => updateDropdownInteractionModeState(previous, key, mode));
    };

    /**
     * Resolves whether one desktop dropdown was explicitly committed via click or tap.
     */
    const isDesktopDropdownInteractive = (menuId: string): boolean =>
        isTouchInput || desktopDropdownModes[menuId] === 'interactive';

    /**
     * Resolves whether one desktop dropdown should keep pointer events enabled while open.
     */
    const isDesktopDropdownPointerEnabled = (menuId: string): boolean =>
        isTouchInput || Boolean(desktopDropdownModes[menuId]);

    /**
     * Resolves whether one nested submenu was explicitly committed via click or tap.
     */
    const isNestedSubMenuInteractive = (key: string): boolean => isTouchInput || subMenuModes[key] === 'interactive';

    /**
     * Resolves whether one nested submenu should capture pointer events.
     */
    const isNestedSubMenuPointerEnabled = (key: string): boolean => isTouchInput || Boolean(subMenuModes[key]);

    /**
     * Cancels the pending close timer for nested submenu branches.
     */
    const cancelSubMenuClose = () => {
        if (subMenuCloseTimer.current) {
            clearTimeout(subMenuCloseTimer.current);
            subMenuCloseTimer.current = null;
        }
    };

    /**
     * Cancels the pending hover-open timer for nested submenu branches.
     */
    const cancelSubMenuOpen = () => {
        if (subMenuOpenTimer.current) {
            clearTimeout(subMenuOpenTimer.current);
            subMenuOpenTimer.current = null;
        }
    };

    /**
     * Clears currently open nested submenu state and interaction modes.
     */
    const resetNestedDropdownState = () => {
        cancelSubMenuClose();
        cancelSubMenuOpen();
        setOpenSubMenu(null);
        setSubMenuModes({});
        setDesktopExpandedSubMenus({});
    };

    /**
     * Opens one nested submenu in the provided mode.
     */
    const openNestedSubMenu = (key: string, items: SubMenuItem[], rect: DOMRect, mode: DropdownInteractionMode) => {
        cancelSubMenuClose();
        cancelSubMenuOpen();
        setSubMenuMode(key, mode);
        setOpenSubMenu({
            key,
            rect,
            items,
        });
    };

    /**
     * Schedules a delayed close for one nested submenu branch.
     */
    const scheduleSubMenuClose = (key: string) => {
        cancelSubMenuClose();
        cancelSubMenuOpen();
        subMenuCloseTimer.current = setTimeout(() => {
            setOpenSubMenu((current) => (current?.key === key ? null : current));
            setSubMenuMode(key, null);
            subMenuCloseTimer.current = null;
        }, SUBMENU_CLOSE_DELAY_MS);
    };

    /**
     * Schedules one nested submenu to open as hover preview.
     */
    const scheduleSubMenuPreviewOpen = (key: string, items: SubMenuItem[], event: MouseEvent<HTMLDivElement>) => {
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
    };

    /**
     * Opens one nested submenu immediately in interactive mode.
     */
    const openInteractiveSubMenu = (key: string, items: SubMenuItem[], rect: DOMRect) => {
        openNestedSubMenu(key, items, rect, 'interactive');
    };

    /**
     * Keeps the nested submenu open while moving pointer between trigger and panel.
     */
    const keepSubMenuOpen = () => {
        cancelSubMenuClose();
        cancelSubMenuOpen();
    };

    /**
     * Handles leaving the floating nested submenu portal.
     */
    const handleSubMenuPortalLeave = () => {
        if (openSubMenu) {
            scheduleSubMenuClose(openSubMenu.key);
        }
    };

    /**
     * Cancels the pending hover-open timer of a header dropdown.
     */
    const cancelMenuOpen = (menuId: string) => {
        const pendingTimer = menuOpenTimers.current[menuId];
        if (pendingTimer) {
            clearTimeout(pendingTimer);
            menuOpenTimers.current[menuId] = null;
        }
    };

    /**
     * Schedules one header dropdown to open as hover preview.
     */
    const scheduleMenuPreviewOpen = (menuId: string, open: () => void) => {
        if (isTouchInput) {
            return;
        }

        cancelMenuOpen(menuId);
        menuOpenTimers.current[menuId] = setTimeout(() => {
            setDesktopDropdownMode(menuId, 'preview');
            open();
            menuOpenTimers.current[menuId] = null;
        }, HEADER_DROPDOWN_HOVER_OPEN_DELAY_MS);
    };

    /**
     * Opens one desktop dropdown immediately in interactive mode.
     */
    const openInteractiveDesktopDropdown = (menuId: string, open: () => void) => {
        cancelMenuOpen(menuId);
        cancelMenuClose(menuId);
        setDesktopDropdownMode(menuId, 'interactive');
        open();
    };

    /**
     * Closes one desktop dropdown immediately and clears interaction state.
     */
    const closeDesktopDropdownNow = (menuId: string, close: () => void) => {
        cancelMenuOpen(menuId);
        cancelMenuClose(menuId);
        setDesktopDropdownMode(menuId, null);
        close();
        resetNestedDropdownState();
    };

    /**
     * Begins hover-based preview opening for one desktop dropdown.
     */
    const startDesktopDropdownPreview = (menuId: string, isOpen: boolean, open: () => void) => {
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
    };

    /**
     * Cancels the pending close timer of a header dropdown.
     */
    const cancelMenuClose = (menuId: string) => {
        const pendingTimer = menuCloseTimers.current[menuId];
        if (pendingTimer) {
            clearTimeout(pendingTimer);
            menuCloseTimers.current[menuId] = null;
        }
    };

    /**
     * Schedules a delayed close for a header dropdown.
     */
    const scheduleMenuClose = (menuId: string, close: () => void) => {
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
    };

    useEffect(() => {
        if (!isTouchInput) {
            return;
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (!headerRef.current) {
                return;
            }

            if (headerRef.current.contains(event.target as Node)) {
                return;
            }

            setIsFederatedOpen(false);
            setIsAgentsOpen(false);
            setIsAgentViewOpen(false);
            setIsDocsOpen(false);
            setIsSystemOpen(false);
            setIsProfileOpen(false);
            setDesktopDropdownModes({});

            if (subMenuCloseTimer.current) {
                clearTimeout(subMenuCloseTimer.current);
                subMenuCloseTimer.current = null;
            }

            if (subMenuOpenTimer.current) {
                clearTimeout(subMenuOpenTimer.current);
                subMenuOpenTimer.current = null;
            }

            setOpenSubMenu(null);
            setSubMenuModes({});
            setDesktopExpandedSubMenus({});
        };

        document.addEventListener('pointerdown', handlePointerDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
        };
    }, [isTouchInput]);

    /**
     * Toggles one mobile submenu branch.
     */
    const toggleMobileSubMenu = (key: string) => {
        setMobileOpenSubMenus((previous) => ({
            ...previous,
            [key]: !previous[key],
        }));
    };

    /**
     * Toggles one desktop submenu branch for touch-based expansion.
     */
    const toggleDesktopSubMenu = (key: string) => {
        setDesktopExpandedSubMenus((previous) => ({
            ...previous,
            [key]: !previous[key],
        }));
    };

    /**
     * Closes one interactive submenu branch.
     */
    const closeInteractiveSubMenu = (key: string) => {
        setOpenSubMenu(null);
        setSubMenuMode(key, null);
    };

    /**
     * Closes the mobile drawer.
     */
    const closeMobileMenu = useCallback(() => {
        setIsMenuOpen(false);
    }, []);

    const { renderMobileNestedMenuItems, renderDesktopDropdownItems } = createHeaderDropdownRenderers({
        isTouchInput,
        openSubMenu,
        mobileOpenSubMenus,
        desktopExpandedSubMenus,
        dropdownPortalContainer,
        toggleMobileSubMenu,
        toggleDesktopSubMenu,
        closeMobileMenu,
        isNestedSubMenuInteractive,
        isNestedSubMenuPointerEnabled,
        scheduleSubMenuPreviewOpen,
        cancelMenuClose,
        scheduleSubMenuClose,
        openInteractiveSubMenu,
        closeInteractiveSubMenu,
        keepSubMenuOpen,
        handleSubMenuPortalLeave,
        scheduleMenuClose,
        fallbackNavigateToHref,
        isHeadless,
    });

    useEffect(() => {
        if (!isMenuOpen) {
            hasInitializedMobileDrawerRef.current = false;
            return;
        }

        if (hasInitializedMobileDrawerRef.current) {
            return;
        }

        hasInitializedMobileDrawerRef.current = true;

        if (hasHoistedMobileMenuItems) {
            setMobileOpenSubMenus((previous) => ({
                ...previous,
                [DEFAULT_HOISTED_MOBILE_MENU_KEY]: true,
            }));
        }
    }, [hasHoistedMobileMenuItems, isMenuOpen]);

    /**
     * Closes the agent-view dropdown after a selection.
     */
    const closeAgentViewDropdown = () => {
        closeDesktopDropdownNow('agent-view', () => setIsAgentViewOpen(false));
        setIsMenuOpen(false);
    };

    /**
     * Closes only the desktop breadcrumb agent-view dropdown.
     */
    const closeAgentViewDesktopDropdown = () => {
        closeDesktopDropdownNow('agent-view', () => setIsAgentViewOpen(false));
    };

    /**
     * Toggles the desktop breadcrumb agent-view dropdown, committing on click.
     */
    const toggleAgentViewDesktopDropdown = () => {
        if (isAgentViewOpen && isDesktopDropdownInteractive('agent-view')) {
            closeAgentViewDesktopDropdown();
            return;
        }

        openInteractiveDesktopDropdown('agent-view', () => setIsAgentViewOpen(true));
    };

    /**
     * Reflects whether the agent-view breadcrumb dropdown should keep pointer events enabled.
     */
    const isAgentViewDesktopPointerEnabled = isDesktopDropdownPointerEnabled('agent-view');

    /**
     * Closes the desktop agents hierarchy dropdown and the mobile drawer.
     */
    const closeAgentsDropdown = () => {
        closeDesktopDropdownNow('agents-hierarchy', () => setIsAgentsOpen(false));
        setIsMenuOpen(false);
    };

    /**
     * Toggles the desktop federated-server switcher dropdown, committing on click.
     */
    const toggleFederatedDesktopDropdown = () => {
        if (isFederatedOpen && isDesktopDropdownInteractive('federated-server-switcher')) {
            closeDesktopDropdownNow('federated-server-switcher', () => setIsFederatedOpen(false));
            return;
        }

        openInteractiveDesktopDropdown('federated-server-switcher', () => setIsFederatedOpen(true));
    };

    /**
     * Closes only the desktop federated-server switcher dropdown.
     */
    const closeFederatedDesktopDropdown = () => {
        closeDesktopDropdownNow('federated-server-switcher', () => setIsFederatedOpen(false));
    };

    /**
     * Reflects whether the federated dropdown should keep pointer events enabled.
     */
    const isFederatedDesktopPointerEnabled = isDesktopDropdownPointerEnabled('federated-server-switcher');

    /**
     * Closes only the desktop agents hierarchy dropdown.
     */
    const closeAgentsDesktopDropdown = () => {
        closeDesktopDropdownNow('agents-hierarchy', () => setIsAgentsOpen(false));
    };

    /**
     * Toggles the desktop agents hierarchy dropdown, committing on click.
     */
    const toggleAgentsDesktopDropdown = () => {
        if (isAgentsOpen && isDesktopDropdownInteractive('agents-hierarchy')) {
            closeAgentsDesktopDropdown();
            return;
        }

        openInteractiveDesktopDropdown('agents-hierarchy', () => setIsAgentsOpen(true));
    };

    /**
     * Reflects whether the agents hierarchy dropdown should keep pointer events enabled.
     */
    const isAgentsDesktopPointerEnabled = isDesktopDropdownPointerEnabled('agents-hierarchy');

    /**
     * Closes only the desktop profile dropdown.
     */
    const closeProfileDesktopDropdown = () => {
        closeDesktopDropdownNow('profile-menu', () => setIsProfileOpen(false));
    };

    /**
     * Toggles the desktop profile dropdown, committing on click.
     */
    const toggleProfileDesktopDropdown = () => {
        if (isProfileOpen && isDesktopDropdownInteractive('profile-menu')) {
            closeProfileDesktopDropdown();
            return;
        }

        openInteractiveDesktopDropdown('profile-menu', () => setIsProfileOpen(true));
    };

    /**
     * Reflects whether the profile dropdown should keep pointer events enabled.
     */
    const isProfileDesktopPointerEnabled = isDesktopDropdownPointerEnabled('profile-menu');

    return {
        closeAgentViewDesktopDropdown,
        closeAgentViewDropdown,
        closeAgentsDropdown,
        closeFederatedDesktopDropdown,
        closeMobileMenu,
        closeProfileDesktopDropdown,
        headerRef,
        isAgentViewDesktopPointerEnabled,
        isAgentViewOpen,
        isAgentsDesktopPointerEnabled,
        isAgentsOpen,
        isDocsOpen,
        isFederatedDesktopPointerEnabled,
        isFederatedOpen,
        isMenuOpen,
        isMobileAgentViewOpen,
        isMobileAgentsOpen,
        isMobileDocsOpen,
        isMobileSystemOpen,
        isProfileDesktopPointerEnabled,
        isProfileOpen,
        isSystemOpen,
        isTouchInput,
        mobileMenuDrawerRef,
        openInteractiveDesktopDropdown,
        renderDesktopDropdownItems,
        renderMobileNestedMenuItems,
        scheduleMenuClose,
        startDesktopDropdownPreview,
        cancelMenuClose,
        setIsAgentViewOpen,
        setIsAgentsOpen,
        setIsDocsOpen,
        setIsFederatedOpen,
        setIsMenuOpen,
        setIsMobileAgentViewOpen,
        setIsMobileAgentsOpen,
        setIsMobileDocsOpen,
        setIsMobileSystemOpen,
        setIsProfileOpen,
        setIsSystemOpen,
        toggleAgentViewDesktopDropdown,
        toggleAgentsDesktopDropdown,
        toggleFederatedDesktopDropdown,
        toggleProfileDesktopDropdown,
        closeDesktopDropdownNow,
        isDesktopDropdownInteractive,
        isDesktopDropdownPointerEnabled,
    };
}
