import type { string_url } from '@promptbook-local/types';
import { useMemo, type Dispatch, type SetStateAction } from 'react';
import type { AgentOrganizationAgent } from '../../utils/agentOrganization/types';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { AgentCard } from '../Homepage/AgentCard';
import { HOMEPAGE_AGENT_GRID_CLASS } from '../Homepage/gridLayout';
import { normalizeServerUrl } from '../Homepage/normalizeServerUrl';
import { Section } from '../Homepage/Section';
import { useFederatedAgentSections } from '../Homepage/useFederatedAgentSections';
import type { AgentWithVisibility } from '../Homepage/useFederatedAgents';
import { AgentCardsLoadingSkeleton } from '../Skeleton/AgentCardsLoadingSkeleton';
import { NewAgentWizardClassNames } from './NewAgentWizardClassNames';
import {
    normalizeTeamReferenceInput,
    summarizeTeamReference,
    toggleTeamReferenceSelection,
    type NewAgentWizardState,
} from './NewAgentWizardState';
import type { NewAgentWizardTranslate } from './NewAgentWizardTranslate';
import { WizardChipInput } from './WizardChipInput';

/**
 * Canonical compact reference that lets the agent ask the current human for input.
 */
const USER_TEAM_REFERENCE = '{User}';

/**
 * Number of skeleton cards rendered while teammate cards load.
 */
const TEAM_AGENT_LOADING_CARD_COUNT = 4;

/**
 * Compact section heading styles reused for homepage-style picker groups inside the wizard.
 */
const TEAM_PICKER_SECTION_TITLE_CLASS_NAME = 'mb-4 text-xl font-semibold text-slate-900';

/**
 * Small margin overrides so homepage sections fit comfortably inside the wizard.
 */
const TEAM_PICKER_SECTION_CLASS_NAME = 'mt-8 first:mt-0 mb-0';

/**
 * Agent shape used by the selectable teammate cards.
 */
type TeamSelectableAgent = (AgentOrganizationAgent | AgentWithVisibility) & {
    readonly url?: string;
};

/**
 * Builds the preferred TEAM reference to persist when one selectable agent card is chosen.
 */
function buildPreferredTeamReference(agent: TeamSelectableAgent, serverUrl: string, isLocal: boolean): string {
    if (isLocal) {
        return `{${agent.agentName}}`;
    }

    return `${normalizeServerUrl(serverUrl)}/agents/${encodeURIComponent(agent.agentName)}`;
}

/**
 * Normalizes one absolute agent URL for comparison.
 */
function normalizeAgentReferenceUrl(url: string): string {
    return url.replace(/\/+$/, '');
}

/**
 * Tests whether one TEAM reference points at the given selectable agent.
 */
function matchesSelectableAgentReference(
    teamReference: string,
    agent: TeamSelectableAgent,
    serverUrl: string,
    isLocal: boolean,
): boolean {
    const normalizedReference = normalizeTeamReferenceInput(teamReference);
    if (normalizedReference === '') {
        return false;
    }

    if (normalizedReference.startsWith('{')) {
        return isLocal && normalizedReference.toLowerCase() === `{${agent.agentName}}`.toLowerCase();
    }

    if (!normalizedReference.startsWith('http://') && !normalizedReference.startsWith('https://')) {
        return false;
    }

    const normalizedServerOrigin = normalizeServerUrl(serverUrl);
    const candidateUrls = [
        `${normalizedServerOrigin}/agents/${encodeURIComponent(agent.agentName)}`,
        `${normalizedServerOrigin}/agents/${agent.agentName}`,
        agent.permanentId ? `${normalizedServerOrigin}/agents/${encodeURIComponent(agent.permanentId)}` : null,
        agent.url || null,
    ].filter((candidate): candidate is string => Boolean(candidate));

    return candidateUrls.some(
        (candidateUrl) => normalizeAgentReferenceUrl(candidateUrl) === normalizeAgentReferenceUrl(normalizedReference),
    );
}

/**
 * Builds the visible label for one selectable agent, adding hostname context for remote entries.
 */
