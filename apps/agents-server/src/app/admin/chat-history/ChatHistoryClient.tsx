'use client';

import { MockedChat } from '@promptbook-local/components';
import { useAgentNaming } from '../../../components/AgentNaming/AgentNamingContext';
import { useServerLanguage } from '../../../components/ServerLanguage/ServerLanguageProvider';
import { ChatHistoryFiltersCard } from './ChatHistoryFiltersCard';
import { ChatHistoryPagination } from './ChatHistoryPagination';
import { ChatHistoryTable } from './ChatHistoryTable';
import { useChatHistoryState } from './useChatHistoryState';

/**
 * Props for chat history client.
 */
type ChatHistoryClientProps = {
    /**
     * Optional initial agent filter, taken from the URL query.
     */
    initialAgentName?: string;
};

/**
 * Handles chat history client.
 */
export function ChatHistoryClient({ initialAgentName }: ChatHistoryClientProps) {
    const { formatText } = useAgentNaming();
    const { language } = useServerLanguage();
    const chatHistoryState = useChatHistoryState({ initialAgentName, formatText });

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            <div className="mt-20 mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl text-gray-900 font-light">Chat history</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {formatText('Inspect and manage all recorded chat messages across your agents.')}
                    </p>
                </div>
                <div className="flex items-end gap-4 text-sm text-gray-500 md:text-right">
                    <div className="flex rounded-md shadow-sm" role="group">
                        <button
                            type="button"
                            onClick={() => chatHistoryState.handleViewModeChange('table')}
                            className={`px-4 py-2 text-sm font-medium border border-gray-300 rounded-l-lg ${
                                chatHistoryState.viewMode === 'table'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            Table
                        </button>
                        <button
                            type="button"
                            onClick={() => chatHistoryState.handleViewModeChange('chat')}
                            className={`px-4 py-2 text-sm font-medium border border-gray-300 rounded-r-lg border-l-0 ${
                                chatHistoryState.viewMode === 'chat'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            Chat
                        </button>
                    </div>
                    <div>
                        <a
                            href={chatHistoryState.exportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Download CSV
                        </a>
                    </div>
                    <div>
                        <div className="text-xl font-semibold text-gray-900">
                            {chatHistoryState.total.toLocaleString()}
                        </div>
                        <div className="text-xs uppercase tracking-wide text-gray-400">Total messages</div>
                    </div>
                </div>
            </div>

            <ChatHistoryFiltersCard
                formatText={formatText}
                searchInput={chatHistoryState.searchInput}
                handleSearchInputChange={chatHistoryState.handleSearchInputChange}
                handleSearchSubmit={chatHistoryState.handleSearchSubmit}
                agentName={chatHistoryState.agentName}
                agents={chatHistoryState.agents}
                agentsLoading={chatHistoryState.agentsLoading}
                handleAgentChange={chatHistoryState.handleAgentChange}
                pageSize={chatHistoryState.pageSize}
                handlePageSizeChange={chatHistoryState.handlePageSizeChange}
                handleClearAgentHistory={chatHistoryState.handleClearAgentHistory}
            />

            {chatHistoryState.viewMode === 'chat' ? (
                <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden flex flex-col">
                    <div className="flex justify-end border-b border-gray-200 bg-gray-50 p-3">
                        <button
                            type="button"
                            onClick={() => void chatHistoryState.handleCreateMockFromChatView()}
                            disabled={chatHistoryState.isCreatingMock}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Create a mocked chat preset from the shown messages"
                        >
                            {chatHistoryState.isCreatingMock ? 'Creating mock…' : 'Create mock'}
                        </button>
                    </div>
                    <div className="h-[800px] relative">
                        <MockedChat
                            messages={chatHistoryState.chatMessages}
                            isPausable={true}
                            isResettable={false}
                            isSaveButtonEnabled={true}
                            layout="STANDALONE"
                        />
                    </div>
                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                        <ChatHistoryPagination
                            total={chatHistoryState.total}
                            page={chatHistoryState.page}
                            pageSize={chatHistoryState.pageSize}
                            totalPages={chatHistoryState.totalPages}
                            goToPreviousPage={chatHistoryState.goToPreviousPage}
                            goToNextPage={chatHistoryState.goToNextPage}
                        />
                    </div>
                </div>
            ) : (
                <ChatHistoryTable
                    formatText={formatText}
                    language={language}
                    items={chatHistoryState.items}
                    total={chatHistoryState.total}
                    loading={chatHistoryState.loading}
                    error={chatHistoryState.error}
                    page={chatHistoryState.page}
                    pageSize={chatHistoryState.pageSize}
                    totalPages={chatHistoryState.totalPages}
                    sortBy={chatHistoryState.sortBy}
                    sortOrder={chatHistoryState.sortOrder}
                    handleSortChange={chatHistoryState.handleSortChange}
                    handleDeleteRow={chatHistoryState.handleDeleteRow}
                    handleCreateMockFromRow={chatHistoryState.handleCreateMockFromRow}
                    isCreatingMock={chatHistoryState.isCreatingMock}
                    goToPreviousPage={chatHistoryState.goToPreviousPage}
                    goToNextPage={chatHistoryState.goToNextPage}
                />
            )}
        </div>
    );
}
