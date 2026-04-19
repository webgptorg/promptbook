import type { Dispatch, SetStateAction } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { parseGoogleCalendarReference } from '../../../../../src/commitments/USE_CALENDAR/calendarReference';
import { parseGitHubRepositoryReference } from '../../../../../src/commitments/USE_PROJECT/projectReference';
import { NewAgentWizardClassNames } from './NewAgentWizardClassNames';
import {
    getNewAgentWizardSelectedSetupCapabilityPresets,
    type NewAgentWizardCapabilityPreset,
} from './newAgentWizardPresets';
import type { NewAgentWizardState } from './NewAgentWizardState';
import type { NewAgentWizardTranslate } from './NewAgentWizardTranslate';

/**
 * Props for the capability-setup step in the new-agent wizard.
 */
type NewAgentWizardUseSetupStepProps = {
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
};

/**
 * Builds a GitHub repository search URL for the current query.
 *
 * @param query - Current user-entered repository query.
 * @returns GitHub repository search URL.
 */
function createGitHubRepositorySearchUrl(query: string): string {
    const normalizedQuery = query.trim();
    return `https://github.com/search?q=${encodeURIComponent(normalizedQuery)}&type=repositories`;
}

/**
 * Validates one generic HTTP(S) URL for the MCP setup preview.
 *
 * @param rawValue - Raw URL entered in the wizard.
 * @returns Canonical URL string when valid, otherwise `null`.
 */
function parseHttpUrl(rawValue: string): string | null {
    const normalizedValue = rawValue.trim();
    if (normalizedValue === '') {
        return null;
    }

    try {
        const parsedUrl = new URL(normalizedValue);
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return null;
        }

        return parsedUrl.toString();
    } catch {
        return null;
    }
}

/**
 * Renders the setup panel for one selected capability preset.
 *
 * @param options - Render options for the selected capability.
 * @returns Capability-specific form block.
 */
