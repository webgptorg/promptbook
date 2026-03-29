import { CopyIcon, MailIcon } from 'lucide-react';
import type { ContextMenuItem } from '../ContextMenu/ContextMenuPanel';
import { mapContextMenuItemsToSubMenuItems } from './mapContextMenuItemsToSubMenuItems';

describe('mapContextMenuItemsToSubMenuItems', () => {
    it('preserves context-menu icons for breadcrumb More submenu items', () => {
        const handleCopy = jest.fn();
        const menuItems: ContextMenuItem[] = [
            {
                type: 'action',
                icon: CopyIcon,
                label: 'Copy Agent URL',
                onClick: handleCopy,
            },
            { type: 'divider' },
            {
                type: 'link',
                href: '/agents/demo',
                icon: MailIcon,
                label: 'Copy Agent Email',
            },
        ];

        expect(mapContextMenuItemsToSubMenuItems(menuItems)).toEqual([
            {
                label: 'Copy Agent URL',
                icon: CopyIcon,
                onClick: handleCopy,
                isBordered: true,
            },
            {
                label: 'Copy Agent Email',
                icon: MailIcon,
                href: '/agents/demo',
            },
        ]);
    });
});
