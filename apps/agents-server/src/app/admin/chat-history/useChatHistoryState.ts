import type { ChatMessage, string_date_iso8601 } from '@promptbook-local/types';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { showConfirm } from '../../../components/AsyncDialogs/asyncDialogs';
import { notifyError, notifySuccess } from '../../../components/Notifications/notifications';
import { resolveNextAdminTableSortState } from '../_components/adminTableSorting';
import {
    $clearAgentChatHistory,
    $deleteChatHistoryRow,
    $fetchChatHistory,
    $fetchChatHistoryThreads,
    type ChatHistoryListParams,
    type ChatHistoryListResponse,
    type ChatHistoryRow,
    type ChatHistorySortField,
    type ChatHistorySortOrder,
    type ChatHistoryThread,
} from '../../../utils/chatHistoryAdmin';
import {
    resolveChatHistoryMessageSender,
    resolveChatHistoryMessageText,
} from '../../../utils/chatHistoryMessage';
import {
    $saveMockedChatPresetFromMessages,
    MOCKED_CHATS_EDITOR_ROUTE,
} from '../../../utils/mockedChats/$saveMockedChatPresetFromMessages';
import type { MockedChatSourceMessage } from '../../../utils/mockedChats/createMockedChatPresetFromChatMessages';

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
     * Optional initial chat thread filter, taken from the URL query.
     */
    initialChatId?: string;
    /**
     * Optional initial view mode, taken from the URL query.
     */
    initialViewMode?: ChatHistoryViewMode;
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
    chatId: string;
    threads: ChatHistoryThread[];
    threadsLoading: boolean;
    selectedThread: ChatHistoryThread | null;
    searchInput: string;
    sortBy: ChatHistorySortField;
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
    handleChatThreadChange: (chatId: string) => void;
    handlePageSizeChange: (event: ChangeEvent<HTMLSelectElement>) => void;
    handleSortChange: (field: ChatHistorySortField) => void;
    handleViewModeChange: (mode: ChatHistoryViewMode) => void;
    handleDeleteRow: (row: ChatHistoryRow) => Promise<void>;
    handleClearAgentHistory: () => Promise<void>;
    handleCreateMockFromRow: (row: ChatHistoryRow) => Promise<void>;
    handleCreateMockFromChatView: () => Promise<void>;
    isCreatingMock: boolean;
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
    state: Pick<UseChatHistoryState, 'page' | 'pageSize' | 'agentName' | 'chatId'> & {
        search: string;
        sortBy: ChatHistorySortField;
        sortOrder: ChatHistorySortOrder;
    },
    overrides: Partial<ChatHistoryListParams> = {},
): ChatHistoryListParams {
    const chatId = state.chatId || undefined;

    return {
        page: state.page,
        pageSize: state.pageSize,
        // Note: A chat thread belongs to exactly one agent, so a selected `chatId` fully
        // determines the rows and the redundant `agentName` filter is dropped. This keeps
        // deep-links robust even when the agent was addressed by permanent id.
        agentName: chatId ? undefined : state.agentName || undefined,
        chatId,
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
 * Builds the CSV export URL for the active agent and chat thread filters.
 */
function getChatHistoryExportUrl(agentName: string, chatId: string): string {
    const params = new URLSearchParams();

    if (chatId) {
        // Note: A selected chat thread fully determines the exported rows (see `createChatHistoryListParams`)
        params.set('chatId', chatId);
    } else if (agentName) {
        params.set('agentName', agentName);
    }

    return `/api/chat-history/export?${params.toString()}`;
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
        content: resolveChatHistoryMessageText(row.message) || JSON.stringify(row.message),
        isComplete: true,
        createdAt: row.createdAt as string_date_iso8601,
    }));
}

/**
 * Converts one stored chat history row into a mocked-chat source message.
 */
function mapChatHistoryRowToMockedChatSourceMessage(row: ChatHistoryRow): MockedChatSourceMessage {
    return {
        sender: String(resolveChatHistoryMessageSender(row.message)),
        content: resolveChatHistoryMessageText(row.message) || JSON.stringify(row.message),
        createdAt: row.createdAt,
    };
}

/**
 * Builds a human-readable mocked-chat preset name for one recorded chat.
 */
