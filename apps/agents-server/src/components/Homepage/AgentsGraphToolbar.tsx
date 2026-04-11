import { Code, FileImage, FileText, type LucideIcon } from 'lucide-react';
import type { AgentWithVisibility, ConnectionType } from './buildGraphData';

/**
 * Federated server loading status shown in the graph toolbar.
 *
 * @private function of AgentsGraph
 */
type FederatedServerStatus = {
    status: 'loading' | 'success' | 'error';
    error?: string;
};

/**
 * Props for the graph toolbar controls.
 *
 * @private function of AgentsGraph
 */
type AgentsGraphToolbarProps = {
    readonly agents: AgentWithVisibility[];
    readonly federatedAgents: AgentWithVisibility[];
    readonly federatedServersStatus: Record<string, FederatedServerStatus>;
    readonly filterType: ConnectionType[];
    readonly selectedServerUrl: string | null;
    readonly selectedAgentName: string | null;
    readonly normalizedPublicUrl: string;
    readonly isDownloadAvailable: boolean;
    readonly formatText: (text: string) => string;
    readonly onToggleFilter: (type: ConnectionType) => void;
    readonly onSelectServerAndAgent: (value: string) => void;
    readonly onDownloadPng: () => void | Promise<void>;
    readonly onDownloadSvg: () => void | Promise<void>;
    readonly onDownloadAscii: () => void | Promise<void>;
};

/**
 * Metadata for one connection-type toggle.
 *
 * @private function of AgentsGraph
 */
type FilterToggleOption = {
    type: ConnectionType;
    label: string;
};

/**
 * Metadata for one graph download button.
 *
 * @private function of AgentsGraph
 */
type DownloadButtonOption = {
    label: string;
    title: string;
    icon: LucideIcon;
    onClick: () => void | Promise<void>;
    isEnabled: boolean;
};

/**
 * Static connection toggles displayed in the toolbar.
 *
 * @private function of AgentsGraph
 */
const FILTER_TOGGLE_OPTIONS: ReadonlyArray<FilterToggleOption> = [
    { type: 'inheritance', label: 'Parent' },
    { type: 'import', label: 'Import' },
    { type: 'team', label: 'Team' },
];

/**
 * Resolve the current select value from the active server/agent filters.
 *
 * @private function of AgentsGraph
 */
function buildSelectionValue(selectedServerUrl: string | null, selectedAgentName: string | null): string {
    if (selectedAgentName) {
        return `${selectedServerUrl}|${selectedAgentName}`;
    }

    if (selectedServerUrl === 'ALL') {
        return 'ALL';
    }

    if (selectedServerUrl) {
        return `SERVER:${selectedServerUrl}`;
    }

    return '';
}

/**
 * Group federated agents by their server URL so each optgroup can render in one pass.
 *
 * @private function of AgentsGraph
 */
function groupFederatedAgentsByServer(
    federatedAgents: ReadonlyArray<AgentWithVisibility>,
): ReadonlyMap<string, AgentWithVisibility[]> {
    const agentsByServerUrl = new Map<string, AgentWithVisibility[]>();

    federatedAgents.forEach((agent) => {
        const serverUrl = agent.serverUrl;
        if (!serverUrl) {
            return;
        }

        const serverAgents = agentsByServerUrl.get(serverUrl) || [];
        serverAgents.push(agent);
        agentsByServerUrl.set(serverUrl, serverAgents);
    });

    return agentsByServerUrl;
}

/**
 * Format the select-group label for one federated server.
 *
 * @private function of AgentsGraph
 */
