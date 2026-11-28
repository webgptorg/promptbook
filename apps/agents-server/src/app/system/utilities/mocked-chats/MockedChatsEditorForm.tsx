import Link from 'next/link';
import { AlertTriangleIcon, QrCodeIcon } from 'lucide-react';
import { PromptbookQrCode } from '@promptbook-local/components';
import {
    MOCKED_CHAT_VIEWPORT_PRESETS,
    type MockedChatParticipant,
    type MockedChatScriptedMessage,
} from '@/src/utils/mockedChatsSchema';
import type { UseMockedChatsEditorState } from './useMockedChatsEditorState';

/**
 * Warning displayed in the editor explaining public visibility.
 */
const MOCKED_CHATS_PUBLIC_WARNING_MESSAGE =
    'Mocked chats are publicly viewable by URL. Never include private or sensitive information in mocked-chat data.';

/**
 * Props for `MockedChatsEditorForm`.
 */
type MockedChatsEditorFormProps = Pick<
    UseMockedChatsEditorState,
    | 'draftChat'
    | 'isSaving'
    | 'isDraftPersisted'
    | 'isDraftDirty'
    | 'duplicateDraft'
    | 'deleteChat'
    | 'saveDraftAsNew'
    | 'saveDraft'
    | 'updateDraftName'
    | 'updateDraftBackgroundColor'
    | 'updateDraftBackgroundImageUrl'
    | 'addParticipant'
    | 'updateParticipant'
    | 'removeParticipant'
    | 'addMessage'
    | 'updateMessage'
    | 'removeMessage'
    | 'updateTimingPreset'
    | 'updateViewportPreset'
    | 'updateShowTimestamps'
    | 'updateLoopPlayback'
> & {
    viewerHref: string;
    publicViewerUrl: string | null;
};

/**
 * Resolves the editor status text shown next to the title.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function resolveDraftStatusDescription(isDraftPersisted: boolean, isDraftDirty: boolean): string {
    if (!isDraftPersisted) {
        return 'Editing an unsaved draft.';
    }

    return isDraftDirty ? 'Unsaved changes in this preset.' : 'All changes saved.';
}

/**
 * Props for the draft action bar.
 */
type MockedChatsEditorActionsProps = Pick<
    MockedChatsEditorFormProps,
    'draftChat' | 'isSaving' | 'isDraftPersisted' | 'duplicateDraft' | 'deleteChat' | 'saveDraftAsNew' | 'saveDraft'
> & {
    viewerHref: string;
};

/**
 * Renders the top action bar for the editor card.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function MockedChatsEditorActions({
    draftChat,
    isSaving,
    isDraftPersisted,
    duplicateDraft,
    deleteChat,
    saveDraftAsNew,
    saveDraft,
    viewerHref,
}: MockedChatsEditorActionsProps) {
    return (
        <div className="flex flex-wrap gap-2">
            <button
                type="button"
                onClick={duplicateDraft}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
                Duplicate
            </button>
            {isDraftPersisted && (
                <button
                    type="button"
                    onClick={() => void deleteChat(draftChat.id)}
                    className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:border-red-400"
                >
                    Delete
                </button>
            )}
            <Link
                href={viewerHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                    isDraftPersisted
                        ? 'border-blue-300 text-blue-700 hover:border-blue-400'
                        : 'pointer-events-none border-slate-200 text-slate-400'
                }`}
            >
                Open in new window
            </Link>
            <button
                type="button"
                onClick={() => void saveDraftAsNew()}
                disabled={isSaving}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-60"
            >
                Save as New
            </button>
            <button
                type="button"
                onClick={() => void saveDraft()}
                disabled={isSaving}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
                {isSaving ? 'Saving...' : 'Save'}
            </button>
        </div>
    );
}

/**
 * Props for the share and visibility cards.
 */
type MockedChatsEditorSharePanelProps = Pick<MockedChatsEditorFormProps, 'isDraftPersisted'> & {
    viewerHref: string;
    publicViewerUrl: string | null;
};