function getSelectableAgentLabel(agent: TeamSelectableAgent, serverUrl?: string): string {
    const baseLabel =
        typeof agent.meta.fullname === 'string' && agent.meta.fullname.trim() !== ''
            ? agent.meta.fullname.trim()
            : agent.agentName;

    if (!serverUrl) {
        return baseLabel;
    }

    try {
        return `${baseLabel} (${new URL(serverUrl).hostname})`;
    } catch {
        return `${baseLabel} (${serverUrl})`;
    }
}

/**
 * Props for the team step in the new-agent wizard.
 */
type NewAgentWizardTeamStepProps = {
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
     * Public server URL used for rendering local teammate cards.
     */
    readonly publicUrl: string_url;

    /**
     * Local agents available for team selection.
     */
    readonly localTeammateAgents: ReadonlyArray<AgentOrganizationAgent>;

    /**
     * Adds the current teammate draft as one chip.
     */
    readonly addTeamReferenceFromDraft: () => void;

    /**
     * Adds one predefined teammate reference.
     */
    readonly addTeamReference: (reference: string) => void;

    /**
     * Removes one teammate chip.
     */
    readonly removeTeamReference: (teamReferenceIndex: number) => void;
};

/**
 * Renders the team-composition step.
 *
 * @param props - Step props.
 * @returns Team step content.
 *
 * @private internal component of <NewAgentWizard/>.
 */
