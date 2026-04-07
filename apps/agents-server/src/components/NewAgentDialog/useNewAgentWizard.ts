'use client';

import type { string_book } from '@promptbook-local/types';
import { useMemo, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react';
import type { NewAgentWizardMode } from '../../constants/newAgentWizard';
import { simplifyKnowledgeLabel } from '../../utils/knowledge/simplifyKnowledgeLabel';
import { bookEditorUploadHandler } from '../../utils/upload/createBookEditorUploadHandler';
import type { AgentVisibility } from '../../utils/agentVisibility';
import { useDirtyModalGuard } from '../utils/useDirtyModalGuard';
import { createNewAgentWizardSource } from './createNewAgentWizardSource';
import { NEW_AGENT_WIZARD_STEP_DEFINITIONS } from './newAgentWizardPresets';
import {
    addUniqueChip,
    buildWizardSourceOptions,
    createInitialWizardState,
    createKnowledgeItemId,
    hasWizardChanges,
    parseKnowledgeUrl,
    removeChipAt,
    toggleSelection,
    type NewAgentWizardChipCollectionKey,
    type NewAgentWizardChipDraftKey,
    type NewAgentWizardPresetSelectionKey,
    type NewAgentWizardState,
} from './NewAgentWizardState';
import type { NewAgentWizardTranslate } from './NewAgentWizardTranslate';
import { trackNewAgentCreationEvent } from './trackNewAgentCreationEvent';

/**
 * Options for the extracted new-agent wizard state hook.
 */
type UseNewAgentWizardOptions = {
    /**
     * Metadata-driven flow assignment used for analytics.
     */
    readonly mode: NewAgentWizardMode;

    /**
     * Default visibility resolved from server metadata.
     */
    readonly defaultVisibility: AgentVisibility;

    /**
     * Boilerplate agent name generated through the existing name pool mechanism.
     */
    readonly initialAgentName?: string;

    /**
     * Folder scope where the flow was opened.
     */
    readonly folderId?: number | null;

    /**
     * Requests closing the wizard dialog.
     */
    readonly onClose: () => void;

    /**
     * Persists the synthesized agent source using the existing create-agent endpoint.
     */
    readonly onCreate: (request: {
        readonly agentSource: string_book;
        readonly visibility: AgentVisibility;
        readonly knowledgeCount: number;
    }) => Promise<void>;

    /**
     * Switches from the wizard to the advanced raw editor before creation.
     */
    readonly onOpenEditor: (request: {
        readonly agentSource: string_book;
        readonly visibility: AgentVisibility;
    }) => void;

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
 * Encapsulates the wizard state machine, upload handling, and dialog interactions.
 *
 * @param options - Hook options.
 * @returns Stateful wizard data and event handlers.
 *
 * @private internal hook of <NewAgentWizard/>.
 */
export function useNewAgentWizard(options: UseNewAgentWizardOptions) {
    const { mode, defaultVisibility, initialAgentName, folderId, onClose, onCreate, onOpenEditor, t } = options;
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const dragDepthRef = useRef(0);
    const initialState = useMemo(
        () => createInitialWizardState(defaultVisibility, initialAgentName),
        [defaultVisibility, initialAgentName],
    );
    const [state, setState] = useState<NewAgentWizardState>(initialState);
    const [step, setStep] = useState(0);
    const [knowledgeFeedback, setKnowledgeFeedback] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isDragOverDialog, setIsDragOverDialog] = useState(false);
    const hasUploadingKnowledge = state.knowledgeItems.some((item) => item.status === 'uploading');
    const hasUnsavedChanges = hasWizardChanges(state, initialState);
    const { requestClose } = useDirtyModalGuard({
        hasUnsavedChanges,
        isCloseBlocked: isCreating,
        onClose,
    });

    /**
     * Queues one or more knowledge files for upload.
     *
     * @param files - Files selected via input or drag/drop.
     */
    function queueKnowledgeFiles(files: ReadonlyArray<File>): void {
        if (files.length === 0) {
            return;
        }

        setKnowledgeFeedback(null);

        for (const file of files) {
            const knowledgeItemId = createKnowledgeItemId();

            setState((previous) => ({
                ...previous,
                knowledgeItems: [
                    ...previous.knowledgeItems,
                    {
                        id: knowledgeItemId,
                        label: file.name,
                        source: '',
                        kind: 'file',
                        status: 'uploading',
                        progress: 0,
                    },
                ],
            }));

            void bookEditorUploadHandler(file, {
                onProgress: (progress) => {
                    setState((previous) => ({
                        ...previous,
                        knowledgeItems: previous.knowledgeItems.map((item) =>
                            item.id === knowledgeItemId ? { ...item, progress } : item,
                        ),
                    }));
                },
            })
                .then((uploadedSource) => {
                    setState((previous) => ({
                        ...previous,
                        knowledgeItems: previous.knowledgeItems.map((item) =>
                            item.id === knowledgeItemId
                                ? {
                                      ...item,
                                      source: uploadedSource,
                                      status: 'ready',
                                      progress: 1,
                                  }
                                : item,
                        ),
                    }));
                })
                .catch((uploadError) => {
                    setState((previous) => ({
                        ...previous,
                        knowledgeItems: previous.knowledgeItems.map((item) =>
                            item.id === knowledgeItemId
                                ? {
                                      ...item,
                                      status: 'error',
                                      errorMessage:
                                          uploadError instanceof Error
                                              ? uploadError.message
                                              : t('agentCreation.wizard.uploadFailed'),
                                  }
                                : item,
                        ),
                    }));
                });
        }
    }

    /**
     * Toggles one preset selection in state.
     *
     * @param key - State property holding ids.
     * @param presetId - Target preset identifier.
     */
    function togglePresetSelection(key: NewAgentWizardPresetSelectionKey, presetId: string): void {
        setState((previous) => ({
            ...previous,
            [key]: toggleSelection(previous[key], presetId),
        }));
    }

    /**
     * Adds the current draft value into one chip array and clears the draft.
     *
     * @param chipsKey - State property containing chip values.
     * @param draftKey - State property containing draft input.
     */
    function addDraftChip(chipsKey: NewAgentWizardChipCollectionKey, draftKey: NewAgentWizardChipDraftKey): void {
        setState((previous) => ({
            ...previous,
            [chipsKey]: addUniqueChip(previous[chipsKey], previous[draftKey]),
            [draftKey]: '',
        }));
    }

    /**
     * Removes one chip from the specified chip list.
     *
     * @param chipsKey - State property containing chip values.
     * @param chipIndex - Index of the chip to remove.
     */
    function removeDraftChip(chipsKey: NewAgentWizardChipCollectionKey, chipIndex: number): void {
        setState((previous) => ({
            ...previous,
            [chipsKey]: removeChipAt(previous[chipsKey], chipIndex),
        }));
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

        const existingSources = new Set(state.knowledgeItems.map((item) => item.source));
        if (validUrl && !existingSources.has(validUrl)) {
            setState((previous) => ({
                ...previous,
                knowledgeItems: [
                    ...previous.knowledgeItems,
                    {
                        id: createKnowledgeItemId(),
                        label: simplifyKnowledgeLabel(validUrl),
                        source: validUrl,
                        kind: 'url',
                        status: 'ready',
                        progress: 1,
                    },
                ],
                knowledgeUrlDraft: '',
            }));
        } else {
            setState((previous) => ({
                ...previous,
                knowledgeUrlDraft: '',
            }));
        }
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
        event.dataTransfer.dropEffect = 'copy';
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
        setStep(NEW_AGENT_WIZARD_STEP_DEFINITIONS.length - 1);
    }

    /**
     * Moves the wizard one step forward.
     */
    function handleNext(): void {
        setStep((previous) => Math.min(previous + 1, NEW_AGENT_WIZARD_STEP_DEFINITIONS.length - 1));
    }

    /**
     * Moves the wizard back by one step.
     */
    function handleBack(): void {
        setStep((previous) => Math.max(previous - 1, 0));
    }

    /**
     * Switches from the guided wizard to the raw editor experience.
     */
    function handleOpenAdvancedEditor(): void {
        const sourceOptions = buildWizardSourceOptions(state);
        onOpenEditor({
            agentSource: createNewAgentWizardSource(sourceOptions),
            visibility: state.visibility,
        });
    }

    /**
     * Creates the agent directly from the wizard.
     */
    async function handleCreate(): Promise<void> {
        const sourceOptions = buildWizardSourceOptions(state);
        const knowledgeCount = sourceOptions.knowledgeItems.length;

        trackNewAgentCreationEvent('new_agent_wizard_completed', {
            mode,
            surface: 'wizard',
            folderId,
            knowledgeCount,
        });

        setIsCreating(true);
        try {
            await onCreate({
                agentSource: createNewAgentWizardSource(sourceOptions),
                visibility: state.visibility,
                knowledgeCount,
            });
        } finally {
            setIsCreating(false);
        }
    }

    return {
        state,
        setState,
        step,
        setStep,
        knowledgeFeedback,
        isCreating,
        isDragOverDialog,
        hasUploadingKnowledge,
        hasUnsavedChanges,
        requestClose,
        fileInputRef,
        togglePresetSelection,
        addDraftChip,
        removeDraftChip,
        removeKnowledgeItem,
        handleKnowledgeFileSelection,
        handleKnowledgeUrlKeyDown,
        handleDialogDragEnter,
        handleDialogDragOver,
        handleDialogDragLeave,
        handleDialogDrop,
        handleNext,
        handleBack,
        handleOpenAdvancedEditor,
        handleCreate,
    };
}
