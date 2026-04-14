import { DEFAULT_FOLDER_COLOR, DEFAULT_FOLDER_ICON } from '../../utils/agentOrganization/folderAppearance';
import type { AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import type { FolderEditValues } from './FolderEditDialog';

/**
 * State for create/edit folder dialog interactions.
 *
 * @private function of AgentsList
 */
export type FolderEditDialogState = {
    readonly mode: 'CREATE' | 'EDIT';
    readonly folderId: number | null;
    readonly initialValues: FolderEditValues;
};

/**
 * Creates the initial values shown in the folder dialog.
 *
 * @param folder - Optional folder whose values should seed the dialog.
 * @returns Folder edit form values.
 *
 * @private function of AgentsList
 */
function createFolderEditInitialValues(folder?: AgentOrganizationFolder | null): FolderEditValues {
    return {
        name: folder?.name ?? '',
        icon: folder?.icon ?? DEFAULT_FOLDER_ICON,
        color: folder?.color ?? DEFAULT_FOLDER_COLOR,
    };
}

/**
 * Creates create/edit dialog state for folder operations.
 *
 * @param mode - Dialog mode.
 * @param folderId - Edited folder id or null for create mode.
 * @param folder - Optional folder used to seed edit defaults.
 * @returns Dialog state object.
 *
 * @private function of AgentsList
 */
export function createFolderEditDialogState(
    mode: FolderEditDialogState['mode'],
    folderId: number | null,
    folder?: AgentOrganizationFolder | null,
): FolderEditDialogState {
    return {
        mode,
        folderId,
        initialValues: createFolderEditInitialValues(folder),
    };
}
