import { EyeIcon, EyeOffIcon, MessageSquarePlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import { SolidArrowButton } from '../../../../../../../src/book-components/icons/SolidArrowButton';
import { ChatListLoadingSkeleton } from '../../../../components/Skeleton/ChatListLoadingSkeleton';
import { AgentChatSidebarActivityIndicator } from './AgentChatSidebarActivityIndicator';
import type { AgentChatSidebarActivityState, AgentChatSidebarItem } from './useAgentChatSidebarState';

/**
 * Props consumed by `AgentChatSidebarDefault`.
 *
 * @private function of AgentChatSidebar
 */
type AgentChatSidebarDefaultProps = {
    readonly sidebarId: string;
    readonly isLoadingChats: boolean;
    readonly formatText: (text: string) => string;
    readonly newChatHref: string;
    readonly isAdmin: boolean;
    readonly isShowingExternalChats: boolean;
    readonly isCollapsed: boolean;
    readonly isMobileSidebarOpen: boolean;
    readonly onToggleCollapse: () => void;
    readonly onCloseMobileSidebar: () => void;
    readonly sidebarItems: ReadonlyArray<AgentChatSidebarItem>;
    readonly emptyChatCount: number;
    readonly shouldRenderFilters: boolean;
    readonly isShowingEmptyChats: boolean;
    readonly onToggleEmptyChatVisibility: () => void;
    readonly onToggleExternalChatVisibility: () => void;
    readonly onChatSelect: (chatId: string) => void;
    readonly onNewChatLinkClick: () => void;
    readonly onChatDelete: (chatId: string) => void;
};

/**
 * Props consumed by `AgentChatSidebarDefaultCollapsedSection`.
 *
 * @private function of AgentChatSidebar
 */
type AgentChatSidebarDefaultCollapsedSectionProps = {
    readonly isLoadingChats: boolean;
    readonly formatText: (text: string) => string;
    readonly newChatHref: string;
    readonly sidebarItems: ReadonlyArray<AgentChatSidebarItem>;
    readonly emptyChatCount: number;
    readonly shouldRenderFilters: boolean;
    readonly isAdmin: boolean;
    readonly isShowingEmptyChats: boolean;
    readonly isShowingExternalChats: boolean;
    readonly onToggleEmptyChatVisibility: () => void;
    readonly onToggleExternalChatVisibility: () => void;
    readonly onChatSelect: (chatId: string) => void;
    readonly onNewChatLinkClick: () => void;
};

/**
 * Props consumed by `AgentChatSidebarDefaultExpandedSection`.
 *
 * @private function of AgentChatSidebar
 */
type AgentChatSidebarDefaultExpandedSectionProps = {
    readonly isLoadingChats: boolean;
    readonly formatText: (text: string) => string;
    readonly newChatHref: string;
    readonly sidebarItems: ReadonlyArray<AgentChatSidebarItem>;
    readonly emptyChatCount: number;
    readonly shouldRenderFilters: boolean;
    readonly isAdmin: boolean;
    readonly isShowingEmptyChats: boolean;
    readonly isShowingExternalChats: boolean;
    readonly onToggleEmptyChatVisibility: () => void;
    readonly onToggleExternalChatVisibility: () => void;
    readonly onChatSelect: (chatId: string) => void;
    readonly onNewChatLinkClick: () => void;
    readonly onChatDelete: (chatId: string) => void;
};

/**
 * Props consumed by `AgentChatSidebarDefaultCollapsedRow`.
 *
 * @private function of AgentChatSidebar
 */
type AgentChatSidebarDefaultCollapsedRowProps = {
    readonly item: AgentChatSidebarItem;
    readonly onChatSelect: (chatId: string) => void;
};

/**
 * Props consumed by `AgentChatSidebarDefaultExpandedRow`.
 *
 * @private function of AgentChatSidebar
 */
type AgentChatSidebarDefaultExpandedRowProps = {
    readonly item: AgentChatSidebarItem;
    readonly formatText: (text: string) => string;
    readonly onChatSelect: (chatId: string) => void;
    readonly onChatDelete: (chatId: string) => void;
};

/**
 * Props consumed by `AgentChatSidebarDefaultCollapsedFilters`.
 *
 * @private function of AgentChatSidebar
 */
type AgentChatSidebarDefaultCollapsedFiltersProps = {
    readonly emptyChatCount: number;
    readonly isAdmin: boolean;
    readonly isShowingEmptyChats: boolean;
    readonly isShowingExternalChats: boolean;
    readonly formatText: (text: string) => string;
    readonly onToggleEmptyChatVisibility: () => void;
    readonly onToggleExternalChatVisibility: () => void;
};

/**
 * Props consumed by `AgentChatSidebarDefaultExpandedFilters`.
 *
 * @private function of AgentChatSidebar
 */
type AgentChatSidebarDefaultExpandedFiltersProps = {
    readonly emptyChatCount: number;
    readonly isAdmin: boolean;
    readonly isShowingEmptyChats: boolean;
    readonly isShowingExternalChats: boolean;
    readonly formatText: (text: string) => string;
    readonly onToggleEmptyChatVisibility: () => void;
    readonly onToggleExternalChatVisibility: () => void;
};

/**
 * Resolves the muted timestamp color used by collapsed chat cards.
 *
 * @private function of AgentChatSidebar
 */
function resolveAgentChatSidebarCollapsedStatusClassName(
    activityKind: AgentChatSidebarActivityState['kind'],
    isActive: boolean,
): string {
    if (activityKind === 'scheduled') {
        return 'text-amber-700';
    }

    if (activityKind === 'running' || isActive) {
        return 'text-blue-700';
    }

    return 'text-slate-400';
}

/**
 * Resolves the timestamp color used by expanded chat rows.
 *
 * @private function of AgentChatSidebar
 */
function resolveAgentChatSidebarExpandedStatusClassName(activityKind: AgentChatSidebarActivityState['kind']): string {
    if (activityKind === 'scheduled') {
        return 'font-semibold text-amber-700';
    }

    if (activityKind === 'running') {
        return 'font-semibold text-blue-700';
    }

    return 'text-slate-400';
}

/**
 * Renders one chat card in the collapsed sidebar layout.
 *
 * @private function of AgentChatSidebar
 */
function AgentChatSidebarDefaultCollapsedRow({
    item,
    onChatSelect,
}: AgentChatSidebarDefaultCollapsedRowProps) {
    const statusClassName = resolveAgentChatSidebarCollapsedStatusClassName(
        item.content.activityIndicator.kind,
        item.isActive,
    );

    return (
        <button
            type="button"
            onClick={() => onChatSelect(item.id)}
            className={`group relative flex w-full min-w-0 flex-col items-center gap-1 rounded-2xl border px-1.5 py-2 transition focus-visible:outline focus-visible:outline-blue-400 focus-visible:outline-offset-2 ${
                item.isActive
                    ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-transparent bg-slate-100/80 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
            } ${item.isEmpty && !item.isActive ? 'opacity-40' : ''}`}
            aria-label={item.content.accessibilityLabel}
            title={item.content.accessibilityLabel}
        >
            <span className="absolute left-1.5 top-1.5 z-[5]">
                <AgentChatSidebarActivityIndicator indicator={item.content.activityIndicator} />
            </span>
            {item.content.sourceChipLabel && (
                <span className="absolute left-1.5 bottom-1.5 z-[5] inline-flex items-center rounded-full bg-slate-900/85 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em] text-white shadow-sm">
                    {item.content.sourceChipLabel}
                </span>
            )}
            <span
                className={`absolute right-0.5 top-0.5 z-[5] inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none shadow-sm ${
                    item.isActive ? 'bg-blue-500 text-white' : 'bg-slate-400 text-white'
                }`}
                aria-label={item.content.messagesCountLabel}
            >
                {item.content.messagesCount}
            </span>
            <div
                className={`aspect-square w-full overflow-hidden rounded-xl border px-1.5 py-1.5 text-left ${
                    item.isActive
                        ? 'border-blue-300 bg-white/90 text-blue-700'
                        : 'border-slate-200 bg-white/90 text-slate-600'
                }`}
            >
                <div className="max-w-full truncate text-[10px] font-semibold leading-none">{item.content.title}</div>
                <div className="mt-1 max-w-full truncate text-[9px] leading-tight text-slate-500">
                    {item.content.preview}
                </div>
            </div>
            <span className={`max-w-full truncate text-[10px] font-semibold leading-none ${statusClassName}`}>
                {item.content.activityIndicator.compactLabel || item.content.lastActivity}
            </span>
        </button>
    );
}

/**
 * Renders one chat row in the expanded sidebar layout.
 *
 * @private function of AgentChatSidebar
 */
function AgentChatSidebarDefaultExpandedRow({
    item,
    formatText,
    onChatSelect,
    onChatDelete,
}: AgentChatSidebarDefaultExpandedRowProps) {
    const statusClassName = resolveAgentChatSidebarExpandedStatusClassName(item.content.activityIndicator.kind);

    return (
        <div
            className={`group relative rounded-xl border ${
                item.isActive
                    ? 'border-blue-300 bg-blue-50 shadow-sm'
                    : 'border-transparent hover:border-slate-200 hover:bg-slate-100/80'
            } ${item.isEmpty && !item.isActive ? 'opacity-40' : ''}`}
        >
            <span className="absolute left-3 top-3.5 z-[5]">
                <AgentChatSidebarActivityIndicator indicator={item.content.activityIndicator} />
            </span>
            <button
                type="button"
                className="w-full px-3 py-3 pl-10 pr-10 text-left"
                onClick={() => onChatSelect(item.id)}
                aria-label={item.content.accessibilityLabel}
                title={item.content.accessibilityLabel}
            >
                <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{item.content.title}</div>
                    {item.content.sourceChipLabel && (
                        <span className="inline-flex flex-shrink-0 items-center rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                            {item.content.sourceChipLabel}
                        </span>
                    )}
                </div>
                <div className="mt-1 truncate text-xs text-slate-500">{item.content.preview}</div>
                <div className="mt-2 flex items-center justify-between gap-2">
                    <div className={`truncate text-[11px] ${statusClassName}`}>
                        {item.content.activityIndicator.compactLabel || item.content.lastActivity}
                    </div>
                </div>
            </button>
            {!item.isReadOnly && (
                <button
                    type="button"
                    className="absolute right-2 top-2 rounded-md p-1.5 text-slate-400 opacity-0 transition hover:bg-white/90 hover:text-red-600 group-hover:opacity-100 focus-visible:outline focus-visible:outline-blue-400 focus-visible:outline-offset-2"
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onChatDelete(item.id);
                    }}
                    title={formatText('Delete chat')}
                >
                    <Trash2Icon className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}

/**
 * Renders the filter controls used in the collapsed sidebar.
 *
 * @private function of AgentChatSidebar
 */
function AgentChatSidebarDefaultCollapsedFilters({
    emptyChatCount,
    isAdmin,
    isShowingEmptyChats,
    isShowingExternalChats,
    formatText,
    onToggleEmptyChatVisibility,
    onToggleExternalChatVisibility,
}: AgentChatSidebarDefaultCollapsedFiltersProps) {
    return (
        <div className="flex flex-col items-center gap-2">
            {emptyChatCount > 0 && (
                <button
                    type="button"
                    onClick={onToggleEmptyChatVisibility}
                    className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    title={
                        isShowingEmptyChats
                            ? formatText('Hide empty chats')
                            : `${formatText('Show')} ${emptyChatCount} ${formatText('empty')}`
                    }
                >
                    {isShowingEmptyChats ? <EyeOffIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
                </button>
            )}
            {isAdmin && (
                <button
                    type="button"
                    onClick={onToggleExternalChatVisibility}
                    className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[9px] font-bold uppercase tracking-[0.18em] transition ${
                        isShowingExternalChats
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                    }`}
                    title={
                        isShowingExternalChats ? formatText('Hide external chats') : formatText('Show external chats')
                    }
                >
                    EXT
                </button>
            )}
        </div>
    );
}

/**
 * Renders the filter controls used in the expanded sidebar.
 *
 * @private function of AgentChatSidebar
 */
function AgentChatSidebarDefaultExpandedFilters({
    emptyChatCount,
    isAdmin,
    isShowingEmptyChats,
    isShowingExternalChats,
    formatText,
    onToggleEmptyChatVisibility,
    onToggleExternalChatVisibility,
}: AgentChatSidebarDefaultExpandedFiltersProps) {
    return (
        <div className="px-2 pb-2">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-2">
                <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {formatText('Filters')}
                </div>
                <div className="flex flex-col gap-1">
                    {emptyChatCount > 0 && (
                        <button
                            type="button"
                            onClick={onToggleEmptyChatVisibility}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        >
                            {isShowingEmptyChats ? (
                                <>
                                    <EyeOffIcon className="h-3.5 w-3.5" />
                                    {formatText('Hide empty chats')}
                                </>
                            ) : (
                                <>
                                    <EyeIcon className="h-3.5 w-3.5" />
                                    {`${formatText('Show')} ${emptyChatCount} ${formatText('empty')}`}
                                </>
                            )}
                        </button>
                    )}
                    {isAdmin && (
                        <button
                            type="button"
                            onClick={onToggleExternalChatVisibility}
                            className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${
                                isShowingExternalChats
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                            }`}
                        >
                            {isShowingExternalChats
                                ? formatText('Hide external chats')
                                : formatText('Show external chats')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Renders the collapsed desktop sidebar content.
 *
 * @private function of AgentChatSidebar
 */
function AgentChatSidebarDefaultCollapsedSection({
    isLoadingChats,
    formatText,
    newChatHref,
    sidebarItems,
    emptyChatCount,
    shouldRenderFilters,
    isAdmin,
    isShowingEmptyChats,
    isShowingExternalChats,
    onToggleEmptyChatVisibility,
    onToggleExternalChatVisibility,
    onChatSelect,
    onNewChatLinkClick,
}: AgentChatSidebarDefaultCollapsedSectionProps) {
    const emptyStateText = formatText('No chats yet');

    return (
        <div className="flex min-h-0 flex-1 flex-col items-center gap-3 px-2 py-4">
            <a
                href={newChatHref}
                onClick={onNewChatLinkClick}
                className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                title={formatText('New chat')}
                aria-label={formatText('New chat')}
            >
                <MessageSquarePlusIcon className="h-5 w-5" />
            </a>

            {isLoadingChats ? (
                <ChatListLoadingSkeleton isCollapsed rowCount={6} />
            ) : (
                <div className="flex min-h-0 w-full flex-1 flex-col gap-2 overflow-y-auto scrollbar-hidden">
                    {sidebarItems.length === 0 ? (
                        <p className="px-1 text-center text-[11px] text-slate-500">{emptyStateText}</p>
                    ) : (
                        sidebarItems.map((item) => (
                            <AgentChatSidebarDefaultCollapsedRow
                                key={item.id}
                                item={item}
                                onChatSelect={onChatSelect}
                            />
                        ))
                    )}
                </div>
            )}

            {shouldRenderFilters && !isLoadingChats && (
                <AgentChatSidebarDefaultCollapsedFilters
                    emptyChatCount={emptyChatCount}
                    isAdmin={isAdmin}
                    isShowingEmptyChats={isShowingEmptyChats}
                    isShowingExternalChats={isShowingExternalChats}
                    formatText={formatText}
                    onToggleEmptyChatVisibility={onToggleEmptyChatVisibility}
                    onToggleExternalChatVisibility={onToggleExternalChatVisibility}
                />
            )}

            <p className="text-[11px] text-slate-400">{formatText('Chats')}</p>
        </div>
    );
}

/**
 * Renders the expanded sidebar content.
 *
 * @private function of AgentChatSidebar
 */
function AgentChatSidebarDefaultExpandedSection({
    isLoadingChats,
    formatText,
    newChatHref,
    sidebarItems,
    emptyChatCount,
    shouldRenderFilters,
    isAdmin,
    isShowingEmptyChats,
    isShowingExternalChats,
    onToggleEmptyChatVisibility,
    onToggleExternalChatVisibility,
    onChatSelect,
    onNewChatLinkClick,
    onChatDelete,
}: AgentChatSidebarDefaultExpandedSectionProps) {
    const emptyStateText = formatText('No chats yet');

    return (
        <>
            <div className="border-b border-slate-200 p-3">
                <a
                    href={newChatHref}
                    onClick={onNewChatLinkClick}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                    <MessageSquarePlusIcon className="h-4 w-4" />
                    {formatText('New chat')}
                </a>
            </div>

            {isLoadingChats ? (
                <ChatListLoadingSkeleton rowCount={7} />
            ) : (
                <div className="flex-1 space-y-2 overflow-y-auto p-2 scrollbar-hidden">
                    {sidebarItems.length === 0 ? (
                        <p className="px-2 text-xs text-slate-500">{emptyStateText}</p>
                    ) : (
                        sidebarItems.map((item) => (
                            <AgentChatSidebarDefaultExpandedRow
                                key={item.id}
                                item={item}
                                formatText={formatText}
                                onChatSelect={onChatSelect}
                                onChatDelete={onChatDelete}
                            />
                        ))
                    )}
                </div>
            )}

            {shouldRenderFilters && !isLoadingChats && (
                <AgentChatSidebarDefaultExpandedFilters
                    emptyChatCount={emptyChatCount}
                    isAdmin={isAdmin}
                    isShowingEmptyChats={isShowingEmptyChats}
                    isShowingExternalChats={isShowingExternalChats}
                    formatText={formatText}
                    onToggleEmptyChatVisibility={onToggleEmptyChatVisibility}
                    onToggleExternalChatVisibility={onToggleExternalChatVisibility}
                />
            )}
        </>
    );
}

/**
 * Renders the default chat sidebar variant, including collapsed and expanded desktop states.
 *
 * @private function of AgentChatSidebar
 */
export function AgentChatSidebarDefault({
    sidebarId,
    isLoadingChats,
    formatText,
    newChatHref,
    isAdmin,
    isShowingExternalChats,
    isCollapsed,
    isMobileSidebarOpen,
    onToggleCollapse,
    onCloseMobileSidebar,
    sidebarItems,
    emptyChatCount,
    shouldRenderFilters,
    isShowingEmptyChats,
    onToggleEmptyChatVisibility,
    onToggleExternalChatVisibility,
    onChatSelect,
    onNewChatLinkClick,
    onChatDelete,
}: AgentChatSidebarDefaultProps) {
    const shouldRenderCollapsed = isCollapsed && !isMobileSidebarOpen;
    const widthClasses = isCollapsed ? 'w-72 md:w-20' : 'w-72 md:w-72';
    const transformClasses = isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full';
    const panelTransitionClasses = 'transition-all duration-300 ease-in-out will-change-transform';
    const overlayTransitionClasses = 'transition-opacity duration-300 ease-in-out';
    const mobileOverlayState = isMobileSidebarOpen
        ? 'opacity-100 pointer-events-auto'
        : 'opacity-0 pointer-events-none';
    const sidebarToggleLabel = isCollapsed ? formatText('Expand sidebar') : formatText('Collapse sidebar');

    return (
        <>
            <aside
                id={sidebarId}
                className={`fixed inset-y-0 left-0 z-[60] flex flex-col border-r border-slate-200 bg-white/95 shadow-xl backdrop-blur md:static md:bg-white/90 md:shadow-none ${panelTransitionClasses} ${widthClasses} ${transformClasses} md:translate-x-0`}
            >
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            className="p-1 text-slate-500 hover:text-slate-900 focus-visible:outline focus-visible:outline-blue-400 focus-visible:outline-offset-2 md:hidden"
                            onClick={onCloseMobileSidebar}
                            aria-label={formatText('Close chats sidebar')}
                        >
                            <XIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden translate-x-1/2 items-center justify-center md:flex">
                    <SolidArrowButton
                        direction={isCollapsed ? 'right' : 'left'}
                        onClick={onToggleCollapse}
                        className="pointer-events-auto"
                        aria-controls={sidebarId}
                        aria-expanded={!isCollapsed}
                        aria-label={sidebarToggleLabel}
                    />
                </div>

                {shouldRenderCollapsed ? (
                    <AgentChatSidebarDefaultCollapsedSection
                        isLoadingChats={isLoadingChats}
                        formatText={formatText}
                        newChatHref={newChatHref}
                        sidebarItems={sidebarItems}
                        emptyChatCount={emptyChatCount}
                        shouldRenderFilters={shouldRenderFilters}
                        isAdmin={isAdmin}
                        isShowingEmptyChats={isShowingEmptyChats}
                        isShowingExternalChats={isShowingExternalChats}
                        onToggleEmptyChatVisibility={onToggleEmptyChatVisibility}
                        onToggleExternalChatVisibility={onToggleExternalChatVisibility}
                        onChatSelect={onChatSelect}
                        onNewChatLinkClick={onNewChatLinkClick}
                    />
                ) : (
                    <AgentChatSidebarDefaultExpandedSection
                        isLoadingChats={isLoadingChats}
                        formatText={formatText}
                        newChatHref={newChatHref}
                        sidebarItems={sidebarItems}
                        emptyChatCount={emptyChatCount}
                        shouldRenderFilters={shouldRenderFilters}
                        isAdmin={isAdmin}
                        isShowingEmptyChats={isShowingEmptyChats}
                        isShowingExternalChats={isShowingExternalChats}
                        onToggleEmptyChatVisibility={onToggleEmptyChatVisibility}
                        onToggleExternalChatVisibility={onToggleExternalChatVisibility}
                        onChatSelect={onChatSelect}
                        onNewChatLinkClick={onNewChatLinkClick}
                        onChatDelete={onChatDelete}
                    />
                )}
            </aside>

            <div
                className={`fixed inset-0 z-50 bg-slate-900/40 md:hidden ${overlayTransitionClasses} ${mobileOverlayState}`}
                onClick={onCloseMobileSidebar}
                aria-hidden="true"
            />
        </>
    );
}
