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
} from 'react';
import type { NewAgentWizardMode } from '../../constants/newAgentWizard';
import type { ServerTranslationKey } from '../../languages/ServerTranslationKeys';
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
    type NewAgentWizardCapabilityCommitment,
} from './createNewAgentWizardSource';
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
 * One step displayed in the wizard timeline.
 */
type WizardStepDefinition = {
    /**
     * Localized title key displayed as the current section heading.
     */
    readonly titleKey: ServerTranslationKey;
    /**
     * Localized helper text shown under the wizard title.
     */
    readonly descriptionKey: ServerTranslationKey;
    /**
     * Compact label shown in the step navigation buttons.
     */
    readonly shortKey: ServerTranslationKey;
};

/**
 * One persona preset shown as a selectable chip.
 */
type WizardTraitPreset = {
    /**
     * Stable identifier stored in local component state.
     */
    readonly id: string;
    /**
     * Translation key used for the chip label.
     */
    readonly labelKey: ServerTranslationKey;
    /**
     * Canonical English fragment written into the final `PERSONA` commitment.
     */
    readonly sourceText: string;
    /**
     * Whether the preset is selected by default.
     */
    readonly isDefault: boolean;
};

/**
 * One capability preset shown as a selectable chip in step 2.
 */
type WizardCapabilityPreset = {
    /**
     * Stable identifier stored in local component state.
     */
    readonly id: string;
    /**
     * Human-friendly chip label key.
     */
    readonly labelKey: ServerTranslationKey;
    /**
     * Final book-language commitment added when selected.
     */
    readonly commitmentKeyword: NewAgentWizardCapabilityCommitment;
};

/**
 * One rule/guardrail preset shown as a selectable chip.
 */
