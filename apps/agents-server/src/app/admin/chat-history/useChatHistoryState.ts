import type { ChatMessage, string_date_iso8601 } from '@promptbook-local/types';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { showConfirm } from '../../../components/AsyncDialogs/asyncDialogs';
import {
    $clearAgentChatHistory,
    $deleteChatHistoryRow,
    $fetchChatHistory,
    type ChatHistoryListParams,
    type ChatHistoryListResponse,
    type ChatHistoryRow,
    type ChatHistorySortField,
    type ChatHistorySortOrder,
} from '../../../utils/chatHistoryAdmin';

/**
 * Default page size used in the table view.
 */
const TABLE_VIEW_PAGE_SIZE = 20;

/**
 * Larger page size used in the chat transcript view.
 */
const CHAT_VIEW_PAGE_SIZE = 100;

/**
 * Information about admin agent.
 */
type AdminAgentInfo = {
    agentName: string;
    fullname?: string | null;
};

/**
 * Response for agents Api.
 */
type AgentsApiResponse = {
    agents?: Array<{
        agentName: string;
        meta: { fullname?: string | null };
    }>;
};

/**
 * Supported chat history admin view modes.
 */
type ChatHistoryViewMode = 'table' | 'chat';

/**
 * Stateful settings that change when the view mode changes.
 */
type ChatHistoryViewSettings = {
    sortBy: ChatHistorySortField;
    sortOrder: ChatHistorySortOrder;
    pageSize: number;
};

/**
 * Props for useChatHistoryState.
 */
type UseChatHistoryStateProps = {
    /**
     * Optional initial agent filter, taken from the URL query.
     */
    initialAgentName?: string;
    /**
     * Active text formatter for agent naming.
     */
    formatText: (text: string) => string;
};

/**
 * State contract shared by the private chat history modules.
 *
 * @private internal type of <ChatHistoryClient/>
 */
export type UseChatHistoryState = {
    items: ChatHistoryRow[];
    chatMessages: ChatMessage[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    agentName: string;
    searchInput: string;
    sortOrder: ChatHistorySortOrder;
    viewMode: ChatHistoryViewMode;
    loading: boolean;
    error: string | null;
    agents: AdminAgentInfo[];
    agentsLoading: boolean;
    exportUrl: string;
    handleSearchInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
    handleSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
    handleAgentChange: (event: ChangeEvent<HTMLSelectElement>) => void;
    handlePageSizeChange: (event: ChangeEvent<HTMLSelectElement>) => void;
    handleSortChange: (field: ChatHistorySortField) => void;
    handleViewModeChange: (mode: ChatHistoryViewMode) => void;
    handleDeleteRow: (row: ChatHistoryRow) => Promise<void>;
    handleClearAgentHistory: () => Promise<void>;
    isSortedBy: (field: ChatHistorySortField) => boolean;
    goToPreviousPage: () => void;
    goToNextPage: () => void;
};

/**
 * Maps the agents API response into sorted agent options.
 */
function mapAdminAgents(data: AgentsApiResponse): AdminAgentInfo[] {
    const mappedAgents: AdminAgentInfo[] =
        data.agents?.map((agent) => ({
            agentName: agent.agentName,
            fullname: agent.meta?.fullname ?? null,
        })) ?? [];

    mappedAgents.sort((agentA, agentB) => {
        const nameA = (agentA.fullname || agentA.agentName).toLowerCase();
        const nameB = (agentB.fullname || agentB.agentName).toLowerCase();
        return nameA.localeCompare(nameB);
    });

    return mappedAgents;
}

/**
 * Builds fetch params for the current chat history view state.
 */
function createChatHistoryListParams(
    state: Pick<UseChatHistoryState, 'page' | 'pageSize' | 'agentName'> & {
        search: string;
        sortBy: ChatHistorySortField;
        sortOrder: ChatHistorySortOrder;
    },
    overrides: Partial<ChatHistoryListParams> = {},
): ChatHistoryListParams {
    return {
        page: state.page,
        pageSize: state.pageSize,
        agentName: state.agentName || undefined,
        search: state.search || undefined,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        ...overrides,
    };
}

/**
 * Resolves a human-readable action error message.
 */
function resolveChatHistoryActionErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}

/**
 * Resolves the page size and sorting used by a view mode switch.
 */
