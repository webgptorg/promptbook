import type { Dispatch, SetStateAction } from 'react';
import { NEW_AGENT_WIZARD_RULE_PRESETS } from './newAgentWizardPresets';
import type {
    NewAgentWizardChipCollectionKey,
    NewAgentWizardChipDraftKey,
    NewAgentWizardPresetSelectionKey,
    NewAgentWizardState,
} from './NewAgentWizardState';
import type { NewAgentWizardTranslate } from './NewAgentWizardTranslate';
import { WizardChipInput } from './WizardChipInput';
import { WizardSelectableCard } from './WizardSelectableCard';

/**
 * Props for the rules step in the new-agent wizard.
 */
type NewAgentWizardRulesStepProps = {
    /**
     * Current wizard state.
     */
    readonly state: NewAgentWizardState;

    /**
     * State updater shared by the wizard.
     */
    readonly setState: Dispatch<SetStateAction<NewAgentWizardState>>;

    /**
     * Translation helper.
     */
    readonly t: NewAgentWizardTranslate;

    /**
     * Toggles one preset selection list.
     */
    readonly togglePresetSelection: (key: NewAgentWizardPresetSelectionKey, presetId: string) => void;

    /**
     * Adds the current draft input into a chip list.
     */
    readonly addDraftChip: (chipsKey: NewAgentWizardChipCollectionKey, draftKey: NewAgentWizardChipDraftKey) => void;

    /**
     * Removes one chip from a chip list.
     */
    readonly removeDraftChip: (chipsKey: NewAgentWizardChipCollectionKey, chipIndex: number) => void;
};

/**
 * Renders the rule-selection step.
 *
 * @param props - Step props.
 * @returns Rule-selection step content.
 *
 * @private internal component of <NewAgentWizard/>.
 */
export function NewAgentWizardRulesStep(props: NewAgentWizardRulesStepProps) {
    const { state, setState, t, togglePresetSelection, addDraftChip, removeDraftChip } = props;

    return (
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
                onDraftChange={(customRuleDraft) => setState((previous) => ({ ...previous, customRuleDraft }))}
                onAdd={() => addDraftChip('customRules', 'customRuleDraft')}
                onRemove={(chipIndex) => removeDraftChip('customRules', chipIndex)}
                removeLabel={t('agentCreation.wizard.removeKnowledgeAction')}
            />
        </div>
    );
}
