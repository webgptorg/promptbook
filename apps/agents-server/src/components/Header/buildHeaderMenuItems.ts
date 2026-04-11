import type { MenuItem } from './HeaderTypes';
import type { SubMenuItem } from './SubMenuItem';

/**
 * Shared setter signature used by top-level header dropdown entries.
 *
 * @private type of Header
 */
type HeaderMenuSetter = (isOpen: boolean) => void;

/**
 * Inputs required to build one top-level dropdown menu item.
 *
 * @private type of Header
 */
type HeaderDropdownMenuItemConfig = {
    readonly id: string;
    readonly isMobileOpen: boolean;
    readonly isOpen: boolean;
    readonly items: ReadonlyArray<SubMenuItem>;
    readonly label: MenuItem['label'];
    readonly setIsMobileOpen: HeaderMenuSetter;
    readonly setIsOpen: HeaderMenuSetter;
};

/**
 * Inputs required to assemble the desktop/mobile top-menu items shown near the control panel.
 *
 * @private type of Header
 */
type BuildHeaderMenuItemsOptions = {
    readonly documentationDropdownItems: ReadonlyArray<SubMenuItem>;
    readonly documentationLabel: MenuItem['label'];
    readonly hasMenuAccess: boolean;
    readonly isMobileDocsOpen: boolean;
    readonly isMobileSystemOpen: boolean;
    readonly isDocsOpen: boolean;
    readonly isSystemOpen: boolean;
    readonly setIsDocsOpen: HeaderMenuSetter;
    readonly setIsMobileDocsOpen: HeaderMenuSetter;
    readonly setIsMobileSystemOpen: HeaderMenuSetter;
    readonly setIsSystemOpen: HeaderMenuSetter;
    readonly systemLabel: MenuItem['label'];
    readonly systemMenuEntries: ReadonlyArray<SubMenuItem>;
};

/**
 * Creates one dropdown-style top-level header menu item.
 *
 * @private function of Header
 */
function createHeaderDropdownMenuItem({
    id,
    isMobileOpen,
    isOpen,
    items,
    label,
    setIsMobileOpen,
    setIsOpen,
}: HeaderDropdownMenuItemConfig): MenuItem {
    return {
        type: 'dropdown',
        id,
        label,
        isOpen,
        setIsOpen,
        isMobileOpen,
        setIsMobileOpen,
        items: [...items],
    };
}

/**
 * Builds the top-level Documentation and System menu entries for the header.
 *
 * @private function of Header
 */
export function buildHeaderMenuItems({
    documentationDropdownItems,
    documentationLabel,
    hasMenuAccess,
    isMobileDocsOpen,
    isMobileSystemOpen,
    isDocsOpen,
    isSystemOpen,
    setIsDocsOpen,
    setIsMobileDocsOpen,
    setIsMobileSystemOpen,
    setIsSystemOpen,
    systemLabel,
    systemMenuEntries,
}: BuildHeaderMenuItemsOptions): MenuItem[] {
    const items: MenuItem[] = [];

    if (hasMenuAccess) {
        items.push(
            createHeaderDropdownMenuItem({
                id: 'documentation',
                label: documentationLabel,
                items: documentationDropdownItems,
                isOpen: isDocsOpen,
                setIsOpen: setIsDocsOpen,
                isMobileOpen: isMobileDocsOpen,
                setIsMobileOpen: setIsMobileDocsOpen,
            }),
        );
    }

    if (systemMenuEntries.length > 0) {
        items.push(
            createHeaderDropdownMenuItem({
                id: 'system',
                label: systemLabel,
                items: systemMenuEntries,
                isOpen: isSystemOpen,
                setIsOpen: setIsSystemOpen,
                isMobileOpen: isMobileSystemOpen,
                setIsMobileOpen: setIsMobileSystemOpen,
            }),
        );
    }

    return items;
}
