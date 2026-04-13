import {
    $fetchUsageAnalytics,
    type UsageActorType,
    type UsageAgentOption,
    type UsageAnalyticsResponse,
    type UsageCallType,
    type UsageFolderOption,
    type UsageMetricMode,
    type UsageTimeframePreset,
} from '@/src/utils/usageAdmin';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { UsageClientFormatting } from './UsageClientFormatting';
import { UsageClientQuery } from './UsageClientQuery';

/**
 * Input props for `useUsageClientState`.
 */
type UseUsageClientStateProps = {
    agents: UsageAgentOption[];
    folders: UsageFolderOption[];
    initialAgentName: string | null;
    initialFolderId: number | null;
    initialTimeframe: UsageTimeframePreset;
    initialFrom: string | null;
    initialTo: string | null;
    initialCallType: UsageCallType | null;
    initialActorType: UsageActorType | null;
    initialMetric: UsageMetricMode;
};

/**
 * Filter state managed by `<UsageClient/>`.
 *
 * @private internal type of <UsageClient/>
 */
type UsageClientFilterState = {
    agentName: string;
    folderId: string;
    timeframe: UsageTimeframePreset;
    fromDate: string;
    toDate: string;
    callType: UsageCallType | '';
    actorType: UsageActorType | '';
    metric: UsageMetricMode;
};

/**
 * Analytics fetch filters derived from the client state.
 *
 * @private internal type of <UsageClient/>
 */
type UsageClientAnalyticsFilters = Omit<UsageClientFilterState, 'metric'>;

/**
 * State and handlers exposed by `useUsageClientState`.
 *
 * @private internal type of <UsageClient/>
 */
type UseUsageClientStateResult = UsageClientFilterState & {
    data: UsageAnalyticsResponse | null;
    loading: boolean;
    error: string | null;
    selectedScopeLabel: string;
    timeframeRangeLabel: string | null;
    handleAgentNameChange: (value: string) => void;
    handleFolderIdChange: (value: string) => void;
    handleTimeframeChange: (value: UsageTimeframePreset) => void;
    handleFromDateChange: (value: string) => void;
    handleToDateChange: (value: string) => void;
    handleCallTypeChange: (value: UsageCallType | '') => void;
    handleActorTypeChange: (value: UsageActorType | '') => void;
    handleMetricChange: (value: UsageMetricMode) => void;
};

/**
 * Builds the initial filter state from server-provided props.
 */
function createUsageClientInitialState(props: UseUsageClientStateProps): UsageClientFilterState {
    return {
        agentName: props.initialAgentName || '',
        folderId: props.initialFolderId ? String(props.initialFolderId) : '',
        timeframe: props.initialTimeframe,
        fromDate: props.initialFrom || '',
        toDate: props.initialTo || '',
        callType: props.initialCallType || '',
        actorType: props.initialActorType || '',
        metric: props.initialMetric,
    };
}

/**
 * Builds the route string used for search-param synchronization.
 */
function resolveUsageClientRoute(pathname: string | null, searchQuery: string): string | null {
    if (!pathname) {
        return null;
    }

    return searchQuery ? `${pathname}?${searchQuery}` : pathname;
}

/**
 * Determines whether the custom timeframe inputs are currently invalid.
 */
function isUsageClientCustomRangeInvalid(
    filters: Pick<UsageClientFilterState, 'timeframe' | 'fromDate' | 'toDate'>,
): boolean {
    if (filters.timeframe !== 'custom') {
        return false;
    }

    return (
        !UsageClientFormatting.isIsoDateInputValue(filters.fromDate) ||
        !UsageClientFormatting.isIsoDateInputValue(filters.toDate) ||
        filters.fromDate > filters.toDate
    );
}

/**
 * Resolves the active scope label shown in the filter summary chips.
 */
function resolveUsageClientSelectedScopeLabel(
    agents: UsageAgentOption[],
    folders: UsageFolderOption[],
    agentName: string,
    folderId: string,
): string {
    if (agentName) {
        const selectedAgent = agents.find((agent) => agent.agentName === agentName);
        return selectedAgent?.fullname || selectedAgent?.agentName || agentName;
    }

    if (folderId) {
        const selectedFolder = folders.find((folder) => String(folder.id) === folderId);
        return selectedFolder?.name || `Folder #${folderId}`;
    }

    return 'Entire server';
}

/**
 * Resolves the human-readable timeframe range chip label.
 */
function resolveUsageClientTimeframeRangeLabel(data: UsageAnalyticsResponse | null): string | null {
    if (!data) {
        return null;
    }

    return `${UsageClientFormatting.formatDateTime(data.timeframe.from)} - ${UsageClientFormatting.formatDateTime(
        data.timeframe.to,
    )}`;
}

/**
 * Resolves a safe error message for usage analytics requests.
 */
function resolveUsageClientAnalyticsErrorMessage(fetchError: unknown): string {
    return fetchError instanceof Error ? fetchError.message : 'Failed to load usage analytics';
}

