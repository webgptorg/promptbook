import type { ServerTranslationKey } from '../../languages/ServerTranslationKeys';

/**
 * One step displayed in the wizard timeline.
 */
export type NewAgentWizardStepDefinition = {
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
     * Canonical English fragment written into the final `PERSONA` commitment.
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
};

/**
 * Ordered wizard steps.
 */
export const NEW_AGENT_WIZARD_STEP_DEFINITIONS = [
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
        titleKey: 'agentCreation.wizard.teamTitle',
        descriptionKey: 'agentCreation.wizard.teamDescription',
        shortKey: 'agentCreation.wizard.teamShort',
    },
    {
        titleKey: 'agentCreation.wizard.writingTitle',
        descriptionKey: 'agentCreation.wizard.writingDescription',
        shortKey: 'agentCreation.wizard.writingShort',
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
] as const satisfies ReadonlyArray<NewAgentWizardStepDefinition>;

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
 *
 * The catalogue intentionally includes all concrete `USE *` commitments, but
 * some of them are marked as `advanced-editor` because a bare checkbox would
 * not collect enough configuration to make the commitment meaningful.
 */
export const NEW_AGENT_WIZARD_CAPABILITY_PRESETS = [
    {
        id: 'browser',
        labelKey: 'agentCreation.wizard.capabilityBrowser',
        icon: '🌐',
        commitmentKeyword: 'USE BROWSER',
        availability: 'wizard',
    },
    {
        id: 'search-engine',
        labelKey: 'agentCreation.wizard.capabilitySearchEngine',
        icon: '🔍',
        commitmentKeyword: 'USE SEARCH ENGINE',
        availability: 'wizard',
    },
    {
        id: 'spawn',
        labelKey: 'agentCreation.wizard.capabilitySpawn',
        icon: '🧬',
        commitmentKeyword: 'USE SPAWN',
        availability: 'wizard',
    },
    {
        id: 'timeout',
        labelKey: 'agentCreation.wizard.capabilityTimeout',
        icon: '⏱️',
        commitmentKeyword: 'USE TIMEOUT',
        availability: 'wizard',
    },
    {
        id: 'time',
        labelKey: 'agentCreation.wizard.capabilityTime',
        icon: '🕒',
        commitmentKeyword: 'USE TIME',
        availability: 'wizard',
    },
    {
        id: 'user-location',
        labelKey: 'agentCreation.wizard.capabilityUserLocation',
        icon: '📍',
        commitmentKeyword: 'USE USER LOCATION',
        availability: 'wizard',
    },
    {
        id: 'calendar',
        labelKey: 'agentCreation.wizard.capabilityCalendar',
        icon: '📅',
        commitmentKeyword: 'USE CALENDAR',
        availability: 'wizard',
    },
    {
        id: 'email',
        labelKey: 'agentCreation.wizard.capabilityEmail',
        icon: '📧',
        commitmentKeyword: 'USE EMAIL',
        availability: 'wizard',
    },
    {
        id: 'popup',
        labelKey: 'agentCreation.wizard.capabilityPopup',
        icon: '🪟',
        commitmentKeyword: 'USE POPUP',
        availability: 'wizard',
    },
    {
        id: 'image-generator',
        labelKey: 'agentCreation.wizard.capabilityImageGenerator',
        icon: '🖼️',
        commitmentKeyword: 'USE IMAGE GENERATOR',
        availability: 'wizard',
    },
    {
        id: 'privacy',
        labelKey: 'agentCreation.wizard.capabilityPrivacy',
        icon: '🛡️',
        commitmentKeyword: 'USE PRIVACY',
        availability: 'wizard',
    },
    {
        id: 'project',
        labelKey: 'agentCreation.wizard.capabilityProject',
        icon: '🧑‍💻',
        commitmentKeyword: 'USE PROJECT',
        availability: 'advanced-editor',
    },
    {
        id: 'mcp',
        labelKey: 'agentCreation.wizard.capabilityMcp',
        icon: '🔌',
        commitmentKeyword: 'USE MCP',
        availability: 'advanced-editor',
    },
] as const satisfies ReadonlyArray<NewAgentWizardCapabilityPreset>;

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
