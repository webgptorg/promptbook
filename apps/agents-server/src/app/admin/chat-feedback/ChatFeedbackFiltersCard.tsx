import { Card } from '../../../components/Homepage/Card';
import type { UseChatFeedbackState } from './useChatFeedbackState';

/**
 * Props for ChatFeedbackFiltersCard.
 */
type ChatFeedbackFiltersCardProps = Pick<
    UseChatFeedbackState,
    | 'searchInput'
    | 'handleSearchInputChange'
    | 'handleSearchSubmit'
    | 'agentName'
    | 'agents'
    | 'agentsLoading'
    | 'handleAgentChange'
    | 'pageSize'
    | 'handlePageSizeChange'
    | 'handleClearAgentFeedback'
> & {
    /**
     * Active text formatter for agent naming.
     */
    formatText: (text: string) => string;
};

/**
 * Renders the filter controls for chat feedback.
 *
 * @private function of <ChatFeedbackClient/>
 */
export function ChatFeedbackFiltersCard({
    formatText,
    searchInput,
    handleSearchInputChange,
    handleSearchSubmit,
    agentName,
    agents,
    agentsLoading,
    handleAgentChange,
    pageSize,
    handlePageSizeChange,
    handleClearAgentFeedback,
}: ChatFeedbackFiltersCardProps) {
    return (
        <Card>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 md:flex-row md:items-end">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="search" className="text-sm font-medium text-gray-700">
                            Search
                        </label>
                        <input
                            id="search"
                            type="text"
                            value={searchInput}
                            onChange={handleSearchInputChange}
                            placeholder={formatText('Search by agent, URL, IP, rating or note')}
                            className="w-full md:w-72 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        type="submit"
                        className="mt-2 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 md:mt-0 md:ml-3"
                    >
                        Apply
                    </button>
                </form>

                <div className="flex flex-col gap-2 md:flex-row md:items-end md:gap-4">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="agentFilter" className="text-sm font-medium text-gray-700">
                            {formatText('Agent filter')}
                        </label>
                        <select
                            id="agentFilter"
                            value={agentName}
                            onChange={handleAgentChange}
                            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">{formatText('All agents')}</option>
                            {agents.map((agent) => (
                                <option key={agent.agentName} value={agent.agentName}>
                                    {agent.fullname || agent.agentName}
                                </option>
                            ))}
                        </select>
                        {agentsLoading && <span className="text-xs text-gray-400">{formatText('Loading agents…')}</span>}
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="pageSize" className="text-sm font-medium text-gray-700">
                            Page size
                        </label>
                        <select
                            id="pageSize"
                            value={pageSize}
                            onChange={handlePageSizeChange}
                            className="w-28 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>
            </div>

            {agentName && (
                <div className="mt-4 flex items-center justify-between gap-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm text-amber-800">
                        {formatText('Showing feedback for agent')}{' '}
                        <span className="font-semibold break-all">{agentName}</span>.
                    </p>
                    <button
                        type="button"
                        onClick={handleClearAgentFeedback}
                        className="inline-flex items-center justify-center rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                        {formatText('Clear feedback for this agent')}
                    </button>
                </div>
            )}
        </Card>
    );
}
