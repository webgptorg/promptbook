import type { AgentVisibility } from '../../utils/agentVisibility';
import {
    NEW_AGENT_WIZARD_CAPABILITY_PRESETS,
    NEW_AGENT_WIZARD_PERSONA_PRESETS,
    NEW_AGENT_WIZARD_RULE_PRESETS,
    NEW_AGENT_WIZARD_WRITING_STYLE_PRESETS,
} from './newAgentWizardPresets';
import type { CreateNewAgentWizardSourceOptions } from './createNewAgentWizardSource';

/**
 * Local knowledge item tracked while uploads finish.
 *
 * @private internal type of <NewAgentWizard/>.
 */
export type WizardKnowledgeItem = {
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
 *
 * @private internal type of <NewAgentWizard/>.
 */
export type NewAgentWizardState = {
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
     * Draft teammate reference entered in the team step.
     */
    readonly teamReferenceDraft: string;

    /**
     * Compact references or URLs emitted as `TEAM` commitments.
     */
    readonly teamReferences: ReadonlyArray<string>;

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
 * State keys that store toggleable preset identifiers.
 *
 * @private internal type of <NewAgentWizard/>.
 */
export type NewAgentWizardPresetSelectionKey =
    | 'selectedPersonaTraitIds'
    | 'selectedCapabilityIds'
    | 'selectedWritingStyleIds'
    | 'selectedRuleIds';

/**
 * State keys that store wizard chip collections.
 *
 * @private internal type of <NewAgentWizard/>.
 */
export type NewAgentWizardChipCollectionKey =
    | 'customPersonaTraits'
    | 'customWritingTraits'
    | 'customWritingRules'
    | 'customRules';

/**
 * State keys that store draft chip input values.
 *
 * @private internal type of <NewAgentWizard/>.
 */
export type NewAgentWizardChipDraftKey =
    | 'customPersonaTraitDraft'
    | 'customWritingTraitDraft'
    | 'customWritingRuleDraft'
    | 'customRuleDraft';

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
 * Collects the default-selected preset ids from one preset list.
 *
 * @param presets - Preset catalogue.
 * @returns Default preset identifiers.
 */
function selectDefaultPresetIds(presets: ReadonlyArray<{ readonly id: string; readonly isDefault: boolean }>): Array<string> {
    return presets.filter((preset) => preset.isDefault).map((preset) => preset.id);
}

/**
 * Creates the initial wizard state using metadata defaults and generated agent name.
 *
 * @param defaultVisibility - Default visibility resolved from metadata.
 * @param initialAgentName - Optional generated boilerplate name.
 * @returns Fresh wizard state.
 *
 * @private internal utility of <NewAgentWizard/>.
 */
export function createInitialWizardState(
    defaultVisibility: AgentVisibility,
    initialAgentName: string | null | undefined,
): NewAgentWizardState {
    return {
        name: normalizeSingleLineInput(initialAgentName),
        description: '',
        goal: '',
        visibility: defaultVisibility,
        selectedPersonaTraitIds: selectDefaultPresetIds(NEW_AGENT_WIZARD_PERSONA_PRESETS),
        customPersonaTraitDraft: '',
        customPersonaTraits: [],
        selectedCapabilityIds: [],
        teamReferenceDraft: '',
        teamReferences: [],
        isOpenToLearning: true,
        selectedWritingStyleIds: selectDefaultPresetIds(NEW_AGENT_WIZARD_WRITING_STYLE_PRESETS),
        customWritingTraitDraft: '',
        customWritingTraits: [],
        customWritingRuleDraft: '',
        customWritingRules: [],
        customWritingSample: '',
        selectedRuleIds: selectDefaultPresetIds(NEW_AGENT_WIZARD_RULE_PRESETS),
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
 *
 * @private internal utility of <NewAgentWizard/>.
 */
export function hasWizardChanges(state: NewAgentWizardState, initialState: NewAgentWizardState): boolean {
    return JSON.stringify(state) !== JSON.stringify(initialState);
}

/**
 * Generates a stable client-side knowledge item identifier.
 *
 * @returns Unique local identifier.
 *
 * @private internal utility of <NewAgentWizard/>.
 */
export function createKnowledgeItemId(): string {
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
 *
 * @private internal utility of <NewAgentWizard/>.
 */
export function toggleSelection(selectedIds: ReadonlyArray<string>, idToToggle: string): ReadonlyArray<string> {
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
 *
 * @private internal utility of <NewAgentWizard/>.
 */
export function addUniqueChip(chips: ReadonlyArray<string>, rawValue: string): ReadonlyArray<string> {
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
 * Normalizes one teammate reference entered in the wizard UI.
 *
 * Plain agent names are converted into compact references such as `{Legal Reviewer}`
 * so the existing Agents Server resolver can expand them later.
 *
 * @param rawValue - Raw teammate reference entered by the user.
 * @returns Normalized teammate reference or empty string when nothing should be added.
 *
 * @private internal utility of <NewAgentWizard/>.
 */
export function normalizeTeamReferenceInput(rawValue: string): string {
    const normalizedValue = normalizeSingleLineInput(rawValue);
    if (normalizedValue === '') {
        return '';
    }

    try {
        const parsedUrl = new URL(normalizedValue);
        if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
            return parsedUrl.toString();
        }
    } catch {
        // Non-URL values are treated as compact agent references below.
    }

    const bracketMatch = /^\{(.+)\}$/.exec(normalizedValue);
    const compactReferencePayload = normalizeSingleLineInput(
        bracketMatch?.[1] || normalizedValue.replace(/^@/, ''),
    );

    return compactReferencePayload === '' ? '' : `{${compactReferencePayload}}`;
}

/**
 * Formats one teammate reference for friendly chip labels and traceability summaries.
 *
 * @param teamReference - TEAM compact reference or URL.
 * @returns Readable teammate label.
 *
 * @private internal utility of <NewAgentWizard/>.
 */
export function summarizeTeamReference(teamReference: string): string {
    const normalizedReference = normalizeSingleLineInput(teamReference);
    if (normalizedReference === '') {
        return '';
    }

    const bracketMatch = /^\{(.+)\}$/.exec(normalizedReference);
    if (bracketMatch?.[1]) {
        return normalizeSingleLineInput(bracketMatch[1]);
    }

    try {
        const parsedUrl = new URL(normalizedReference);
        const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
        const lastPathPart = decodeURIComponent(pathParts[pathParts.length - 1] || parsedUrl.hostname);
        return normalizeSingleLineInput(lastPathPart.replace(/[-_]+/g, ' ')) || parsedUrl.hostname;
    } catch {
        return normalizedReference;
    }
}

/**
 * Adds one normalized teammate reference if it is non-empty and not already present.
 *
 * @param teamReferences - Existing teammate references.
 * @param rawValue - Raw teammate reference entered by the user.
 * @returns Updated teammate reference list.
 *
 * @private internal utility of <NewAgentWizard/>.
 */
export function addUniqueTeamReference(teamReferences: ReadonlyArray<string>, rawValue: string): ReadonlyArray<string> {
    const normalizedReference = normalizeTeamReferenceInput(rawValue);
    if (normalizedReference === '') {
        return teamReferences;
    }

    const alreadyPresent = teamReferences.some(
        (teamReference) => teamReference.toLowerCase() === normalizedReference.toLowerCase(),
    );
    if (alreadyPresent) {
        return teamReferences;
    }

    return [...teamReferences, normalizedReference];
}

/**
 * Toggles one teammate selection using the provided preferred reference and known match variants.
 *
 * @param teamReferences - Existing teammate references.
 * @param preferredReference - Canonical reference to add when no match is selected.
 * @param matchingReferences - Reference variants that should count as the same teammate.
 * @returns Updated teammate reference list.
 *
 * @private internal utility of <NewAgentWizard/>.
 */
export function toggleTeamReferenceSelection(
    teamReferences: ReadonlyArray<string>,
    preferredReference: string,
    matchingReferences: ReadonlyArray<string>,
): ReadonlyArray<string> {
    const normalizedMatchingReferences = new Set(
        matchingReferences.map((teamReference) => normalizeTeamReferenceInput(teamReference).toLowerCase()).filter(Boolean),
    );

    if (normalizedMatchingReferences.size > 0) {
        const filteredTeamReferences = teamReferences.filter(
            (teamReference) => !normalizedMatchingReferences.has(normalizeTeamReferenceInput(teamReference).toLowerCase()),
        );
        if (filteredTeamReferences.length !== teamReferences.length) {
            return filteredTeamReferences;
        }
    }

    return addUniqueTeamReference(teamReferences, preferredReference);
}

/**
 * Removes one chip by index.
 *
 * @param chips - Existing chip values.
 * @param chipIndex - Index to remove.
 * @returns Updated chip array.
 *
 * @private internal utility of <NewAgentWizard/>.
 */
export function removeChipAt(chips: ReadonlyArray<string>, chipIndex: number): ReadonlyArray<string> {
    return chips.filter((_, index) => index !== chipIndex);
}

/**
 * Parses one user-entered URL and validates HTTP(S) protocol.
 *
 * @param rawUrl - Raw URL input.
 * @returns Valid URL or invalid marker.
 *
 * @private internal utility of <NewAgentWizard/>.
 */
export function parseKnowledgeUrl(rawUrl: string): { validUrl?: string; isInvalid: boolean } {
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
 *
 * @private internal utility of <NewAgentWizard/>.
 */
export function buildWizardSourceOptions(state: NewAgentWizardState): CreateNewAgentWizardSourceOptions {
    const selectedPersonaPresets = selectPresetsById(NEW_AGENT_WIZARD_PERSONA_PRESETS, state.selectedPersonaTraitIds);
    const selectedWritingPresets = selectPresetsById(NEW_AGENT_WIZARD_WRITING_STYLE_PRESETS, state.selectedWritingStyleIds);
    const selectedRulePresets = selectPresetsById(NEW_AGENT_WIZARD_RULE_PRESETS, state.selectedRuleIds);
    const selectedCapabilityPresets = selectPresetsById(NEW_AGENT_WIZARD_CAPABILITY_PRESETS, state.selectedCapabilityIds)
        .filter((preset) => preset.availability === 'wizard');
    const customWritingSample = state.customWritingSample.trim();

    return {
        agentName: state.name,
        description: state.description,
        goal: state.goal,
        personaTraits: [...selectedPersonaPresets.map((preset) => preset.sourceText), ...state.customPersonaTraits],
        teamReferences: state.teamReferences,
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
