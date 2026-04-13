import type { ChatMessage, string_date_iso8601 } from '@promptbook-local/types';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { showAlert, showConfirm } from '../../../components/AsyncDialogs/asyncDialogs';
import {
    $clearAgentChatFeedback,
    $deleteChatFeedbackRow,
    $fetchChatFeedback,
    type ChatFeedbackListParams,
    type ChatFeedbackListResponse,
    type ChatFeedbackRow,
    type ChatFeedbackSortField,
    type ChatFeedbackSortOrder,
} from '../../../utils/chatFeedbackAdmin';

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
 * Props for useChatFeedbackState.
 */
type UseChatFeedbackStateProps = {
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
 * State contract shared by the private chat feedback modules.
 *
 * @private internal type of <ChatFeedbackClient/>
 */
export type UseChatFeedbackState = {
    items: ChatFeedbackRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    agentName: string;
    searchInput: string;
    sortOrder: ChatFeedbackSortOrder;
    selectedThread: ChatMessage[] | null;
    loading: boolean;
    error: string | null;
    agents: AdminAgentInfo[];
    agentsLoading: boolean;
    exportUrl: string;
    handleSearchInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
    handleSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
    handleAgentChange: (event: ChangeEvent<HTMLSelectElement>) => void;
    handlePageSizeChange: (event: ChangeEvent<HTMLSelectElement>) => void;
    handleSortChange: (field: ChatFeedbackSortField) => void;
    handleViewChat: (row: ChatFeedbackRow) => Promise<void>;
    handleDeleteRow: (row: ChatFeedbackRow) => Promise<void>;
    handleClearAgentFeedback: () => Promise<void>;
    isSortedBy: (field: ChatFeedbackSortField) => boolean;
    goToPreviousPage: () => void;
    goToNextPage: () => void;
    closeThreadDialog: () => void;
};

/**
 * Input message shape accepted by the stored feedback thread payload.
 */
type ChatThreadMessageInput = Omit<ChatMessage, 'createdAt'> & {
    createdAt?: string | Date;
    date?: string | Date;
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
 * Builds fetch params for the current chat feedback view state.
 */
function createChatFeedbackListParams(
    state: Pick<UseChatFeedbackState, 'page' | 'pageSize' | 'agentName'> & {
        search: string;
        sortBy: ChatFeedbackSortField;
        sortOrder: ChatFeedbackSortOrder;
    },
    overrides: Partial<ChatFeedbackListParams> = {},
): ChatFeedbackListParams {
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
function resolveChatFeedbackActionErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}

/**
 * Builds the CSV export URL for the active agent filter.
 */
function getChatFeedbackExportUrl(agentName: string): string {
    const params = new URLSearchParams();
    if (agentName) {
        params.set('agentName', agentName);
    }
    return `/api/chat-feedback/export?${params.toString()}`;
}

/**
 * Converts a stored feedback timestamp to a normalized ISO string.
 */
function normalizeChatThreadCreatedAt(value: string | Date | undefined): string_date_iso8601 | undefined {
    if (!value) {
        return undefined;
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return undefined;
    }

    return date.toISOString() as string_date_iso8601;
}

/**
 * Normalizes the persisted feedback thread into chat messages consumable by <Chat/>.
 */
function normalizeChatThread(chatThread: unknown): ChatMessage[] {
    if (!Array.isArray(chatThread)) {
        throw new Error('Chat thread must be an array.');
    }

    return chatThread.map((message) => {
        const { createdAt, date, ...chatMessage } = message as ChatThreadMessageInput;

        return {
            ...chatMessage,
            createdAt: normalizeChatThreadCreatedAt(createdAt ?? date),
        };
    });
}

/**
 * Requests confirmation before deleting one feedback row.
 */
async function confirmDeleteFeedbackRow(): Promise<boolean> {
    return showConfirm({
        title: 'Delete feedback',
        message: 'Are you sure you want to delete this feedback entry?',
        confirmLabel: 'Delete feedback',
        cancelLabel: 'Cancel',
    }).catch(() => false);
}

/**
 * Requests confirmation before clearing one agent's feedback.
 */
async function confirmClearAgentFeedback(agentName: string, formatText: (text: string) => string): Promise<boolean> {
    return showConfirm({
        title: 'Clear feedback',
        message: `${formatText('Are you sure you want to permanently delete all feedback for agent')} "${agentName}"?`,
        confirmLabel: 'Delete feedback',
        cancelLabel: 'Cancel',
    }).catch(() => false);
}

/**
 * Shows the alert used when no chat thread is available for a row.
 */
async function alertMissingChatThread(): Promise<void> {
    await showAlert({
        title: 'Missing chat thread',
        message: 'No chat thread available for this feedback.',
    }).catch(() => undefined);
}

/**
 * Shows the alert used when a stored chat thread cannot be parsed.
 */
async function alertChatThreadParseFailed(): Promise<void> {
    await showAlert({
        title: 'Parse failed',
        message: 'Failed to parse chat thread.',
    }).catch(() => undefined);
}

/**
 * Provides state and actions for the chat feedback admin page.
 *
 * @private function of <ChatFeedbackClient/>
 */
export function useChatFeedbackState({ initialAgentName, formatText }: UseChatFeedbackStateProps): UseChatFeedbackState {
    const [items, setItems] = useState<ChatFeedbackRow[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [agentName, setAgentName] = useState(initialAgentName ?? '');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<ChatFeedbackSortField>('createdAt');
    const [sortOrder, setSortOrder] = useState<ChatFeedbackSortOrder>('desc');
    const [selectedThread, setSelectedThread] = useState<ChatMessage[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [agents, setAgents] = useState<AdminAgentInfo[]>([]);
    const [agentsLoading, setAgentsLoading] = useState(false);

    const applyChatFeedbackResponse = useCallback((response: ChatFeedbackListResponse) => {
        setItems(response.items);
        setTotal(response.total);
    }, []);

    const loadChatFeedback = useCallback(
        (overrides: Partial<ChatFeedbackListParams> = {}) =>
            $fetchChatFeedback(
                createChatFeedbackListParams(
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

                const response = await loadChatFeedback();
                if (isCancelled) {
                    return;
                }

                applyChatFeedbackResponse(response);
            } catch (loadError) {
                if (isCancelled) {
                    return;
                }

                setError(resolveChatFeedbackActionErrorMessage(loadError, 'Failed to load chat feedback'));
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
    }, [applyChatFeedbackResponse, loadChatFeedback]);

    const totalPages = useMemo(() => {
        if (total <= 0 || pageSize <= 0) {
            return 1;
        }

        return Math.max(1, Math.ceil(total / pageSize));
    }, [total, pageSize]);

    const exportUrl = useMemo(() => getChatFeedbackExportUrl(agentName), [agentName]);

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
        (field: ChatFeedbackSortField) => {
            if (sortBy === field) {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                return;
            }

            setSortBy(field);
            setSortOrder(field === 'createdAt' ? 'desc' : 'asc');
        },
        [sortBy, sortOrder],
    );

    const handleViewChat = useCallback(async (row: ChatFeedbackRow) => {
        if (!row.chatThread) {
            await alertMissingChatThread();
            return;
        }

        try {
            setSelectedThread(normalizeChatThread(row.chatThread));
        } catch (parseError) {
            console.error('Failed to parse chat thread', parseError);
            await alertChatThreadParseFailed();
        }
    }, []);

    const handleDeleteRow = useCallback(
        async (row: ChatFeedbackRow) => {
            if (!row.id) {
                return;
            }

            const isConfirmed = await confirmDeleteFeedbackRow();
            if (!isConfirmed) {
                return;
            }

            try {
                await $deleteChatFeedbackRow(row.id);
                applyChatFeedbackResponse(await loadChatFeedback());
            } catch (actionError) {
                setError(resolveChatFeedbackActionErrorMessage(actionError, 'Failed to delete feedback entry'));
            }
        },
        [applyChatFeedbackResponse, loadChatFeedback],
    );

    const handleClearAgentFeedback = useCallback(async () => {
        if (!agentName) {
            return;
        }

        const isConfirmed = await confirmClearAgentFeedback(agentName, formatText);
        if (!isConfirmed) {
            return;
        }

        try {
            setLoading(true);
            setError(null);
            await $clearAgentChatFeedback(agentName);
            setPage(1);
            applyChatFeedbackResponse(await loadChatFeedback({ page: 1 }));
        } catch (actionError) {
            setError(resolveChatFeedbackActionErrorMessage(actionError, 'Failed to clear feedback'));
        } finally {
            setLoading(false);
        }
    }, [agentName, applyChatFeedbackResponse, formatText, loadChatFeedback]);

    const isSortedBy = useCallback((field: ChatFeedbackSortField) => sortBy === field, [sortBy]);

    const goToPreviousPage = useCallback(() => {
        setPage((previousPage) => Math.max(1, previousPage - 1));
    }, []);

    const goToNextPage = useCallback(() => {
        setPage((previousPage) => Math.min(totalPages, previousPage + 1));
    }, [totalPages]);

    const closeThreadDialog = useCallback(() => {
        setSelectedThread(null);
    }, []);

    return {
        items,
        total,
        page,
        pageSize,
        totalPages,
        agentName,
        searchInput,
        sortOrder,
        selectedThread,
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
        handleViewChat,
        handleDeleteRow,
        handleClearAgentFeedback,
        isSortedBy,
        goToPreviousPage,
        goToNextPage,
        closeThreadDialog,
    };
}
