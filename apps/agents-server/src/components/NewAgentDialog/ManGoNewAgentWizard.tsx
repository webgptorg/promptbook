'use client';

import type { string_book } from '@promptbook-local/types';
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    CheckCircle2,
    Loader2,
    Plus,
    RotateCcw,
    Sparkles,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import { useId, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { BookEditor } from '../../../../../src/book-components/BookEditor/BookEditor';
import type { NewAgentWizardMode } from '../../constants/newAgentWizard';
import { AGENT_VISIBILITY_OPTIONS, type AgentVisibility } from '../../utils/agentVisibility';
import { simplifyKnowledgeLabel } from '../../utils/knowledge/simplifyKnowledgeLabel';
import { bookEditorUploadHandler } from '../../utils/upload/createBookEditorUploadHandler';
import { FileUploadUnavailableNotice } from '../FileUploadAvailability/FileUploadUnavailableNotice';
import { useFileUploadAvailability } from '../FileUploadAvailability/FileUploadAvailabilityContext';
import { Dialog } from '../Portal/Dialog';
import { usePromptbookTheme } from '../ThemeMode/usePromptbookTheme';
import { useDirtyModalGuard } from '../utils/useDirtyModalGuard';
import { createFinalManGoWizardSource, createManGoWizardSource } from './createManGoWizardSource';
import type { NewAgentWizardCreateRequest, NewAgentWizardOpenEditorRequest } from './NewAgentWizard';
import { NewAgentWizardClassNames } from './NewAgentWizardClassNames';
import { createKnowledgeItemId, parseKnowledgeUrl, type WizardKnowledgeItem } from './NewAgentWizardState';
import { trackNewAgentCreationEvent } from './trackNewAgentCreationEvent';

/**
 * Stable identifiers for the adapted manGo onboarding steps.
 */
type ManGoWizardStepId = 'assignment' | 'book' | 'knowledge' | 'finish';

/**
 * One step shown in the manGo wizard header.
 */
type ManGoWizardStep = {
    /**
     * Stable step identifier.
     */
    readonly id: ManGoWizardStepId;

    /**
     * Short label shown in the stepper.
     */
    readonly label: string;

    /**
     * Heading shown inside the body.
     */
    readonly title: string;

    /**
     * Description shown under the title.
     */
    readonly description: string;
};

/**
 * Full mutable state for one manGo wizard session.
 */
type ManGoWizardState = {
    /**
     * Human-readable agent name.
     */
    readonly agentName: string;

    /**
     * Short assignment describing what the agent should do.
     */
    readonly agentBrief: string;

    /**
     * Editable Book-language source.
     */
    readonly bookSource: string;

    /**
     * Whether the generated source was edited manually.
     */
    readonly isBookCustomized: boolean;

    /**
     * Visibility selected for the created agent.
     */
    readonly visibility: AgentVisibility;

    /**
     * Uploaded and pasted knowledge items.
     */
    readonly knowledgeItems: ReadonlyArray<WizardKnowledgeItem>;

    /**
     * Draft URL entry.
     */
    readonly knowledgeUrlDraft: string;
};

/**
 * Props accepted by the adapted manGo new-agent wizard.
 */
type ManGoNewAgentWizardProps = {
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
    readonly onCreate: (request: NewAgentWizardCreateRequest) => Promise<void>;

    /**
     * Switches from the wizard to the advanced raw editor before creation.
     */
    readonly onOpenEditor: (request: NewAgentWizardOpenEditorRequest) => void;
};

/**
 * Step sequence adapted from the external onboarding wizard.
 */
const MANGO_WIZARD_STEPS: ReadonlyArray<ManGoWizardStep> = [
    {
        id: 'assignment',
        label: 'Assignment',
        title: 'Tell me about the agent',
        description: 'Start with a name and one short sentence. The wizard turns that into an editable book.',
    },
    {
        id: 'book',
        label: 'Book',
        title: 'Review the generated book',
        description: 'This is the first version of the agent definition. Edit it before adding knowledge.',
    },
    {
        id: 'knowledge',
        label: 'Knowledge',
        title: 'Attach knowledge',
        description: 'Add files or URLs that the agent should use when answering.',
    },
    {
        id: 'finish',
        label: 'Create',
        title: 'Create the first version',
        description: 'Review the setup and create the agent in the current folder.',
    },
] as const;

/**
 * Creates the initial manGo wizard state.
 *
 * @param defaultVisibility - Default visibility resolved from metadata.
 * @param initialAgentName - Optional generated name prefill.
 * @returns Fresh wizard state.
 */
function createInitialManGoWizardState(
    defaultVisibility: AgentVisibility,
    initialAgentName: string | null | undefined,
): ManGoWizardState {
    return {
        agentName: (initialAgentName || '').trim(),
        agentBrief: '',
        bookSource: '',
        isBookCustomized: false,
        visibility: defaultVisibility,
        knowledgeItems: [],
        knowledgeUrlDraft: '',
    };
}

/**
 * Returns whether the wizard contains any unsaved values.
 *
 * @param state - Current wizard state.
 * @param initialState - Initial wizard state.
 * @returns `true` when the close action should confirm.
 */
function hasManGoWizardChanges(state: ManGoWizardState, initialState: ManGoWizardState): boolean {
    return JSON.stringify(state) !== JSON.stringify(initialState);
}

/**
 * Creates a ready URL knowledge item.
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
 * Creates the placeholder knowledge item used while a file upload is in progress.
 *
 * @param file - Selected file.
 * @param knowledgeItemId - Stable local upload identifier.
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
 * Returns `true` when the drag interaction contains files.
 *
 * @param event - Drag event from the dialog surface.
 * @returns Whether this drag operation is file-based.
 */
function isFileDragEvent(event: DragEvent<HTMLElement>): boolean {
    return Array.from(event.dataTransfer?.types || []).includes('Files');
}

/**
 * Counts ready knowledge items.
 *
 * @param knowledgeItems - Wizard knowledge items.
 * @returns Number of ready items.
 */
function countReadyKnowledgeItems(knowledgeItems: ReadonlyArray<WizardKnowledgeItem>): number {
    return knowledgeItems.filter((item) => item.status === 'ready' && item.source.trim() !== '').length;
}

/**
 * Finds a step by id.
 *
 * @param stepId - Target step id.
 * @returns Step index.
 */
function getStepIndex(stepId: ManGoWizardStepId): number {
    return Math.max(
        0,
        MANGO_WIZARD_STEPS.findIndex((step) => step.id === stepId),
    );
}

/**
 * Creates a generated book source from the current state.
 *
 * @param state - Current wizard state.
 * @returns Generated book source.
 */
function createSourceFromState(state: ManGoWizardState): string_book {
    return createManGoWizardSource({
        agentName: state.agentName,
        agentBrief: state.agentBrief,
        knowledgeItems: state.knowledgeItems,
    });
}

/**
 * Creates a final book source from the current state.
 *
 * @param state - Current wizard state.
 * @returns Final validated book source.
 */
function createFinalSourceFromState(state: ManGoWizardState): string_book {
    return createFinalManGoWizardSource({
        agentName: state.agentName,
        agentBrief: state.agentBrief,
        bookSource: state.bookSource,
        knowledgeItems: state.knowledgeItems,
    });
}

/**
 * Renders a compact step body heading.
 *
 * @param props - Heading props.
 * @returns Step heading.
 */
function StepHeading(props: { readonly step: ManGoWizardStep }) {
    return (
        <header className="mb-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">
                manGo wizard
            </div>
            <h3 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">{props.step.title}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {props.step.description}
            </p>
        </header>
    );
}

/**
 * Renders one summary row on the finish step.
 *
 * @param props - Row props.
 * @returns Summary row.
 */
function SummaryRow(props: { readonly label: string; readonly value: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0 dark:border-slate-800">
            <span className="text-sm text-slate-500 dark:text-slate-400">{props.label}</span>
            <span className="text-right text-sm font-medium text-slate-900 dark:text-slate-100">{props.value}</span>
        </div>
    );
}

/**
 * Renders the adapted manGo multi-step new-agent wizard.
 *
 * @param props - Wizard props.
 * @returns manGo wizard dialog.
 */
export function ManGoNewAgentWizard(props: ManGoNewAgentWizardProps) {
    const { mode, defaultVisibility, initialAgentName, folderId, onClose, onCreate, onOpenEditor } = props;
    const initialState = useRef(createInitialManGoWizardState(defaultVisibility, initialAgentName));
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const dragDepthRef = useRef(0);
    const titleId = useId();
    const descriptionId = useId();
    const fileUploadAvailability = useFileUploadAvailability();
    const { promptbookTheme } = usePromptbookTheme();
    const [state, setState] = useState<ManGoWizardState>(initialState.current);
    const [stepIndex, setStepIndex] = useState(0);
    const [isCreating, setIsCreating] = useState(false);
    const [isDragOverDialog, setIsDragOverDialog] = useState(false);
    const [bookError, setBookError] = useState<string | null>(null);
    const [knowledgeFeedback, setKnowledgeFeedback] = useState<string | null>(null);
    const currentStep = MANGO_WIZARD_STEPS[stepIndex] || MANGO_WIZARD_STEPS[0]!;
    const hasUploadingKnowledge = state.knowledgeItems.some((item) => item.status === 'uploading');
    const readyKnowledgeCount = countReadyKnowledgeItems(state.knowledgeItems);
    const { requestClose } = useDirtyModalGuard({
        hasUnsavedChanges: hasManGoWizardChanges(state, initialState.current),
        isCloseBlocked: isCreating,
        onClose,
    });

    /**
     * Replaces the editable book with a fresh source generated from the assignment.
     */
    function regenerateBook(): void {
        setBookError(null);
        setState((previous) => ({
            ...previous,
            bookSource: createSourceFromState(previous),
            isBookCustomized: false,
        }));
    }

    /**
     * Moves from assignment to book, generating a source when needed.
     */
    function continueFromAssignment(): void {
        setBookError(null);
        setState((previous) => {
            if (previous.bookSource.trim() !== '' && previous.isBookCustomized) {
                return previous;
            }

            return {
                ...previous,
                bookSource: createSourceFromState(previous),
                isBookCustomized: false,
            };
        });
        setStepIndex(getStepIndex('book'));
    }

    /**
     * Validates the current book before moving beyond the editor step.
     *
     * @returns Whether the current book is valid.
     */
    function validateCurrentBook(): boolean {
        try {
            createFinalSourceFromState(state);
            setBookError(null);
            return true;
        } catch (error) {
            setBookError(error instanceof Error ? error.message : 'The book source is not valid.');
            setStepIndex(getStepIndex('book'));
            return false;
        }
    }

    /**
     * Moves the wizard forward from the current step.
     */
    function handleNext(): void {
        if (currentStep.id === 'assignment') {
            continueFromAssignment();
            return;
        }

        if (currentStep.id === 'book' && !validateCurrentBook()) {
            return;
        }

        setStepIndex((previous) => Math.min(previous + 1, MANGO_WIZARD_STEPS.length - 1));
    }

    /**
     * Moves the wizard back from the current step.
     */
    function handleBack(): void {
        setStepIndex((previous) => Math.max(previous - 1, 0));
    }

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
            setKnowledgeFeedback(fileUploadAvailability.message || 'File uploads are not available.');
            return;
        }

        setKnowledgeFeedback(null);

        for (const file of files) {
            const knowledgeItemId = createKnowledgeItemId();

            setState((previous) => ({
                ...previous,
                knowledgeItems: [...previous.knowledgeItems, createUploadingKnowledgeItem(file, knowledgeItemId)],
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
                                          uploadError instanceof Error ? uploadError.message : 'File upload failed.',
                                  }
                                : item,
                        ),
                    }));
                });
        }
    }

    /**
     * Handles file input selection.
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

        if (isInvalid || !validUrl) {
            setKnowledgeFeedback('Enter a valid http or https URL.');
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
     * Handles Enter in the knowledge URL field.
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
     * Removes one knowledge item from state.
     *
     * @param knowledgeItemId - Item identifier.
     */
    function removeKnowledgeItem(knowledgeItemId: string): void {
        setState((previous) => ({
            ...previous,
            knowledgeItems: previous.knowledgeItems.filter((item) => item.id !== knowledgeItemId),
        }));
    }

    /**
     * Handles drag enter over the dialog.
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
     * Handles drag over the dialog.
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
     * Handles drag leave over the dialog.
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
     * Handles file drop on the dialog.
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
        setStepIndex(getStepIndex('knowledge'));
    }

    /**
     * Opens the advanced editor with the current manGo source.
     */
    function handleOpenAdvancedEditor(): void {
        try {
            onOpenEditor({
                agentSource: createFinalSourceFromState(state),
                visibility: state.visibility,
            });
        } catch (error) {
            setBookError(error instanceof Error ? error.message : 'The book source is not valid.');
            setStepIndex(getStepIndex('book'));
        }
    }

    /**
     * Creates the agent directly from the manGo wizard.
     */
    async function handleCreate(): Promise<void> {
        let agentSource: string_book;

        try {
            agentSource = createFinalSourceFromState(state);
        } catch (error) {
            setBookError(error instanceof Error ? error.message : 'The book source is not valid.');
            setStepIndex(getStepIndex('book'));
            return;
        }

        trackNewAgentCreationEvent('new_agent_wizard_completed', {
            mode,
            surface: 'mango-wizard',
            folderId,
            knowledgeCount: readyKnowledgeCount,
        });

        setIsCreating(true);
        try {
            await onCreate({
                agentSource,
                visibility: state.visibility,
                knowledgeCount: readyKnowledgeCount,
            });
        } finally {
            setIsCreating(false);
        }
    }

    const isAssignmentComplete = state.agentName.trim() !== '' && state.agentBrief.trim() !== '';
    const canMoveNext =
        currentStep.id === 'assignment'
            ? isAssignmentComplete
            : currentStep.id === 'knowledge'
            ? !hasUploadingKnowledge
            : true;
    const isLastStep = currentStep.id === 'finish';

    return (
        <Dialog
            onClose={requestClose}
            className="w-[min(96vw,64rem)]"
            ariaLabelledBy={titleId}
            ariaDescribedBy={descriptionId}
        >
            <div
                className="relative flex h-[min(92vh,54rem)] flex-col overflow-hidden"
                onDragEnter={handleDialogDragEnter}
                onDragOver={handleDialogDragOver}
                onDragLeave={handleDialogDragLeave}
                onDrop={handleDialogDrop}
            >
                <div className="border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-950/95">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                NEW_AGENT_WIZARD
                            </div>
                            <h2 id={titleId} className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
                                manGo wizard
                            </h2>
                            <p id={descriptionId} className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                Create an agent through the adapted onboarding flow.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleOpenAdvancedEditor}
                                disabled={isCreating || hasUploadingKnowledge}
                                className={NewAgentWizardClassNames.wizardHeaderAction}
                            >
                                <BookOpen className="h-4 w-4" />
                                Advanced editor
                            </button>
                            <button
                                type="button"
                                onClick={requestClose}
                                className={NewAgentWizardClassNames.wizardCloseButton}
                            >
                                <X className="h-5 w-5" />
                                <span className="sr-only">Close</span>
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        {MANGO_WIZARD_STEPS.map((step, index) => (
                            <button
                                key={step.id}
                                type="button"
                                onClick={() => setStepIndex(index)}
                                disabled={isCreating}
                                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                                    index === stepIndex
                                        ? 'border-blue-600 bg-blue-600 text-white'
                                        : NewAgentWizardClassNames.wizardStepButtonInactive
                                }`}
                            >
                                {index + 1}. {step.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50 px-5 py-5 dark:bg-slate-900/78">
                    <div className="mx-auto max-w-4xl">
                        <StepHeading step={currentStep} />

                        {currentStep.id === 'assignment' && (
                            <div className={NewAgentWizardClassNames.surfaceCard}>
                                <div className="grid gap-4">
                                    <label>
                                        <span className={NewAgentWizardClassNames.fieldLabel}>Agent name</span>
                                        <input
                                            value={state.agentName}
                                            onChange={(event) =>
                                                setState((previous) => ({
                                                    ...previous,
                                                    agentName: event.target.value,
                                                }))
                                            }
                                            placeholder="Customer support assistant"
                                            className={NewAgentWizardClassNames.input}
                                        />
                                    </label>
                                    <label>
                                        <span className={NewAgentWizardClassNames.fieldLabel}>What should it do?</span>
                                        <textarea
                                            value={state.agentBrief}
                                            onChange={(event) =>
                                                setState((previous) => ({
                                                    ...previous,
                                                    agentBrief: event.target.value,
                                                }))
                                            }
                                            rows={4}
                                            placeholder="Help operators answer customer requests using company knowledge."
                                            className={NewAgentWizardClassNames.textarea}
                                        />
                                    </label>
                                    <label>
                                        <span className={NewAgentWizardClassNames.fieldLabel}>Visibility</span>
                                        <select
                                            value={state.visibility}
                                            onChange={(event) =>
                                                setState((previous) => ({
                                                    ...previous,
                                                    visibility: event.target.value as AgentVisibility,
                                                }))
                                            }
                                            className={NewAgentWizardClassNames.input}
                                        >
                                            {AGENT_VISIBILITY_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                            </div>
                        )}

                        {currentStep.id === 'book' && (
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className={NewAgentWizardClassNames.sectionHint}>
                                        {state.isBookCustomized
                                            ? 'The book has manual edits.'
                                            : 'Generated from the current assignment.'}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={regenerateBook}
                                        disabled={isCreating}
                                        className={NewAgentWizardClassNames.secondaryButton}
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        Regenerate
                                    </button>
                                </div>
                                {bookError && (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
                                        {bookError}
                                    </div>
                                )}
                                <div className="min-h-[30rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner dark:border-slate-700">
                                    <BookEditor
                                        className="h-full w-full"
                                        agentSource={state.bookSource as string_book}
                                        onChange={(source) =>
                                            setState((previous) => ({
                                                ...previous,
                                                bookSource: source,
                                                isBookCustomized: true,
                                            }))
                                        }
                                        height="30rem"
                                        isBorderRadiusDisabled
                                        isVerbose={false}
                                        onFileUpload={
                                            fileUploadAvailability.isUploadAvailable
                                                ? bookEditorUploadHandler
                                                : undefined
                                        }
                                        theme={promptbookTheme}
                                    />
                                </div>
                            </div>
                        )}

                        {currentStep.id === 'knowledge' && (
                            <div className="space-y-4">
                                <div className={NewAgentWizardClassNames.dashedSurfaceCard}>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <div className={NewAgentWizardClassNames.sectionTitle}>
                                                Upload source files
                                            </div>
                                            <div className={`mt-1 ${NewAgentWizardClassNames.sectionHint}`}>
                                                Drop files anywhere in this dialog or choose them manually.
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={!fileUploadAvailability.isUploadAvailable}
                                            className={NewAgentWizardClassNames.primaryButton}
                                        >
                                            <Upload className="h-4 w-4" />
                                            Upload
                                        </button>
                                    </div>
                                    {!fileUploadAvailability.isUploadAvailable && (
                                        <FileUploadUnavailableNotice className="mt-3" />
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={handleKnowledgeFileSelection}
                                        disabled={!fileUploadAvailability.isUploadAvailable}
                                    />
                                </div>

                                <div className={NewAgentWizardClassNames.surfaceCard}>
                                    <label className={NewAgentWizardClassNames.fieldLabel}>Add URL</label>
                                    <div className="flex gap-2">
                                        <input
                                            value={state.knowledgeUrlDraft}
                                            onChange={(event) =>
                                                setState((previous) => ({
                                                    ...previous,
                                                    knowledgeUrlDraft: event.target.value,
                                                }))
                                            }
                                            onKeyDown={handleKnowledgeUrlKeyDown}
                                            placeholder="https://example.com/docs"
                                            className={NewAgentWizardClassNames.input}
                                        />
                                        <button
                                            type="button"
                                            onClick={addKnowledgeUrlFromDraft}
                                            className={NewAgentWizardClassNames.secondaryButton}
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add
                                        </button>
                                    </div>
                                    {knowledgeFeedback && (
                                        <p className="mt-2 text-sm text-amber-700 dark:text-amber-200">
                                            {knowledgeFeedback}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    {state.knowledgeItems.length === 0 ? (
                                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-300">
                                            No knowledge sources yet.
                                        </div>
                                    ) : (
                                        state.knowledgeItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950/90"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                                            {item.label}
                                                        </div>
                                                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                            {item.kind === 'file' ? 'Uploaded file' : item.source}
                                                        </div>
                                                        {item.status === 'uploading' && (
                                                            <div className="mt-2">
                                                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                                                    <div
                                                                        className="h-full rounded-full bg-blue-500 transition-[width]"
                                                                        style={{
                                                                            width: `${Math.round(
                                                                                item.progress * 100,
                                                                            )}%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                                    Uploading {Math.round(item.progress * 100)}%
                                                                </div>
                                                            </div>
                                                        )}
                                                        {item.status === 'error' && item.errorMessage && (
                                                            <div className="mt-2 text-sm text-rose-700 dark:text-rose-300">
                                                                {item.errorMessage}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {item.status !== 'uploading' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeKnowledgeItem(item.id)}
                                                            className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {currentStep.id === 'finish' && (
                            <div className={NewAgentWizardClassNames.surfaceCard}>
                                <div className="mb-4 flex items-center gap-3">
                                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-200">
                                        <CheckCircle2 className="h-6 w-6" />
                                    </span>
                                    <div>
                                        <div className={NewAgentWizardClassNames.sectionTitle}>Ready to create</div>
                                        <div className={NewAgentWizardClassNames.sectionHint}>
                                            The agent will be created from the current book and ready knowledge.
                                        </div>
                                    </div>
                                </div>
                                <SummaryRow label="Name" value={state.agentName.trim() || 'New Agent'} />
                                <SummaryRow label="Visibility" value={state.visibility} />
                                <SummaryRow label="Knowledge" value={`${readyKnowledgeCount} ready source(s)`} />
                                <SummaryRow
                                    label="Book"
                                    value={state.bookSource.trim() ? 'Defined' : 'Generated on create'}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="border-t border-slate-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-950/95">
                    <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={stepIndex === 0 ? requestClose : handleBack}
                            disabled={isCreating}
                            className={NewAgentWizardClassNames.secondaryButton}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {stepIndex === 0 ? 'Cancel' : 'Back'}
                        </button>

                        {!isLastStep ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={isCreating || !canMoveNext}
                                className={NewAgentWizardClassNames.primaryButton}
                            >
                                {currentStep.id === 'assignment' ? (
                                    <Sparkles className="h-4 w-4" />
                                ) : (
                                    <ArrowRight className="h-4 w-4" />
                                )}
                                {currentStep.id === 'assignment' ? 'Generate book' : 'Continue'}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => void handleCreate()}
                                disabled={isCreating || hasUploadingKnowledge || !isAssignmentComplete}
                                className={NewAgentWizardClassNames.primaryButton}
                            >
                                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {isCreating ? 'Creating' : 'Create agent'}
                            </button>
                        )}
                    </div>
                </div>

                {isDragOverDialog && (
                    <div className={NewAgentWizardClassNames.wizardOverlayBackdrop}>
                        <div className={NewAgentWizardClassNames.wizardOverlayCard}>
                            <div className={NewAgentWizardClassNames.wizardOverlayTitle}>Drop files to upload</div>
                            <div className={NewAgentWizardClassNames.wizardOverlayDescription}>
                                They will be attached as agent knowledge.
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Dialog>
    );
}
