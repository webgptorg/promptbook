import type { ReactNode } from 'react';

/**
 * One hierarchical menu item rendered inside header dropdowns.
 *
 * @private internal menu model of <Header/>
 */
export type SubMenuItem = {
    label: ReactNode;
    href?: string;
    onClick?: () => void | Promise<void>;
    isBold?: boolean;
    isBordered?: boolean;
    items?: SubMenuItem[];
};
