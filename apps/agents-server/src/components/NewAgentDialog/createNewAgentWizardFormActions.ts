import type { Dispatch, SetStateAction } from 'react';
import {
    addUniqueChip,
    removeChipAt,
    toggleSelection,
    toggleTeamReferenceSelection,
    type NewAgentWizardChipCollectionKey,
    type NewAgentWizardChipDraftKey,
    type NewAgentWizardPresetSelectionKey,
    type NewAgentWizardState,
} from './NewAgentWizardState';

/**
 * Options for the extracted form-action facade used by `useNewAgentWizard`.
 *
 * @private internal type of <useNewAgentWizard/>.
 */
type CreateNewAgentWizardFormActionsOptions = {
    /**
     * State updater shared by the wizard.
     */
    readonly setState: Dispatch<SetStateAction<NewAgentWizardState>>;
};

/**
 * Creates focused setters for the wizard's preset, chip, and team-reference fields.
 *
 * @param options - Action factory options.
 * @returns Small facade for form-specific mutations.
 *
 * @private internal utility of <useNewAgentWizard/>.
 */
export function createNewAgentWizardFormActions(options: CreateNewAgentWizardFormActionsOptions) {
    const { setState } = options;

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
     * Toggles one teammate reference directly from the selectable agent picker.
     *
     * @param reference - Raw teammate reference to normalize and toggle.
     */
    function toggleTeamReference(reference: string): void {
        setState((previous) => ({
            ...previous,
            teamReferences: toggleTeamReferenceSelection(previous.teamReferences, reference),
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

    return {
        togglePresetSelection,
        addDraftChip,
        toggleTeamReference,
        removeDraftChip,
    };
}
