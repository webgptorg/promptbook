import { useCallback, useEffect, useRef, useState } from 'react';

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
 * Inputs required to manage shared mobile drawer state and effects.
 *
 * @private type of Header
 */
type UseHeaderMobileMenuStateProps = {
    readonly defaultOpenSubMenuKey: string | null;
    readonly openMobileSubMenu: (key: string) => void;
    readonly resetMobileSubMenus: () => void;
};

/**
 * Manages the mobile header drawer state, viewport side effects, and swipe gestures.
 *
 * @private function of Header
 */
export function useHeaderMobileMenuState({
    defaultOpenSubMenuKey,
    openMobileSubMenu,
    resetMobileSubMenus,
}: UseHeaderMobileMenuStateProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMobileAgentsOpen, setIsMobileAgentsOpen] = useState(false);
    const [isMobileAgentViewOpen, setIsMobileAgentViewOpen] = useState(false);
    const [isMobileDocsOpen, setIsMobileDocsOpen] = useState(false);
    const [isMobileSystemOpen, setIsMobileSystemOpen] = useState(false);
    const mobileMenuDrawerRef = useRef<HTMLDivElement | null>(null);
    const mobileMenuSwipeGestureRef = useRef<MobileMenuSwipeGesture | null>(null);
    const hasInitializedMobileDrawerRef = useRef(false);

    /**
     * Closes the mobile drawer.
     */
    const closeMobileMenu = useCallback(() => {
        setIsMenuOpen(false);
    }, []);

    useEffect(() => {
        if (!isMenuOpen) {
            resetMobileSubMenus();
            setIsMobileAgentsOpen(false);
            setIsMobileAgentViewOpen(false);
            setIsMobileDocsOpen(false);
            setIsMobileSystemOpen(false);
        }
    }, [isMenuOpen, resetMobileSubMenus]);

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
        if (!isMenuOpen) {
            hasInitializedMobileDrawerRef.current = false;
            return;
        }

        if (hasInitializedMobileDrawerRef.current) {
            return;
        }

        hasInitializedMobileDrawerRef.current = true;

        if (defaultOpenSubMenuKey) {
            openMobileSubMenu(defaultOpenSubMenuKey);
        }
    }, [defaultOpenSubMenuKey, isMenuOpen, openMobileSubMenu]);

    return {
        closeMobileMenu,
        isMenuOpen,
        isMobileAgentViewOpen,
        isMobileAgentsOpen,
        isMobileDocsOpen,
        isMobileSystemOpen,
        mobileMenuDrawerRef,
        setIsMenuOpen,
        setIsMobileAgentViewOpen,
        setIsMobileAgentsOpen,
        setIsMobileDocsOpen,
        setIsMobileSystemOpen,
    };
}
