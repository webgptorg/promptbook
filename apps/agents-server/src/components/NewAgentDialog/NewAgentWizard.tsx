'use client';

import type { string_book } from '@promptbook-local/types';
import { ArrowLeft, ArrowRight, Upload, X } from 'lucide-react';
import {
    useId,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type DragEvent,
    type KeyboardEvent,
    type ReactNode,
} from 'react';
import type { NewAgentWizardMode } from '../../constants/newAgentWizard';
import { simplifyKnowledgeLabel } from '../../utils/knowledge/simplifyKnowledgeLabel';
import { bookEditorUploadHandler } from '../../utils/upload/createBookEditorUploadHandler';
import type { AgentVisibility } from '../../utils/agentVisibility';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { Dialog } from '../Portal/Dialog';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';
import { useDirtyModalGuard } from '../utils/useDirtyModalGuard';
import {
    createNewAgentWizardSource,
    type CreateNewAgentWizardSourceOptions,
} from './createNewAgentWizardSource';
import {
    NEW_AGENT_WIZARD_CAPABILITY_PRESETS,
    NEW_AGENT_WIZARD_PERSONA_PRESETS,
    NEW_AGENT_WIZARD_RULE_PRESETS,
    NEW_AGENT_WIZARD_STEP_DEFINITIONS,
    NEW_AGENT_WIZARD_WRITING_STYLE_PRESETS,
} from './newAgentWizardPresets';
import { trackNewAgentCreationEvent } from './trackNewAgentCreationEvent';

/**
 * Props accepted by the guided new-agent wizard.
 */