/**
 * Renders the public visibility warning and QR-share card.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function MockedChatsEditorSharePanel({
    isDraftPersisted,
    viewerHref,
    publicViewerUrl,
}: MockedChatsEditorSharePanelProps) {
    return (
        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex items-start gap-3 text-amber-900">
                    <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    <div className="space-y-2">
                        <p className="text-sm font-semibold">Public visibility warning</p>
                        <p className="text-sm">{MOCKED_CHATS_PUBLIC_WARNING_MESSAGE}</p>
                        <p className="text-xs text-amber-800">
                            <span className="font-semibold">Public URL:</span>{' '}
                            <span className="break-all">
                                {publicViewerUrl ||
                                    (isDraftPersisted
                                        ? 'Loading public URL...'
                                        : 'Save the mocked chat to generate a public URL.')}
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <QrCodeIcon className="h-4 w-4" aria-hidden="true" />
                    Share via QR
                </div>
                {isDraftPersisted && publicViewerUrl ? (
                    <div className="space-y-3">
                        <PromptbookQrCode value={publicViewerUrl} size={180} className="flex justify-center" />
                        <Link
                            href={viewerHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-center text-xs font-semibold text-blue-700 hover:text-blue-800"
                        >
                            Open public view
                        </Link>
                    </div>
                ) : (
                    <p className="text-center text-xs text-slate-500">
                        Save this mocked chat first to generate its public QR code.
                    </p>
                )}
            </div>
        </div>
    );
}

/**
 * Props for the general settings section.
 */
type MockedChatsEditorGeneralSectionProps = Pick<
    MockedChatsEditorFormProps,
    'draftChat' | 'updateDraftName' | 'updateDraftBackgroundColor' | 'updateDraftBackgroundImageUrl'
>;

/**
 * Renders the general metadata fields for the draft.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function MockedChatsEditorGeneralSection({
    draftChat,
    updateDraftName,
    updateDraftBackgroundColor,
    updateDraftBackgroundImageUrl,
}: MockedChatsEditorGeneralSectionProps) {
    return (
        <section className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">General</h3>
            <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm text-slate-700">
                    <span className="font-semibold">Preset name</span>
                    <input
                        type="text"
                        value={draftChat.name}
                        onChange={(event) => updateDraftName(event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </label>
                <label className="space-y-1 text-sm text-slate-700">
                    <span className="font-semibold">Background color</span>
                    <input
                        type="text"
                        value={draftChat.settings.backgroundColor || ''}
                        onChange={(event) => updateDraftBackgroundColor(event.target.value || null)}
                        placeholder="#f8fafc"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </label>
            </div>
            <label className="space-y-1 text-sm text-slate-700">
                <span className="font-semibold">Background image URL (optional)</span>
                <input
                    type="url"
                    value={draftChat.settings.backgroundImageUrl || ''}
                    onChange={(event) => updateDraftBackgroundImageUrl(event.target.value || null)}
                    placeholder="https://example.com/background.png"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </label>
        </section>
    );
}

/**
 * Props for one participant editor card.
 */
type MockedChatsEditorParticipantCardProps = {
    participant: MockedChatParticipant;
    participantsCount: number;
    updateParticipant: MockedChatsEditorFormProps['updateParticipant'];
    removeParticipant: MockedChatsEditorFormProps['removeParticipant'];
};

/**
 * Renders one participant editor card.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function MockedChatsEditorParticipantCard({
    participant,
    participantsCount,
    updateParticipant,
    removeParticipant,
}: MockedChatsEditorParticipantCardProps) {
    return (
        <article className="rounded-xl border border-slate-200 p-3">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-1 text-xs text-slate-600">
                    <span className="font-semibold uppercase tracking-wide">Name</span>
                    <input
                        type="text"
                        value={participant.name}
                        onChange={(event) => updateParticipant(participant.id, 'name', event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </label>
                <label className="space-y-1 text-xs text-slate-600">
                    <span className="font-semibold uppercase tracking-wide">Bubble color</span>
                    <input
                        type="text"
                        value={participant.bubbleColor}
                        onChange={(event) => updateParticipant(participant.id, 'bubbleColor', event.target.value)}
                        placeholder="#2563eb"
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </label>
                <label className="space-y-1 text-xs text-slate-600">
                    <span className="font-semibold uppercase tracking-wide">Avatar URL</span>
                    <input
                        type="url"
                        value={participant.avatarUrl || ''}
                        onChange={(event) => updateParticipant(participant.id, 'avatarUrl', event.target.value || null)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </label>
                <label className="space-y-1 text-xs text-slate-600">
                    <span className="font-semibold uppercase tracking-wide">Typing avatar URL</span>
                    <input
                        type="url"
                        value={participant.typingAvatarUrl || ''}
                        onChange={(event) =>
                            updateParticipant(participant.id, 'typingAvatarUrl', event.target.value || null)
                        }
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </label>
            </div>
            <div className="mt-3 flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                    <input
                        type="checkbox"
                        checked={participant.isMe}
                        onChange={(event) => updateParticipant(participant.id, 'isMe', event.target.checked)}
                    />
                    Messages from this participant appear as me
                </label>
                <button
                    type="button"
                    onClick={() => removeParticipant(participant.id)}
                    disabled={participantsCount <= 1}
                    className="rounded-lg border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:border-red-400 disabled:opacity-60"
                >
                    Remove
                </button>
            </div>
        </article>
    );
}

/**
 * Props for the participants section.
 */