function renderCapabilitySetupFields(options: {
    readonly preset: NewAgentWizardCapabilityPreset;
    readonly state: NewAgentWizardState;
    readonly setState: Dispatch<SetStateAction<NewAgentWizardState>>;
    readonly t: NewAgentWizardTranslate;
}) {
    const { preset, state, setState, t } = options;

    switch (preset.commitmentKeyword) {
        case 'USE PROJECT': {
            const projectSetup = state.capabilitySetupByCommitment['USE PROJECT'];
            const parsedRepository = parseGitHubRepositoryReference(projectSetup.repositoryReference);
            const searchUrl =
                projectSetup.repositoryReference.trim() === ''
                    ? null
                    : createGitHubRepositorySearchUrl(projectSetup.repositoryReference);

            return (
                <>
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-800">
                                {t('agentCreation.wizard.useSetupProjectRepositoryLabel')}
                            </label>
                            <input
                                type="search"
                                value={projectSetup.repositoryReference}
                                onChange={(event) =>
                                    setState((previous) => ({
                                        ...previous,
                                        capabilitySetupByCommitment: {
                                            ...previous.capabilitySetupByCommitment,
                                            'USE PROJECT': {
                                                ...previous.capabilitySetupByCommitment['USE PROJECT'],
                                                repositoryReference: event.target.value,
                                            },
                                        },
                                    }))
                                }
                                placeholder={t('agentCreation.wizard.useSetupProjectRepositoryPlaceholder')}
                                className={NewAgentWizardClassNames.input}
                            />
                            <p className="mt-2 text-sm text-slate-500">
                                {t('agentCreation.wizard.useSetupProjectRepositoryHint')}
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                {t('agentCreation.wizard.useSetupPreviewLabel')}
                            </div>
                            {parsedRepository ? (
                                <>
                                    <div className="mt-2 text-sm font-semibold text-slate-900">
                                        {parsedRepository.slug}
                                    </div>
                                    <div className="mt-1 break-all text-xs text-slate-500">{parsedRepository.url}</div>
                                    <a
                                        href={parsedRepository.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`${NewAgentWizardClassNames.secondaryButton} mt-3 w-full`}
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        {t('agentCreation.wizard.useSetupOpenLinkAction')}
                                    </a>
                                </>
                            ) : searchUrl ? (
                                <>
                                    <p className="mt-2 text-sm text-slate-600">
                                        {t('agentCreation.wizard.useSetupProjectRepositoryHint')}
                                    </p>
                                    <a
                                        href={searchUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`${NewAgentWizardClassNames.secondaryButton} mt-3 w-full`}
                                    >
                                        <Search className="h-4 w-4" />
                                        {t('agentCreation.wizard.useSetupSearchGithubAction')}
                                    </a>
                                </>
                            ) : (
                                <p className="mt-2 text-sm text-slate-500">
                                    {t('agentCreation.wizard.useSetupProjectRepositoryHint')}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="mb-1.5 block text-sm font-medium text-slate-800">
                            {t('agentCreation.wizard.useSetupInstructionsLabel')}
                        </label>
                        <textarea
                            value={projectSetup.instructions}
                            onChange={(event) =>
                                setState((previous) => ({
                                    ...previous,
                                    capabilitySetupByCommitment: {
                                        ...previous.capabilitySetupByCommitment,
                                        'USE PROJECT': {
                                            ...previous.capabilitySetupByCommitment['USE PROJECT'],
                                            instructions: event.target.value,
                                        },
                                    },
                                }))
                            }
                            placeholder={t('agentCreation.wizard.useSetupInstructionsPlaceholder')}
                            className={NewAgentWizardClassNames.textarea}
                        />
                    </div>
                </>
            );
        }

        case 'USE EMAIL': {
            const emailSetup = state.capabilitySetupByCommitment['USE EMAIL'];

            return (
                <>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-800">
                            {t('agentCreation.wizard.useSetupEmailSenderLabel')}
                        </label>
                        <input
                            type="email"
                            value={emailSetup.senderEmail}
                            onChange={(event) =>
                                setState((previous) => ({
                                    ...previous,
                                    capabilitySetupByCommitment: {
                                        ...previous.capabilitySetupByCommitment,
                                        'USE EMAIL': {
                                            ...previous.capabilitySetupByCommitment['USE EMAIL'],
                                            senderEmail: event.target.value,
                                        },
                                    },
                                }))
                            }
                            placeholder={t('agentCreation.wizard.useSetupEmailSenderPlaceholder')}
                            className={NewAgentWizardClassNames.input}
                        />
                        <p className="mt-2 text-sm text-slate-500">
                            {t('agentCreation.wizard.useSetupEmailSenderHint')}
                        </p>
                    </div>

                    <div className="mt-4">
                        <label className="mb-1.5 block text-sm font-medium text-slate-800">
                            {t('agentCreation.wizard.useSetupInstructionsLabel')}
                        </label>
                        <textarea
                            value={emailSetup.instructions}
                            onChange={(event) =>
                                setState((previous) => ({
                                    ...previous,
                                    capabilitySetupByCommitment: {
                                        ...previous.capabilitySetupByCommitment,
                                        'USE EMAIL': {
                                            ...previous.capabilitySetupByCommitment['USE EMAIL'],
                                            instructions: event.target.value,
                                        },
                                    },
                                }))
                            }
                            placeholder={t('agentCreation.wizard.useSetupInstructionsPlaceholder')}
                            className={NewAgentWizardClassNames.textarea}
                        />
                    </div>
                </>
            );
        }

        case 'USE CALENDAR': {
            const calendarSetup = state.capabilitySetupByCommitment['USE CALENDAR'];
            const parsedCalendar = parseGoogleCalendarReference(calendarSetup.calendarUrl);

            return (
                <>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-800">
                            {t('agentCreation.wizard.useSetupCalendarUrlLabel')}
                        </label>
                        <input
                            type="url"
                            value={calendarSetup.calendarUrl}
                            onChange={(event) =>
                                setState((previous) => ({
                                    ...previous,
                                    capabilitySetupByCommitment: {
                                        ...previous.capabilitySetupByCommitment,
                                        'USE CALENDAR': {
                                            ...previous.capabilitySetupByCommitment['USE CALENDAR'],
                                            calendarUrl: event.target.value,
                                        },
                                    },
                                }))
                            }
                            placeholder={t('agentCreation.wizard.useSetupCalendarUrlPlaceholder')}
                            className={NewAgentWizardClassNames.input}
                        />
                        <p className="mt-2 text-sm text-slate-500">
                            {t('agentCreation.wizard.useSetupCalendarUrlHint')}
                        </p>
                    </div>

                    {parsedCalendar && (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                {t('agentCreation.wizard.useSetupPreviewLabel')}
                            </div>
                            <div className="mt-2 text-sm font-semibold text-slate-900">{parsedCalendar.calendarId}</div>
                            <div className="mt-1 break-all text-xs text-slate-500">{parsedCalendar.url}</div>
                            <a
                                href={parsedCalendar.url}
                                target="_blank"
                                rel="noreferrer"
                                className={`${NewAgentWizardClassNames.secondaryButton} mt-3 inline-flex`}
                            >
                                <ExternalLink className="h-4 w-4" />
                                {t('agentCreation.wizard.useSetupOpenLinkAction')}
                            </a>
                        </div>
                    )}

                    <div className="mt-4">
                        <label className="mb-1.5 block text-sm font-medium text-slate-800">
                            {t('agentCreation.wizard.useSetupInstructionsLabel')}
                        </label>
                        <textarea
                            value={calendarSetup.instructions}
                            onChange={(event) =>
                                setState((previous) => ({
                                    ...previous,
                                    capabilitySetupByCommitment: {
                                        ...previous.capabilitySetupByCommitment,
                                        'USE CALENDAR': {
                                            ...previous.capabilitySetupByCommitment['USE CALENDAR'],
                                            instructions: event.target.value,
                                        },
                                    },
                                }))
                            }
                            placeholder={t('agentCreation.wizard.useSetupInstructionsPlaceholder')}
                            className={NewAgentWizardClassNames.textarea}
                        />
                    </div>
                </>
            );
        }

        case 'USE MCP': {
            const mcpSetup = state.capabilitySetupByCommitment['USE MCP'];
            const parsedServerUrl = parseHttpUrl(mcpSetup.serverUrl);

            return (
                <>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-800">
                            {t('agentCreation.wizard.useSetupMcpUrlLabel')}
                        </label>
                        <input
                            type="url"
                            value={mcpSetup.serverUrl}
                            onChange={(event) =>
                                setState((previous) => ({
                                    ...previous,
                                    capabilitySetupByCommitment: {
                                        ...previous.capabilitySetupByCommitment,
                                        'USE MCP': {
                                            ...previous.capabilitySetupByCommitment['USE MCP'],
                                            serverUrl: event.target.value,
                                        },
                                    },
                                }))
                            }
                            placeholder={t('agentCreation.wizard.useSetupMcpUrlPlaceholder')}
                            className={NewAgentWizardClassNames.input}
                        />
                        <p className="mt-2 text-sm text-slate-500">{t('agentCreation.wizard.useSetupMcpUrlHint')}</p>
                    </div>

                    {parsedServerUrl && (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                {t('agentCreation.wizard.useSetupPreviewLabel')}
                            </div>
                            <div className="mt-2 break-all text-sm text-slate-700">{parsedServerUrl}</div>
                            <a
                                href={parsedServerUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={`${NewAgentWizardClassNames.secondaryButton} mt-3 inline-flex`}
                            >
                                <ExternalLink className="h-4 w-4" />
                                {t('agentCreation.wizard.useSetupOpenLinkAction')}
                            </a>
                        </div>
                    )}

                    <div className="mt-4">
                        <label className="mb-1.5 block text-sm font-medium text-slate-800">
                            {t('agentCreation.wizard.useSetupInstructionsLabel')}
                        </label>
                        <textarea
                            value={mcpSetup.instructions}
                            onChange={(event) =>
                                setState((previous) => ({
                                    ...previous,
                                    capabilitySetupByCommitment: {
                                        ...previous.capabilitySetupByCommitment,
                                        'USE MCP': {
                                            ...previous.capabilitySetupByCommitment['USE MCP'],
                                            instructions: event.target.value,
                                        },
                                    },
                                }))
                            }
                            placeholder={t('agentCreation.wizard.useSetupInstructionsPlaceholder')}
                            className={NewAgentWizardClassNames.textarea}
                        />
                    </div>
                </>
            );
        }

        default:
            return null;
    }
}

/**
 * Renders the optional `USE`-commitment setup step.
 *
 * @param props - Step props.
 * @returns Capability-setup step content.
 *
 * @private internal component of <NewAgentWizard/>.
 */
export function NewAgentWizardUseSetupStep(props: NewAgentWizardUseSetupStepProps) {
    const { state, setState, t } = props;
    const selectedSetupCapabilityPresets = getNewAgentWizardSelectedSetupCapabilityPresets(state.selectedCapabilityIds);

    return (
        <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-600">{t('agentCreation.wizard.useSetupSectionHint')}</p>
            </div>

            {selectedSetupCapabilityPresets.map((preset) => (
                <section key={preset.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                        <div className="text-2xl leading-none">{preset.icon}</div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">{t(preset.labelKey)}</h3>
                        </div>
                    </div>

                    <div className="mt-4">{renderCapabilitySetupFields({ preset, state, setState, t })}</div>
                </section>
            ))}
        </div>
    );
}
