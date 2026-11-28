'use client';

import {
    useRef,
    useState,
    type ChangeEvent,
    type Dispatch,
    type DragEvent,
    type KeyboardEvent,
    type SetStateAction,
} from 'react';
import { useFileUploadAvailability } from '../FileUploadAvailability/FileUploadAvailabilityContext';
import { simplifyKnowledgeLabel } from '../../utils/knowledge/simplifyKnowledgeLabel';
import { bookEditorUploadHandler } from '../../utils/upload/createBookEditorUploadHandler';
import {
    createKnowledgeItemId,
    parseKnowledgeUrl,
    type NewAgentWizardState,
    type WizardKnowledgeItem,
} from './NewAgentWizardState';
import type { NewAgentWizardTranslate } from './NewAgentWizardTranslate';

/**
 * Options for the extracted knowledge-state hook used by `useNewAgentWizard`.
 *
 * @private internal type of <useNewAgentWizard/>.
 */
type UseNewAgentWizardKnowledgeStateOptions = {
    /**
     * Current wizard state.
     */
    readonly state: NewAgentWizardState;

    /**
     * State updater shared by the wizard.
     */
    readonly setState: Dispatch<SetStateAction<NewAgentWizardState>>;

    /**
     * Wizard step updater used by drag-and-drop uploads.
     */
    readonly setStep: Dispatch<SetStateAction<number>>;

    /**
     * Absolute step index of the knowledge step in the current dynamic flow.
     */
    readonly knowledgeStepIndex: number;

    /**
     * Translation helper.
     */
    readonly t: NewAgentWizardTranslate;
};

/**
 * Returns `true` when the drag interaction contains files.
 *
 * @param event - Drag event from dialog surface.
 * @returns Whether this drag operation is file-based.
 */
function isFileDragEvent(event: DragEvent<HTMLElement>): boolean {
    return Array.from(event.dataTransfer?.types || []).includes('Files');
}

/**
 * Creates the placeholder knowledge item used while a file upload is in progress.
 *
 * @param file - File selected by the user.
 * @param knowledgeItemId - Stable client-side identifier for the upload.
 * @returns Uploading knowledge item.
 */
function createUploadingKnowledgeItem(file: File, knowledgeItemId: string): WizardKnowledgeItem {
    return {
        id: knowledgeItemId,
        label: file.name,
        source: '',
        kind: 'file',
        status: 'uploading',
        progress: 0,
    };
}

/**
 * Creates one ready knowledge item from a validated URL.
 *
 * @param validUrl - Validated HTTP(S) URL.
 * @returns Ready knowledge item.
 */
function createReadyKnowledgeUrlItem(validUrl: string): WizardKnowledgeItem {
    return {
        id: createKnowledgeItemId(),
        label: simplifyKnowledgeLabel(validUrl),
        source: validUrl,
        kind: 'url',
        status: 'ready',
        progress: 1,
    };
}

/**
 * Appends one knowledge item to the wizard state.
 *
 * @param previousState - Previous wizard state.
 * @param knowledgeItem - Knowledge item to append.
 * @returns Updated wizard state.
 */
function appendKnowledgeItem(
    previousState: NewAgentWizardState,
    knowledgeItem: WizardKnowledgeItem,
): NewAgentWizardState {
    return {
        ...previousState,
        knowledgeItems: [...previousState.knowledgeItems, knowledgeItem],
    };
}

/**
 * Updates one knowledge item in the wizard state by id.
 *
 * @param previousState - Previous wizard state.
 * @param knowledgeItemId - Item identifier to update.
 * @param updatedProperties - Partial properties merged into the item.
 * @returns Updated wizard state.
 */
function updateKnowledgeItem(
    previousState: NewAgentWizardState,
    knowledgeItemId: string,
    updatedProperties: Partial<WizardKnowledgeItem>,
): NewAgentWizardState {
    return {
        ...previousState,
        knowledgeItems: previousState.knowledgeItems.map((item) =>
            item.id === knowledgeItemId ? { ...item, ...updatedProperties } : item,
        ),
    };
}

/**
 * Encapsulates knowledge uploads, URL validation, and drag-and-drop dialog interactions.
 *
 * @param options - Hook options.
 * @returns Knowledge-specific state, refs, and handlers.
 *
 * @private internal hook of <NewAgentWizard/>.
 */