type NewAgentWizardProps = {
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
 * Payload submitted when the wizard creates an agent directly.
 */
export type NewAgentWizardCreateRequest = {
    /**
     * Hidden book source synthesized from the wizard form.
     */
    readonly agentSource: string_book;

    /**
     * Explicit visibility choice selected in the wizard.
     */
    readonly visibility: AgentVisibility;

    /**
     * Number of ready knowledge sources included in the final source.
     */
    readonly knowledgeCount: number;
};

/**
 * Payload used when the user switches from the wizard to the advanced editor.
 */
export type NewAgentWizardOpenEditorRequest = {
    /**
     * Hidden book source synthesized from the wizard form.
     */
    readonly agentSource: string_book;

    /**
     * Explicit visibility choice selected in the wizard.
     */
    readonly visibility: AgentVisibility;
};

/**
 * Local knowledge item tracked while uploads finish.
 */
type WizardKnowledgeItem = {
    /**
     * Stable client-side identifier.
     */
    readonly id: string;

    /**
     * Human-friendly label shown in the wizard and traceability note.
     */
    readonly label: string;

    /**
     * Final `KNOWLEDGE` source written into the hidden book.
     */
    readonly source: string;

    /**
     * Distinguishes uploads from pasted URLs for rendering.
     */
    readonly kind: 'file' | 'url';

    /**
     * Upload lifecycle status.
     */
    readonly status: 'uploading' | 'ready' | 'error';

    /**
     * Best-effort upload progress between `0` and `1`.
     */
    readonly progress: number;

    /**
     * Optional upload error message.
     */
    readonly errorMessage?: string;
};

/**
 * Entire mutable wizard form state.
 */
type NewAgentWizardState = {
    /**
     * Required agent name.
     */
    readonly name: string;

    /**
     * Optional short description.
     */
    readonly description: string;

    /**
     * Optional agent goal.
     */
    readonly goal: string;

    /**
     * Explicit visibility override.
     */
    readonly visibility: AgentVisibility;

    /**
     * Selected persona preset ids.
     */
    readonly selectedPersonaTraitIds: ReadonlyArray<string>;

    /**
     * Draft custom persona-trait text entered in the chip input.
     */
    readonly customPersonaTraitDraft: string;

    /**
     * Custom persona-trait chips added by pressing Enter.
     */
    readonly customPersonaTraits: ReadonlyArray<string>;

    /**
     * Selected capability preset ids.
     */
    readonly selectedCapabilityIds: ReadonlyArray<string>;

    /**
     * Whether the wizard should emit `OPEN` or `CLOSED`.
     */
    readonly isOpenToLearning: boolean;

    /**
     * Selected writing-style preset ids.
     */
    readonly selectedWritingStyleIds: ReadonlyArray<string>;

    /**
     * Draft custom writing-style trait entered in the chip input.
     */
    readonly customWritingTraitDraft: string;

    /**
     * Custom writing-style traits added by pressing Enter.
     */
    readonly customWritingTraits: ReadonlyArray<string>;

    /**
     * Draft custom writing-rule text entered in the chip input.
     */
    readonly customWritingRuleDraft: string;

    /**
     * Custom writing-rule chips added by pressing Enter.
     */
    readonly customWritingRules: ReadonlyArray<string>;

    /**
     * Optional free-form writing sample shown in the preview bubble and emitted as `WRITING SAMPLE`.
     */
    readonly customWritingSample: string;

    /**
     * Selected rule preset ids.
     */
    readonly selectedRuleIds: ReadonlyArray<string>;

    /**
     * Draft custom rule text entered in the chip input.
     */
    readonly customRuleDraft: string;

    /**
     * Custom rule chips added by pressing Enter.
     */
    readonly customRules: ReadonlyArray<string>;

    /**
     * Uploaded and pasted knowledge items.
     */
    readonly knowledgeItems: ReadonlyArray<WizardKnowledgeItem>;

    /**
     * Draft URL input.
     */
    readonly knowledgeUrlDraft: string;
};

/**
 * Visual variants for selectable wizard cards.
 */
type WizardCardVariant = 'blue' | 'emerald' | 'amber';

/**
 * Props for one selectable wizard preset card.
 */
type WizardSelectableCardProps = {
    /**
     * Emoji icon shown in the card header.
     */
    readonly icon: string;

    /**
     * Main label shown in the card header.
     */
    readonly label: string;

    /**
     * Whether the card is currently selected.
     */
    readonly isSelected: boolean;

    /**
     * Whether the card is interactive.
     */
    readonly isDisabled?: boolean;

    /**
     * Color theme for selected state.
     */
    readonly variant?: WizardCardVariant;

    /**
     * Optional secondary note displayed under the label.
     */
    readonly note?: string;

    /**
     * Optional rich content rendered under the heading.
     */
    readonly children?: ReactNode;

    /**
     * Handles card selection.
     */
    readonly onClick?: () => void;
};

/**
 * Props for one reusable chip-input section.
 */
type WizardChipInputProps = {
    /**
     * Visible field label.
     */
    readonly label: string;

    /**
     * Current input value.
     */
    readonly draftValue: string;

    /**
     * Placeholder shown in the input.
     */
    readonly placeholder: string;

    /**
     * Collected chips.
     */
    readonly chips: ReadonlyArray<string>;

    /**
     * Visual theme for chip rendering.
     */
    readonly chipVariant?: WizardCardVariant;

    /**
     * Updates the input draft.
     */
    readonly onDraftChange: (nextValue: string) => void;

    /**
     * Adds the current draft as a chip.
     */
    readonly onAdd: () => void;

    /**
     * Removes a single chip by index.
     */
    readonly onRemove: (chipIndex: number) => void;

    /**
     * Accessible remove label.
     */
    readonly removeLabel: string;
};

/**
 * Props for one mocked-chat preview bubble stack.
 */
type WritingSamplePreviewProps = {
    /**
     * Assistant message to show in the preview bubble.
     */
    readonly assistantMessage: string;

    /**
     * Optional label shown above the preview.
     */
    readonly title?: string;

    /**
     * Shared user-side prompt shown above the assistant sample.
     */
    readonly userMessage: string;
};

/**
 * Shared styling for single-line inputs.
 */
const INPUT_CLASS_NAME =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

/**
 * Shared styling for multi-line inputs.
 */
const TEXTAREA_CLASS_NAME = `${INPUT_CLASS_NAME} min-h-24 resize-y`;

/**
 * Shared styling for secondary dialog actions.
 */
const SECONDARY_BUTTON_CLASS_NAME =
    'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Shared styling for primary dialog actions.
 */
const PRIMARY_BUTTON_CLASS_NAME =
    'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Shared user prompt displayed inside mocked-chat previews.
 */
const WRITING_PREVIEW_USER_MESSAGE_KEY = 'agentCreation.wizard.writingPreviewUserMessage' as const;

/**
 * Normalizes free-form single-line input.
 *
 * @param value - Raw user value.
 * @returns Normalized text with collapsed spacing.
 */
function normalizeSingleLineInput(value: string | null | undefined): string {
    return (value || '').replace(/\s+/g, ' ').trim();
}

/**
 * Creates the initial wizard state using metadata defaults and generated agent name.
 *
 * @param defaultVisibility - Default visibility resolved from metadata.
 * @param initialAgentName - Optional generated boilerplate name.
 * @returns Fresh wizard state.
 */
function createInitialWizardState(
    defaultVisibility: AgentVisibility,
    initialAgentName: string | null | undefined,
): NewAgentWizardState {
    return {
        name: normalizeSingleLineInput(initialAgentName),
        description: '',
        goal: '',
        visibility: defaultVisibility,
        selectedPersonaTraitIds: NEW_AGENT_WIZARD_PERSONA_PRESETS.filter((preset) => preset.isDefault).map(
            (preset) => preset.id,
        ),
        customPersonaTraitDraft: '',
        customPersonaTraits: [],
        selectedCapabilityIds: [],
        isOpenToLearning: true,
        selectedWritingStyleIds: NEW_AGENT_WIZARD_WRITING_STYLE_PRESETS.filter((preset) => preset.isDefault).map(
            (preset) => preset.id,
        ),
        customWritingTraitDraft: '',
        customWritingTraits: [],
        customWritingRuleDraft: '',
        customWritingRules: [],
        customWritingSample: '',
        selectedRuleIds: NEW_AGENT_WIZARD_RULE_PRESETS.filter((preset) => preset.isDefault).map((preset) => preset.id),
        customRuleDraft: '',
        customRules: [],
        knowledgeItems: [],
        knowledgeUrlDraft: '',
    };
}

/**
 * Returns `true` when the wizard contains any unsaved value.
 *
 * @param state - Current wizard form state.
 * @param initialState - Fresh wizard baseline.
 * @returns Whether the wizard should confirm before closing.
 */
function hasWizardChanges(state: NewAgentWizardState, initialState: NewAgentWizardState): boolean {
    return JSON.stringify(state) !== JSON.stringify(initialState);
}

/**
 * Generates a stable client-side knowledge item identifier.
 *
 * @returns Unique local identifier.
 */
function createKnowledgeItemId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `knowledge-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Toggles one selected id inside a readonly array.
 *
 * @param selectedIds - Existing selected ids.
 * @param idToToggle - Target id.
 * @returns Updated id selection.
 */
function toggleSelection(selectedIds: ReadonlyArray<string>, idToToggle: string): ReadonlyArray<string> {
    return selectedIds.includes(idToToggle)
        ? selectedIds.filter((id) => id !== idToToggle)
        : [...selectedIds, idToToggle];
}

/**
 * Adds one normalized chip text if it is non-empty and not already present.
 *
 * @param chips - Existing chip values.
 * @param rawValue - Raw chip input value.
 * @returns Same array when no change is needed, otherwise a new chip array.
 */
function addUniqueChip(chips: ReadonlyArray<string>, rawValue: string): ReadonlyArray<string> {
    const normalizedValue = normalizeSingleLineInput(rawValue);
    if (normalizedValue === '') {
        return chips;
    }

    const alreadyPresent = chips.some((chip) => chip.toLowerCase() === normalizedValue.toLowerCase());
    if (alreadyPresent) {
        return chips;
    }

    return [...chips, normalizedValue];
}

/**
 * Removes one chip by index.
 *
 * @param chips - Existing chip values.
 * @param chipIndex - Index to remove.
 * @returns Updated chip array.
 */
function removeChipAt(chips: ReadonlyArray<string>, chipIndex: number): ReadonlyArray<string> {
    return chips.filter((_, index) => index !== chipIndex);
}

/**
 * Parses one user-entered URL and validates HTTP(S) protocol.
 *
 * @param rawUrl - Raw URL input.
 * @returns Valid URL or invalid marker.
 */
function parseKnowledgeUrl(rawUrl: string): { validUrl?: string; isInvalid: boolean } {
    const normalizedEntry = rawUrl.trim();
    if (normalizedEntry === '') {
        return { isInvalid: false };
    }

    try {
        const parsedUrl = new URL(normalizedEntry);
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return { isInvalid: true };
        }

        return { validUrl: parsedUrl.toString(), isInvalid: false };
    } catch {
        return { isInvalid: true };
    }
}

/**
 * Selects preset objects by their ids while preserving preset order.
 *
 * @param presets - Full preset catalogue.
 * @param selectedIds - Selected preset identifiers.
 * @returns Ordered selected preset list.
 */
function selectPresetsById<TPreset extends { id: string }>(
    presets: ReadonlyArray<TPreset>,
    selectedIds: ReadonlyArray<string>,
): Array<TPreset> {
    return presets.filter((preset) => selectedIds.includes(preset.id));
}

/**
 * Converts one free-form writing-style trait into a safe `WRITING RULES` sentence.
 *
 * @param trait - Raw custom writing trait entered by the user.
 * @returns Writing-rule sentence or empty string when nothing should be emitted.
 */
function createWritingTraitRule(trait: string): string {
    const normalizedTrait = normalizeSingleLineInput(trait);
    return normalizedTrait === '' ? '' : `Use a ${normalizedTrait} writing style.`;
}

/**
 * Builds the pure source-builder payload from the current wizard state.
 *
 * @param state - Current wizard state.
 * @returns Normalized source-builder payload.
 */
function buildWizardSourceOptions(state: NewAgentWizardState): CreateNewAgentWizardSourceOptions {
    const selectedPersonaPresets = selectPresetsById(NEW_AGENT_WIZARD_PERSONA_PRESETS, state.selectedPersonaTraitIds);
    const selectedWritingPresets = selectPresetsById(
        NEW_AGENT_WIZARD_WRITING_STYLE_PRESETS,
        state.selectedWritingStyleIds,
    );
    const selectedRulePresets = selectPresetsById(NEW_AGENT_WIZARD_RULE_PRESETS, state.selectedRuleIds);
    const selectedCapabilityPresets = selectPresetsById(
        NEW_AGENT_WIZARD_CAPABILITY_PRESETS,
        state.selectedCapabilityIds,
    ).filter((preset) => preset.availability === 'wizard');
    const customWritingSample = state.customWritingSample.trim();

    return {
        agentName: state.name,
        description: state.description,
        goal: state.goal,
        personaTraits: [...selectedPersonaPresets.map((preset) => preset.sourceText), ...state.customPersonaTraits],
        isOpenToLearning: state.isOpenToLearning,
        rules: [...selectedRulePresets.map((preset) => preset.sourceText), ...state.customRules],
        capabilityCommitments: selectedCapabilityPresets.map((preset) => preset.commitmentKeyword),
        writingStyleTraits: [...selectedWritingPresets.map((preset) => preset.sourceText), ...state.customWritingTraits],
        writingRules: [
            ...selectedWritingPresets.flatMap((preset) => preset.writingRules),
            ...state.customWritingTraits.map(createWritingTraitRule).filter(Boolean),
            ...state.customWritingRules,
        ],
        writingSamples: [
            ...selectedWritingPresets.map((preset) => preset.writingSample),
            ...(customWritingSample === '' ? [] : [customWritingSample]),
        ],
        knowledgeItems: state.knowledgeItems
            .filter((item) => item.status === 'ready')
            .map((item) => ({ label: item.label, source: item.source })),
    };
}

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
 * Returns the selected-state classes for a given card variant.
 *
 * @param variant - Visual variant.
 * @returns Tailwind class string for selected state.
 */
function getSelectedCardClassName(variant: WizardCardVariant): string {
    if (variant === 'emerald') {
        return 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-emerald-100';
    }

    if (variant === 'amber') {
        return 'border-amber-500 bg-amber-50 text-amber-950 shadow-amber-100';
    }

    return 'border-blue-500 bg-blue-50 text-blue-950 shadow-blue-100';
}

/**
 * Renders one reusable selectable wizard card.
 *
 * @param props - Card props.
 * @returns Selectable preset card.
 */
function WizardSelectableCard(props: WizardSelectableCardProps) {
    const { icon, label, isSelected, isDisabled = false, variant = 'blue', note, children, onClick } = props;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isDisabled}
            className={`flex min-h-24 flex-col rounded-xl border p-3 text-left transition ${
                isDisabled
                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500'
                    : isSelected
                    ? `shadow-sm ${getSelectedCardClassName(variant)}`
                    : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
            }`}
        >
            <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">
                    {icon}
                </span>
                <span className="text-sm font-semibold">{label}</span>
            </div>
            {note && <p className="mt-1 text-xs leading-5 opacity-80">{note}</p>}
            {children && <div className="mt-3">{children}</div>}
        </button>
    );
}

/**
 * Renders a reusable chip-input section with removable chips.
 *
 * @param props - Chip input props.
 * @returns Label, input, and chip list.
 */
function WizardChipInput(props: WizardChipInputProps) {
    const {
        label,
        draftValue,
        placeholder,
        chips,
        chipVariant = 'blue',
        onDraftChange,
        onAdd,
        onRemove,
        removeLabel,
    } = props;
    const chipClassName =
        chipVariant === 'amber'
            ? 'border-amber-200 bg-amber-50 text-amber-900'
            : chipVariant === 'emerald'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-blue-200 bg-blue-50 text-blue-900';
    const iconClassName =
        chipVariant === 'amber'
            ? 'text-amber-700 hover:text-amber-900'
            : chipVariant === 'emerald'
            ? 'text-emerald-700 hover:text-emerald-900'
            : 'text-blue-700 hover:text-blue-900';

    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-800">{label}</label>
            <input
                value={draftValue}
                onChange={(event) => onDraftChange(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key !== 'Enter') {
                        return;
                    }

                    event.preventDefault();
                    onAdd();
                }}
                placeholder={placeholder}
                className={INPUT_CLASS_NAME}
            />
            {chips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {chips.map((chip, index) => (
                        <span
                            key={`${chip}-${index}`}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${chipClassName}`}
                        >
                            {chip}
                            <button
                                type="button"
                                onClick={() => onRemove(index)}
                                className={`transition ${iconClassName}`}
                                aria-label={removeLabel}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Renders a minimal mocked-chat preview used for writing-style samples.
 *
 * @param props - Writing preview props.
 * @returns Mocked chat bubbles.
 */
