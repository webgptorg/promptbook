import type { ComponentType, ReactNode } from 'react';

/**
 * Shape of one entry rendered in nested header dropdowns and mobile menu trees.
 *
 * @private type of Header
 */
export type SubMenuItem = {
    label: ReactNode;
    icon?: ComponentType<{ className?: string }>;
    href?: string;
    onClick?: () => void | Promise<void>;
    isBold?: boolean;
    isBordered?: boolean;
    items?: SubMenuItem[];
};