export function useNewAgentWizardKnowledgeState(options: UseNewAgentWizardKnowledgeStateOptions) {
    const { state, setState, setStep, knowledgeStepIndex, t } = options;
    const fileUploadAvailability = useFileUploadAvailability();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const dragDepthRef = useRef(0);
    const [knowledgeFeedback, setKnowledgeFeedback] = useState<string | null>(null);
    const [isDragOverDialog, setIsDragOverDialog] = useState(false);
    const hasUploadingKnowledge = state.knowledgeItems.some((item) => item.status === 'uploading');

    /**
     * Queues one or more knowledge files for upload.
     *
     * @param files - Files selected via input or drag/drop.
     */
    function queueKnowledgeFiles(files: ReadonlyArray<File>): void {
        if (files.length === 0) {
            return;
        }

        if (!fileUploadAvailability.isUploadAvailable) {
            setKnowledgeFeedback(fileUploadAvailability.message || t('agentCreation.wizard.uploadFailed'));
            return;
        }

        setKnowledgeFeedback(null);

        for (const file of files) {
            const knowledgeItemId = createKnowledgeItemId();

            setState((previous) => appendKnowledgeItem(previous, createUploadingKnowledgeItem(file, knowledgeItemId)));

            void bookEditorUploadHandler(file, {
                onProgress: (progress) => {
                    setState((previous) => updateKnowledgeItem(previous, knowledgeItemId, { progress }));
                },
            })
                .then((uploadedSource) => {
                    setState((previous) =>
                        updateKnowledgeItem(previous, knowledgeItemId, {
                            source: uploadedSource,
                            status: 'ready',
                            progress: 1,
                        }),
                    );
                })
                .catch((uploadError) => {
                    setState((previous) =>
                        updateKnowledgeItem(previous, knowledgeItemId, {
                            status: 'error',
                            errorMessage:
                                uploadError instanceof Error
                                    ? uploadError.message
                                    : t('agentCreation.wizard.uploadFailed'),
                        }),
                    );
                });
        }
    }

    /**
     * Removes one knowledge item from the wizard.
     *
     * @param knowledgeItemId - Item identifier to remove.
     */
    function removeKnowledgeItem(knowledgeItemId: string): void {
        setState((previous) => ({
            ...previous,
            knowledgeItems: previous.knowledgeItems.filter((item) => item.id !== knowledgeItemId),
        }));
    }

    /**
     * Uploads selected knowledge files through the shared book-editor pipeline.
     *
     * @param event - File input change event.
     */
    function handleKnowledgeFileSelection(event: ChangeEvent<HTMLInputElement>): void {
        const files = Array.from(event.target.files ?? []);
        event.target.value = '';
        queueKnowledgeFiles(files);
    }

    /**
     * Adds one knowledge URL from the draft input.
     */
    function addKnowledgeUrlFromDraft(): void {
        const { validUrl, isInvalid } = parseKnowledgeUrl(state.knowledgeUrlDraft);
        if (!validUrl && !isInvalid) {
            return;
        }

        if (isInvalid) {
            setKnowledgeFeedback(
                t('agentCreation.wizard.invalidUrls', {
                    count: '1',
                }),
            );
            return;
        }

        if (!validUrl) {
            return;
        }

        const hasDuplicateSource = state.knowledgeItems.some((item) => item.source === validUrl);

        setState((previous) =>
            hasDuplicateSource
                ? {
                      ...previous,
                      knowledgeUrlDraft: '',
                  }
                : {
                      ...previous,
                      knowledgeItems: [...previous.knowledgeItems, createReadyKnowledgeUrlItem(validUrl)],
                      knowledgeUrlDraft: '',
                  },
        );
        setKnowledgeFeedback(null);
    }

    /**
     * Handles Enter key in the URL input.
     *
     * @param event - Keyboard event from the URL input.
     */
    function handleKnowledgeUrlKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        if (event.key !== 'Enter') {
            return;
        }

        event.preventDefault();
        addKnowledgeUrlFromDraft();
    }

    /**
     * Handles drag-enter over the wizard surface.
     *
     * @param event - Drag event.
     */
    function handleDialogDragEnter(event: DragEvent<HTMLElement>): void {
        if (!isFileDragEvent(event)) {
            return;
        }

        event.preventDefault();
        dragDepthRef.current += 1;
        setIsDragOverDialog(true);
    }

    /**
     * Handles drag-over over the wizard surface.
     *
     * @param event - Drag event.
     */
    function handleDialogDragOver(event: DragEvent<HTMLElement>): void {
        if (!isFileDragEvent(event)) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = fileUploadAvailability.isUploadAvailable ? 'copy' : 'none';
        setIsDragOverDialog(true);
    }

    /**
     * Handles drag-leave over the wizard surface.
     *
     * @param event - Drag event.
     */
    function handleDialogDragLeave(event: DragEvent<HTMLElement>): void {
        if (!isFileDragEvent(event)) {
            return;
        }

        event.preventDefault();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) {
            setIsDragOverDialog(false);
        }
    }

    /**
     * Handles file drop on the wizard surface.
     *
     * @param event - Drop event.
     */
    function handleDialogDrop(event: DragEvent<HTMLElement>): void {
        if (!isFileDragEvent(event)) {
            return;
        }

        event.preventDefault();
        dragDepthRef.current = 0;
        setIsDragOverDialog(false);
        const files = Array.from(event.dataTransfer.files || []);
        if (files.length === 0) {
            return;
        }

        queueKnowledgeFiles(files);
        setStep(knowledgeStepIndex);
    }

    return {
        fileInputRef,
        knowledgeFeedback,
        isDragOverDialog,
        hasUploadingKnowledge,
        removeKnowledgeItem,
        handleKnowledgeFileSelection,
        handleKnowledgeUrlKeyDown,
        handleDialogDragEnter,
        handleDialogDragOver,
        handleDialogDragLeave,
        handleDialogDrop,
    };
}