type MockedChatsEditorParticipantsSectionProps = Pick<
    MockedChatsEditorFormProps,
    'draftChat' | 'addParticipant' | 'updateParticipant' | 'removeParticipant'
>;

/**
 * Renders the participant management section.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function MockedChatsEditorParticipantsSection({
    draftChat,
    addParticipant,
    updateParticipant,
    removeParticipant,
}: MockedChatsEditorParticipantsSectionProps) {
    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Participants</h3>
                <button
                    type="button"
                    onClick={addParticipant}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
                >
                    Add participant
                </button>
            </div>

            <div className="space-y-3">
                {draftChat.participants.map((participant) => (
                    <MockedChatsEditorParticipantCard
                        key={participant.id}
                        participant={participant}
                        participantsCount={draftChat.participants.length}
                        updateParticipant={updateParticipant}
                        removeParticipant={removeParticipant}
                    />
                ))}
            </div>
        </section>
    );
}

/**
 * Props for one scripted message editor card.
 */
type MockedChatsEditorMessageCardProps = {
    message: MockedChatScriptedMessage;
    index: number;
    participants: Array<MockedChatParticipant>;
    messagesCount: number;
    updateMessage: MockedChatsEditorFormProps['updateMessage'];
    removeMessage: MockedChatsEditorFormProps['removeMessage'];
};

/**
 * Renders one scripted message editor card.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function MockedChatsEditorMessageCard({
    message,
    index,
    participants,
    messagesCount,
    updateMessage,
    removeMessage,
}: MockedChatsEditorMessageCardProps) {
    return (
        <article className="rounded-xl border border-slate-200 p-3">
            <div className="grid gap-3 md:grid-cols-[180px_160px_minmax(0,1fr)]">
                <label className="space-y-1 text-xs text-slate-600">
                    <span className="font-semibold uppercase tracking-wide">Sender</span>
                    <select
                        value={message.senderId}
                        onChange={(event) => updateMessage(message.id, 'senderId', event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {participants.map((participant) => (
                            <option key={participant.id} value={participant.id}>
                                {participant.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="space-y-1 text-xs text-slate-600">
                    <span className="font-semibold uppercase tracking-wide">Offset (ms)</span>
                    <input
                        type="number"
                        value={message.offsetMs}
                        min={0}
                        step={100}
                        onChange={(event) =>
                            updateMessage(message.id, 'offsetMs', Math.max(0, Number(event.target.value) || 0))
                        }
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </label>
                <label className="space-y-1 text-xs text-slate-600">
                    <span className="font-semibold uppercase tracking-wide">Content</span>
                    <textarea
                        value={message.content}
                        onChange={(event) => updateMessage(message.id, 'content', event.target.value)}
                        className="min-h-[88px] w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </label>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Message #{index + 1}</span>
                <button
                    type="button"
                    onClick={() => removeMessage(message.id)}
                    disabled={messagesCount <= 1}
                    className="rounded-lg border border-red-300 px-2 py-1 font-semibold text-red-700 hover:border-red-400 disabled:opacity-60"
                >
                    Remove
                </button>
            </div>
        </article>
    );
}

/**
 * Props for the messages section.
 */
type MockedChatsEditorMessagesSectionProps = Pick<
    MockedChatsEditorFormProps,
    'draftChat' | 'addMessage' | 'updateMessage' | 'removeMessage'
>;

/**
 * Renders the scripted messages section.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function MockedChatsEditorMessagesSection({
    draftChat,
    addMessage,
    updateMessage,
    removeMessage,
}: MockedChatsEditorMessagesSectionProps) {
    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Messages</h3>
                <button
                    type="button"
                    onClick={addMessage}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
                >
                    Add message
                </button>
            </div>

            <div className="space-y-3">
                {draftChat.messages.map((message, index) => (
                    <MockedChatsEditorMessageCard
                        key={message.id}
                        message={message}
                        index={index}
                        participants={draftChat.participants}
                        messagesCount={draftChat.messages.length}
                        updateMessage={updateMessage}
                        removeMessage={removeMessage}
                    />
                ))}
            </div>
        </section>
    );
}

/**
 * Props for the playback metadata section.
 */