export function NewAgentWizardTeamStep(props: NewAgentWizardTeamStepProps) {
    const {
        state,
        setState,
        t,
        publicUrl,
        localTeammateAgents,
        addTeamReferenceFromDraft,
        addTeamReference,
        removeTeamReference,
    } = props;
    const { formatText } = useAgentNaming();
    const { isLoading: isLoadingFederatedSections, sections: federatedSections } = useFederatedAgentSections();
    const successfulFederatedSections = useMemo(
        () => federatedSections.filter((section) => section.status === 'success'),
        [federatedSections],
    );

    function getTeamReferenceLabel(teamReference: string): string {
        for (const localTeammateAgent of localTeammateAgents) {
            if (matchesSelectableAgentReference(teamReference, localTeammateAgent, publicUrl, true)) {
                return getSelectableAgentLabel(localTeammateAgent);
            }
        }

        for (const section of successfulFederatedSections) {
            for (const agent of section.agents) {
                if (matchesSelectableAgentReference(teamReference, agent, section.serverUrl, false)) {
                    return getSelectableAgentLabel(agent, section.serverUrl);
                }
            }
        }

        return summarizeTeamReference(teamReference);
    }

    function handleToggleSelectableAgent(agent: TeamSelectableAgent, serverUrl: string, isLocal: boolean): void {
        const preferredReference = buildPreferredTeamReference(agent, serverUrl, isLocal);
        setState((previous) => ({
            ...previous,
            teamReferences: toggleTeamReferenceSelection(
                previous.teamReferences,
                preferredReference,
                previous.teamReferences.filter((teamReference) =>
                    matchesSelectableAgentReference(teamReference, agent, serverUrl, isLocal),
                ),
            ),
        }));
    }

    return (
        <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <WizardChipInput
                    label={t('agentCreation.wizard.teamLabel')}
                    draftValue={state.teamReferenceDraft}
                    placeholder={t('agentCreation.wizard.teamPlaceholder')}
                    chips={state.teamReferences}
                    chipVariant="emerald"
                    getChipLabel={(teamReference) => getTeamReferenceLabel(teamReference)}
                    onDraftChange={(teamReferenceDraft) => setState((previous) => ({ ...previous, teamReferenceDraft }))}
                    onAdd={addTeamReferenceFromDraft}
                    onRemove={removeTeamReference}
                    removeLabel={t('agentCreation.wizard.removeKnowledgeAction')}
                />

                <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => addTeamReference(USER_TEAM_REFERENCE)}
                        className={NewAgentWizardClassNames.secondaryButton}
                    >
                        {t('agentCreation.wizard.teamAddUserAction')}
                    </button>
                    <p className="text-sm text-slate-500">{t('agentCreation.wizard.teamHint')}</p>
                </div>
            </div>

            {localTeammateAgents.length > 0 && (
                <Section
                    title={`${formatText('Local Agents')} (${localTeammateAgents.length})`}
                    className={TEAM_PICKER_SECTION_CLASS_NAME}
                    titleClassName={TEAM_PICKER_SECTION_TITLE_CLASS_NAME}
                    gridClassName={HOMEPAGE_AGENT_GRID_CLASS}
                >
                    {localTeammateAgents.map((agent) => (
                        <AgentCard
                            key={`local-${agent.permanentId || agent.agentName}`}
                            agent={agent}
                            publicUrl={publicUrl}
                            isSelected={state.teamReferences.some((teamReference) =>
                                matchesSelectableAgentReference(teamReference, agent, publicUrl, true),
                            )}
                            onSelect={() => handleToggleSelectableAgent(agent, publicUrl, true)}
                        />
                    ))}
                </Section>
            )}

            {isLoadingFederatedSections && (
                <Section
                    title={formatText('Federated agents')}
                    className={TEAM_PICKER_SECTION_CLASS_NAME}
                    titleClassName={TEAM_PICKER_SECTION_TITLE_CLASS_NAME}
                    gridClassName={HOMEPAGE_AGENT_GRID_CLASS}
                >
                    <AgentCardsLoadingSkeleton cardCount={TEAM_AGENT_LOADING_CARD_COUNT} />
                </Section>
            )}

            {!isLoadingFederatedSections &&
                federatedSections.map((section) => {
                    const hostname = (() => {
                        try {
                            return new URL(section.serverUrl).hostname;
                        } catch {
                            return section.serverUrl;
                        }
                    })();

                    if (section.status === 'loading') {
                        return (
                            <Section
                                key={section.serverUrl}
                                title={`${formatText('Agents from')} ${hostname} (...)`}
                                className={TEAM_PICKER_SECTION_CLASS_NAME}
                                titleClassName={TEAM_PICKER_SECTION_TITLE_CLASS_NAME}
                                gridClassName={HOMEPAGE_AGENT_GRID_CLASS}
                            >
                                <AgentCardsLoadingSkeleton cardCount={TEAM_AGENT_LOADING_CARD_COUNT} />
                            </Section>
                        );
                    }

                    if (section.status === 'error') {
                        return (
                            <Section
                                key={section.serverUrl}
                                title={`${formatText('Agents from')} ${hostname} (Error)`}
                                className={TEAM_PICKER_SECTION_CLASS_NAME}
                                titleClassName={TEAM_PICKER_SECTION_TITLE_CLASS_NAME}
                                gridClassName={HOMEPAGE_AGENT_GRID_CLASS}
                            >
                                <div className="py-4 text-sm text-red-500 text-center">
                                    {formatText('Failed to load agents from this server.')}
                                </div>
                            </Section>
                        );
                    }

                    if (section.agents.length === 0) {
                        return null;
                    }

                    return (
                        <Section
                            key={section.serverUrl}
                            title={`${formatText('Agents from')} ${hostname} (${section.agents.length})`}
                            className={TEAM_PICKER_SECTION_CLASS_NAME}
                            titleClassName={TEAM_PICKER_SECTION_TITLE_CLASS_NAME}
                            gridClassName={HOMEPAGE_AGENT_GRID_CLASS}
                        >
                            {section.agents.map((agent) => (
                                <AgentCard
                                    key={agent.url || `${section.serverUrl}-${agent.permanentId || agent.agentName}`}
                                    agent={agent}
                                    publicUrl={publicUrl}
                                    serverUrl={section.serverUrl as string_url}
                                    isSelected={state.teamReferences.some((teamReference) =>
                                        matchesSelectableAgentReference(teamReference, agent, section.serverUrl, false),
                                    )}
                                    onSelect={() => handleToggleSelectableAgent(agent, section.serverUrl, false)}
                                />
                            ))}
                        </Section>
                    );
                })}

            {state.teamReferences.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    {t('agentCreation.wizard.noTeamMembers')}
                </div>
            )}
        </div>
    );
}
