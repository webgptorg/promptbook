import type { ReactNode } from 'react';

/**
 * @private Describes a single entry within header dropdowns or mobile navigation stacks.
 */
export type SubMenuItem = {
    /** Primary rendered label. */
    label: ReactNode;
    /** Optional target link for navigation. */
    href?: string;
    /** Optional action invoked when the entry is selected. */
    onClick?: () => void | Promise<void>;
    /** When true, renders with stronger visual emphasis. */
    isBold?: boolean;
    /** When true, renders a dividing border below the entry. */
    isBordered?: boolean;
    /** Nested submenu entries. */
    items?: SubMenuItem[];
};

/**
 * @private Shared metadata used by every header menu entry.
 */
export type MenuItemBase = {
    /** @private Unique identifier used for hover timers and coordinated actions. */
    readonly id: string;
};

/**
 * @private Represents either a simple link or a stateful dropdown rendered inside the header.
 */
export type MenuItem =
    | (MenuItemBase & {
          type: 'link';
          label: ReactNode;
          href: string;
      })
    | (MenuItemBase & {
          type: 'dropdown';
          label: ReactNode;
          isOpen: boolean;
          setIsOpen: (isOpen: boolean) => void;
          isMobileOpen: boolean;
          setIsMobileOpen: (isOpen: boolean) => void;
          items: Array<SubMenuItem>;
          renderMenu?: () => ReactNode;
      });

/**
 * @private Tracks which submenu is currently expanded along with the anchor rectangle.
 */
export type OpenSubMenuState = {
    key: string;
    rect: DOMRect;
    items: SubMenuItem[];
};
