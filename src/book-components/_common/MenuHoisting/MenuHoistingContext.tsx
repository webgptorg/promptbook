import { createContext, ReactNode, useContext, useState } from 'react';

/**
 * Item that can be hoisted to the top menu
 *
 * @private mechanism inside Promptbook
 */
export type HoistedMenuItem = {
    /**
     * Unique key for the menu item
     */
    key?: string;

    /**
     * Icon to display
     */
    icon: ReactNode;

    /**
     * Name/Tooltip of the item
     */
    name: string;

    /**
     * Action to perform when clicked
     */
    onClick: () => void;

    /**
     * If true, the item is active/toggled
     */
    isActive?: boolean;
};

/**
 * Shared actions provided to hoisted mobile menu-section renderers.
 *
 * @private mechanism inside Promptbook
 */
export type HoistedMobileMenuSectionRenderOptions = {
    /**
     * Closes the owning mobile header menu.
     */
    readonly closeMenu: () => void;
};

/**
 * Mobile-only section hoisted into the shared application menu.
 *
 * @private mechanism inside Promptbook
 */
export type HoistedMobileMenuSection = {
    /**
     * Stable identifier used to preserve section open state.
     */
    readonly key: string;

    /**
     * Visible section label rendered by the mobile menu.
     */
    readonly label: ReactNode;

    /**
     * Whether the section should start expanded whenever the menu opens.
     */
    readonly isDefaultOpen?: boolean;

    /**
     * Lazily renders section content inside the mobile header menu.
     */
    readonly renderContent: (options: HoistedMobileMenuSectionRenderOptions) => ReactNode;
};

/**
 * Value exposed through the shared menu-hoisting context.
 *
 * @private mechanism inside Promptbook
 */
type MenuHoistingContextType = {
    /**
     * The currently hoisted menu items
     */
    menu: HoistedMenuItem[];

    /**
     * Set the hoisted menu items
     */
    setMenu: (items: HoistedMenuItem[]) => void;

    /**
     * Mobile-only sections hoisted into the shared application menu.
     */
    mobileMenuSections: HoistedMobileMenuSection[];

    /**
     * Sets the mobile-only hoisted menu sections.
     */
    setMobileMenuSections: (sections: HoistedMobileMenuSection[]) => void;
};

const MenuHoistingContext = createContext<MenuHoistingContextType | null>(null);

/**
 * Provider for menu hoisting
 *
 * @private mechanism inside Promptbook
 */
export function MenuHoistingProvider({ children }: { children: ReactNode }) {
    const [menu, setMenu] = useState<HoistedMenuItem[]>([]);
    const [mobileMenuSections, setMobileMenuSections] = useState<HoistedMobileMenuSection[]>([]);

    return (
        <MenuHoistingContext.Provider value={{ menu, setMenu, mobileMenuSections, setMobileMenuSections }}>
            {children}
        </MenuHoistingContext.Provider>
    );
}

/**
 * Hook to use the menu hoisting system
 *
 * @private mechanism inside Promptbook
 */
export function useMenuHoisting() {
    return useContext(MenuHoistingContext);
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
