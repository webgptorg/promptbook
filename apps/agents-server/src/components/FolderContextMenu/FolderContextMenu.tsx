'use client';

import { FolderOpenIcon, PencilIcon, SquareSplitHorizontalIcon, TrashIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useMemo, useRef } from 'react';
import type { AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import { ContextMenuPanel, type ContextMenuItem } from '../ContextMenu/ContextMenuPanel';
import {
    type ContextMenuAnchorPoint,
    useClampedMenuPosition,
    useCloseOnOutsideClick,
} from '../ContextMenu/contextMenuUtils';

/**
 * Props for the right-click folder context menu popover.
 */
type FolderContextMenuPopoverProps = {
    /**
     * Folder currently targeted by the menu.
     */
    readonly folder: AgentOrganizationFolder;
    /**
     * Whether the menu is currently visible.
     */
    readonly isOpen: boolean;
    /**
     * Cursor anchor position for menu placement.
     */
    readonly anchorPoint: ContextMenuAnchorPoint | null;
    /**
     * Callback used to close the menu.
     */
    readonly onClose: () => void;
    /**
     * Callback used to open the selected folder.
     */
    readonly onOpenFolder: () => void;
    /**
     * Optional callback used to rename the selected folder.
     */
    readonly onRenameFolder?: () => void;
    /**
     * Optional callback used to delete the selected folder.
     */
    readonly onDeleteFolder?: () => void;
    /**
     * Optional callback triggered when the visibility update action is selected.
     */
    readonly onRequestVisibilityUpdate?: () => void;
};

/**
 * Renders the folder context menu at the cursor position.
 */
export function FolderContextMenuPopover(props: FolderContextMenuPopoverProps) {
    const { folder, isOpen, anchorPoint, onClose, onOpenFolder, onRenameFolder, onDeleteFolder, onRequestVisibilityUpdate } =
        props;
    const menuRef = useRef<HTMLDivElement>(null);
    const clampedPosition = useClampedMenuPosition(anchorPoint, isOpen, menuRef);

    useCloseOnOutsideClick(menuRef, onClose, isOpen);

    const menuItems = useMemo<ContextMenuItem[]>(
        () => [
            {
                type: 'action',
                icon: FolderOpenIcon,
                label: `Open Folder: ${folder.name}`,
                onClick: onOpenFolder,
                closeOnClick: true,
            },
            ...(onRenameFolder || onDeleteFolder ? [{ type: 'divider' as const }] : []),
            ...(onRenameFolder
                ? [
                      {
                          type: 'action' as const,
                          icon: PencilIcon,
                          label: 'Edit Folder',
                          onClick: onRenameFolder,
                          closeOnClick: true,
                      },
                  ]
                : []),
            ...(onDeleteFolder
                ? [
                      {
                          type: 'action' as const,
                          icon: TrashIcon,
                          label: 'Delete Folder',
                          onClick: onDeleteFolder,
                          closeOnClick: true,
                      },
                  ]
                : []),
            ...(onRequestVisibilityUpdate
                ? [
                      { type: 'divider' as const },
                      {
                          type: 'action' as const,
                          icon: SquareSplitHorizontalIcon,
                          label: 'Update subtree visibility',
                          onClick: onRequestVisibilityUpdate,
                          closeOnClick: true,
                      },
                  ]
                : []),
        ],
        [folder.name, onDeleteFolder, onOpenFolder, onRenameFolder, onRequestVisibilityUpdate],
    );

    if (!isOpen || !anchorPoint) {
        return null;
    }

    const style: CSSProperties | undefined = clampedPosition
        ? { left: clampedPosition.x, top: clampedPosition.y }
        : { left: anchorPoint.x, top: anchorPoint.y };

    return (
        <div ref={menuRef} className="fixed z-40" style={style}>
            <ContextMenuPanel menuItems={menuItems} onClose={onClose} />
        </div>
    );
}