type MockedChatsEditorPlaybackSectionProps = Pick<
    MockedChatsEditorFormProps,
    'draftChat' | 'updateTimingPreset' | 'updateViewportPreset' | 'updateShowTimestamps' | 'updateLoopPlayback'
>;

/**
 * Renders the playback metadata controls.
 *
 * @private function of <MockedChatsEditorClient/>
 */
function MockedChatsEditorPlaybackSection({
    draftChat,
    updateTimingPreset,
    updateViewportPreset,
    updateShowTimestamps,
    updateLoopPlayback,
}: MockedChatsEditorPlaybackSectionProps) {
    return (
        <section className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Playback Metadata</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-1 text-sm text-slate-700">
                    <span className="font-semibold">Timing preset</span>
                    <select
                        value={draftChat.settings.timingPreset}
                        onChange={(event) => updateTimingPreset(event.target.value as typeof draftChat.settings.timingPreset)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="FAST">Fast</option>
                        <option value="NORMAL">Normal</option>
                        <option value="SLOW">Slow</option>
                    </select>
                </label>
                <label className="space-y-1 text-sm text-slate-700">
                    <span className="font-semibold">Viewport preset</span>
                    <select
                        value={draftChat.settings.viewportPreset}
                        onChange={(event) =>
                            updateViewportPreset(event.target.value as typeof draftChat.settings.viewportPreset)
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {Object.entries(MOCKED_CHAT_VIEWPORT_PRESETS).map(([presetKey, presetMetadata]) => (
                            <option key={presetKey} value={presetKey}>
                                {presetMetadata.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input
                        type="checkbox"
                        checked={draftChat.settings.showTimestamps}
                        onChange={(event) => updateShowTimestamps(event.target.checked)}
                    />
                    Show timestamps
                </label>
                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input
                        type="checkbox"
                        checked={draftChat.settings.loopPlayback}
                        onChange={(event) => updateLoopPlayback(event.target.checked)}
                    />
                    Loop playback
                </label>
            </div>
        </section>
    );
}

/**
 * Renders the main mocked-chat editor form.
 *
 * @private function of <MockedChatsEditorClient/>
 */
export function MockedChatsEditorForm(props: MockedChatsEditorFormProps) {
    const {
        draftChat,
        isSaving,
        isDraftPersisted,
        isDraftDirty,
        duplicateDraft,
        deleteChat,
        saveDraftAsNew,
        saveDraft,
        updateDraftName,
        updateDraftBackgroundColor,
        updateDraftBackgroundImageUrl,
        addParticipant,
        updateParticipant,
        removeParticipant,
        addMessage,
        updateMessage,
        removeMessage,
        updateTimingPreset,
        updateViewportPreset,
        updateShowTimestamps,
        updateLoopPlayback,
        viewerHref,
        publicViewerUrl,
    } = props;

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-slate-900">Editor</h2>
                    <p className="text-sm text-slate-600">
                        {resolveDraftStatusDescription(isDraftPersisted, isDraftDirty)}
                    </p>
                </div>
                <MockedChatsEditorActions
                    draftChat={draftChat}
                    isSaving={isSaving}
                    isDraftPersisted={isDraftPersisted}
                    duplicateDraft={duplicateDraft}
                    deleteChat={deleteChat}
                    saveDraftAsNew={saveDraftAsNew}
                    saveDraft={saveDraft}
                    viewerHref={viewerHref}
                />
            </div>

            <MockedChatsEditorSharePanel
                isDraftPersisted={isDraftPersisted}
                viewerHref={viewerHref}
                publicViewerUrl={publicViewerUrl}
            />

            <div className="mt-6 space-y-8">
                <MockedChatsEditorGeneralSection
                    draftChat={draftChat}
                    updateDraftName={updateDraftName}
                    updateDraftBackgroundColor={updateDraftBackgroundColor}
                    updateDraftBackgroundImageUrl={updateDraftBackgroundImageUrl}
                />

                <MockedChatsEditorParticipantsSection
                    draftChat={draftChat}
                    addParticipant={addParticipant}
                    updateParticipant={updateParticipant}
                    removeParticipant={removeParticipant}
                />

                <MockedChatsEditorMessagesSection
                    draftChat={draftChat}
                    addMessage={addMessage}
                    updateMessage={updateMessage}
                    removeMessage={removeMessage}
                />

                <MockedChatsEditorPlaybackSection
                    draftChat={draftChat}
                    updateTimingPreset={updateTimingPreset}
                    updateViewportPreset={updateViewportPreset}
                    updateShowTimestamps={updateShowTimestamps}
                    updateLoopPlayback={updateLoopPlayback}
                />
            </div>
        </section>
    );
}