function getChatHistoryViewSettings(mode: ChatHistoryViewMode): ChatHistoryViewSettings {
    if (mode === 'chat') {
        return {
            sortBy: 'createdAt',
            sortOrder: 'asc',
            pageSize: CHAT_VIEW_PAGE_SIZE,
        };
    }

    return {
        sortBy: 'createdAt',
        sortOrder: 'desc',
        pageSize: TABLE_VIEW_PAGE_SIZE,
    };
}

/**
 * Builds the CSV export URL for the active agent filter.
 */
function getChatHistoryExportUrl(agentName: string): string {
    const params = new URLSearchParams();

    if (agentName) {
        params.set('agentName', agentName);
    }

    return `/api/chat-history/export?${params.toString()}`;
}

/**
 * Converts one stored chat message into the sender used by <MockedChat/>.
 */
function resolveChatHistoryMessageSender(message: unknown): ChatMessage['sender'] {
    const role = ((message as { role?: string }).role || 'USER').toUpperCase();
    return role === 'USER' ? 'USER' : 'ASSISTANT';
}

/**
 * Converts one stored chat message into the content used by <MockedChat/>.
 */
function resolveChatHistoryMessageContent(message: unknown): ChatMessage['content'] {
    return (message as { content?: ChatMessage['content'] }).content || JSON.stringify(message);
}

/**
 * Converts stored chat history rows into chat messages consumable by <MockedChat/>.
 */
function createChatHistoryMessages(items: ChatHistoryRow[], viewMode: ChatHistoryViewMode): ChatMessage[] {
    if (viewMode !== 'chat') {
        return [];
    }

    return items.map((row) => ({
        id: String(row.id),
        sender: resolveChatHistoryMessageSender(row.message),
        content: resolveChatHistoryMessageContent(row.message),
        isComplete: true,
        createdAt: row.createdAt as string_date_iso8601,
    }));
}

/**
 * Requests confirmation before deleting one chat history row.
 */
async function confirmDeleteChatMessage(): Promise<boolean> {
    return showConfirm({
        title: 'Delete chat message',
        message: 'Are you sure you want to delete this chat message?',
        confirmLabel: 'Delete message',
        cancelLabel: 'Cancel',
    }).catch(() => false);
}

/**
 * Requests confirmation before clearing one agent's chat history.
 */
async function confirmClearAgentHistory(agentName: string, formatText: (text: string) => string): Promise<boolean> {
    return showConfirm({
        title: 'Clear chat history',
        message: `${formatText('Are you sure you want to permanently delete all chat history for agent')} "${agentName}"?`,
        confirmLabel: 'Delete history',
        cancelLabel: 'Cancel',
    }).catch(() => false);
}

/**
 * Provides state and actions for the chat history admin page.
 *
 * @private function of <ChatHistoryClient/>
 */