function WritingSamplePreview(props: WritingSamplePreviewProps) {
    const { assistantMessage, title, userMessage } = props;

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            {title && <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</div>}
            <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
                    {userMessage}
                </div>
            </div>
            <div className="mt-2 flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-blue-600 px-3 py-2 text-xs text-white shadow-sm">
                    {assistantMessage}
                </div>
            </div>
        </div>
    );
}

/**
 * Renders the guided multi-step new-agent creation flow.
 *
 * @param props - Wizard props.
 * @returns Guided new-agent wizard dialog.
 */
export function NewAgentWizard(props: NewAgentWizardProps) {
    const { mode, defaultVisibility, initialAgentName, folderId, onClose, onCreate, onOpenEditor } = props;
    const { formatText } = useAgentNaming();
    const { t } = useServerLanguage();
    const titleId = useId();
    const descriptionId = useId();
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
    const currentStepDefinition = NEW_AGENT_WIZARD_STEP_DEFINITIONS[step] || NEW_AGENT_WIZARD_STEP_DEFINITIONS[0];
    const currentStepTitle = t(currentStepDefinition.titleKey);
    const currentStepDescription = t(currentStepDefinition.descriptionKey);
    const isLastStep = step === NEW_AGENT_WIZARD_STEP_DEFINITIONS.length - 1;
    const writingPreviewUserMessage = t(WRITING_PREVIEW_USER_MESSAGE_KEY);

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
    function togglePresetSelection(
        key:
            | 'selectedPersonaTraitIds'
            | 'selectedCapabilityIds'
            | 'selectedWritingStyleIds'
            | 'selectedRuleIds',
        presetId: string,
    ): void {
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
    function addDraftChip(
        chipsKey:
            | 'customPersonaTraits'
            | 'customWritingTraits'
            | 'customWritingRules'
            | 'customRules',
        draftKey:
            | 'customPersonaTraitDraft'
            | 'customWritingTraitDraft'
            | 'customWritingRuleDraft'
            | 'customRuleDraft',
    ): void {
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
    function removeDraftChip(
        chipsKey:
            | 'customPersonaTraits'
            | 'customWritingTraits'
            | 'customWritingRules'
            | 'customRules',
        chipIndex: number,
    ): void {
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

    return (
        <Dialog
            onClose={requestClose}
            className="w-[min(96vw,60rem)]"
            ariaLabelledBy={titleId}
            ariaDescribedBy={descriptionId}
        >
            <div
                className="relative flex h-[min(92vh,52rem)] flex-col overflow-hidden"
                onDragEnter={handleDialogDragEnter}
                onDragOver={handleDialogDragOver}
                onDragLeave={handleDialogDragLeave}
                onDrop={handleDialogDrop}
            >
                <div className="border-b border-slate-200 bg-white px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                                {t('agentCreation.wizardEyebrow')}
                            </div>
                            <h2 id={titleId} className="mt-1 text-xl font-semibold text-slate-900">
                                {formatText(t('agentCreation.wizardTitle'))}
                            </h2>
                            <p id={descriptionId} className="mt-1 text-sm text-slate-600">
                                {currentStepDescription}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={requestClose}
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                            <X className="h-5 w-5" />
                            <span className="sr-only">{t('common.close')}</span>
                        </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        {NEW_AGENT_WIZARD_STEP_DEFINITIONS.map((stepDefinition, stepIndex) => (
                            <button
                                key={stepDefinition.shortKey}
                                type="button"
                                onClick={() => setStep(stepIndex)}
                                disabled={isCreating}
                                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                                    stepIndex === step
                                        ? 'border-blue-600 bg-blue-600 text-white'
                                        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                                }`}
                            >
                                {stepIndex + 1}. {t(stepDefinition.shortKey)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50 px-5 py-4">
                    <div className="mx-auto max-w-4xl">
                        <h3 className="text-lg font-semibold text-slate-900">{currentStepTitle}</h3>

                        {step === 0 && (
                            <div className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-800">
                                        {t('agentCreation.wizard.nameLabel')}
                                    </label>
                                    <input
                                        value={state.name}
                                        onChange={(event) =>
                                            setState((previous) => ({ ...previous, name: event.target.value }))
                                        }
                                        placeholder={t('agentCreation.wizard.namePlaceholder')}
                                        className={INPUT_CLASS_NAME}
                                    />
                                    {state.name.trim() === '' && (
                                        <p className="mt-2 text-sm text-amber-700">{t('agentCreation.wizard.nameRequired')}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-800">
                                        {t('agentCreation.wizard.descriptionLabel')}
                                    </label>
                                    <input
                                        value={state.description}
                                        onChange={(event) =>
                                            setState((previous) => ({ ...previous, description: event.target.value }))
                                        }
                                        placeholder={t('agentCreation.wizard.descriptionPlaceholder')}
                                        className={INPUT_CLASS_NAME}
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-800">
                                        {t('agentCreation.wizard.goalLabel')}
                                    </label>
                                    <textarea
                                        value={state.goal}
                                        onChange={(event) =>
                                            setState((previous) => ({ ...previous, goal: event.target.value }))
                                        }
                                        placeholder={t('agentCreation.wizard.goalPlaceholder')}
                                        className={TEXTAREA_CLASS_NAME}
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-800">
                                        {t('agentCreation.wizard.visibilityLabel')}
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {([
                                            ['PRIVATE', t('agentCreation.wizard.visibilityPrivate')],
                                            ['UNLISTED', t('agentCreation.wizard.visibilityUnlisted')],
                                            ['PUBLIC', t('agentCreation.wizard.visibilityPublic')],
                                        ] as const).map(([visibility, label]) => (
                                            <button
                                                key={visibility}
                                                type="button"
                                                onClick={() =>
                                                    setState((previous) => ({
                                                        ...previous,
                                                        visibility,
                                                    }))
                                                }
                                                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                                                    state.visibility === visibility
                                                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                                                        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="mt-4 space-y-6 rounded-xl border border-slate-200 bg-white p-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-800">
                                        {t('agentCreation.wizard.traitsLabel')}
                                    </label>
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        {NEW_AGENT_WIZARD_PERSONA_PRESETS.map((preset) => (
                                            <WizardSelectableCard
                                                key={preset.id}
                                                icon={preset.icon}
                                                label={t(preset.labelKey)}
                                                isSelected={state.selectedPersonaTraitIds.includes(preset.id)}
                                                onClick={() => togglePresetSelection('selectedPersonaTraitIds', preset.id)}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <WizardChipInput
                                    label={t('agentCreation.wizard.customTraitLabel')}
                                    draftValue={state.customPersonaTraitDraft}
                                    placeholder={t('agentCreation.wizard.customTraitPlaceholder')}
                                    chips={state.customPersonaTraits}
                                    onDraftChange={(customPersonaTraitDraft) =>
                                        setState((previous) => ({ ...previous, customPersonaTraitDraft }))
                                    }
                                    onAdd={() => addDraftChip('customPersonaTraits', 'customPersonaTraitDraft')}
                                    onRemove={(chipIndex) => removeDraftChip('customPersonaTraits', chipIndex)}
                                    removeLabel={t('agentCreation.wizard.removeKnowledgeAction')}
                                />

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-800">
                                        {t('agentCreation.wizard.learningModeLabel')}
                                    </label>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <WizardSelectableCard
                                            icon="🔓"
                                            label={t('agentCreation.wizard.learningModeOpen')}
                                            note={t('agentCreation.wizard.learningModeOpenDescription')}
                                            isSelected={state.isOpenToLearning}
                                            onClick={() =>
                                                setState((previous) => ({ ...previous, isOpenToLearning: true }))
                                            }
                                            variant="emerald"
                                        />
                                        <WizardSelectableCard
                                            icon="🔒"
                                            label={t('agentCreation.wizard.learningModeClosed')}
                                            note={t('agentCreation.wizard.learningModeClosedDescription')}
                                            isSelected={!state.isOpenToLearning}
                                            onClick={() =>
                                                setState((previous) => ({ ...previous, isOpenToLearning: false }))
                                            }
                                            variant="amber"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <label className="block text-sm font-medium text-slate-800">
                                            {t('agentCreation.wizard.capabilitiesLabel')}
                                        </label>
                                        <span className="text-xs text-slate-500">
                                            {t('agentCreation.wizard.capabilitiesHint')}
                                        </span>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        {NEW_AGENT_WIZARD_CAPABILITY_PRESETS.map((preset) => {
                                            const isSelected = state.selectedCapabilityIds.includes(preset.id);
                                            const isDisabled = preset.availability !== 'wizard';

                                            return (
                                                <WizardSelectableCard
                                                    key={preset.id}
                                                    icon={preset.icon}
                                                    label={t(preset.labelKey)}
                                                    isSelected={isSelected}
                                                    isDisabled={isDisabled}
                                                    note={
                                                        isDisabled
                                                            ? t('agentCreation.wizard.capabilityRequiresEditor')
                                                            : undefined
                                                    }
                                                    onClick={
                                                        isDisabled
                                                            ? undefined
                                                            : () => togglePresetSelection('selectedCapabilityIds', preset.id)
                                                    }
                                                    variant="emerald"
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="mt-4 space-y-6 rounded-xl border border-slate-200 bg-white p-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-800">
                                        {t('agentCreation.wizard.writingStylesLabel')}
                                    </label>
                                    <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                                        {NEW_AGENT_WIZARD_WRITING_STYLE_PRESETS.map((preset) => (
                                            <WizardSelectableCard
                                                key={preset.id}
                                                icon={preset.icon}
                                                label={t(preset.labelKey)}
                                                isSelected={state.selectedWritingStyleIds.includes(preset.id)}
                                                onClick={() => togglePresetSelection('selectedWritingStyleIds', preset.id)}
                                            >
                                                <WritingSamplePreview
                                                    assistantMessage={preset.writingSample}
                                                    userMessage={writingPreviewUserMessage}
                                                />
                                            </WizardSelectableCard>
                                        ))}
                                    </div>
                                </div>

                                <WizardChipInput
                                    label={t('agentCreation.wizard.customWritingTraitLabel')}
                                    draftValue={state.customWritingTraitDraft}
                                    placeholder={t('agentCreation.wizard.customWritingTraitPlaceholder')}
                                    chips={state.customWritingTraits}
                                    chipVariant="blue"
                                    onDraftChange={(customWritingTraitDraft) =>
                                        setState((previous) => ({ ...previous, customWritingTraitDraft }))
                                    }
                                    onAdd={() => addDraftChip('customWritingTraits', 'customWritingTraitDraft')}
                                    onRemove={(chipIndex) => removeDraftChip('customWritingTraits', chipIndex)}
                                    removeLabel={t('agentCreation.wizard.removeKnowledgeAction')}
                                />

                                <WizardChipInput
                                    label={t('agentCreation.wizard.customWritingRuleLabel')}
                                    draftValue={state.customWritingRuleDraft}
                                    placeholder={t('agentCreation.wizard.customWritingRulePlaceholder')}
                                    chips={state.customWritingRules}
                                    chipVariant="amber"
                                    onDraftChange={(customWritingRuleDraft) =>
                                        setState((previous) => ({ ...previous, customWritingRuleDraft }))
                                    }
                                    onAdd={() => addDraftChip('customWritingRules', 'customWritingRuleDraft')}
                                    onRemove={(chipIndex) => removeDraftChip('customWritingRules', chipIndex)}
                                    removeLabel={t('agentCreation.wizard.removeKnowledgeAction')}
                                />

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-800">
                                        {t('agentCreation.wizard.customWritingSampleLabel')}
                                    </label>
                                    <textarea
                                        value={state.customWritingSample}
                                        onChange={(event) =>
                                            setState((previous) => ({
                                                ...previous,
                                                customWritingSample: event.target.value,
                                            }))
                                        }
                                        placeholder={t('agentCreation.wizard.customWritingSamplePlaceholder')}
                                        className={TEXTAREA_CLASS_NAME}
                                    />
                                    {state.customWritingSample.trim() !== '' && (
                                        <div className="mt-3">
                                            <WritingSamplePreview
                                                title={t('agentCreation.wizard.customWritingSamplePreviewTitle')}
                                                assistantMessage={state.customWritingSample.trim()}
                                                userMessage={writingPreviewUserMessage}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    {NEW_AGENT_WIZARD_RULE_PRESETS.map((preset) => (
                                        <WizardSelectableCard
                                            key={preset.id}
                                            icon={preset.icon}
                                            label={t(preset.labelKey)}
                                            isSelected={state.selectedRuleIds.includes(preset.id)}
                                            onClick={() => togglePresetSelection('selectedRuleIds', preset.id)}
                                            variant="amber"
                                        />
                                    ))}
                                </div>

                                <WizardChipInput
                                    label={t('agentCreation.wizard.customInstructionsLabel')}
                                    draftValue={state.customRuleDraft}
                                    placeholder={t('agentCreation.wizard.customInstructionsPlaceholder')}
                                    chips={state.customRules}
                                    chipVariant="amber"
                                    onDraftChange={(customRuleDraft) =>
                                        setState((previous) => ({ ...previous, customRuleDraft }))
                                    }
                                    onAdd={() => addDraftChip('customRules', 'customRuleDraft')}
                                    onRemove={(chipIndex) => removeDraftChip('customRules', chipIndex)}
                                    removeLabel={t('agentCreation.wizard.removeKnowledgeAction')}
                                />
                            </div>
                        )}

                        {step === 4 && (
                            <div className="mt-4 space-y-4">
                                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-medium text-slate-900">
                                                {t('agentCreation.wizard.uploadLabel')}
                                            </div>
                                            <div className="mt-1 text-sm text-slate-600">
                                                {t('agentCreation.wizard.uploadHint')}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className={PRIMARY_BUTTON_CLASS_NAME}
                                        >
                                            <Upload className="h-4 w-4" />
                                            {t('agentCreation.wizard.uploadAction')}
                                        </button>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={handleKnowledgeFileSelection}
                                    />
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <label className="mb-1.5 block text-sm font-medium text-slate-800">
                                        {t('agentCreation.wizard.urlsLabel')}
                                    </label>
                                    <input
                                        value={state.knowledgeUrlDraft}
                                        onChange={(event) =>
                                            setState((previous) => ({
                                                ...previous,
                                                knowledgeUrlDraft: event.target.value,
                                            }))
                                        }
                                        onKeyDown={handleKnowledgeUrlKeyDown}
                                        placeholder={t('agentCreation.wizard.urlsPlaceholder')}
                                        className={INPUT_CLASS_NAME}
                                    />
                                    <p className="mt-2 text-sm text-slate-500">{t('agentCreation.wizard.urlsHint')}</p>
                                    {knowledgeFeedback && <p className="mt-2 text-sm text-amber-700">{knowledgeFeedback}</p>}
                                </div>

                                <div className="space-y-2">
                                    {state.knowledgeItems.length === 0 ? (
                                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                                            {t('agentCreation.wizard.noKnowledge')}
                                        </div>
                                    ) : (
                                        state.knowledgeItems.map((item) => (
                                            <div key={item.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-medium text-slate-900">{item.label}</div>
                                                        <div className="mt-1 text-xs text-slate-500">
                                                            {item.kind === 'file'
                                                                ? t('agentCreation.wizard.uploadedFile')
                                                                : item.source}
                                                        </div>
                                                        {item.status === 'uploading' && (
                                                            <div className="mt-2">
                                                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                                    <div
                                                                        className="h-full rounded-full bg-blue-500 transition-[width]"
                                                                        style={{ width: `${Math.round(item.progress * 100)}%` }}
                                                                    />
                                                                </div>
                                                                <div className="mt-1 text-xs text-slate-500">
                                                                    {t('agentCreation.wizard.uploading', {
                                                                        progress: String(Math.round(item.progress * 100)),
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {item.status === 'error' && item.errorMessage && (
                                                            <div className="mt-2 text-sm text-rose-700">{item.errorMessage}</div>
                                                        )}
                                                    </div>
                                                    {item.status !== 'uploading' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeKnowledgeItem(item.id)}
                                                            className="text-sm font-medium text-slate-500 transition hover:text-slate-800"
                                                        >
                                                            {t('agentCreation.wizard.removeKnowledgeAction')}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={handleOpenAdvancedEditor}
                                    disabled={isCreating || hasUploadingKnowledge}
                                    className="text-sm font-medium text-blue-700 transition hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {t('agentCreation.wizard.openAdvancedEditorAction')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="border-t border-slate-200 bg-white px-5 py-3">
                    <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={step === 0 ? requestClose : handleBack}
                            disabled={isCreating}
                            className={SECONDARY_BUTTON_CLASS_NAME}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {step === 0 ? t('common.cancel') : t('agentCreation.wizard.backAction')}
                        </button>

                        {!isLastStep ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={isCreating}
                                className={PRIMARY_BUTTON_CLASS_NAME}
                            >
                                {t('agentCreation.wizard.nextAction')}
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => void handleCreate()}
                                disabled={isCreating || hasUploadingKnowledge || state.name.trim() === ''}
                                className={PRIMARY_BUTTON_CLASS_NAME}
                            >
                                {isCreating ? t('agentCreation.wizard.creatingAction') : t('agentCreation.wizard.createAction')}
                            </button>
                        )}
                    </div>
                </div>

                {isDragOverDialog && (
                    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-blue-50/80">
                        <div className="rounded-xl border border-blue-300 bg-white px-5 py-4 text-center">
                            <div className="text-sm font-semibold text-blue-900">{t('agentCreation.wizard.uploadLabel')}</div>
                            <div className="mt-1 text-sm text-blue-700">{t('agentCreation.wizard.uploadHint')}</div>
                        </div>
                    </div>
                )}
            </div>
        </Dialog>
    );
}
