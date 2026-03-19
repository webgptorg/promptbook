'use client';

import type { string_book } from '@promptbook-local/types';
import { ArrowLeft, ArrowRight, Link2, Upload, X } from 'lucide-react';
import { useId, useMemo, useRef, useState, type ChangeEvent } from 'react';
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
    /**
     * Whether the book editor should open after successful creation.
     */
    readonly openBookEditorAfterCreation: boolean;
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
 * One rule/guardrail preset shown as a checkbox.
 */
type WizardRulePreset = {
    /**
     * Stable identifier stored in local component state.
     */
    readonly id: string;
    /**
     * Translation key used for the checkbox label.
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
     * Optional custom trait text.
     */
    readonly customTraitText: string;
    /**
     * Selected guardrail preset ids.
     */
    readonly selectedRuleIds: ReadonlyArray<string>;
    /**
     * Optional custom instructions block.
     */
    readonly customInstructions: string;
    /**
     * Uploaded and pasted knowledge items.
     */
    readonly knowledgeItems: ReadonlyArray<WizardKnowledgeItem>;
    /**
     * Draft multiline URL input.
     */
    readonly knowledgeUrlDraft: string;
    /**
     * Whether to open the book editor after successful creation.
     */
    readonly openBookEditorAfterCreation: boolean;
};

/**
 * Shared styling for single-line inputs.
 */
const INPUT_CLASS_NAME =
    'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

/**
 * Shared styling for multi-line inputs.
 */
const TEXTAREA_CLASS_NAME =
    'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

/**
 * Shared styling for secondary dialog actions.
 */
const SECONDARY_BUTTON_CLASS_NAME =
    'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Shared styling for primary dialog actions.
 */
const PRIMARY_BUTTON_CLASS_NAME =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50';

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
 * Creates the initial wizard state using the metadata-driven default visibility.
 *
 * @param defaultVisibility - Default visibility resolved from metadata.
 * @returns Fresh wizard state.
 */
function createInitialWizardState(defaultVisibility: AgentVisibility): NewAgentWizardState {
    return {
        name: '',
        description: '',
        visibility: defaultVisibility,
        selectedTraitIds: WIZARD_TRAIT_PRESETS.filter((preset) => preset.isDefault).map((preset) => preset.id),
        customTraitText: '',
        selectedRuleIds: WIZARD_RULE_PRESETS.filter((preset) => preset.isDefault).map((preset) => preset.id),
        customInstructions: '',
        knowledgeItems: [],
        knowledgeUrlDraft: '',
        openBookEditorAfterCreation: false,
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
 * Parses a multiline list of URLs and returns only valid HTTP(S) entries.
 *
 * @param rawUrls - Raw textarea value.
 * @returns Parsed valid URLs and original invalid lines.
 */
function parseKnowledgeUrls(rawUrls: string): { validUrls: string[]; invalidEntries: string[] } {
    const rawEntries = rawUrls
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean);
    const validUrls: string[] = [];
    const invalidEntries: string[] = [];

    for (const entry of rawEntries) {
        try {
            const parsedUrl = new URL(entry);
            if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
                invalidEntries.push(entry);
                continue;
            }

            validUrls.push(parsedUrl.toString());
        } catch {
            invalidEntries.push(entry);
        }
    }

    return { validUrls, invalidEntries };
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

    return {
        agentName: state.name,
        description: state.description,
        personaTraits: selectedTraits,
        customTraitText: state.customTraitText,
        rules: selectedRules,
        customInstructions: state.customInstructions,
        knowledgeItems: state.knowledgeItems
            .filter((item) => item.status === 'ready')
            .map((item) => ({ label: item.label, source: item.source })),
    };
}

/**
 * Renders the guided multi-step new-agent creation flow.
 */
