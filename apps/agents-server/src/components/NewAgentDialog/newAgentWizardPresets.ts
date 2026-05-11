import type { ServerTranslationKey } from '../../languages/ServerTranslationKeys';

/**
 * One step displayed in the wizard timeline.
 */
export type NewAgentWizardStepDefinition = {
    /**
     * Stable identifier used by the wizard step renderer.
     */
    readonly id: NewAgentWizardStepId;

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
 * Stable step identifiers used by the wizard flow.
 */
export type NewAgentWizardStepId = 'basic' | 'persona' | 'use-setup' | 'team' | 'writing' | 'rules' | 'knowledge';

/**
 * Base shape for one selectable wizard preset.
 */
type NewAgentWizardSelectablePreset = {
    /**
     * Stable identifier stored in local component state.
     */
    readonly id: string;

    /**
     * Translation key used for the visible label.
     */
    readonly labelKey: ServerTranslationKey;

    /**
     * Emoji icon shown in cards and chips.
     */
    readonly icon: string;

    /**
     * Whether the preset starts enabled in a fresh wizard state.
     */
    readonly isDefault: boolean;
};

/**
 * One persona preset shown in page 2 of the wizard.
 */
export type NewAgentWizardPersonaPreset = NewAgentWizardSelectablePreset & {
    /**
     * Canonical English fragment synthesized into the final `GOAL` commitment.
     */
    readonly sourceText: string;
};

/**
 * One writing-style preset shown in page 3 of the wizard.
 */
export type NewAgentWizardWritingStylePreset = NewAgentWizardSelectablePreset & {
    /**
     * Human-readable style summary stored in the wizard trace note.
     */
    readonly sourceText: string;

    /**
     * `WRITING RULES` fragments synthesized when the preset is selected.
     */
    readonly writingRules: ReadonlyArray<string>;

    /**
     * Canonical `WRITING SAMPLE` text shown in the mocked-chat preview.
     */
    readonly writingSample: string;
};

/**
 * One rule preset shown in page 4 of the wizard.
 */
export type NewAgentWizardRulePreset = NewAgentWizardSelectablePreset & {
    /**
     * Canonical English rule written into the final `RULE` commitment.
     */
    readonly sourceText: string;
};

/**
 * Availability modes for capability cards in the wizard.
 */
export type NewAgentWizardCapabilityAvailability = 'wizard' | 'advanced-editor';

/**
 * Extra setup surfaces supported by wizard capability cards.
 */
export type NewAgentWizardCapabilitySetupKind = 'none' | 'calendar' | 'email' | 'mcp' | 'project';

/**
 * One capability preset shown in page 2 of the wizard.
 */
export type NewAgentWizardCapabilityPreset = {
    /**
     * Stable identifier stored in local component state.
     */
    readonly id: string;

    /**
     * Translation key used for the visible capability label.
     */
    readonly labelKey: ServerTranslationKey;

    /**
     * Emoji icon shown in cards and chips.
     */
    readonly icon: string;

    /**
     * Final book-language commitment added when selected.
     */
    readonly commitmentKeyword: string;

    /**
     * Whether the capability can be fully configured from the simple wizard.
     */
    readonly availability: NewAgentWizardCapabilityAvailability;

    /**
     * Additional setup surface rendered after the persona step.
     */
    readonly setupKind: NewAgentWizardCapabilitySetupKind;
};

/**
 * Ordered base wizard steps shared by every wizard session.
 */
const NEW_AGENT_WIZARD_BASE_STEP_DEFINITIONS = [
    {
        id: 'basic',
        titleKey: 'agentCreation.wizard.basicTitle',
        descriptionKey: 'agentCreation.wizard.basicDescription',
        shortKey: 'agentCreation.wizard.basicShort',
    },
    {
        id: 'persona',
        titleKey: 'agentCreation.wizard.personaTitle',
        descriptionKey: 'agentCreation.wizard.personaDescription',
        shortKey: 'agentCreation.wizard.personaShort',
    },
    {
        id: 'team',
        titleKey: 'agentCreation.wizard.teamTitle',
        descriptionKey: 'agentCreation.wizard.teamDescription',
        shortKey: 'agentCreation.wizard.teamShort',
    },
    {
        id: 'writing',
        titleKey: 'agentCreation.wizard.writingTitle',
        descriptionKey: 'agentCreation.wizard.writingDescription',
        shortKey: 'agentCreation.wizard.writingShort',
    },
    {
        id: 'rules',
        titleKey: 'agentCreation.wizard.rulesTitle',
        descriptionKey: 'agentCreation.wizard.rulesDescription',
        shortKey: 'agentCreation.wizard.rulesShort',
    },
    {
        id: 'knowledge',
        titleKey: 'agentCreation.wizard.knowledgeTitle',
        descriptionKey: 'agentCreation.wizard.knowledgeDescription',
        shortKey: 'agentCreation.wizard.knowledgeShort',
    },
] as const satisfies ReadonlyArray<NewAgentWizardStepDefinition>;

/**
 * Optional step inserted after persona selection when the chosen `USE`
 * commitments need additional setup.
 */
const NEW_AGENT_WIZARD_USE_SETUP_STEP_DEFINITION = {
    id: 'use-setup',
    titleKey: 'agentCreation.wizard.useSetupTitle',
    descriptionKey: 'agentCreation.wizard.useSetupDescription',
    shortKey: 'agentCreation.wizard.useSetupShort',
} as const satisfies NewAgentWizardStepDefinition;

/**
 * Returns the step sequence for the current wizard capability selection.
 *
 * @param selectedCapabilityIds - Capability preset ids currently enabled in the wizard.
 * @returns Ordered step definitions for the current session.
 */
export function getNewAgentWizardStepDefinitions(
    selectedCapabilityIds: ReadonlyArray<string>,
): Array<NewAgentWizardStepDefinition> {
    if (!hasNewAgentWizardUseSetupStep(selectedCapabilityIds)) {
        return [...NEW_AGENT_WIZARD_BASE_STEP_DEFINITIONS];
    }

    return [
        NEW_AGENT_WIZARD_BASE_STEP_DEFINITIONS[0]!,
        NEW_AGENT_WIZARD_BASE_STEP_DEFINITIONS[1]!,
        NEW_AGENT_WIZARD_USE_SETUP_STEP_DEFINITION,
        ...NEW_AGENT_WIZARD_BASE_STEP_DEFINITIONS.slice(2),
    ];
}

/**
 * Persona presets available in page 2 of the wizard.
 */
export const NEW_AGENT_WIZARD_PERSONA_PRESETS = [
    {
        id: 'helpful',
        labelKey: 'agentCreation.wizard.traitHelpful',
        icon: '💡',
        sourceText: 'helpful and supportive',
        isDefault: true,
    },
    {
        id: 'analytical',
        labelKey: 'agentCreation.wizard.traitAnalytical',
        icon: '🧠',
        sourceText: 'analytical',
        isDefault: true,
    },
    {
        id: 'empathetic',
        labelKey: 'agentCreation.wizard.traitEmpathetic',
        icon: '💗',
        sourceText: 'empathetic',
        isDefault: false,
    },
    {
        id: 'curious',
        labelKey: 'agentCreation.wizard.traitCurious',
        icon: '🔎',
        sourceText: 'curious and inquisitive',
        isDefault: false,
    },
    {
        id: 'strategic',
        labelKey: 'agentCreation.wizard.traitStrategic',
        icon: '♟️',
        sourceText: 'strategic',
        isDefault: false,
    },
    {
        id: 'technical',
        labelKey: 'agentCreation.wizard.traitTechnical',
        icon: '🛠️',
        sourceText: 'technically knowledgeable',
        isDefault: false,
    },
    {
        id: 'educational',
        labelKey: 'agentCreation.wizard.traitEducational',
        icon: '🎓',
        sourceText: 'clear and patient when explaining complex topics',
        isDefault: false,
    },
    {
        id: 'creative',
        labelKey: 'agentCreation.wizard.traitCreative',
        icon: '🎨',
        sourceText: 'creative when brainstorming',
        isDefault: false,
    },
    {
        id: 'patient',
        labelKey: 'agentCreation.wizard.traitPatient',
        icon: '🌿',
        sourceText: 'patient',
        isDefault: false,
    },
    {
        id: 'decisive',
        labelKey: 'agentCreation.wizard.traitDecisive',
        icon: '⚡',
        sourceText: 'decisive when offering recommendations',
        isDefault: false,
    },
] as const satisfies ReadonlyArray<NewAgentWizardPersonaPreset>;

/**
 * Writing-style presets available in page 3 of the wizard.
 */
export const NEW_AGENT_WIZARD_WRITING_STYLE_PRESETS = [
    {
        id: 'professional',
        labelKey: 'agentCreation.wizard.writingStyleProfessional',
        icon: '💼',
        sourceText: 'professional',
        writingRules: ['Use a professional tone.', 'Keep phrasing polished and business-ready.'],
        writingSample:
            'Here is a clear overview of the next steps, along with the main tradeoff to keep in mind before you decide.',
        isDefault: true,
    },
    {
        id: 'friendly',
        labelKey: 'agentCreation.wizard.writingStyleFriendly',
        icon: '😊',
        sourceText: 'friendly',
        writingRules: ['Use a warm, approachable tone.', 'Make the user feel supported without sounding overly formal.'],
        writingSample: 'Happy to help. Here is the simplest way to move this forward today without adding extra friction.',
        isDefault: false,
    },
    {
        id: 'concise',
        labelKey: 'agentCreation.wizard.writingStyleConcise',
        icon: '✂️',
        sourceText: 'concise',
        writingRules: ['Keep responses concise.', 'Lead with the answer before adding extra detail.'],
        writingSample: 'Yes. The issue is the missing API key. Add it, restart the app, and test again.',
        isDefault: true,
    },
    {
        id: 'detailed',
        labelKey: 'agentCreation.wizard.writingStyleDetailed',
        icon: '📚',
        sourceText: 'detailed',
        writingRules: ['Provide thorough explanations when needed.', 'Include context, tradeoffs, and concrete next steps.'],
        writingSample:
            'There are three parts to consider: what changed, why it matters, and what to do next. I will walk through each one in order.',
        isDefault: false,
    },
    {
        id: 'conversational',
        labelKey: 'agentCreation.wizard.writingStyleConversational',
        icon: '💬',
        sourceText: 'conversational',
        writingRules: ['Write in a natural, conversational rhythm.', 'Prefer plain language over stiff phrasing.'],
        writingSample: 'Let’s break it down. The good news is the hard part is already done, so we can focus on the last mile.',
        isDefault: false,
    },
    {
        id: 'upbeat',
        labelKey: 'agentCreation.wizard.writingStyleUpbeat',
        icon: '🌞',
        sourceText: 'upbeat',
        writingRules: ['Keep the tone positive and energizing.', 'Highlight momentum and achievable next actions.'],
        writingSample: 'You are closer than it looks. A couple of focused changes should get this over the line.',
        isDefault: false,
    },
] as const satisfies ReadonlyArray<NewAgentWizardWritingStylePreset>;

/**
 * Capability presets available in page 2.
 */
export const NEW_AGENT_WIZARD_CAPABILITY_PRESETS = [
    {
        id: 'browser',
        labelKey: 'agentCreation.wizard.capabilityBrowser',
        icon: '🌐',
        commitmentKeyword: 'USE BROWSER',
        availability: 'wizard',
        setupKind: 'none',
    },
    {
        id: 'search-engine',
        labelKey: 'agentCreation.wizard.capabilitySearchEngine',
        icon: '🔍',
        commitmentKeyword: 'USE SEARCH ENGINE',
        availability: 'wizard',
        setupKind: 'none',
    },
    {
        id: 'deep-search',
        labelKey: 'agentCreation.wizard.capabilityDeepSearch',
        icon: '🔎',
        commitmentKeyword: 'USE DEEPSEARCH',
        availability: 'wizard',
        setupKind: 'none',
    },
    {
        id: 'spawn',
        labelKey: 'agentCreation.wizard.capabilitySpawn',
        icon: '🧬',
        commitmentKeyword: 'USE SPAWN',
        availability: 'wizard',
        setupKind: 'none',
    },
    {
        id: 'timeout',
        labelKey: 'agentCreation.wizard.capabilityTimeout',
        icon: '⏱️',
        commitmentKeyword: 'USE TIMEOUT',
        availability: 'wizard',
        setupKind: 'none',
    },
    {
        id: 'time',
        labelKey: 'agentCreation.wizard.capabilityTime',
        icon: '🕒',
        commitmentKeyword: 'USE TIME',
        availability: 'wizard',
        setupKind: 'none',
    },
    {
        id: 'user-location',
        labelKey: 'agentCreation.wizard.capabilityUserLocation',
        icon: '📍',
        commitmentKeyword: 'USE USER LOCATION',
        availability: 'wizard',
        setupKind: 'none',
    },
    {
        id: 'calendar',
        labelKey: 'agentCreation.wizard.capabilityCalendar',
        icon: '📅',
        commitmentKeyword: 'USE CALENDAR',
        availability: 'wizard',
        setupKind: 'calendar',
    },
    {
        id: 'email',
        labelKey: 'agentCreation.wizard.capabilityEmail',
        icon: '📧',
        commitmentKeyword: 'USE EMAIL',
        availability: 'wizard',
        setupKind: 'email',
    },
    {
        id: 'popup',
        labelKey: 'agentCreation.wizard.capabilityPopup',
        icon: '🪟',
        commitmentKeyword: 'USE POPUP',
        availability: 'wizard',
        setupKind: 'none',
    },
    {
        id: 'image-generator',
        labelKey: 'agentCreation.wizard.capabilityImageGenerator',
        icon: '🖼️',
        commitmentKeyword: 'USE IMAGE GENERATOR',
        availability: 'wizard',
        setupKind: 'none',
    },
    {
        id: 'privacy',
        labelKey: 'agentCreation.wizard.capabilityPrivacy',
        icon: '🛡️',
        commitmentKeyword: 'USE PRIVACY',
        availability: 'wizard',
        setupKind: 'none',
    },
    {
        id: 'project',
        labelKey: 'agentCreation.wizard.capabilityProject',
        icon: '🧑‍💻',
        commitmentKeyword: 'USE PROJECT',
        availability: 'wizard',
        setupKind: 'project',
    },
    {
        id: 'mcp',
        labelKey: 'agentCreation.wizard.capabilityMcp',
        icon: '🔌',
        commitmentKeyword: 'USE MCP',
        availability: 'wizard',
        setupKind: 'mcp',
    },
] as const satisfies ReadonlyArray<NewAgentWizardCapabilityPreset>;

/**
 * Returns capability presets selected in the wizard, preserving preset order.
 *
 * @param selectedCapabilityIds - Capability ids currently selected in wizard state.
 * @returns Ordered selected capability presets.
 */
export function getNewAgentWizardSelectedCapabilityPresets(
    selectedCapabilityIds: ReadonlyArray<string>,
) {
    return NEW_AGENT_WIZARD_CAPABILITY_PRESETS.filter((preset) => selectedCapabilityIds.includes(preset.id));
}

/**
 * Returns selected capability presets that need the extra USE setup step.
 *
 * @param selectedCapabilityIds - Capability ids currently selected in wizard state.
 * @returns Ordered selected capability presets with additional setup UI.
 */
export function getNewAgentWizardSelectedSetupCapabilityPresets(
    selectedCapabilityIds: ReadonlyArray<string>,
) {
    return getNewAgentWizardSelectedCapabilityPresets(selectedCapabilityIds).filter((preset) => preset.setupKind !== 'none');
}

/**
 * Returns whether the current capability selection should show the extra USE setup step.
 *
 * @param selectedCapabilityIds - Capability ids currently selected in wizard state.
 * @returns `true` when the wizard should render the extra setup step.
 */
export function hasNewAgentWizardUseSetupStep(selectedCapabilityIds: ReadonlyArray<string>): boolean {
    return getNewAgentWizardSelectedSetupCapabilityPresets(selectedCapabilityIds).length > 0;
}

/**
 * Rule presets available in page 4 of the wizard.
 */
export const NEW_AGENT_WIZARD_RULE_PRESETS = [
    {
        id: 'protect-personal-data',
        labelKey: 'agentCreation.wizard.ruleProtectPersonalData',
        icon: '🛡️',
        sourceText: 'Do not request or disclose personal data unless it is essential and clearly provided by the user.',
        isDefault: true,
    },
    {
        id: 'clarify-ambiguity',
        labelKey: 'agentCreation.wizard.ruleClarifyAmbiguity',
        icon: '❓',
        sourceText: 'Ask clarifying questions when the request is ambiguous or underspecified.',
        isDefault: true,
    },
    {
        id: 'regulated-advice',
        labelKey: 'agentCreation.wizard.ruleRegulatedAdvice',
        icon: '⚠️',
        sourceText: 'Do not provide medical, legal, or financial advice beyond general informational guidance.',
        isDefault: false,
    },
    {
        id: 'uncertainty',
        labelKey: 'agentCreation.wizard.ruleUncertainty',
        icon: '🪞',
        sourceText: 'Be transparent about uncertainty and limitations.',
        isDefault: false,
    },
    {
        id: 'cite-sources',
        labelKey: 'agentCreation.wizard.ruleCiteSources',
        icon: '🔗',
        sourceText: 'When using external information, cite or name the source.',
        isDefault: false,
    },
    {
        id: 'stay-in-scope',
        labelKey: 'agentCreation.wizard.ruleStayInScope',
        icon: '🎯',
        sourceText: 'Stay within the agent scope and say when a request should be escalated or reframed.',
        isDefault: false,
    },
    {
        id: 'state-assumptions',
        labelKey: 'agentCreation.wizard.ruleStateAssumptions',
        icon: '🧾',
        sourceText: 'State important assumptions explicitly instead of hiding them.',
        isDefault: false,
    },
    {
        id: 'confirm-risky-actions',
        labelKey: 'agentCreation.wizard.ruleConfirmRiskyActions',
        icon: '🧯',
        sourceText: 'Ask for confirmation before taking actions that could be risky, costly, or irreversible.',
        isDefault: false,
    },
] as const satisfies ReadonlyArray<NewAgentWizardRulePreset>;

/**
 * Union of capability commitment keywords known by the wizard catalogue.
 */
export type NewAgentWizardCapabilityCommitment =
    (typeof NEW_AGENT_WIZARD_CAPABILITY_PRESETS)[number]['commitmentKeyword'];

/**
 * All capability commitments known by the wizard catalogue.
 */
export const NEW_AGENT_WIZARD_KNOWN_CAPABILITY_COMMITMENTS = new Set<NewAgentWizardCapabilityCommitment>(
    NEW_AGENT_WIZARD_CAPABILITY_PRESETS.map((preset) => preset.commitmentKeyword),
);

/**
 * Capability commitments that can be fully configured from the simple wizard UI.
 */
export const NEW_AGENT_WIZARD_SELECTABLE_CAPABILITY_COMMITMENTS = new Set<NewAgentWizardCapabilityCommitment>(
    NEW_AGENT_WIZARD_CAPABILITY_PRESETS.filter((preset) => preset.availability === 'wizard').map(
        (preset) => preset.commitmentKeyword as NewAgentWizardCapabilityCommitment,
    ),
);

/**
 * Capability commitments that open the additional USE setup step in the wizard.
 */
export const NEW_AGENT_WIZARD_CONFIGURABLE_CAPABILITY_COMMITMENTS = new Set<NewAgentWizardCapabilityCommitment>(
    NEW_AGENT_WIZARD_CAPABILITY_PRESETS.filter((preset) => preset.setupKind !== 'none').map(
        (preset) => preset.commitmentKeyword as NewAgentWizardCapabilityCommitment,
    ),
);