type WizardRulePreset = {
    /**
     * Stable identifier stored in local component state.
     */
    readonly id: string;
    /**
     * Translation key used for the chip label.
     */
    readonly labelKey: ServerTranslationKey;
    /**
     * Canonical English rule written into the final `RULE` commitment.
     */
    readonly sourceText: string;
    /**
     * Whether the rule starts enabled.
     */
    readonly isDefault: boolean;
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
     * Explicit visibility override.
     */
    readonly visibility: AgentVisibility;
    /**
     * Selected persona preset ids.
     */
    readonly selectedTraitIds: ReadonlyArray<string>;
    /**
     * Draft custom trait text entered in the chip input.
     */
    readonly customTraitDraft: string;
    /**
     * Custom trait chips added by pressing Enter.
     */
    readonly customTraits: ReadonlyArray<string>;
    /**
     * Selected capability preset ids.
     */
    readonly selectedCapabilityIds: ReadonlyArray<string>;
    /**
     * Selected guardrail preset ids.
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
 * Shared styling for single-line inputs.
 */
const INPUT_CLASS_NAME =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

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
 * Ordered wizard steps.
 */
const WIZARD_STEP_DEFINITIONS: ReadonlyArray<WizardStepDefinition> = [
    {
        titleKey: 'agentCreation.wizard.basicTitle',
        descriptionKey: 'agentCreation.wizard.basicDescription',
        shortKey: 'agentCreation.wizard.basicShort',
    },
    {
        titleKey: 'agentCreation.wizard.personaTitle',
        descriptionKey: 'agentCreation.wizard.personaDescription',
        shortKey: 'agentCreation.wizard.personaShort',
    },
    {
        titleKey: 'agentCreation.wizard.rulesTitle',
        descriptionKey: 'agentCreation.wizard.rulesDescription',
        shortKey: 'agentCreation.wizard.rulesShort',
    },
    {
        titleKey: 'agentCreation.wizard.knowledgeTitle',
        descriptionKey: 'agentCreation.wizard.knowledgeDescription',
        shortKey: 'agentCreation.wizard.knowledgeShort',
    },
] as const;

/**
 * Persona presets available in step 2 of the wizard.
 */
const WIZARD_TRAIT_PRESETS: ReadonlyArray<WizardTraitPreset> = [
    { id: 'helpful', labelKey: 'agentCreation.wizard.traitHelpful', sourceText: 'helpful', isDefault: true },
    { id: 'concise', labelKey: 'agentCreation.wizard.traitConcise', sourceText: 'concise', isDefault: true },
    {
        id: 'professional',
        labelKey: 'agentCreation.wizard.traitProfessional',
        sourceText: 'professional',
        isDefault: true,
    },
    { id: 'friendly', labelKey: 'agentCreation.wizard.traitFriendly', sourceText: 'friendly', isDefault: false },
    {
        id: 'analytical',
        labelKey: 'agentCreation.wizard.traitAnalytical',
        sourceText: 'analytical',
        isDefault: false,
    },
    {
        id: 'technical',
        labelKey: 'agentCreation.wizard.traitTechnical',
        sourceText: 'technically knowledgeable',
        isDefault: false,
    },
    {
        id: 'educational',
        labelKey: 'agentCreation.wizard.traitEducational',
        sourceText: 'clear and patient when explaining complex topics',
        isDefault: false,
    },
    {
        id: 'creative',
        labelKey: 'agentCreation.wizard.traitCreative',
        sourceText: 'creative when brainstorming',
        isDefault: false,
    },
] as const;

/**
 * Capability presets available in step 2.
 */
const WIZARD_CAPABILITY_PRESETS: ReadonlyArray<WizardCapabilityPreset> = [
    {
        id: 'browser',
        labelKey: 'agentCreation.wizard.capabilityBrowser',
        commitmentKeyword: 'USE BROWSER',
    },
    {
        id: 'search-engine',
        labelKey: 'agentCreation.wizard.capabilitySearchEngine',
        commitmentKeyword: 'USE SEARCH ENGINE',
    },
] as const;

/**
 * Guardrail presets available in step 3 of the wizard.
 */
const WIZARD_RULE_PRESETS: ReadonlyArray<WizardRulePreset> = [
    {
        id: 'protect-personal-data',
        labelKey: 'agentCreation.wizard.ruleProtectPersonalData',
        sourceText: 'Do not request or disclose personal data unless it is essential and clearly provided by the user.',
        isDefault: true,
    },
    {
        id: 'professional-tone',
        labelKey: 'agentCreation.wizard.ruleProfessionalTone',
        sourceText: 'Use a professional tone in every response.',
        isDefault: true,
    },
    {
        id: 'regulated-advice',
        labelKey: 'agentCreation.wizard.ruleRegulatedAdvice',
        sourceText: 'Do not provide medical, legal, or financial advice beyond general informational guidance.',
        isDefault: false,
    },
    {
        id: 'uncertainty',
        labelKey: 'agentCreation.wizard.ruleUncertainty',
        sourceText: 'Be transparent about uncertainty and limitations.',
        isDefault: false,
    },
] as const;

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
        visibility: defaultVisibility,
        selectedTraitIds: WIZARD_TRAIT_PRESETS.filter((preset) => preset.isDefault).map((preset) => preset.id),
        customTraitDraft: '',
        customTraits: [],
        selectedCapabilityIds: [],
        selectedRuleIds: WIZARD_RULE_PRESETS.filter((preset) => preset.isDefault).map((preset) => preset.id),
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
 * Builds the pure source-builder payload from the current wizard state.
 *
 * @param state - Current wizard state.
 * @returns Normalized source-builder payload.
 */
function buildWizardSourceOptions(state: NewAgentWizardState): CreateNewAgentWizardSourceOptions {
    const selectedTraits = WIZARD_TRAIT_PRESETS.filter((preset) => state.selectedTraitIds.includes(preset.id)).map(
        (preset) => preset.sourceText,
    );
    const selectedRules = WIZARD_RULE_PRESETS.filter((preset) => state.selectedRuleIds.includes(preset.id)).map(
        (preset) => preset.sourceText,
    );
    const selectedCapabilities = WIZARD_CAPABILITY_PRESETS.filter((preset) =>
        state.selectedCapabilityIds.includes(preset.id),
    ).map((preset) => preset.commitmentKeyword);

    return {
        agentName: state.name,
        description: state.description,
        personaTraits: [...selectedTraits, ...state.customTraits],
        rules: [...selectedRules, ...state.customRules],
        capabilityCommitments: selectedCapabilities,
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
 * Renders the guided multi-step new-agent creation flow.
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
    const currentStepDefinition = WIZARD_STEP_DEFINITIONS[step] || WIZARD_STEP_DEFINITIONS[0];
    const currentStepTitle = t(currentStepDefinition.titleKey);
    const currentStepDescription = t(currentStepDefinition.descriptionKey);
    const isLastStep = step === WIZARD_STEP_DEFINITIONS.length - 1;

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
     * Toggles one persona trait preset.
     *
     * @param traitId - Trait identifier.
     */
    function toggleTrait(traitId: string): void {
        setState((previous) => ({
            ...previous,
            selectedTraitIds: toggleSelection(previous.selectedTraitIds, traitId),
        }));
    }

    /**
     * Toggles one capability preset.
     *
     * @param capabilityId - Capability identifier.
     */
    function toggleCapability(capabilityId: string): void {
        setState((previous) => ({
            ...previous,
            selectedCapabilityIds: toggleSelection(previous.selectedCapabilityIds, capabilityId),
        }));
    }

    /**
     * Toggles one rule preset.
     *
     * @param ruleId - Rule identifier.
     */
    function toggleRule(ruleId: string): void {
        setState((previous) => ({
            ...previous,
            selectedRuleIds: toggleSelection(previous.selectedRuleIds, ruleId),
        }));
    }

    /**
     * Adds the custom trait draft as one chip.
     */
    function addCustomTrait(): void {
        setState((previous) => {
            const nextCustomTraits = addUniqueChip(previous.customTraits, previous.customTraitDraft);
            return {
                ...previous,
                customTraits: nextCustomTraits,
                customTraitDraft: '',
            };
        });
    }

    /**
     * Adds the custom rule draft as one chip.
     */
    function addCustomRule(): void {
        setState((previous) => {
            const nextCustomRules = addUniqueChip(previous.customRules, previous.customRuleDraft);
            return {
                ...previous,
                customRules: nextCustomRules,
                customRuleDraft: '',
            };
        });
    }

    /**
     * Handles Enter key for chip-style trait insertion.
     *
     * @param event - Keyboard event from the trait input.
     */
    function handleCustomTraitKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        if (event.key !== 'Enter') {
            return;
        }

        event.preventDefault();
        addCustomTrait();
    }

    /**
     * Handles Enter key for chip-style rule insertion.
     *
     * @param event - Keyboard event from the rule input.
     */
    function handleCustomRuleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        if (event.key !== 'Enter') {
            return;
        }

        event.preventDefault();
        addCustomRule();
    }

    /**
     * Removes one custom trait chip.
     *
     * @param chipIndex - Index of the chip to remove.
     */
    function removeCustomTrait(chipIndex: number): void {
        setState((previous) => ({
            ...previous,
            customTraits: removeChipAt(previous.customTraits, chipIndex),
        }));
    }

    /**
     * Removes one custom rule chip.
     *
     * @param chipIndex - Index of the chip to remove.
     */
    function removeCustomRule(chipIndex: number): void {
        setState((previous) => ({
            ...previous,
            customRules: removeChipAt(previous.customRules, chipIndex),
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
        setStep(WIZARD_STEP_DEFINITIONS.length - 1);
    }

    /**
     * Moves the wizard one step forward.
     */
    function handleNext(): void {
        setStep((previous) => Math.min(previous + 1, WIZARD_STEP_DEFINITIONS.length - 1));
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
            className="w-[min(94vw,52rem)]"
            ariaLabelledBy={titleId}
            ariaDescribedBy={descriptionId}
        >
            <div
                className="relative flex h-[min(92vh,46rem)] flex-col overflow-hidden"
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
                        {WIZARD_STEP_DEFINITIONS.map((stepDefinition, stepIndex) => (
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
                    <div className="mx-auto max-w-3xl">
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
                            <div className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-800">
                                        {t('agentCreation.wizard.traitsLabel')}
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {WIZARD_TRAIT_PRESETS.map((preset) => {
                                            const isSelected = state.selectedTraitIds.includes(preset.id);
                                            return (
                                                <button
                                                    key={preset.id}
                                                    type="button"
                                                    onClick={() => toggleTrait(preset.id)}
                                                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                                                        isSelected
                                                            ? 'border-blue-600 bg-blue-600 text-white'
                                                            : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {t(preset.labelKey)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-800">
                                        {t('agentCreation.wizard.capabilitiesLabel')}
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {WIZARD_CAPABILITY_PRESETS.map((preset) => {
                                            const isSelected = state.selectedCapabilityIds.includes(preset.id);
                                            return (
                                                <button
                                                    key={preset.id}
                                                    type="button"
                                                    onClick={() => toggleCapability(preset.id)}
                                                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                                                        isSelected
                                                            ? 'border-emerald-600 bg-emerald-600 text-white'
                                                            : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {t(preset.labelKey)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-800">
                                        {t('agentCreation.wizard.customTraitLabel')}
                                    </label>
                                    <input
                                        value={state.customTraitDraft}
                                        onChange={(event) =>
                                            setState((previous) => ({ ...previous, customTraitDraft: event.target.value }))
                                        }
                                        onKeyDown={handleCustomTraitKeyDown}
                                        placeholder={t('agentCreation.wizard.customTraitPlaceholder')}
                                        className={INPUT_CLASS_NAME}
                                    />
                                    {state.customTraits.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {state.customTraits.map((trait, index) => (
                                                <span
                                                    key={`${trait}-${index}`}
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-900"
                                                >
                                                    {trait}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeCustomTrait(index)}
                                                        className="text-blue-700 transition hover:text-blue-900"
                                                        aria-label={t('agentCreation.wizard.removeKnowledgeAction')}
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex flex-wrap gap-2">
                                    {WIZARD_RULE_PRESETS.map((preset) => {
                                        const isSelected = state.selectedRuleIds.includes(preset.id);
                                        return (
                                            <button
                                                key={preset.id}
                                                type="button"
                                                onClick={() => toggleRule(preset.id)}
                                                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                                                    isSelected
                                                        ? 'border-blue-600 bg-blue-600 text-white'
                                                        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                                                }`}
                                            >
                                                {t(preset.labelKey)}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-800">
                                        {t('agentCreation.wizard.customInstructionsLabel')}
                                    </label>
                                    <input
                                        value={state.customRuleDraft}
                                        onChange={(event) =>
                                            setState((previous) => ({ ...previous, customRuleDraft: event.target.value }))
                                        }
                                        onKeyDown={handleCustomRuleKeyDown}
                                        placeholder={t('agentCreation.wizard.customInstructionsPlaceholder')}
                                        className={INPUT_CLASS_NAME}
                                    />
                                    {state.customRules.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {state.customRules.map((rule, index) => (
                                                <span
                                                    key={`${rule}-${index}`}
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm text-slate-800"
                                                >
                                                    {rule}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeCustomRule(index)}
                                                        className="text-slate-500 transition hover:text-slate-800"
                                                        aria-label={t('agentCreation.wizard.removeKnowledgeAction')}
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 3 && (
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
                    <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
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
