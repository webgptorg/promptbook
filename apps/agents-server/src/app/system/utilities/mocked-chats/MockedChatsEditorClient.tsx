'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MockedChatPreset } from '@/src/utils/mockedChatsSchema';
import { MockedChatsEditorForm } from './MockedChatsEditorForm';
import { MockedChatsEditorSidebar } from './MockedChatsEditorSidebar';
import { useMockedChatsEditorState } from './useMockedChatsEditorState';

/**
 * Properties for mocked-chat editor client.
 */
type MockedChatsEditorClientProps = {
    initialMockedChats: Array<MockedChatPreset>;
};

/**
 * Mocked chat editor under `System -> Utilities`.
 */
export function MockedChatsEditorClient({ initialMockedChats }: MockedChatsEditorClientProps) {
    const mockedChatsEditorState = useMockedChatsEditorState({ initialMockedChats });
    const viewerHref = useMemo(
        () => buildMockedChatViewerHref(mockedChatsEditorState.draftChat.id),
        [mockedChatsEditorState.draftChat.id],
    );
    const [publicViewerUrl, setPublicViewerUrl] = useState<string | null>(null);

    useEffect(() => {
        setPublicViewerUrl(buildMockedChatViewerAbsoluteUrl(viewerHref));
    }, [viewerHref]);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mx-auto max-w-[1440px] space-y-6">
                <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.4em] text-gray-400">System Utilities</p>
                    <h1 className="text-3xl font-semibold text-gray-900">Mocked Chats</h1>
                    <p className="max-w-4xl text-sm text-gray-600">
                        Create deterministic mocked-chat presets for recordings and demos. Save and open any preset in a
                        dedicated recording window.
                    </p>
                </div>

                <MockedChatsEditorFeedbackBanner
                    statusMessage={mockedChatsEditorState.statusMessage}
                    errorMessage={mockedChatsEditorState.errorMessage}
                />

                <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
                    <MockedChatsEditorSidebar
                        savedChats={mockedChatsEditorState.savedChats}
                        selectedChatId={mockedChatsEditorState.selectedChatId}
                        createNewDraft={mockedChatsEditorState.createNewDraft}
                        selectSavedChat={mockedChatsEditorState.selectSavedChat}
                        buildViewerHref={buildMockedChatViewerHref}
                    />

                    <MockedChatsEditorForm
                        draftChat={mockedChatsEditorState.draftChat}
                        isSaving={mockedChatsEditorState.isSaving}
                        isDraftPersisted={mockedChatsEditorState.isDraftPersisted}
                        isDraftDirty={mockedChatsEditorState.isDraftDirty}
                        duplicateDraft={mockedChatsEditorState.duplicateDraft}
                        deleteChat={mockedChatsEditorState.deleteChat}
                        saveDraftAsNew={mockedChatsEditorState.saveDraftAsNew}
                        saveDraft={mockedChatsEditorState.saveDraft}
                        updateDraftName={mockedChatsEditorState.updateDraftName}
                        updateDraftBackgroundColor={mockedChatsEditorState.updateDraftBackgroundColor}
                        updateDraftBackgroundImageUrl={mockedChatsEditorState.updateDraftBackgroundImageUrl}
                        addParticipant={mockedChatsEditorState.addParticipant}
                        updateParticipant={mockedChatsEditorState.updateParticipant}
                        removeParticipant={mockedChatsEditorState.removeParticipant}
                        addMessage={mockedChatsEditorState.addMessage}
                        updateMessage={mockedChatsEditorState.updateMessage}
                        removeMessage={mockedChatsEditorState.removeMessage}
                        updateTimingPreset={mockedChatsEditorState.updateTimingPreset}
                        updateViewportPreset={mockedChatsEditorState.updateViewportPreset}
                        updateShowTimestamps={mockedChatsEditorState.updateShowTimestamps}
                        updateLoopPlayback={mockedChatsEditorState.updateLoopPlayback}
                        viewerHref={viewerHref}
                        publicViewerUrl={publicViewerUrl}
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * Renders the transient success or error banner above the editor.
 */
function MockedChatsEditorFeedbackBanner({
    statusMessage,
    errorMessage,
}: {
    statusMessage: string | null;
    errorMessage: string | null;
}) {
    if (!statusMessage && !errorMessage) {
        return null;
    }

    return (
        <div
            className={`rounded-xl border px-4 py-3 text-sm ${
                errorMessage
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
        >
            {errorMessage || statusMessage}
        </div>
    );
}

/**
 * Builds the viewer route URL for one mocked-chat id.
 */
function buildMockedChatViewerHref(mockedChatId: string): string {
    const params = new URLSearchParams();
    params.set('chat', mockedChatId);
    return `/system/utilities/mocked-chats/view?${params.toString()}`;
}

/**
 * Builds one absolute mocked-chat viewer URL in browser context.
 */
function buildMockedChatViewerAbsoluteUrl(viewerHref: string): string | null {
    if (typeof window === 'undefined') {
        return null;
    }

    return new URL(viewerHref, window.location.origin).toString();
}
