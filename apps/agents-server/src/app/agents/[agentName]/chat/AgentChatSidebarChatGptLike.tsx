import { EyeIcon, EyeOffIcon, MessageSquarePlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import { ChatListLoadingSkeleton } from '../../../../components/Skeleton/ChatListLoadingSkeleton';
import { AgentChatSidebarActivityIndicator } from './AgentChatSidebarActivityIndicator';
import type { AgentChatSidebarActivityState, AgentChatSidebarItem } from './useAgentChatSidebarState';

/**
 * Props consumed by `AgentChatSidebarChatGptLike`.
 *
 * @private function of AgentChatSidebar
 */
type AgentChatSidebarChatGptLikeProps = {
    readonly sidebarId: string;
    readonly isLoadingChats: boolean;
    readonly formatText: (text: string) => string;
    readonly newChatHref: string;
    readonly isAdmin: boolean;
    readonly isShowingExternalChats: boolean;
    readonly isMobileSidebarOpen: boolean;
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
 * Props consumed by `AgentChatSidebarChatGptLikeChatRow`.
 *
 * @private function of AgentChatSidebar
 */
type AgentChatSidebarChatGptLikeChatRowProps = {
    readonly item: AgentChatSidebarItem;
    readonly formatText: (text: string) => string;
    readonly onChatSelect: (chatId: string) => void;
    readonly onChatDelete: (chatId: string) => void;
};

/**
 * Props consumed by `AgentChatSidebarChatGptLikeFilters`.
 *
 * @private function of AgentChatSidebar
 */
type AgentChatSidebarChatGptLikeFiltersProps = {
    readonly emptyChatCount: number;
    readonly isShowingEmptyChats: boolean;
    readonly isAdmin: boolean;
    readonly isShowingExternalChats: boolean;
    readonly formatText: (text: string) => string;
    readonly onToggleEmptyChatVisibility: () => void;
    readonly onToggleExternalChatVisibility: () => void;
};

/**
 * Resolves the footer color used by a ChatGPT-like chat row.
 *
 * @private function of AgentChatSidebar
 */
function resolveAgentChatSidebarChatGptLikeStatusClassName(
    activityKind: AgentChatSidebarActivityState['kind'],
): string {
    if (activityKind === 'running') {
        return 'text-emerald-400/90';
    }

    if (activityKind === 'scheduled') {
        return 'text-amber-400/90';
    }

    return 'text-current/55';
}

/**
 * Renders one chat row in the ChatGPT-like sidebar layout.
 *
 * @private function of AgentChatSidebar
 */
function AgentChatSidebarChatGptLikeChatRow({
    item,
    formatText,
    onChatSelect,
    onChatDelete,
}: AgentChatSidebarChatGptLikeChatRowProps) {
    const rowStatusClassName = resolveAgentChatSidebarChatGptLikeStatusClassName(item.content.activityIndicator.kind);

    return (
        <div
            className={`agent-chat-chatgpt-like-chat-row group relative rounded-xl ${
                item.isActive ? 'is-active' : ''
            } ${item.isEmpty && !item.isActive ? 'opacity-55' : ''}`}
        >
            <button
                type="button"
                className="agent-chat-chatgpt-like-chat-row__button w-full rounded-xl px-2.5 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                onClick={() => onChatSelect(item.id)}
                aria-label={item.content.accessibilityLabel}
                title={item.content.accessibilityLabel}
            >
                <div className="flex items-start gap-2.5">
                    <div className="pt-0.5">
                        <AgentChatSidebarActivityIndicator indicator={item.content.activityIndicator} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <div className="min-w-0 flex-1 truncate text-[13px] font-medium">{item.content.title}</div>
                            {item.content.sourceChipLabel && (
                                <span className="agent-chat-chatgpt-like-chat-row__chip inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
                                    {item.content.sourceChipLabel}
                                </span>
                            )}
                        </div>
                        <div className="mt-1 truncate text-[11px] text-current/65">{item.content.preview}</div>
                        <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px]">
                            <span className={`truncate font-medium ${rowStatusClassName}`}>
                                {item.content.activityIndicator.compactLabel || item.content.lastActivity}
                            </span>
                            <span className="text-current/52">{item.content.messagesCountLabel}</span>
                        </div>
                    </div>
                </div>
            </button>

            {!item.isReadOnly && (
                <button
                    type="button"
                    className="agent-chat-chatgpt-like-chat-row__delete absolute right-1.5 top-1.5 rounded-md p-1.5 opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onChatDelete(item.id);
                    }}
                    title={formatText('Delete chat')}
                >
                    <Trash2Icon className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
}

/**
 * Renders the footer filter controls for the ChatGPT-like layout.
 *
 * @private function of AgentChatSidebar
 */
function AgentChatSidebarChatGptLikeFilters({
    emptyChatCount,
    isShowingEmptyChats,
    isAdmin,
    isShowingExternalChats,
    formatText,
    onToggleEmptyChatVisibility,
    onToggleExternalChatVisibility,
}: AgentChatSidebarChatGptLikeFiltersProps) {
    return (
        <div className="agent-chat-chatgpt-like-sidebar__footer px-3 py-3">
            <div className="flex flex-wrap gap-2">
                {emptyChatCount > 0 && (
                    <button
                        type="button"
                        onClick={onToggleEmptyChatVisibility}
                        className="agent-chat-chatgpt-like-filter-button inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition"
                    >
                        {isShowingEmptyChats ? (
                            <>
                                <EyeOffIcon className="h-3.5 w-3.5" />
                                {formatText('Hide empty')}
                            </>
                        ) : (
                            <>
                                <EyeIcon className="h-3.5 w-3.5" />
                                {`${formatText('Show')} ${emptyChatCount}`}
                            </>
                        )}
                    </button>
                )}
                {isAdmin && (
                    <button
                        type="button"
                        onClick={onToggleExternalChatVisibility}
                        className={`agent-chat-chatgpt-like-filter-button inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                            isShowingExternalChats ? 'is-active' : ''
                        }`}
                    >
                        {isShowingExternalChats ? formatText('External chats on') : formatText('External chats off')}
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * Renders the ChatGPT-like chat sidebar variant.
 *
 * @private function of AgentChatSidebar
 */
export function AgentChatSidebarChatGptLike({
    sidebarId,
    isLoadingChats,
    formatText,
    newChatHref,
    isAdmin,
    isShowingExternalChats,
    isMobileSidebarOpen,
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
}: AgentChatSidebarChatGptLikeProps) {
    const emptyStateText = formatText('No chats yet');

    return (
        <>
            <aside
                id={sidebarId}
                className={`agent-chat-chatgpt-like-sidebar fixed inset-y-0 left-0 z-[60] flex w-[17.25rem] max-w-[84vw] flex-col transition-transform duration-300 ease-in-out md:static md:max-w-none md:translate-x-0 ${
                    isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="agent-chat-chatgpt-like-sidebar__header flex items-center justify-between px-3.5 py-3">
                    <div className="min-w-0">
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-current/55">
                            {formatText('Current agent')}
                        </p>
                        <h2 className="truncate text-sm font-semibold text-current">{formatText('Chats')}</h2>
                    </div>
                    <button
                        type="button"
                        className="agent-chat-chatgpt-like-sidebar__close rounded-lg p-1.5 transition md:hidden"
                        onClick={onCloseMobileSidebar}
                        aria-label={formatText('Close chats sidebar')}
                    >
                        <XIcon className="h-4 w-4" />
                    </button>
                </div>

                <div className="px-3 pb-3 pt-1.5">
                    <a
                        href={newChatHref}
                        onClick={onNewChatLinkClick}
                        className="agent-chat-chatgpt-like-new-chat inline-flex w-full items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition"
                    >
                        <MessageSquarePlusIcon className="h-4 w-4" />
                        {formatText('New chat')}
                    </a>
                </div>

                {isLoadingChats ? (
                    <ChatListLoadingSkeleton rowCount={8} />
                ) : (
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-3 scrollbar-hidden">
                        {sidebarItems.length === 0 ? (
                            <p className="px-3 py-2 text-sm text-current/65">{emptyStateText}</p>
                        ) : (
                            sidebarItems.map((item) => (
                                <AgentChatSidebarChatGptLikeChatRow
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
                    <AgentChatSidebarChatGptLikeFilters
                        emptyChatCount={emptyChatCount}
                        isShowingEmptyChats={isShowingEmptyChats}
                        isAdmin={isAdmin}
                        isShowingExternalChats={isShowingExternalChats}
                        formatText={formatText}
                        onToggleEmptyChatVisibility={onToggleEmptyChatVisibility}
                        onToggleExternalChatVisibility={onToggleExternalChatVisibility}
                    />
                )}
            </aside>

            <div
                className={`fixed inset-0 z-50 bg-black/45 backdrop-blur-[1.5px] transition-opacity duration-300 ${
                    isMobileSidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                } md:hidden`}
                onClick={onCloseMobileSidebar}
                aria-hidden="true"
            />
        </>
    );
}
