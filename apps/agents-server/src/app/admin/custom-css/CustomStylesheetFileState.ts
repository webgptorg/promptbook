import { MAX_CUSTOM_STYLESHEET_LENGTH } from '../../../constants/customStylesheet';

/**
 * Constant for new file base name.
 *
 * @private function of useCustomCssClientState
 */
const NEW_FILE_BASE_NAME = 'custom-stylesheet';

/**
 * Serialized custom stylesheet file returned by the API.
 *
 * @private function of useCustomCssClientState
 */
export type CustomStylesheetFilePayload = {
    id: number;
    scope: string;
    css: string;
    createdAt: string;
    updatedAt: string | null;
};

/**
 * UI state for a custom stylesheet entry tracked across unsaved edits.
 *
 * @private function of useCustomCssClientState
 */
export type CustomStylesheetFileState = {
    localId: string;
    id?: number;
    scope: string;
    css: string;
    createdAt?: string;
    updatedAt?: string | null;
};

/**
 * Normalized state returned after loading stylesheets from the server.
 *
 * @private function of useCustomCssClientState
 */
export type LoadedCustomCssState = {
    files: CustomStylesheetFileState[];
    serverSnapshot: CustomStylesheetFileState[];
    maxLength: number;
    selectedFileLocalId: string;
};

/**
 * Normalized state returned after deleting the current stylesheet.
 *
 * @private function of useCustomCssClientState
 */
export type DeletedCustomCssState = {
    files: CustomStylesheetFileState[];
    serverSnapshot: CustomStylesheetFileState[];
    selectedFileLocalId: string;
};

/**
 * Props consumed by `resolveDeletedCustomCssState`.
 *
 * @private function of useCustomCssClientState
 */
export type ResolveDeletedCustomCssStateProps = {
    files: CustomStylesheetFileState[];
    serverSnapshot: CustomStylesheetFileState[];
    deletedFileLocalId: string;
    defaultCss: string;
    selectedFileLocalId: string;
};

/**
 * Generates a short local identifier for tracking unsaved entries.
 *
 * @private function of useCustomCssClientState
 */
function buildCustomCssLocalId(): string {
    return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Maps a persisted stylesheet payload into local editor state.
 *
 * @private function of useCustomCssClientState
 */
function mapCustomStylesheetPayloadToState(file: CustomStylesheetFilePayload): CustomStylesheetFileState {
    return {
        localId: `server-${file.id}`,
        id: file.id,
        scope: file.scope,
        css: file.css,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
    };
}

/**
 * Picks a unique default stylesheet name that does not collide with existing entries.
 *
 * @private function of useCustomCssClientState
 */
function pickUniqueCustomCssFileName(existing: ReadonlyArray<CustomStylesheetFileState>): string {
    let suffix = 1;
    let candidate = NEW_FILE_BASE_NAME;
    const normalizedFileNames = existing.map((file) => file.scope.trim().toLowerCase());

    while (normalizedFileNames.includes(candidate.toLowerCase())) {
        suffix += 1;
        candidate = `${NEW_FILE_BASE_NAME}-${suffix}`;
    }

    return candidate;
}

/**
 * Chooses the stylesheet that should stay selected after one load completes.
 *
 * @private function of useCustomCssClientState
 */
function pickSelectedCustomCssFileLocalId(files: ReadonlyArray<CustomStylesheetFileState>, preferredId?: number | null): string {
    if (preferredId) {
        const preferredLocalId = `server-${preferredId}`;
        const matchingFile = files.find((file) => file.localId === preferredLocalId);
        return matchingFile?.localId ?? files[0]?.localId ?? '';
    }

    return files[0]?.localId ?? '';
}

/**
 * Builds a fresh editor state for a new custom stylesheet entry.
 *
 * @private function of useCustomCssClientState
 */
export function createNewCustomCssFileState(
    existing: ReadonlyArray<CustomStylesheetFileState>,
    template: string,
): CustomStylesheetFileState {
    return {
        localId: buildCustomCssLocalId(),
        scope: pickUniqueCustomCssFileName(existing),
        css: template,
        updatedAt: null,
    };
}

/**
 * Creates a lookup map for the last server-confirmed stylesheet snapshot.
 *
 * @private function of useCustomCssClientState
 */
export function createCustomCssServerSnapshotMap(serverSnapshot: ReadonlyArray<CustomStylesheetFileState>) {
    const serverSnapshotMap = new Map<string, CustomStylesheetFileState>();

    serverSnapshot.forEach((file) => {
        serverSnapshotMap.set(file.localId, file);
    });

    return serverSnapshotMap;
}

/**
 * Determines whether any local stylesheet differs from the last saved snapshot.
 *
 * @private function of useCustomCssClientState
 */
export function hasCustomCssFilesChanged(
    files: ReadonlyArray<CustomStylesheetFileState>,
    serverSnapshotMap: ReadonlyMap<string, CustomStylesheetFileState>,
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

        return snapshot.scope !== file.scope || snapshot.css !== file.css;
    });
}

