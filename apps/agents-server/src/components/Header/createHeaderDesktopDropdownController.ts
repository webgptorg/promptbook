/**
 * Inputs required to assemble one repeated desktop dropdown controller.
 *
 * @private type of Header
 */
type CreateHeaderDesktopDropdownControllerProps = {
    readonly menuId: string;
    readonly isOpen: boolean;
    readonly setIsOpen: (isOpen: boolean) => void;
    readonly closeDesktopDropdownNow: (menuId: string, close: () => void) => void;
    readonly isDesktopDropdownInteractive: (menuId: string) => boolean;
    readonly isDesktopDropdownPointerEnabled: (menuId: string) => boolean;
    readonly openInteractiveDesktopDropdown: (menuId: string, open: () => void) => void;
    readonly closeMobileMenu?: () => void;
};

/**
 * Creates the repeated close/toggle/pointer helpers shared by individual desktop dropdown menus.
 *
 * @private function of Header
 */
export function createHeaderDesktopDropdownController({
    menuId,
    isOpen,
    setIsOpen,
    closeDesktopDropdownNow,
    isDesktopDropdownInteractive,
    isDesktopDropdownPointerEnabled,
    openInteractiveDesktopDropdown,
    closeMobileMenu,
}: CreateHeaderDesktopDropdownControllerProps) {
    /**
     * Closes only the desktop dropdown branch associated with the current menu.
     */
    const closeDesktopDropdown = () => {
        closeDesktopDropdownNow(menuId, () => setIsOpen(false));
    };

    /**
     * Closes the desktop dropdown and, when relevant, the mobile drawer.
     */
    const closeDropdown = () => {
        closeDesktopDropdown();
        closeMobileMenu?.();
    };

    /**
     * Toggles the desktop dropdown, committing the menu when it was opened via click or tap.
     */
    const toggleDesktopDropdown = () => {
        if (isOpen && isDesktopDropdownInteractive(menuId)) {
            closeDesktopDropdown();
            return;
        }

        openInteractiveDesktopDropdown(menuId, () => setIsOpen(true));
    };

    return {
        closeDesktopDropdown,
        closeDropdown,
        isDesktopPointerEnabled: isDesktopDropdownPointerEnabled(menuId),
        toggleDesktopDropdown,
    };
}