function createMockedChatNameFromRow(row: ChatHistoryRow): string {
    return `${row.agentName} chat ${new Date(row.createdAt).toLocaleDateString('en-US')}`;
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
export function useChatHistoryState({
    initialAgentName,
    initialChatId,
    initialViewMode,
    formatText,
}: UseChatHistoryStateProps): UseChatHistoryState {
    const initialViewSettings = getChatHistoryViewSettings(initialViewMode ?? 'table');
    const [items, setItems] = useState<ChatHistoryRow[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialViewSettings.pageSize);
    const [agentName, setAgentName] = useState(initialAgentName ?? '');
    const [chatId, setChatId] = useState(initialChatId ?? '');
    const [threads, setThreads] = useState<ChatHistoryThread[]>([]);
    const [threadsLoading, setThreadsLoading] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<ChatHistorySortField>(initialViewSettings.sortBy);
    const [sortOrder, setSortOrder] = useState<ChatHistorySortOrder>(initialViewSettings.sortOrder);
    const [viewMode, setViewMode] = useState<ChatHistoryViewMode>(initialViewMode ?? 'table');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [agents, setAgents] = useState<AdminAgentInfo[]>([]);
    const [agentsLoading, setAgentsLoading] = useState(false);
    const [isCreatingMock, setIsCreatingMock] = useState(false);

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
                        chatId,
                        search,
                        sortBy,
                        sortOrder,
                    },
                    overrides,
                ),
            ),
        [page, pageSize, agentName, chatId, search, sortBy, sortOrder],
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
        if (initialChatId) {
            setChatId(initialChatId);
        }
    }, [initialChatId]);

    useEffect(() => {
        let isCancelled = false;

        async function loadThreads() {
            try {
                setThreadsLoading(true);
                const nextThreads = await $fetchChatHistoryThreads(agentName || undefined);
                if (isCancelled) {
                    return;
                }

                setThreads(nextThreads);
            } catch {
                // Note: The thread list is a browsing aid; a failure must not break the message views
                if (!isCancelled) {
                    setThreads([]);
                }
            } finally {
                if (!isCancelled) {
                    setThreadsLoading(false);
                }
            }
        }

        loadThreads();

        return () => {
            isCancelled = true;
        };
    }, [agentName]);

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

    const exportUrl = useMemo(() => getChatHistoryExportUrl(agentName, chatId), [agentName, chatId]);

    const chatMessages = useMemo(() => createChatHistoryMessages(items, viewMode), [items, viewMode]);

    const selectedThread = useMemo(
        () => (chatId ? threads.find((thread) => thread.chatId === chatId) ?? null : null),
        [chatId, threads],
    );

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
        // Note: Chat threads are scoped to a single agent, so switching agent clears the thread filter
        setChatId('');
        setPage(1);
    }, []);

    const handleChatThreadChange = useCallback(
        (nextChatId: string) => {
            setChatId(nextChatId);
            setPage(1);

            // Note: Selecting a thread also aligns the agent filter so both filters stay consistent
            const nextThread = nextChatId ? threads.find((thread) => thread.chatId === nextChatId) : undefined;
            if (nextThread && nextThread.agentName !== agentName) {
                setAgentName(nextThread.agentName);
            }
        },
        [agentName, threads],
    );

    const handlePageSizeChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        const nextPageSize = parseInt(event.target.value, 10);
        if (!Number.isNaN(nextPageSize) && nextPageSize > 0) {
            setPageSize(nextPageSize);
            setPage(1);
        }
    }, []);

    const handleSortChange = useCallback(
        (field: ChatHistorySortField) => {
            const nextSortState = resolveNextAdminTableSortState({
                currentSortBy: sortBy,
                currentSortOrder: sortOrder,
                nextSortBy: field,
                resolveDefaultSortOrder: (nextSortBy) => (nextSortBy === 'createdAt' ? 'desc' : 'asc'),
            });

            setSortBy(nextSortState.sortBy);
            setSortOrder(nextSortState.sortOrder);
            setPage(1);
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

    const createMockAndNavigate = useCallback(
        async (name: string, messages: ReadonlyArray<MockedChatSourceMessage>): Promise<void> => {
            if (isCreatingMock) {
                return;
            }

            if (messages.length === 0) {
                notifyError('There are no messages to create a mocked chat from.');
                return;
            }

            try {
                setIsCreatingMock(true);
                await $saveMockedChatPresetFromMessages({ name, messages });
                notifySuccess('Mocked chat was created.');
                window.location.href = MOCKED_CHATS_EDITOR_ROUTE;
            } catch (actionError) {
                notifyError(
                    resolveChatHistoryActionErrorMessage(actionError, 'Failed to create the mocked chat'),
                );
            } finally {
                setIsCreatingMock(false);
            }
        },
        [isCreatingMock],
    );

    const handleCreateMockFromRow = useCallback(
        async (row: ChatHistoryRow): Promise<void> => {
            let mockSourceRows: ChatHistoryRow[] = [row];

            if (row.chatId) {
                try {
                    const chatResponse = await $fetchChatHistory({
                        chatId: row.chatId,
                        pageSize: CHAT_VIEW_PAGE_SIZE,
                        sortBy: 'createdAt',
                        sortOrder: 'asc',
                    });
                    if (chatResponse.items.length > 0) {
                        mockSourceRows = chatResponse.items;
                    }
                } catch {
                    // Note: Falling back to the single row keeps the button usable when the chat lookup fails
                }
            }

            await createMockAndNavigate(
                createMockedChatNameFromRow(row),
                mockSourceRows.map(mapChatHistoryRowToMockedChatSourceMessage),
            );
        },
        [createMockAndNavigate],
    );

    const handleCreateMockFromChatView = useCallback(async (): Promise<void> => {
        const firstRow = items[0];
        await createMockAndNavigate(
            firstRow ? createMockedChatNameFromRow(firstRow) : 'Recorded chat',
            items.map(mapChatHistoryRowToMockedChatSourceMessage),
        );
    }, [createMockAndNavigate, items]);

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
        chatId,
        threads,
        threadsLoading,
        selectedThread,
        searchInput,
        sortBy,
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
        handleChatThreadChange,
        handlePageSizeChange,
        handleSortChange,
        handleViewModeChange,
        handleDeleteRow,
        handleClearAgentHistory,
        handleCreateMockFromRow,
        handleCreateMockFromChatView,
        isCreatingMock,
        goToPreviousPage,
        goToNextPage,
    };
}