/**
 * Resolves the stylesheet currently shown in the editor.
 *
 * @private function of useCustomCssClientState
 */
export function findCurrentCustomCssFile(
    files: ReadonlyArray<CustomStylesheetFileState>,
    selectedFileLocalId: string,
): CustomStylesheetFileState | null {
    return files.find((file) => file.localId === selectedFileLocalId) ?? files[0] ?? null;
}

/**
 * Determines whether the currently selected stylesheet differs from the last saved snapshot.
 *
 * @private function of useCustomCssClientState
 */
export function hasCurrentCustomCssFileChanged(
    currentFile: CustomStylesheetFileState | null,
    serverSnapshotMap: ReadonlyMap<string, CustomStylesheetFileState>,
): boolean {
    if (!currentFile) {
        return true;
    }

    const currentSnapshot = serverSnapshotMap.get(currentFile.localId);
    if (!currentSnapshot) {
        return true;
    }

    return currentSnapshot.scope !== currentFile.scope || currentSnapshot.css !== currentFile.css;
}

/**
 * Resolves local editor state from the `GET /api/custom-css` payload.
 *
 * @private function of useCustomCssClientState
 */
export function resolveLoadedCustomCssState(
    payload: { files: CustomStylesheetFilePayload[]; maxLength: number },
    defaultCss: string,
    preferredId?: number | null,
): LoadedCustomCssState {
    const hasServerFiles = payload.files.length > 0;
    const files = hasServerFiles
        ? payload.files.map(mapCustomStylesheetPayloadToState)
        : [createNewCustomCssFileState([], defaultCss)];
    const serverSnapshot = hasServerFiles ? files : [];

    return {
        files,
        serverSnapshot,
        maxLength: payload.maxLength || MAX_CUSTOM_STYLESHEET_LENGTH,
        selectedFileLocalId: pickSelectedCustomCssFileLocalId(files, preferredId),
    };
}

/**
 * Validates the stylesheet before saving.
 *
 * @private function of useCustomCssClientState
 */
export function createCustomCssSaveValidationError(
    currentFile: CustomStylesheetFileState,
    maxLength: number,
): string | null {
    if (!currentFile.scope.trim()) {
        return 'Stylesheet name is required.';
    }

    if (currentFile.css.length > maxLength) {
        return `Stylesheet exceeds the ${maxLength.toLocaleString()}-character limit.`;
    }

    return null;
}

/**
 * Replaces one local stylesheet entry after a successful save or edit.
 *
 * @private function of useCustomCssClientState
 */
export function replaceCustomCssFile(
    files: ReadonlyArray<CustomStylesheetFileState>,
    fileLocalId: string,
    nextFile: CustomStylesheetFileState,
): CustomStylesheetFileState[] {
    return files.map((file) => (file.localId === fileLocalId ? nextFile : file));
}

/**
 * Merges one saved stylesheet into the server snapshot list.
 *
 * @private function of useCustomCssClientState
 */
export function mergeCustomCssServerSnapshot(
    serverSnapshot: ReadonlyArray<CustomStylesheetFileState>,
    savedFile: CustomStylesheetFileState,
): CustomStylesheetFileState[] {
    const isFileAlreadyPersisted = serverSnapshot.some((file) => file.localId === savedFile.localId);

    if (isFileAlreadyPersisted) {
        return replaceCustomCssFile(serverSnapshot, savedFile.localId, savedFile);
    }

    return [...serverSnapshot, savedFile];
}

/**
 * Resolves local state after the current stylesheet is deleted.
 *
 * @private function of useCustomCssClientState
 */
export function resolveDeletedCustomCssState({
    files,
    serverSnapshot,
    deletedFileLocalId,
    defaultCss,
    selectedFileLocalId,
}: ResolveDeletedCustomCssStateProps): DeletedCustomCssState {
    const remainingFiles = files.filter((file) => file.localId !== deletedFileLocalId);

    if (remainingFiles.length === 0) {
        const fallbackFile = createNewCustomCssFileState([], defaultCss);

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
 * Creates the local file state returned from the save API while preserving the existing local identifier.
 *
 * @private function of useCustomCssClientState
 */
export function createSavedCustomCssFileState(
    savedFilePayload: CustomStylesheetFilePayload,
    localId: string,
): CustomStylesheetFileState {
    return { ...mapCustomStylesheetPayloadToState(savedFilePayload), localId };
}
