'use client';

import { useAgentNaming } from '../../../components/AgentNaming/AgentNamingContext';
import { ChatFeedbackFiltersCard } from './ChatFeedbackFiltersCard';
import { ChatFeedbackTable } from './ChatFeedbackTable';
import { ChatFeedbackThreadDialog } from './ChatFeedbackThreadDialog';
import { useChatFeedbackState } from './useChatFeedbackState';

/**
 * Props for chat feedback client.
 */
type ChatFeedbackClientProps = {
    /**
     * Optional initial agent filter, taken from the URL query.
     */
    initialAgentName?: string;
};

/**
 * Handles chat feedback client.
 */
export function ChatFeedbackClient({ initialAgentName }: ChatFeedbackClientProps) {
    const { formatText } = useAgentNaming();
    const chatFeedbackState = useChatFeedbackState({ initialAgentName, formatText });

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            <div className="mt-20 mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl text-gray-900 font-light">Chat feedback</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {formatText('Review and triage user feedback collected from your agents.')}
                    </p>
                </div>
                <div className="flex items-end gap-4 text-sm text-gray-500 md:text-right">
                    <div>
                        <a
                            href={chatFeedbackState.exportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Download CSV
                        </a>
                    </div>
                    <div>
                        <div className="text-xl font-semibold text-gray-900">
                            {chatFeedbackState.total.toLocaleString()}
                        </div>
                        <div className="text-xs uppercase tracking-wide text-gray-400">Total feedback entries</div>
                    </div>
                </div>
            </div>

            <ChatFeedbackFiltersCard
                formatText={formatText}
                searchInput={chatFeedbackState.searchInput}
                handleSearchInputChange={chatFeedbackState.handleSearchInputChange}
                handleSearchSubmit={chatFeedbackState.handleSearchSubmit}
                agentName={chatFeedbackState.agentName}
                agents={chatFeedbackState.agents}
                agentsLoading={chatFeedbackState.agentsLoading}
                handleAgentChange={chatFeedbackState.handleAgentChange}
                pageSize={chatFeedbackState.pageSize}
                handlePageSizeChange={chatFeedbackState.handlePageSizeChange}
                handleClearAgentFeedback={chatFeedbackState.handleClearAgentFeedback}
            />

            <ChatFeedbackTable
                formatText={formatText}
                items={chatFeedbackState.items}
                total={chatFeedbackState.total}
                loading={chatFeedbackState.loading}
                error={chatFeedbackState.error}
                page={chatFeedbackState.page}
                pageSize={chatFeedbackState.pageSize}
                totalPages={chatFeedbackState.totalPages}
                sortOrder={chatFeedbackState.sortOrder}
                handleSortChange={chatFeedbackState.handleSortChange}
                isSortedBy={chatFeedbackState.isSortedBy}
                handleViewChat={chatFeedbackState.handleViewChat}
                handleDeleteRow={chatFeedbackState.handleDeleteRow}
                goToPreviousPage={chatFeedbackState.goToPreviousPage}
                goToNextPage={chatFeedbackState.goToNextPage}
            />

            <ChatFeedbackThreadDialog
                selectedThread={chatFeedbackState.selectedThread}
                onClose={chatFeedbackState.closeThreadDialog}
            />
        </div>
    );
}
