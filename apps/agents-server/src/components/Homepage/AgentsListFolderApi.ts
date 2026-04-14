import type { AgentOrganizationFolder } from '../../utils/agentOrganization/types';
import type { AgentVisibility } from '../../utils/agentVisibility';
import type { FolderEditValues } from './FolderEditDialog';

/**
 * Shape of JSON payloads returned by the folder API endpoints.
 *
 * @private function of AgentsList
 */
type FolderApiPayload = {
    readonly error?: string;
    readonly folder?: AgentOrganizationFolder;
    readonly success?: boolean;
};

/**
 * Shared headers for JSON folder mutation requests.
 *
 * @private function of AgentsList
 */
const JSON_HEADERS = {
    'Content-Type': 'application/json',
};

/**
 * Parses a folder API JSON payload while tolerating empty error bodies.
 *
 * @param response - Browser fetch response from a folder endpoint.
 * @returns Parsed folder payload or an empty object when the body is not JSON.
 *
 * @private function of AgentsList
 */
async function readFolderApiPayload(response: Response): Promise<FolderApiPayload> {
    return (await response.json().catch(() => ({}))) as FolderApiPayload;
}

/**
 * Resolves the most helpful folder API error message available in one payload.
 *
 * @param payload - Parsed folder API payload.
 * @param fallbackMessage - Fallback message when the payload has no error text.
 * @returns Error instance describing the failed request.
 *
 * @private function of AgentsList
 */
function createFolderApiError(payload: FolderApiPayload, fallbackMessage: string): Error {
    return new Error(payload.error || fallbackMessage);
}

/**
 * Browser-side folder mutation helpers for the homepage list flows.
 *
 * @private function of AgentsList
 */
export const AgentsListFolderApi = {
    /**
     * Creates a new folder within the requested parent folder.
     *
     * @param parentId - Parent folder or `null` for the root level.
     * @param values - Submitted folder dialog values.
     * @returns Persisted folder returned by the API.
     *
     * @private function of AgentsList
     */
    async createFolder(parentId: number | null, values: FolderEditValues): Promise<AgentOrganizationFolder> {
        const response = await fetch('/api/agent-folders', {
            method: 'POST',
            headers: JSON_HEADERS,
            body: JSON.stringify({
                name: values.name,
                parentId,
                icon: values.icon,
                color: values.color,
            }),
        });
        const payload = await readFolderApiPayload(response);

        if (!response.ok || !payload.folder) {
            throw createFolderApiError(payload, 'Failed to create folder.');
        }

        return payload.folder;
    },

    /**
     * Updates one existing folder from dialog values.
     *
     * @param folderId - Folder being edited.
     * @param values - Submitted folder dialog values.
     * @returns Persisted folder returned by the API.
     *
     * @private function of AgentsList
     */
    async updateFolder(folderId: number, values: FolderEditValues): Promise<AgentOrganizationFolder> {
        const response = await fetch(`/api/agent-folders/${folderId}`, {
            method: 'PATCH',
            headers: JSON_HEADERS,
            body: JSON.stringify({
                name: values.name,
                icon: values.icon,
                color: values.color,
            }),
        });
        const payload = await readFolderApiPayload(response);

        if (!response.ok || !payload.folder) {
            throw createFolderApiError(payload, 'Failed to update folder.');
        }

        return payload.folder;
    },

    /**
     * Deletes one folder subtree.
     *
     * @param folderId - Folder being deleted.
     * @returns Resolves when the server confirms the deletion.
     *
     * @private function of AgentsList
     */
    async deleteFolder(folderId: number): Promise<void> {
        const response = await fetch(`/api/agent-folders/${folderId}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            return;
        }

        const payload = await readFolderApiPayload(response);
        throw createFolderApiError(payload, 'Failed to delete folder.');
    },

    /**
     * Updates visibility for one folder subtree.
     *
     * @param folderId - Folder whose subtree visibility should change.
     * @param visibility - Visibility to persist.
     * @returns Resolves when the API confirms the subtree update.
     *
     * @private function of AgentsList
     */
    async updateFolderVisibility(folderId: number, visibility: AgentVisibility): Promise<void> {
        const response = await fetch(`/api/agent-folders/${folderId}/visibility`, {
            method: 'PATCH',
            headers: JSON_HEADERS,
            body: JSON.stringify({ visibility }),
        });
        const payload = await readFolderApiPayload(response);

        if (!response.ok || !payload.success) {
            throw createFolderApiError(payload, 'Failed to update folder visibility.');
        }
    },
};
