import type { ContextMenuItem } from '../ContextMenu/ContextMenuPanel';
import type { SubMenuItem } from './SubMenuItem';

/**
 * Converts one non-divider context menu item into a submenu item while preserving
 * the original icon so header dropdowns can render the same visuals as the profile menu.
 *
 * @param item - Action or link context menu item.
 * @returns Matching submenu item definition for header dropdown rendering.
 */
function createSubMenuItemFromContextMenuItem(item: Exclude<ContextMenuItem, { type: 'divider' }>): SubMenuItem {
    if (item.type === 'link') {
        return {
            label: item.label,
            icon: item.icon,
            href: item.href,
        };
    }

    return {
        label: item.label,
        icon: item.icon,
        onClick: item.onClick,
    };
}

/**
 * Converts context menu items into submenu entries for the agent view dropdown.
 *
 * @param menuItems - Context menu entries to map.
 * @returns View submenu items with divider boundaries preserved as borders.
 */
export function mapContextMenuItemsToSubMenuItems(menuItems: ReadonlyArray<ContextMenuItem>): SubMenuItem[] {
    const items: SubMenuItem[] = [];
    let lastItemIndex = -1;

    menuItems.forEach((item) => {
        if (item.type === 'divider') {
            const previousItem = lastItemIndex >= 0 ? items[lastItemIndex] : undefined;
            if (previousItem) {
                items[lastItemIndex] = { ...previousItem, isBordered: true };
            }
            return;
        }

        items.push(createSubMenuItemFromContextMenuItem(item));
        lastItemIndex = items.length - 1;
    });

    return items;
}