/**
 * Provides state and focused handlers for `<UsageClient/>`.
 *
 * @private function of <UsageClient/>
 */
export function useUsageClientState(props: UseUsageClientStateProps): UseUsageClientStateResult {
    const { agents, folders } = props;
    const router = useRouter();
    const pathname = usePathname();
    const initialState = createUsageClientInitialState(props);

    const [agentName, setAgentName] = useState<string>(initialState.agentName);
    const [folderId, setFolderId] = useState<string>(initialState.folderId);
    const [timeframe, setTimeframe] = useState<UsageTimeframePreset>(initialState.timeframe);
    const [fromDate, setFromDate] = useState<string>(initialState.fromDate);
    const [toDate, setToDate] = useState<string>(initialState.toDate);
    const [callType, setCallType] = useState<UsageCallType | ''>(initialState.callType);
    const [actorType, setActorType] = useState<UsageActorType | ''>(initialState.actorType);
    const [metric, setMetric] = useState<UsageMetricMode>(initialState.metric);
    const [data, setData] = useState<UsageAnalyticsResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const searchFilters = useMemo<UsageClientFilterState>(
        () => ({
            agentName,
            folderId,
            timeframe,
            fromDate,
            toDate,
            callType,
            actorType,
            metric,
        }),
        [agentName, folderId, timeframe, fromDate, toDate, callType, actorType, metric],
    );

    const analyticsFilters = useMemo<UsageClientAnalyticsFilters>(
        () => ({
            agentName,
            folderId,
            timeframe,
            fromDate,
            toDate,
            callType,
            actorType,
        }),
        [agentName, folderId, timeframe, fromDate, toDate, callType, actorType],
    );

    const searchQuery = useMemo(() => UsageClientQuery.buildSearchQuery(searchFilters), [searchFilters]);
    const analyticsQuery = useMemo(() => UsageClientQuery.buildAnalyticsQuery(analyticsFilters), [analyticsFilters]);

    const isCustomRangeInvalid = useMemo(
        () => isUsageClientCustomRangeInvalid(analyticsFilters),
        [analyticsFilters],
    );

    useEffect(() => {
        const route = resolveUsageClientRoute(pathname, searchQuery);
        if (!route) {
            return;
        }

        router.replace(route, { scroll: false });
    }, [pathname, router, searchQuery]);

    useEffect(() => {
        if (isCustomRangeInvalid) {
            setError('Custom timeframe is invalid. Please select a valid start and end date.');
            setLoading(false);
            return;
        }

        let isCancelled = false;

        async function loadUsageAnalytics() {
            try {
                setLoading(true);
                setError(null);

                const response = await $fetchUsageAnalytics(analyticsQuery);
                if (isCancelled) {
                    return;
                }

                setData(response);
            } catch (fetchError) {
                if (isCancelled) {
                    return;
                }

                setError(resolveUsageClientAnalyticsErrorMessage(fetchError));
            } finally {
                if (!isCancelled) {
                    setLoading(false);
                }
            }
        }

        loadUsageAnalytics();

        return () => {
            isCancelled = true;
        };
    }, [analyticsQuery, isCustomRangeInvalid]);

    const selectedScopeLabel = useMemo(
        () => resolveUsageClientSelectedScopeLabel(agents, folders, agentName, folderId),
        [agentName, agents, folderId, folders],
    );

    const timeframeRangeLabel = useMemo(() => resolveUsageClientTimeframeRangeLabel(data), [data]);

    const handleAgentNameChange = useCallback((value: string) => {
        setAgentName(value);
        if (value) {
            setFolderId('');
        }
    }, []);

    const handleFolderIdChange = useCallback((value: string) => {
        setFolderId(value);
        if (value) {
            setAgentName('');
        }
    }, []);

    const handleTimeframeChange = useCallback((value: UsageTimeframePreset) => {
        setTimeframe(value);
    }, []);

    const handleFromDateChange = useCallback((value: string) => {
        setFromDate(value);
    }, []);

    const handleToDateChange = useCallback((value: string) => {
        setToDate(value);
    }, []);

    const handleCallTypeChange = useCallback((value: UsageCallType | '') => {
        setCallType(value);
    }, []);

    const handleActorTypeChange = useCallback((value: UsageActorType | '') => {
        setActorType(value);
    }, []);

    const handleMetricChange = useCallback((value: UsageMetricMode) => {
        setMetric(value);
    }, []);

    return {
        agentName,
        folderId,
        timeframe,
        fromDate,
        toDate,
        callType,
        actorType,
        metric,
        data,
        loading,
        error,
        selectedScopeLabel,
        timeframeRangeLabel,
        handleAgentNameChange,
        handleFolderIdChange,
        handleTimeframeChange,
        handleFromDateChange,
        handleToDateChange,
        handleCallTypeChange,
        handleActorTypeChange,
        handleMetricChange,
    };
}