function formatServerGroupLabel(serverUrl: string, status: FederatedServerStatus): string {
    const normalizedLabel = serverUrl.replace(/^https?:\/\//, '');

    if (status.status === 'loading') {
        return `${normalizedLabel} (loading...)`;
    }

    if (status.status === 'error') {
        return `${normalizedLabel} (error)`;
    }

    return normalizedLabel;
}

/**
 * Resolve the visible label for one agent option.
 *
 * @private function of AgentsGraph
 */
function getAgentOptionLabel(agent: AgentWithVisibility): string {
    return agent.meta.fullname || agent.agentName;
}

/**
 * Build the button className shared by all download buttons.
 *
 * @private function of AgentsGraph
 */
function buildDownloadButtonClassName(isEnabled: boolean): string {
    return `flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
        isEnabled
            ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
    }`;
}

/**
 * Render the AgentsGraph toolbar with filter and export controls.
 *
 * @private function of AgentsGraph
 */
export function AgentsGraphToolbar(props: AgentsGraphToolbarProps) {
    const {
        agents,
        federatedAgents,
        federatedServersStatus,
        filterType,
        selectedServerUrl,
        selectedAgentName,
        normalizedPublicUrl,
        isDownloadAvailable,
        formatText,
        onToggleFilter,
        onSelectServerAndAgent,
        onDownloadPng,
        onDownloadSvg,
        onDownloadAscii,
    } = props;

    const selectionValue = buildSelectionValue(selectedServerUrl, selectedAgentName);
    const isClearFocusVisible = Boolean(selectedAgentName || selectedServerUrl);
    const federatedAgentsByServer = groupFederatedAgentsByServer(federatedAgents);
    const downloadButtons: ReadonlyArray<DownloadButtonOption> = [
        {
            label: 'PNG',
            title: 'Download graph as PNG',
            icon: FileImage,
            onClick: onDownloadPng,
            isEnabled: isDownloadAvailable,
        },
        {
            label: 'SVG',
            title: 'Download graph as SVG',
            icon: Code,
            onClick: onDownloadSvg,
            isEnabled: isDownloadAvailable,
        },
        {
            label: 'ASCII',
            title: 'Download graph as ASCII',
            icon: FileText,
            onClick: onDownloadAscii,
            isEnabled: isDownloadAvailable,
        },
    ];

    return (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Show connections:</span>
                    {FILTER_TOGGLE_OPTIONS.map(({ label, type }) => (
                        <label key={type} className="flex items-center gap-1 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filterType.includes(type)}
                                onChange={() => onToggleFilter(type)}
                                className="rounded text-blue-600"
                            />
                            <span className="text-sm">{label}</span>
                        </label>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Filter:</span>
                    <select
                        value={selectionValue}
                        onChange={(event) => onSelectServerAndAgent(event.target.value)}
                        className="text-sm border rounded-md p-1 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">{formatText('All Agents')}</option>
                        <optgroup label="This Server">
                            <option value={`SERVER:${normalizedPublicUrl}`}>Entire This Server</option>
                            {agents.map((agent) => (
                                <option key={agent.agentName} value={`${normalizedPublicUrl}|${agent.agentName}`}>
                                    {getAgentOptionLabel(agent)}
                                </option>
                            ))}
                        </optgroup>
                        {Object.entries(federatedServersStatus).map(([serverUrl, status]) => (
                            <optgroup key={serverUrl} label={formatServerGroupLabel(serverUrl, status)}>
                                <option value={`SERVER:${serverUrl}`}>Entire Server</option>
                                {(federatedAgentsByServer.get(serverUrl) || []).map((agent) => (
                                    <option key={agent.agentName} value={`${serverUrl}|${agent.agentName}`}>
                                        {getAgentOptionLabel(agent)}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>

                {isClearFocusVisible && (
                    <button
                        type="button"
                        onClick={() => onSelectServerAndAgent('')}
                        className="text-xs text-blue-600 hover:underline"
                    >
                        Clear focus
                    </button>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                <span className="text-xs font-medium text-slate-500">Download:</span>
                {downloadButtons.map(({ icon: Icon, isEnabled, label, onClick, title }) => (
                    <button
                        key={label}
                        type="button"
                        onClick={onClick}
                        disabled={!isEnabled}
                        className={buildDownloadButtonClassName(isEnabled)}
                        title={title}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}
