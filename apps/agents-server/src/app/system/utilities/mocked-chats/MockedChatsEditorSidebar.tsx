import Link from 'next/link';
import type { UseMockedChatsEditorState } from './useMockedChatsEditorState';

/**
 * Props for `MockedChatsEditorSidebar`.
 */
type MockedChatsEditorSidebarProps = Pick<
    UseMockedChatsEditorState,
    'savedChats' | 'selectedChatId' | 'createNewDraft' | 'selectSavedChat'
> & {
    buildViewerHref: (mockedChatId: string) => string;
};

/**
 * Formats one mocked chat timestamp for sidebar display.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function formatMockedChatUpdatedAt(updatedAt: string): string {
    const date = new Date(updatedAt);
    if (Number.isNaN(date.getTime())) {
        return 'just now';
    }

    return date.toLocaleString();
}

/**
 * Renders the saved mocked-chat list and draft creation action.
 *
 * @private function of <MockedChatsEditorClient/>
 */
export function MockedChatsEditorSidebar({
    savedChats,
    selectedChatId,
    createNewDraft,
    selectSavedChat,
    buildViewerHref,
}: MockedChatsEditorSidebarProps) {
    return (
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">My Mocked Chats</h2>
                <button
                    type="button"
                    onClick={createNewDraft}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
                >
                    New
                </button>
            </div>

            {savedChats.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                    No saved mocked chats yet. Start by editing the draft and click Save.
                </p>
            ) : (
                <ul className="space-y-2">
                    {savedChats.map((chat) => {
                        const isSelected = chat.id === selectedChatId;

                        return (
                            <li key={chat.id}>
                                <button
                                    type="button"
                                    onClick={() => selectSavedChat(chat.id)}
                                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                                        isSelected
                                            ? 'border-blue-300 bg-blue-50'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-900">{chat.name}</p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Updated {formatMockedChatUpdatedAt(chat.updatedAt)}
                                            </p>
                                        </div>
                                        <Link
                                            href={buildViewerHref(chat.id)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-slate-400"
                                            onClick={(event) => event.stopPropagation()}
                                        >
                                            Open
                                        </Link>
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </aside>
    );
}
