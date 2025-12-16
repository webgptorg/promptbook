import { createContext, ReactNode, useContext, useState } from 'react';

/**
 * Item that can be hoisted to the top menu
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

type MenuHoistingContextType = {
    /**
     * The currently hoisted menu items
     */
    menu: HoistedMenuItem[];

    /**
     * Set the hoisted menu items
     */
    setMenu: (items: HoistedMenuItem[]) => void;
};

const MenuHoistingContext = createContext<MenuHoistingContextType | null>(null);

/**
 * Provider for menu hoisting
 */
export function MenuHoistingProvider({ children }: { children: ReactNode }) {
    const [menu, setMenu] = useState<HoistedMenuItem[]>([]);

    return <MenuHoistingContext.Provider value={{ menu, setMenu }}>{children}</MenuHoistingContext.Provider>;
}

/**
 * Hook to use the menu hoisting system
 */
export function useMenuHoisting() {
    return useContext(MenuHoistingContext);
}
