'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type DragEvent } from 'react';
import type { ChatInputUploadedFile } from './ChatInputArea';
import type { ChatProps } from './ChatProps';

/**
 * Props for `useChatInputAreaAttachments`.
 *
 * @private function of `<ChatInputArea/>`
 */
type UseChatInputAreaAttachmentsProps = {
    onFileUpload?: ChatProps['onFileUpload'];
};

/**
 * Creates a stable identifier for one uploaded file preview item.
 *
 * @private function of `useChatInputAreaAttachments`
 */
function createChatInputUploadedFileId(): string {
    return Math.random().toString(36).substring(2);
}

/**
 * Handles file-upload state and drag/drop events for the chat composer.
 *
 * @private function of `<ChatInputArea/>`
 */
export function useChatInputAreaAttachments({ onFileUpload }: UseChatInputAreaAttachmentsProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<Array<ChatInputUploadedFile>>([]);
    const uploadedFilesRef = useRef(uploadedFiles);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        uploadedFilesRef.current = uploadedFiles;
    }, [uploadedFiles]);

    const handleFileUpload = useCallback(
        async (files: FileList | File[]) => {
            if (!onFileUpload) {
                return;
            }

            setIsUploading(true);
            const fileArray = Array.from(files);

            try {
                const newUploadedFiles: Array<ChatInputUploadedFile> = [];

                for (const file of fileArray) {
                    const content = await onFileUpload(file);
                    newUploadedFiles.push({
                        id: createChatInputUploadedFileId(),
                        file,
                        content,
                    });
                }

                setUploadedFiles((previous) => [...previous, ...newUploadedFiles]);
            } catch (error) {
                console.error('File upload failed:', error);
                alert('File upload failed. Please try again.');
            } finally {
                setIsUploading(false);
            }
        },
        [onFileUpload],
    );

    const handleDrop = useCallback(
        (event: DragEvent) => {
            event.preventDefault();
            setIsDragOver(false);

            if (!onFileUpload) {
                return;
            }

            const files = event.dataTransfer.files;
            if (files.length > 0) {
                void handleFileUpload(files);
            }
        },
        [handleFileUpload, onFileUpload],
    );

    const handleDragOver = useCallback((event: DragEvent) => {
        event.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((event: DragEvent) => {
        event.preventDefault();
        setIsDragOver(false);
    }, []);

    const handlePaste = useCallback(
        (event: ClipboardEvent) => {
            if (!onFileUpload) {
                return;
            }

            const files = event.clipboardData.files;
            if (files.length > 0) {
                void handleFileUpload(files);
            }
        },
        [handleFileUpload, onFileUpload],
    );

    const handleFileInputChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files;
            if (files && files.length > 0) {
                void handleFileUpload(files);
            }
            event.target.value = '';
        },
        [handleFileUpload],
    );

    const removeUploadedFile = useCallback((fileId: string) => {
        setUploadedFiles((previous) => previous.filter((file) => file.id !== fileId));
    }, []);

    const clearUploadedFiles = useCallback(() => {
        setUploadedFiles([]);
    }, []);

    const openFilePicker = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    return {
        fileInputRef,
        uploadedFiles,
        uploadedFilesRef,
        isDragOver,
        isUploading,
        handleDrop,
        handleDragOver,
        handleDragLeave,
        handlePaste,
        handleFileInputChange,
        removeUploadedFile,
        clearUploadedFiles,
        openFilePicker,
    };
}
