'use client';

import { createContext, useContext, type ReactNode } from 'react';
import {
    AVAILABLE_FILE_UPLOAD,
    type FileUploadAvailability,
} from '../../utils/upload/fileUploadAvailability';

/**
 * Context carrying file upload availability for the current server/domain.
 */
const FileUploadAvailabilityContext = createContext<FileUploadAvailability>(AVAILABLE_FILE_UPLOAD);

/**
 * Props consumed by `FileUploadAvailabilityProvider`.
 */
type FileUploadAvailabilityProviderProps = {
    /**
     * Current upload availability state.
     */
    readonly value: FileUploadAvailability;

    /**
     * Nested app content.
     */
    readonly children: ReactNode;
};

/**
 * Provides file upload availability to upload controls.
 *
 * @param props - Provider props.
 * @returns Provider-wrapped children.
 */
export function FileUploadAvailabilityProvider(props: FileUploadAvailabilityProviderProps) {
    return (
        <FileUploadAvailabilityContext.Provider value={props.value}>
            {props.children}
        </FileUploadAvailabilityContext.Provider>
    );
}

/**
 * Reads the current file upload availability state.
 *
 * @returns Current upload availability state.
 */
export function useFileUploadAvailability(): FileUploadAvailability {
    return useContext(FileUploadAvailabilityContext);
}
