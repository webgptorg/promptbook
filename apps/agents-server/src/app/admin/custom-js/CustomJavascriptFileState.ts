/**
 * Constant for the new file base name.
 *
 * @private function of useCustomJsClientState
 */
export const NEW_CUSTOM_JAVASCRIPT_FILE_BASE_NAME = 'custom-script';

/**
 * Serialized custom JavaScript file returned by the API.
 *
 * @private function of useCustomJsClientState
 */
export type CustomJavascriptFilePayload = {
    id: number;
    scope: string;
    javascript: string;
    createdAt: string;
    updatedAt: string | null;
};

/**
 * UI state for a custom JavaScript file, tracked across unsaved edits.
 *
 * @private function of useCustomJsClientState
 */
export type CustomJavascriptFileState = {
    localId: string;
    id?: number;
    scope: string;
    javascript: string;
    createdAt?: string;
    updatedAt?: string | null;
};

/**
 * Normalized state returned after loading custom JavaScript files from the server.
 *
 * @private function of useCustomJsClientState
 */
export type LoadedCustomJavascriptState = {
    files: CustomJavascriptFileState[];
    serverSnapshot: CustomJavascriptFileState[];
    maxLength: number;
    selectedFileLocalId: string;
};

/**
 * Normalized state returned after deleting the current custom JavaScript file.
 *
 * @private function of useCustomJsClientState
 */
export type DeletedCustomJavascriptState = {
    files: CustomJavascriptFileState[];
    serverSnapshot: CustomJavascriptFileState[];
    selectedFileLocalId: string;
};

/**
 * Props consumed by `resolveDeletedCustomJavascriptState`.
 *
 * @private function of useCustomJsClientState
 */
export type ResolveDeletedCustomJavascriptStateProps = {
    files: CustomJavascriptFileState[];
    serverSnapshot: CustomJavascriptFileState[];
    deletedFileLocalId: string;
    defaultJavaScript: string;
    selectedFileLocalId: string;
};

/**
 * Generates a short local identifier used only for client-side tracking.
 *
 * @private function of useCustomJsClientState
 */
