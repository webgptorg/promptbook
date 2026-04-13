import { readJsonResponse } from '../custom-resource/shared';
import {
    resolveLoadedCustomJavascriptState,
    type CustomJavascriptFilePayload,
    type CustomJavascriptFileState,
    type LoadedCustomJavascriptState,
} from './CustomJavascriptFileState';

/**
 * API payload returned by `GET /api/custom-js`.
 *
 * @private function of useCustomJsClientState
 */
type CustomJavascriptReadResponse = {
    files: CustomJavascriptFilePayload[];
    maxLength: number;
    error?: string;
};

/**
 * API payload returned by `POST`/`PUT /api/custom-js`.
 *
 * @private function of useCustomJsClientState
 */
type CustomJavascriptSaveResponse = {
    file: CustomJavascriptFilePayload;
    maxLength: number;
    error?: string;
};

/**
 * API payload returned by `DELETE /api/custom-js`.
 *
 * @private function of useCustomJsClientState
 */
type CustomJavascriptDeleteResponse = {
    success: true;
    error?: string;
};

/**
 * Builds the API request payload for saving one custom JavaScript file.
 *
 * @private function of useCustomJsClientState
 */
function createCustomJavascriptSaveRequest(
    currentFile: CustomJavascriptFileState,
): { method: 'POST' | 'PUT'; body: string } {
    const trimmedScope = currentFile.scope.trim();
    const payload =
        currentFile.id !== undefined
            ? {
                  id: currentFile.id,
                  scope: trimmedScope,
                  javascript: currentFile.javascript,
              }
            : {
                  scope: trimmedScope,
                  javascript: currentFile.javascript,
              };

    return {
        method: currentFile.id !== undefined ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
    };
}

/**
 * Loads custom JavaScript state from the API and prepares the editor selection.
 *
 * @private function of useCustomJsClientState
 */
async function fetchCustomJavascriptState(
    defaultJavaScript: string,
    preferredId?: number | null,
): Promise<LoadedCustomJavascriptState> {
    const response = await fetch('/api/custom-js');
    const payload = await readJsonResponse<CustomJavascriptReadResponse>(response);

    if (!response.ok) {
        throw new Error(payload.error || 'Failed to load custom JavaScript.');
    }

    return resolveLoadedCustomJavascriptState(payload, defaultJavaScript, preferredId);
}

/**
 * Saves one custom JavaScript file through the API.
 *
 * @private function of useCustomJsClientState
 */
async function saveCustomJavascriptFile(currentFile: CustomJavascriptFileState): Promise<CustomJavascriptSaveResponse> {
    const request = createCustomJavascriptSaveRequest(currentFile);
    const response = await fetch('/api/custom-js', {
        method: request.method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: request.body,
    });

    const payload = await readJsonResponse<CustomJavascriptSaveResponse>(response);

    if (!response.ok) {
        throw new Error(payload.error || 'Failed to save custom JavaScript.');
    }

    return payload;
}

/**
 * Deletes one persisted custom JavaScript file through the API.
 *
 * @private function of useCustomJsClientState
 */
async function deletePersistedCustomJavascriptFile(currentFile: CustomJavascriptFileState): Promise<void> {
    if (currentFile.id === undefined) {
        return;
    }

    const response = await fetch('/api/custom-js', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: currentFile.id }),
    });

    const payload = await readJsonResponse<CustomJavascriptDeleteResponse>(response);
    if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete custom JavaScript.');
    }
}

/**
 * Browser-side persistence helpers for the custom JavaScript admin editor.
 *
 * @private function of useCustomJsClientState
 */
export const CustomJsApi = {
    fetchCustomJavascriptState,
    saveCustomJavascriptFile,
    deletePersistedCustomJavascriptFile,
};