export function NewAgentWizard(props: NewAgentWizardProps) {
    const { mode, defaultVisibility, folderId, onClose, onCreate, onOpenEditor } = props;
    const { formatText } = useAgentNaming();
    const { t } = useServerLanguage();
    const titleId = useId();
    const descriptionId = useId();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const initialState = useMemo(() => createInitialWizardState(defaultVisibility), [defaultVisibility]);
    const [state, setState] = useState<NewAgentWizardState>(initialState);
    const [step, setStep] = useState(0);
    const [knowledgeFeedback, setKnowledgeFeedback] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const hasUploadingKnowledge = state.knowledgeItems.some((item) => item.status === 'uploading');
    const selectedTraitLabels = WIZARD_TRAIT_PRESETS.filter((preset) => state.selectedTraitIds.includes(preset.id)).map(
        (preset) => t(preset.labelKey),
    );
    const selectedRuleLabels = WIZARD_RULE_PRESETS.filter((preset) => state.selectedRuleIds.includes(preset.id)).map(
        (preset) => t(preset.labelKey),
    );
    const readyKnowledgeItems = state.knowledgeItems.filter((item) => item.status === 'ready');
    const hasUnsavedChanges = hasWizardChanges(state, initialState);
    const { requestClose } = useDirtyModalGuard({
        hasUnsavedChanges,
        isCloseBlocked: isCreating,
        onClose,
    });
    const currentStepTitle = [
        t('agentCreation.wizard.basicTitle'),
        t('agentCreation.wizard.personaTitle'),
        t('agentCreation.wizard.rulesTitle'),
        t('agentCreation.wizard.knowledgeTitle'),
        t('agentCreation.wizard.reviewTitle'),
    ][step];
    const currentStepDescription = [
        t('agentCreation.wizard.basicDescription'),
        t('agentCreation.wizard.personaDescription'),
        t('agentCreation.wizard.rulesDescription'),
        t('agentCreation.wizard.knowledgeDescription'),
        t('agentCreation.wizard.reviewDescription'),
    ][step];

    /**
     * Toggles one selected trait preset.
     *
     * @param traitId - Trait identifier to toggle.
     */
    function toggleTrait(traitId: string): void {
        setState((previous) => ({
            ...previous,
            selectedTraitIds: previous.selectedTraitIds.includes(traitId)
                ? previous.selectedTraitIds.filter((id) => id !== traitId)
                : [...previous.selectedTraitIds, traitId],
        }));
    }

    /**
     * Toggles one selected rule preset.
     *
     * @param ruleId - Rule identifier to toggle.
     */
    function toggleRule(ruleId: string): void {
        setState((previous) => ({
            ...previous,
            selectedRuleIds: previous.selectedRuleIds.includes(ruleId)
                ? previous.selectedRuleIds.filter((id) => id !== ruleId)
                : [...previous.selectedRuleIds, ruleId],
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
     * Parses the pasted URLs textarea and stores valid knowledge entries.
     */
    function handleAddKnowledgeUrls(): void {
        const { validUrls, invalidEntries } = parseKnowledgeUrls(state.knowledgeUrlDraft);

        if (validUrls.length === 0 && invalidEntries.length === 0) {
            return;
        }

        const existingSources = new Set(state.knowledgeItems.map((item) => item.source));
        const nextKnowledgeItems = validUrls
            .filter((url) => !existingSources.has(url))
            .map(
                (url): WizardKnowledgeItem => ({
                    id: createKnowledgeItemId(),
                    label: simplifyKnowledgeLabel(url),
                    source: url,
                    kind: 'url',
                    status: 'ready',
                    progress: 1,
                }),
            );

        setState((previous) => ({
            ...previous,
            knowledgeItems: [...previous.knowledgeItems, ...nextKnowledgeItems],
            knowledgeUrlDraft: invalidEntries.join('\n'),
        }));

        if (invalidEntries.length > 0) {
            setKnowledgeFeedback(
                t('agentCreation.wizard.invalidUrls', {
                    count: String(invalidEntries.length),
                }),
            );
            return;
        }

        setKnowledgeFeedback(null);
    }

    /**
     * Advances the wizard to the next step when the current step is valid.
     */
    function handleNext(): void {
        if (step === 0 && state.name.trim() === '') {
            return;
        }

        if (step === 3 && hasUploadingKnowledge) {
            return;
        }

        setStep((previous) => Math.min(previous + 1, 4));
    }

    /**
     * Moves the wizard back by one step.
     */
    function handleBack(): void {
        setStep((previous) => Math.max(previous - 1, 0));
    }

    /**
     * Switches from the guided review step to the raw editor experience.
     */
    function handleOpenAdvancedEditor(): void {
        const sourceOptions = buildWizardSourceOptions(state);
        onOpenEditor({
            agentSource: createNewAgentWizardSource(sourceOptions),
            visibility: state.visibility,
        });
    }

    /**
     * Creates the agent directly from the guided wizard review step.
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
                openBookEditorAfterCreation: state.openBookEditorAfterCreation,
            });
        } finally {
            setIsCreating(false);
        }
    }

    return (
        <Dialog
            onClose={requestClose}
            className="flex h-[min(92vh,48rem)] w-[min(92vw,56rem)] flex-col overflow-hidden"
            ariaLabelledBy={titleId}
            ariaDescribedBy={descriptionId}
        >
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                            {t('agentCreation.wizardEyebrow')}
                        </div>
                        <h2 id={titleId} className="mt-2 text-2xl font-semibold text-slate-900">
                            {formatText(t('agentCreation.wizardTitle'))}
                        </h2>
                        <p id={descriptionId} className="mt-2 max-w-2xl text-sm text-slate-600">
                            {currentStepDescription}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={requestClose}
                        className="rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-600"
                    >
                        <X className="h-5 w-5" />
                        <span className="sr-only">{t('common.close')}</span>
                    </button>
                </div>
                <div className="mt-5 grid grid-cols-5 gap-2">
                    {[0, 1, 2, 3, 4].map((stepIndex) => (
                        <button
                            key={stepIndex}
                            type="button"
                            onClick={() => {
                                if (stepIndex <= step) {
                                    setStep(stepIndex);
                                }
                            }}
                            className={`rounded-2xl border px-3 py-3 text-left transition ${
                                stepIndex === step
                                    ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                                    : stepIndex < step
                                      ? 'border-blue-200 bg-blue-50 text-blue-900'
                                      : 'border-slate-200 bg-white text-slate-500'
                            }`}
                        >
                            <div className="text-[11px] font-semibold uppercase tracking-[0.24em]">
                                {stepIndex + 1}
                            </div>
                            <div className="mt-1 text-sm font-semibold">
                                {
                                    [
                                        t('agentCreation.wizard.basicShort'),
                                        t('agentCreation.wizard.personaShort'),
                                        t('agentCreation.wizard.rulesShort'),
                                        t('agentCreation.wizard.knowledgeShort'),
                                        t('agentCreation.wizard.reviewShort'),
                                    ][stepIndex]
                                }
                            </div>
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-white px-6 py-5">
                <div className="mx-auto max-w-3xl">
                    <h3 className="text-lg font-semibold text-slate-900">{currentStepTitle}</h3>
                    {step === 0 && (
                        <div className="mt-5 space-y-5">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-800">
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
                                    <p className="mt-2 text-sm text-amber-700">
                                        {t('agentCreation.wizard.nameRequired')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-800">
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
                                <label className="mb-2 block text-sm font-semibold text-slate-800">
                                    {t('agentCreation.wizard.visibilityLabel')}
                                </label>
                                <div className="grid gap-3 sm:grid-cols-3">
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
                                            className={`rounded-2xl border px-4 py-3 text-left transition ${
                                                state.visibility === visibility
                                                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="text-sm font-semibold">{label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="mt-5 space-y-5">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-800">
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
                                                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                                    isSelected
                                                        ? 'border-blue-500 bg-blue-600 text-white'
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
                                <label className="mb-2 block text-sm font-semibold text-slate-800">
                                    {t('agentCreation.wizard.customTraitLabel')}
                                </label>
                                <input
                                    value={state.customTraitText}
                                    onChange={(event) =>
                                        setState((previous) => ({ ...previous, customTraitText: event.target.value }))
                                    }
                                    placeholder={t('agentCreation.wizard.customTraitPlaceholder')}
                                    className={INPUT_CLASS_NAME}
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="mt-5 space-y-4">
                            {WIZARD_RULE_PRESETS.map((preset) => {
                                const isSelected = state.selectedRuleIds.includes(preset.id);
                                return (
                                    <label
                                        key={preset.id}
                                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 transition ${
                                            isSelected
                                                ? 'border-blue-200 bg-blue-50'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleRule(preset.id)}
                                            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div className="text-sm font-medium text-slate-800">{t(preset.labelKey)}</div>
                                    </label>
                                );
                            })}
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-800">
                                    {t('agentCreation.wizard.customInstructionsLabel')}
                                </label>
                                <textarea
                                    value={state.customInstructions}
                                    onChange={(event) =>
                                        setState((previous) => ({
                                            ...previous,
                                            customInstructions: event.target.value,
                                        }))
                                    }
                                    placeholder={t('agentCreation.wizard.customInstructionsPlaceholder')}
                                    rows={4}
                                    className={TEXTAREA_CLASS_NAME}
                                />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="mt-5 space-y-5">
                            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-semibold text-slate-900">
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

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-800">
                                    {t('agentCreation.wizard.urlsLabel')}
                                </label>
                                <textarea
                                    value={state.knowledgeUrlDraft}
                                    onChange={(event) =>
                                        setState((previous) => ({
                                            ...previous,
                                            knowledgeUrlDraft: event.target.value,
                                        }))
                                    }
                                    placeholder={t('agentCreation.wizard.urlsPlaceholder')}
                                    rows={4}
                                    className={TEXTAREA_CLASS_NAME}
                                />
                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <p className="text-sm text-slate-500">{t('agentCreation.wizard.urlsHint')}</p>
                                    <button
                                        type="button"
                                        onClick={handleAddKnowledgeUrls}
                                        className={SECONDARY_BUTTON_CLASS_NAME}
                                    >
                                        <Link2 className="h-4 w-4" />
                                        {t('agentCreation.wizard.addUrlsAction')}
                                    </button>
                                </div>
                                {knowledgeFeedback && (
                                    <p className="mt-2 text-sm text-amber-700">{knowledgeFeedback}</p>
                                )}
                            </div>
                            <div className="space-y-3">
                                {state.knowledgeItems.length === 0 ? (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                                        {t('agentCreation.wizard.noKnowledge')}
                                    </div>
                                ) : (
                                    state.knowledgeItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-semibold text-slate-900">
                                                        {item.label}
                                                    </div>
                                                    <div className="mt-1 text-xs text-slate-500">
                                                        {item.kind === 'file'
                                                            ? t('agentCreation.wizard.uploadedFile')
                                                            : item.source}
                                                    </div>
                                                    {item.status === 'uploading' && (
                                                        <div className="mt-3">
                                                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
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
                                                        <div className="mt-2 text-sm text-rose-700">
                                                            {item.errorMessage}
                                                        </div>
                                                    )}
                                                </div>
                                                {item.status !== 'uploading' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeKnowledgeItem(item.id)}
                                                        className="text-sm font-semibold text-slate-500 transition hover:text-slate-800"
                                                    >
                                                        {t('agentCreation.wizard.removeKnowledgeAction')}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                                <input
                                    type="checkbox"
                                    checked={state.openBookEditorAfterCreation}
                                    onChange={(event) =>
                                        setState((previous) => ({
                                            ...previous,
                                            openBookEditorAfterCreation: event.target.checked,
                                        }))
                                    }
                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">
                                        {t('agentCreation.wizard.openEditorAfterCreationLabel')}
                                    </div>
                                    <div className="mt-1 text-sm text-slate-600">
                                        {t('agentCreation.wizard.openEditorAfterCreationDescription')}
                                    </div>
                                </div>
                            </label>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="mt-5 space-y-4">
                            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    {t('agentCreation.wizard.reviewBasicHeading')}
                                </div>
                                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                            {t('agentCreation.wizard.nameLabel')}
                                        </div>
                                        <div className="mt-1 text-sm font-semibold text-slate-900">
                                            {state.name || '—'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                            {t('agentCreation.wizard.visibilityLabel')}
                                        </div>
                                        <div className="mt-1 text-sm font-semibold text-slate-900">
                                            {
                                                {
                                                    PRIVATE: t('agentCreation.wizard.visibilityPrivate'),
                                                    UNLISTED: t('agentCreation.wizard.visibilityUnlisted'),
                                                    PUBLIC: t('agentCreation.wizard.visibilityPublic'),
                                                }[state.visibility]
                                            }
                                        </div>
                                    </div>
                                </div>
                                {state.description.trim() !== '' && (
                                    <div className="mt-4">
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                            {t('agentCreation.wizard.descriptionLabel')}
                                        </div>
                                        <div className="mt-1 text-sm text-slate-700">{state.description}</div>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white p-5">
                                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    {t('agentCreation.wizard.reviewPersonaHeading')}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {[...selectedTraitLabels, ...(state.customTraitText.trim() ? [state.customTraitText.trim()] : [])]
                                        .filter(Boolean)
                                        .map((label) => (
                                            <span
                                                key={label}
                                                className="rounded-full bg-blue-100 px-3 py-1.5 text-sm font-semibold text-blue-900"
                                            >
                                                {label}
                                            </span>
                                        ))}
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white p-5">
                                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    {t('agentCreation.wizard.reviewRulesHeading')}
                                </div>
                                <div className="mt-3 space-y-2">
                                    {[...selectedRuleLabels, ...(state.customInstructions.trim() ? [state.customInstructions.trim()] : [])]
                                        .filter(Boolean)
                                        .map((label) => (
                                            <div key={label} className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                                {label}
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white p-5">
                                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    {t('agentCreation.wizard.reviewKnowledgeHeading')}
                                </div>
                                {readyKnowledgeItems.length === 0 ? (
                                    <div className="mt-3 text-sm text-slate-600">{t('agentCreation.wizard.noKnowledge')}</div>
                                ) : (
                                    <div className="mt-3 grid gap-2">
                                        {readyKnowledgeItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700"
                                            >
                                                {item.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={handleOpenAdvancedEditor}
                                disabled={isCreating || hasUploadingKnowledge}
                                className="text-sm font-semibold text-blue-700 transition hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {t('agentCreation.wizard.openAdvancedEditorAction')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
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
                    {step < 4 ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            disabled={(step === 0 && state.name.trim() === '') || (step === 3 && hasUploadingKnowledge)}
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
        </Dialog>
    );
}
