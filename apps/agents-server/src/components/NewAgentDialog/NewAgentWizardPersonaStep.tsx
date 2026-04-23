import type { Dispatch, SetStateAction } from 'react';
import { NEW_AGENT_WIZARD_CAPABILITY_PRESETS, NEW_AGENT_WIZARD_PERSONA_PRESETS } from './newAgentWizardPresets';
import type {
    NewAgentWizardChipCollectionKey,
    NewAgentWizardChipDraftKey,
    NewAgentWizardPresetSelectionKey,
    NewAgentWizardState,
} from './NewAgentWizardState';
import { NewAgentWizardClassNames } from './NewAgentWizardClassNames';
import type { NewAgentWizardTranslate } from './NewAgentWizardTranslate';
import { WizardChipInput } from './WizardChipInput';
import { WizardSelectableCard } from './WizardSelectableCard';

/**
 * Props for the persona-and-capabilities step in the new-agent wizard.
 */
type NewAgentWizardPersonaStepProps = {
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
 * Renders the persona-and-capabilities step.
 *
 * @param props - Step props.
 * @returns Persona-and-capabilities step content.
 *
 * @private internal component of <NewAgentWizard/>.
 */
export function NewAgentWizardPersonaStep(props: NewAgentWizardPersonaStepProps) {
    const { state, setState, t, togglePresetSelection, addDraftChip, removeDraftChip } = props;

    return (
        <div className={`mt-4 space-y-6 ${NewAgentWizardClassNames.surfaceCard}`}>
            <div>
                <label className={NewAgentWizardClassNames.fieldLabel}>{t('agentCreation.wizard.traitsLabel')}</label>
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
                onDraftChange={(customPersonaTraitDraft) => setState((previous) => ({ ...previous, customPersonaTraitDraft }))}
                onAdd={() => addDraftChip('customPersonaTraits', 'customPersonaTraitDraft')}
                onRemove={(chipIndex) => removeDraftChip('customPersonaTraits', chipIndex)}
                removeLabel={t('agentCreation.wizard.removeKnowledgeAction')}
            />

            <div>
                <label className={NewAgentWizardClassNames.fieldLabel}>
                    {t('agentCreation.wizard.learningModeLabel')}
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                    <WizardSelectableCard
                        icon="🔓"
                        label={t('agentCreation.wizard.learningModeOpen')}
                        note={t('agentCreation.wizard.learningModeOpenDescription')}
                        isSelected={state.isOpenToLearning}
                        onClick={() => setState((previous) => ({ ...previous, isOpenToLearning: true }))}
                        variant="emerald"
                    />
                    <WizardSelectableCard
                        icon="🔒"
                        label={t('agentCreation.wizard.learningModeClosed')}
                        note={t('agentCreation.wizard.learningModeClosedDescription')}
                        isSelected={!state.isOpenToLearning}
                        onClick={() => setState((previous) => ({ ...previous, isOpenToLearning: false }))}
                        variant="amber"
                    />
                </div>
            </div>

            <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                        {t('agentCreation.wizard.capabilitiesLabel')}
                    </label>
                    <span className={NewAgentWizardClassNames.sectionHint}>{t('agentCreation.wizard.capabilitiesHint')}</span>
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
                                note={isDisabled ? t('agentCreation.wizard.capabilityRequiresEditor') : undefined}
                                onClick={
                                    isDisabled ? undefined : () => togglePresetSelection('selectedCapabilityIds', preset.id)
                                }
                                variant="emerald"
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
