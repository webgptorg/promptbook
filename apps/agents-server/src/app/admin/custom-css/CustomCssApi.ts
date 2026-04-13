import { readJsonResponse } from '../custom-resource/shared';
import {
    resolveLoadedCustomCssState,
    type CustomStylesheetFilePayload,
    type CustomStylesheetFileState,
    type LoadedCustomCssState,
} from './CustomStylesheetFileState';

/**
 * API payload returned by `GET /api/custom-css`.
 *
 * @private function of useCustomCssClientState
 */
type CustomCssReadResponse = {
    files: CustomStylesheetFilePayload[];
    maxLength: number;
    error?: string;
};

/**
 * API payload returned by `POST`/`PUT /api/custom-css`.
 *
 * @private function of useCustomCssClientState
 */
type CustomCssSaveResponse = {
    file: CustomStylesheetFilePayload;
    maxLength: number;
    error?: string;
};

/**
 * API payload returned by `DELETE /api/custom-css`.
 *
 * @private function of useCustomCssClientState
 */
type CustomCssDeleteResponse = {
    success: true;
    error?: string;
};

/**
 * Builds the API request payload for saving one stylesheet.
 *
 * @private function of useCustomCssClientState
 */
function createCustomCssSaveRequest(currentFile: CustomStylesheetFileState): { method: 'POST' | 'PUT'; body: string } {
    const trimmedScope = currentFile.scope.trim();
    const payload =
        currentFile.id !== undefined
            ? {
                  id: currentFile.id,
                  scope: trimmedScope,
                  css: currentFile.css,
              }
            : {
                  scope: trimmedScope,
                  css: currentFile.css,
              };

    return {
        method: currentFile.id !== undefined ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
    };
}

/**
 * Loads custom CSS state from the API and prepares the editor selection.
 *
 * @private function of useCustomCssClientState
 */
async function fetchCustomCssState(defaultCss: string, preferredId?: number | null): Promise<LoadedCustomCssState> {
    const response = await fetch('/api/custom-css');
    const payload = await readJsonResponse<CustomCssReadResponse>(response);

    if (!response.ok) {
        throw new Error(payload.error || 'Failed to load custom CSS.');
    }

    return resolveLoadedCustomCssState(payload, defaultCss, preferredId);
}

/**
 * Saves one stylesheet through the custom CSS API.
 *
 * @private function of useCustomCssClientState
 */
async function saveCustomCssFile(currentFile: CustomStylesheetFileState): Promise<CustomCssSaveResponse> {
    const request = createCustomCssSaveRequest(currentFile);
    const response = await fetch('/api/custom-css', {
        method: request.method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: request.body,
    });

    const payload = await readJsonResponse<CustomCssSaveResponse>(response);

    if (!response.ok) {
        throw new Error(payload.error || 'Failed to save custom stylesheet.');
    }

    return payload;
}

/**
 * Deletes one persisted stylesheet through the custom CSS API.
 *
 * @private function of useCustomCssClientState
 */
async function deletePersistedCustomCssFile(currentFile: CustomStylesheetFileState): Promise<void> {
    if (currentFile.id === undefined) {
        return;
    }

    const response = await fetch('/api/custom-css', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: currentFile.id }),
    });

    const payload = await readJsonResponse<CustomCssDeleteResponse>(response);
    if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete custom stylesheet.');
    }
}

/**
 * Browser-side persistence helpers for the custom CSS admin editor.
 *
 * @private function of useCustomCssClientState
 */
export const CustomCssApi = {
    fetchCustomCssState,
    saveCustomCssFile,
    deletePersistedCustomCssFile,
};
