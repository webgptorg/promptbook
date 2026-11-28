import { useEffect, useRef, useState } from 'react';
import { createHeaderDesktopDropdownController } from './createHeaderDesktopDropdownController';
import { createHeaderDropdownRenderers } from './createHeaderDropdownRenderers';
import { useHeaderDesktopDropdownState } from './useHeaderDesktopDropdownState';
import { useHeaderDropdownPortalContainer } from './useHeaderDropdownPortalContainer';
import { useHeaderMobileMenuState } from './useHeaderMobileMenuState';
import { useHeaderNestedDropdownState } from './useHeaderNestedDropdownState';
import { useHeaderTouchInput } from './useHeaderTouchInput';

/**
 * Menu key opened by default for hoisted mobile sections on the first drawer open.
 */
const DEFAULT_HOISTED_MOBILE_MENU_KEY = 'mobile-hoisted-menu-0';

/**
 * Inputs required to assemble the shared header dropdown state.
 *
 * @private type of Header
 */
type UseHeaderDropdownStateProps = {
    readonly hasHoistedMobileMenuItems: boolean;
};

/**
 * Manages shared desktop/mobile dropdown state, timers, and swipe interactions for the header.
 *
 * @private function of Header
 */
export function useHeaderDropdownState({
    hasHoistedMobileMenuItems,
}: UseHeaderDropdownStateProps) {
    const [isAgentsOpen, setIsAgentsOpen] = useState(false);
    const [isAgentViewOpen, setIsAgentViewOpen] = useState(false);
    const [isDocsOpen, setIsDocsOpen] = useState(false);
    const [isSystemOpen, setIsSystemOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isFederatedOpen, setIsFederatedOpen] = useState(false);
    const headerRef = useRef<HTMLElement | null>(null);
    const dropdownPortalContainer = useHeaderDropdownPortalContainer();
    const isTouchInput = useHeaderTouchInput();
    const {
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
    } = useHeaderNestedDropdownState({ isTouchInput });
    const {
        cancelMenuClose,
        closeDesktopDropdownNow,
        isDesktopDropdownInteractive,
        isDesktopDropdownPointerEnabled,
        openInteractiveDesktopDropdown,
        resetDesktopDropdownState,
        scheduleMenuClose,
        startDesktopDropdownPreview,
    } = useHeaderDesktopDropdownState({
        isTouchInput,
        resetNestedDropdownState,
    });
    const {
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
    } = useHeaderMobileMenuState({
        defaultOpenSubMenuKey: hasHoistedMobileMenuItems ? DEFAULT_HOISTED_MOBILE_MENU_KEY : null,
        openMobileSubMenu,
        resetMobileSubMenus,
    });

    useEffect(() => {
        if (!isDocsOpen && !isSystemOpen && !isAgentViewOpen) {
            resetNestedDropdownState();
        }
    }, [isAgentViewOpen, isDocsOpen, isSystemOpen, resetNestedDropdownState]);

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
            resetDesktopDropdownState();
            resetNestedDropdownState();
        };

        document.addEventListener('pointerdown', handlePointerDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
        };
    }, [isTouchInput, resetDesktopDropdownState, resetNestedDropdownState]);

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
    });
    const agentViewDesktopDropdown = createHeaderDesktopDropdownController({
        closeDesktopDropdownNow,
        closeMobileMenu,
        isDesktopDropdownInteractive,
        isDesktopDropdownPointerEnabled,
        isOpen: isAgentViewOpen,
        menuId: 'agent-view',
        openInteractiveDesktopDropdown,
        setIsOpen: setIsAgentViewOpen,
    });
    const agentsDesktopDropdown = createHeaderDesktopDropdownController({
        closeDesktopDropdownNow,
        closeMobileMenu,
        isDesktopDropdownInteractive,
        isDesktopDropdownPointerEnabled,
        isOpen: isAgentsOpen,
        menuId: 'agents-hierarchy',
        openInteractiveDesktopDropdown,
        setIsOpen: setIsAgentsOpen,
    });
    const federatedDesktopDropdown = createHeaderDesktopDropdownController({
        closeDesktopDropdownNow,
        isDesktopDropdownInteractive,
        isDesktopDropdownPointerEnabled,
        isOpen: isFederatedOpen,
        menuId: 'federated-server-switcher',
        openInteractiveDesktopDropdown,
        setIsOpen: setIsFederatedOpen,
    });
    const profileDesktopDropdown = createHeaderDesktopDropdownController({
        closeDesktopDropdownNow,
        isDesktopDropdownInteractive,
        isDesktopDropdownPointerEnabled,
        isOpen: isProfileOpen,
        menuId: 'profile-menu',
        openInteractiveDesktopDropdown,
        setIsOpen: setIsProfileOpen,
    });

    return {
        closeAgentViewDesktopDropdown: agentViewDesktopDropdown.closeDesktopDropdown,
        closeAgentViewDropdown: agentViewDesktopDropdown.closeDropdown,
        closeAgentsDropdown: agentsDesktopDropdown.closeDropdown,
        closeFederatedDesktopDropdown: federatedDesktopDropdown.closeDesktopDropdown,
        closeMobileMenu,
        closeProfileDesktopDropdown: profileDesktopDropdown.closeDesktopDropdown,
        headerRef,
        isAgentViewDesktopPointerEnabled: agentViewDesktopDropdown.isDesktopPointerEnabled,
        isAgentViewOpen,
        isAgentsDesktopPointerEnabled: agentsDesktopDropdown.isDesktopPointerEnabled,
        isAgentsOpen,
        isDocsOpen,
        isFederatedDesktopPointerEnabled: federatedDesktopDropdown.isDesktopPointerEnabled,
        isFederatedOpen,
        isMenuOpen,
        isMobileAgentViewOpen,
        isMobileAgentsOpen,
        isMobileDocsOpen,
        isMobileSystemOpen,
        isProfileDesktopPointerEnabled: profileDesktopDropdown.isDesktopPointerEnabled,
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
        toggleAgentViewDesktopDropdown: agentViewDesktopDropdown.toggleDesktopDropdown,
        toggleAgentsDesktopDropdown: agentsDesktopDropdown.toggleDesktopDropdown,
        toggleFederatedDesktopDropdown: federatedDesktopDropdown.toggleDesktopDropdown,
        toggleProfileDesktopDropdown: profileDesktopDropdown.toggleDesktopDropdown,
        closeDesktopDropdownNow,
        isDesktopDropdownInteractive,
        isDesktopDropdownPointerEnabled,
    };
}
