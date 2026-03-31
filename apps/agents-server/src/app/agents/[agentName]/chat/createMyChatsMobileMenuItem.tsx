import { Loader2Icon, LockIcon, MessageSquareIcon, MessageSquarePlusIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { SubMenuItem } from '../../../../components/Header/SubMenuItem';
import type { UserChatSummary } from '../../../../utils/userChatClient';
import { resolveUserChatMenuItemContent } from './resolveUserChatMenuItemContent';

/**
 * Configuration for the hoisted mobile `My chats` drawer entry.
 */
export type CreateMyChatsMobileMenuItemOptions = {
    /**
     * Localized text formatter.
     */
    readonly formatText: (text: string) => string;
    /**
     * Current list of available chats for the active agent.
     */
    readonly chats: ReadonlyArray<UserChatSummary>;
    /**
     * Currently selected chat when rendered on the full chat page.
     */
    readonly activeChatId?: string | null;
    /**
     * Whether chat history is currently loading.
     */
    readonly isLoading?: boolean;
    /**
     * Whether durable history is enabled for the current route.
     */
    readonly isHistoryEnabled: boolean;
    /**
     * Whether private mode is active, suppressing durable history.
     */
    readonly isPrivateModeEnabled: boolean;
    /**
     * Timestamp formatter shared with the caller.
     */
    readonly formatChatTimestamp: (timestamp: string) => string;
    /**
     * Current timestamp used for live timeout countdowns.
     */
    readonly currentTimestamp: number;
    /**
     * Invoked when one stored chat should open.
     */
    readonly onOpenChat: (chatId: string) => void;
    /**
     * Optional action for creating a fresh chat.
     */
    readonly onCreateChat?: () => void;
};

/**
 * Builds a compact secondary line shown inside informational menu rows.
 *
 * @param title - Primary explanatory label.
 * @param description - Secondary explanatory copy.
 * @param icon - Optional leading visual.
 * @returns Renderable menu row content.
 */
function createInfoMenuRow(title: string, description: string, icon?: ReactNode): ReactNode {
    return (
        <div className="flex items-start gap-3 py-0.5">
            {icon ? <span className="mt-0.5 text-slate-400">{icon}</span> : null}
            <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800">{title}</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div>
            </div>
        </div>
    );
}

/**
 * Creates the `My chats` mobile drawer entry shared by the profile and chat pages.
 *
 * @param options - Route-specific chat menu configuration.
 * @returns Nested mobile menu item describing recent chats.
 */
export function createMyChatsMobileMenuItem(options: CreateMyChatsMobileMenuItemOptions): SubMenuItem {
    const {
        formatText,
        chats,
        activeChatId = null,
        isLoading = false,
        isHistoryEnabled,
        isPrivateModeEnabled,
        formatChatTimestamp,
        currentTimestamp,
        onOpenChat,
        onCreateChat,
    } = options;

    const items: Array<SubMenuItem> = [];

    if (onCreateChat) {
        items.push({
            label: formatText('New chat'),
            icon: MessageSquarePlusIcon,
            onClick: onCreateChat,
            isBold: true,
            isBordered: true,
        });
    }

    if (!isHistoryEnabled) {
        items.push({
            label: createInfoMenuRow(
                formatText('Chat history unavailable'),
                formatText('This agent does not keep durable chat history on this route.'),
                <MessageSquareIcon className="h-4 w-4" />,
            ),
        });
    } else if (isPrivateModeEnabled) {
        items.push({
            label: createInfoMenuRow(
                formatText('Private mode is on'),
                formatText('Chats stay local until private mode is turned off.'),
                <LockIcon className="h-4 w-4" />,
            ),
        });
    } else if (isLoading) {
        items.push({
            label: (
                <span className="flex items-center gap-3 py-1 text-sm text-slate-500">
                    <Loader2Icon className="h-4 w-4 animate-spin text-slate-400" />
                    <span>{formatText('Loading chats...')}</span>
                </span>
            ),
        });
    } else if (chats.length === 0) {
        items.push({
            label: createInfoMenuRow(
                formatText('No chats yet'),
                formatText('Start a conversation and it will appear here for quick access.'),
            ),
        });
    } else {
        items.push(
            ...chats.map((chat) => {
                const content = resolveUserChatMenuItemContent(chat, formatText, formatChatTimestamp, currentTimestamp);
                const activityLabel = content.activityIndicator.compactLabel || content.lastActivity;

                return {
                    label: (
                        <div className="min-w-0 py-0.5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="truncate text-sm font-semibold text-slate-900">
                                            {content.title}
                                        </span>
                                        {content.sourceChipLabel && (
                                            <span className="inline-flex flex-shrink-0 items-center rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white">
                                                {content.sourceChipLabel}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                        {content.preview}
                                    </div>
                                </div>
                                <span
                                    className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                                        content.activityIndicator.kind === 'running'
                                            ? 'bg-emerald-500'
                                            : content.activityIndicator.kind === 'scheduled'
                                              ? 'bg-amber-500'
                                              : 'bg-slate-300'
                                    }`}
                                    aria-hidden="true"
                                />
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-3 text-[11px]">
                                <span
                                    className={`truncate ${
                                        content.activityIndicator.kind === 'running'
                                            ? 'font-semibold text-emerald-700'
                                            : content.activityIndicator.kind === 'scheduled'
                                              ? 'font-semibold text-amber-700'
                                              : 'text-slate-400'
                                    }`}
                                >
                                    {activityLabel}
                                </span>
                                <span className="flex-shrink-0 text-slate-400">{content.messagesCountLabel}</span>
                            </div>
                        </div>
                    ),
                    onClick: () => onOpenChat(chat.id),
                    isActive: chat.id === activeChatId,
                } satisfies SubMenuItem;
            }),
        );
    }

    return {
        label: (
            <span className="flex min-w-0 items-center justify-between gap-3">
                <span className="truncate">{formatText('My chats')}</span>
                {isHistoryEnabled && !isPrivateModeEnabled && chats.length > 0 ? (
                    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {chats.length}
                    </span>
                ) : null}
            </span>
        ),
        icon: MessageSquareIcon,
        items,
    };
}
