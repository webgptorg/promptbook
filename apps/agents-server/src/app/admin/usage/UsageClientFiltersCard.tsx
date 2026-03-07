import type {
    UsageActorType,
    UsageAgentOption,
    UsageCallType,
    UsageFolderOption,
    UsageMetricMode,
    UsageTimeframePreset,
} from '@/src/utils/usageAdmin';

/**
 * Timeframe options exposed in the UI.
 */
const TIMEFRAME_OPTIONS: Array<{ value: UsageTimeframePreset; label: string }> = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: 'custom', label: 'Custom range' },
];

/**
 * Metric options exposed in usage visualizations.
 */
const METRIC_OPTIONS: Array<{ value: UsageMetricMode; label: string }> = [
    { value: 'COST', label: 'Cost' },
    { value: 'AGENT_DURATION', label: 'Agent duration' },
    { value: 'HUMAN_DURATION', label: 'Estimated human time' },
];

/**
 * Props for `<UsageClientFiltersCard/>`.
 */
type UsageClientFiltersCardProps = {
    agents: UsageAgentOption[];
    folders: UsageFolderOption[];
    selectedScopeLabel: string;
    timeframeRangeLabel: string | null;
    agentName: string;
    folderId: string;
    timeframe: UsageTimeframePreset;
    fromDate: string;
    toDate: string;
    callType: UsageCallType | '';
    actorType: UsageActorType | '';
    metric: UsageMetricMode;
    onAgentNameChange: (value: string) => void;
    onFolderIdChange: (value: string) => void;
    onTimeframeChange: (value: UsageTimeframePreset) => void;
    onFromDateChange: (value: string) => void;
    onToDateChange: (value: string) => void;
    onCallTypeChange: (value: UsageCallType | '') => void;
    onActorTypeChange: (value: UsageActorType | '') => void;
    onMetricChange: (value: UsageMetricMode) => void;
};

/**
 * Filter controls and scope chips for `<UsageClient/>`.
 * @private function of UsageClient
 */
export function UsageClientFiltersCard(props: UsageClientFiltersCardProps) {
    const {
        agents,
        folders,
        selectedScopeLabel,
        timeframeRangeLabel,
        agentName,
        folderId,
        timeframe,
        fromDate,
        toDate,
        callType,
        actorType,
        metric,
        onAgentNameChange,
        onFolderIdChange,
        onTimeframeChange,
        onFromDateChange,
        onToDateChange,
        onCallTypeChange,
        onActorTypeChange,
        onMetricChange,
    } = props;

    return (
        <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="flex flex-col gap-1">
                    <label htmlFor="usage-agent" className="text-sm font-medium text-gray-700">
                        Agent
                    </label>
                    <select
                        id="usage-agent"
                        value={agentName}
                        onChange={(event) => onAgentNameChange(event.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                        <option value="">All agents</option>
                        {agents.map((agent) => (
                            <option key={agent.agentName} value={agent.agentName}>
                                {agent.fullname ? `${agent.fullname} (${agent.agentName})` : agent.agentName}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="usage-folder" className="text-sm font-medium text-gray-700">
                        Folder
                    </label>
                    <select
                        id="usage-folder"
                        value={folderId}
                        onChange={(event) => onFolderIdChange(event.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                        <option value="">Entire server</option>
                        {folders.map((folder) => (
                            <option key={folder.id} value={String(folder.id)}>
                                {folder.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="usage-timeframe" className="text-sm font-medium text-gray-700">
                        Timeframe
                    </label>
                    <select
                        id="usage-timeframe"
                        value={timeframe}
                        onChange={(event) => onTimeframeChange(event.target.value as UsageTimeframePreset)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                        {TIMEFRAME_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                {timeframe === 'custom' && (
                    <>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="usage-from-date" className="text-sm font-medium text-gray-700">
                                From
                            </label>
                            <input
                                id="usage-from-date"
                                type="date"
                                value={fromDate}
                                onChange={(event) => onFromDateChange(event.target.value)}
                                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="usage-to-date" className="text-sm font-medium text-gray-700">
                                To
                            </label>
                            <input
                                id="usage-to-date"
                                type="date"
                                value={toDate}
                                onChange={(event) => onToDateChange(event.target.value)}
                                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                        </div>
                    </>
                )}

                <div className="flex flex-col gap-1">
                    <label htmlFor="usage-call-type" className="text-sm font-medium text-gray-700">
                        Call type
                    </label>
                    <select
                        id="usage-call-type"
                        value={callType}
                        onChange={(event) => onCallTypeChange((event.target.value as UsageCallType) || '')}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                        <option value="">All call types</option>
                        <option value="WEB_CHAT">Web chat</option>
                        <option value="VOICE_CHAT">Voice chat</option>
                        <option value="COMPATIBLE_API">Compatible API</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="usage-actor-type" className="text-sm font-medium text-gray-700">
                        Actor type
                    </label>
                    <select
                        id="usage-actor-type"
                        value={actorType}
                        onChange={(event) => onActorTypeChange((event.target.value as UsageActorType) || '')}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                        <option value="">All actors</option>
                        <option value="ANONYMOUS">Anonymous</option>
                        <option value="TEAM_MEMBER">Team member</option>
                        <option value="API_KEY">API key</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="usage-metric" className="text-sm font-medium text-gray-700">
                        Metric
                    </label>
                    <select
                        id="usage-metric"
                        value={metric}
                        onChange={(event) => onMetricChange(event.target.value as UsageMetricMode)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                        {METRIC_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                    Scope: {selectedScopeLabel}
                </span>
                {timeframeRangeLabel && (
                    <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">
                        Range: {timeframeRangeLabel}
                    </span>
                )}
            </div>
        </>
    );
}