function buildCustomJavascriptLocalId(): string {
    return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Maps a persisted API file into local editor state.
 *
 * @private function of useCustomJsClientState
 */
function mapCustomJavascriptPayloadToState(file: CustomJavascriptFilePayload): CustomJavascriptFileState {
    return {
        localId: `server-${file.id}`,
        id: file.id,
        scope: file.scope,
        javascript: file.javascript,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
    };
}

/**
 * Picks a new file name that does not collide with existing entries.
 *
 * @private function of useCustomJsClientState
 */
function pickUniqueCustomJavascriptFileName(existing: ReadonlyArray<CustomJavascriptFileState>): string {
    let suffix = 1;
    let candidate = NEW_CUSTOM_JAVASCRIPT_FILE_BASE_NAME;
    const normalizedFileNames = existing.map((file) => file.scope.trim().toLowerCase());

    while (normalizedFileNames.includes(candidate.toLowerCase())) {
        suffix += 1;
        candidate = `${NEW_CUSTOM_JAVASCRIPT_FILE_BASE_NAME}-${suffix}`;
    }

    return candidate;
}

/**
 * Chooses the file that should stay selected after one load completes.
 *
 * @private function of useCustomJsClientState
 */
function pickSelectedCustomJavascriptFileLocalId(
    files: ReadonlyArray<CustomJavascriptFileState>,
    preferredId?: number | null,
): string {
    if (preferredId) {
        const preferredLocalId = `server-${preferredId}`;
        const matchingFile = files.find((file) => file.localId === preferredLocalId);
        return matchingFile?.localId ?? files[0]?.localId ?? '';
    }

    return files[0]?.localId ?? '';
}

/**
 * Builds a fresh editor state for a new custom JavaScript file.
 *
 * @private function of useCustomJsClientState
 */
export function createNewCustomJavascriptFileState(
    existing: ReadonlyArray<CustomJavascriptFileState>,
    template: string,
): CustomJavascriptFileState {
    return {
        localId: buildCustomJavascriptLocalId(),
        scope: pickUniqueCustomJavascriptFileName(existing),
        javascript: template,
        updatedAt: null,
    };
}

/**
 * Creates a lookup map for the last server-confirmed custom JavaScript snapshot.
 *
 * @private function of useCustomJsClientState
 */
export function createCustomJavascriptServerSnapshotMap(serverSnapshot: ReadonlyArray<CustomJavascriptFileState>) {
    const serverSnapshotMap = new Map<string, CustomJavascriptFileState>();

    serverSnapshot.forEach((file) => {
        serverSnapshotMap.set(file.localId, file);
    });

    return serverSnapshotMap;
}

/**
 * Determines whether any local custom JavaScript file differs from the last saved snapshot.
 *
 * @private function of useCustomJsClientState
 */
export function hasCustomJavascriptFilesChanged(
    files: ReadonlyArray<CustomJavascriptFileState>,
    serverSnapshotMap: ReadonlyMap<string, CustomJavascriptFileState>,
    serverSnapshotLength: number,
): boolean {
    if (files.length !== serverSnapshotLength) {
        return true;
    }

    return files.some((file) => {
        const snapshot = serverSnapshotMap.get(file.localId);
        if (!snapshot) {
            return true;
        }

        return snapshot.scope !== file.scope || snapshot.javascript !== file.javascript;
    });
}

/**
 * Resolves the custom JavaScript file currently shown in the editor.
 *
 * @private function of useCustomJsClientState
 */
export function findCurrentCustomJavascriptFile(
    files: ReadonlyArray<CustomJavascriptFileState>,
    selectedFileLocalId: string,
): CustomJavascriptFileState | null {
    return files.find((file) => file.localId === selectedFileLocalId) ?? files[0] ?? null;
}

/**
 * Determines whether the current custom JavaScript file differs from the last saved snapshot.
 *
 * @private function of useCustomJsClientState
 */
export function hasCurrentCustomJavascriptFileChanged(
    currentFile: CustomJavascriptFileState | null,
    serverSnapshotMap: ReadonlyMap<string, CustomJavascriptFileState>,
): boolean {
    if (!currentFile) {
        return true;
    }

    const currentSnapshot = serverSnapshotMap.get(currentFile.localId);
    if (!currentSnapshot) {
        return true;
    }

    return currentSnapshot.scope !== currentFile.scope || currentSnapshot.javascript !== currentFile.javascript;
}

/**
 * Resolves local editor state from the `GET /api/custom-js` payload.
 *
 * @private function of useCustomJsClientState
 */
export function resolveLoadedCustomJavascriptState(
    payload: { files: CustomJavascriptFilePayload[]; maxLength: number },
    defaultJavaScript: string,
    preferredId?: number | null,
): LoadedCustomJavascriptState {
    const hasServerFiles = payload.files.length > 0;
    const files = hasServerFiles
        ? payload.files.map(mapCustomJavascriptPayloadToState)
        : [createNewCustomJavascriptFileState([], defaultJavaScript)];
    const serverSnapshot = hasServerFiles ? files : [];

    return {
        files,
        serverSnapshot,
        maxLength: payload.maxLength,
        selectedFileLocalId: pickSelectedCustomJavascriptFileLocalId(files, preferredId),
    };
}

/**
 * Validates the current custom JavaScript file before saving.
 *
 * @private function of useCustomJsClientState
 */
export function createCustomJavascriptSaveValidationError(
    currentFile: CustomJavascriptFileState,
    maxLength: number,
): string | null {
    if (!currentFile.scope.trim()) {
        return 'File name is required.';
    }

    if (currentFile.javascript.length > maxLength) {
        return `File exceeds the ${maxLength.toLocaleString()}-character limit.`;
    }

    return null;
}

/**
 * Replaces one local custom JavaScript file after a successful save or edit.
 *
 * @private function of useCustomJsClientState
 */
export function replaceCustomJavascriptFile(
    files: ReadonlyArray<CustomJavascriptFileState>,
    fileLocalId: string,
    nextFile: CustomJavascriptFileState,
): CustomJavascriptFileState[] {
    return files.map((file) => (file.localId === fileLocalId ? nextFile : file));
}

/**
 * Merges one saved custom JavaScript file into the server snapshot list.
 *
 * @private function of useCustomJsClientState
 */
export function mergeCustomJavascriptServerSnapshot(
    serverSnapshot: ReadonlyArray<CustomJavascriptFileState>,
    savedFile: CustomJavascriptFileState,
): CustomJavascriptFileState[] {
    const isFileAlreadyPersisted = serverSnapshot.some((file) => file.localId === savedFile.localId);

    if (isFileAlreadyPersisted) {
        return replaceCustomJavascriptFile(serverSnapshot, savedFile.localId, savedFile);
    }

    return [...serverSnapshot, savedFile];
}

/**
 * Resolves local state after the current custom JavaScript file is deleted.
 *
 * @private function of useCustomJsClientState
 */
export function resolveDeletedCustomJavascriptState({
    files,
    serverSnapshot,
    deletedFileLocalId,
    defaultJavaScript,
    selectedFileLocalId,
}: ResolveDeletedCustomJavascriptStateProps): DeletedCustomJavascriptState {
    const remainingFiles = files.filter((file) => file.localId !== deletedFileLocalId);

    if (remainingFiles.length === 0) {
        const fallbackFile = createNewCustomJavascriptFileState([], defaultJavaScript);

        return {
            files: [fallbackFile],
            serverSnapshot: [],
            selectedFileLocalId: fallbackFile.localId,
        };
    }

    return {
        files: remainingFiles,
        serverSnapshot: serverSnapshot.filter((file) => file.localId !== deletedFileLocalId),
        selectedFileLocalId: selectedFileLocalId === deletedFileLocalId ? remainingFiles[0].localId : selectedFileLocalId,
    };
}

/**
 * Creates the local file state returned from the save API while preserving the current local identifier.
 *
 * @private function of useCustomJsClientState
 */
export function createSavedCustomJavascriptFileState(
    savedFilePayload: CustomJavascriptFilePayload,
    localId: string,
): CustomJavascriptFileState {
    return { ...mapCustomJavascriptPayloadToState(savedFilePayload), localId };
}