export function useChatHistoryState({ initialAgentName, formatText }: UseChatHistoryStateProps): UseChatHistoryState {
    const [items, setItems] = useState<ChatHistoryRow[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(TABLE_VIEW_PAGE_SIZE);
    const [agentName, setAgentName] = useState(initialAgentName ?? '');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<ChatHistorySortField>('createdAt');
    const [sortOrder, setSortOrder] = useState<ChatHistorySortOrder>('desc');
    const [viewMode, setViewMode] = useState<ChatHistoryViewMode>('table');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [agents, setAgents] = useState<AdminAgentInfo[]>([]);
    const [agentsLoading, setAgentsLoading] = useState(false);

    const applyChatHistoryResponse = useCallback((response: ChatHistoryListResponse) => {
        setItems(response.items);
        setTotal(response.total);
    }, []);

    const loadChatHistory = useCallback(
        (overrides: Partial<ChatHistoryListParams> = {}) =>
            $fetchChatHistory(
                createChatHistoryListParams(
                    {
                        page,
                        pageSize,
                        agentName,
                        search,
                        sortBy,
                        sortOrder,
                    },
                    overrides,
                ),
            ),
        [page, pageSize, agentName, search, sortBy, sortOrder],
    );

    useEffect(() => {
        let isCancelled = false;

        async function loadAgents() {
            try {
                setAgentsLoading(true);
                const response = await fetch('/api/agents');
                if (!response.ok) {
                    return;
                }

                const data = (await response.json()) as AgentsApiResponse;
                if (isCancelled) {
                    return;
                }

                setAgents(mapAdminAgents(data));
            } finally {
                if (!isCancelled) {
                    setAgentsLoading(false);
                }
            }
        }

        loadAgents();

        return () => {
            isCancelled = true;
        };
    }, []);

    useEffect(() => {
        if (initialAgentName) {
            setAgentName(initialAgentName);
        }
    }, [initialAgentName]);

    useEffect(() => {
        let isCancelled = false;

        async function loadData() {
            try {
                setLoading(true);
                setError(null);

                const response = await loadChatHistory();
                if (isCancelled) {
                    return;
                }

                applyChatHistoryResponse(response);
            } catch (loadError) {
                if (isCancelled) {
                    return;
                }

                setError(resolveChatHistoryActionErrorMessage(loadError, 'Failed to load chat history'));
            } finally {
                if (!isCancelled) {
                    setLoading(false);
                }
            }
        }

        loadData();

        return () => {
            isCancelled = true;
        };
    }, [applyChatHistoryResponse, loadChatHistory]);

    const totalPages = useMemo(() => {
        if (total <= 0 || pageSize <= 0) {
            return 1;
        }

        return Math.max(1, Math.ceil(total / pageSize));
    }, [total, pageSize]);

    const exportUrl = useMemo(() => getChatHistoryExportUrl(agentName), [agentName]);

    const chatMessages = useMemo(() => createChatHistoryMessages(items, viewMode), [items, viewMode]);

    const handleSearchInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setSearchInput(event.target.value);
    }, []);

    const handleSearchSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setPage(1);
            setSearch(searchInput.trim());
        },
        [searchInput],
    );

    const handleAgentChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        setAgentName(event.target.value);
        setPage(1);
    }, []);

    const handlePageSizeChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        const nextPageSize = parseInt(event.target.value, 10);
        if (!Number.isNaN(nextPageSize) && nextPageSize > 0) {
            setPageSize(nextPageSize);
            setPage(1);
        }
    }, []);

    const handleSortChange = useCallback(
        (field: ChatHistorySortField) => {
            if (sortBy === field) {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                return;
            }

            setSortBy(field);
            setSortOrder(field === 'createdAt' ? 'desc' : 'asc');
        },
        [sortBy, sortOrder],
    );

    const handleViewModeChange = useCallback((mode: ChatHistoryViewMode) => {
        const settings = getChatHistoryViewSettings(mode);

        setViewMode(mode);
        setSortBy(settings.sortBy);
        setSortOrder(settings.sortOrder);
        setPageSize(settings.pageSize);
    }, []);

    const handleDeleteRow = useCallback(
        async (row: ChatHistoryRow) => {
            if (!row.id) {
                return;
            }

            const isConfirmed = await confirmDeleteChatMessage();
            if (!isConfirmed) {
                return;
            }

            try {
                await $deleteChatHistoryRow(row.id);
                applyChatHistoryResponse(await loadChatHistory());
            } catch (actionError) {
                setError(resolveChatHistoryActionErrorMessage(actionError, 'Failed to delete chat message'));
            }
        },
        [applyChatHistoryResponse, loadChatHistory],
    );

    const handleClearAgentHistory = useCallback(async () => {
        if (!agentName) {
            return;
        }

        const isConfirmed = await confirmClearAgentHistory(agentName, formatText);
        if (!isConfirmed) {
            return;
        }

        try {
            setLoading(true);
            setError(null);
            await $clearAgentChatHistory(agentName);
            setPage(1);
            applyChatHistoryResponse(await loadChatHistory({ page: 1 }));
        } catch (actionError) {
            setError(resolveChatHistoryActionErrorMessage(actionError, 'Failed to clear chat history'));
        } finally {
            setLoading(false);
        }
    }, [agentName, applyChatHistoryResponse, formatText, loadChatHistory]);

    const isSortedBy = useCallback((field: ChatHistorySortField) => sortBy === field, [sortBy]);

    const goToPreviousPage = useCallback(() => {
        setPage((previousPage) => Math.max(1, previousPage - 1));
    }, []);

    const goToNextPage = useCallback(() => {
        setPage((previousPage) => Math.min(totalPages, previousPage + 1));
    }, [totalPages]);

    return {
        items,
        chatMessages,
        total,
        page,
        pageSize,
        totalPages,
        agentName,
        searchInput,
        sortOrder,
        viewMode,
        loading,
        error,
        agents,
        agentsLoading,
        exportUrl,
        handleSearchInputChange,
        handleSearchSubmit,
        handleAgentChange,
        handlePageSizeChange,
        handleSortChange,
        handleViewModeChange,
        handleDeleteRow,
        handleClearAgentHistory,
        isSortedBy,
        goToPreviousPage,
        goToNextPage,
    };
}
