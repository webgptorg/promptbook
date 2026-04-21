'use client';

import {
    MOCKED_CHAT_TIMING_PRESET_MULTIPLIERS,
    type MockedChatPreset,
    type MockedChatTimingPreset,
} from '@/src/utils/mockedChatsSchema';
import { MockedChat } from '@promptbook-local/components';
import type { ChatMessage, ChatParticipant, string_date_iso8601 } from '@promptbook-local/types';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

/**
 * Properties for the mocked-chat recording viewer.
 */
type MockedChatsViewerClientProps = {
    mockedChats: Array<MockedChatPreset>;
    initialMockedChatId: string | null;
};

/**
 * Recording-oriented mocked-chat viewer with minimal left list.
 */
export function MockedChatsViewerClient(props: MockedChatsViewerClientProps) {
    const { mockedChats, initialMockedChatId } = props;

    const selectedMockedChat = useMemo(() => {
        if (mockedChats.length === 0) {
            return null;
        }

        if (!initialMockedChatId) {
            return mockedChats[0] || null;
        }

        return mockedChats.find((chat) => chat.id === initialMockedChatId) || mockedChats[0] || null;
    }, [initialMockedChatId, mockedChats]);

    const [replayNonce, setReplayNonce] = useState(0);

    useEffect(() => {
        setReplayNonce(0);
    }, [selectedMockedChat?.id]);

    const timingMultiplier = useMemo(() => {
        if (!selectedMockedChat) {
            return 1;
        }

        return MOCKED_CHAT_TIMING_PRESET_MULTIPLIERS[selectedMockedChat.settings.timingPreset];
    }, [selectedMockedChat]);

    const replayOffsetsMs = useMemo(() => {
        if (!selectedMockedChat) {
            return [];
        }

        return selectedMockedChat.messages.map((message) =>
            Math.max(0, Math.round(message.offsetMs * timingMultiplier)),
        );
    }, [selectedMockedChat, timingMultiplier]);

    const participants = useMemo<ReadonlyArray<ChatParticipant>>(() => {
        if (!selectedMockedChat) {
            return [];
        }

        return selectedMockedChat.participants.map((participant) => ({
            name: participant.id,
            fullname: participant.name,
            isMe: participant.isMe,
            avatarSrc: participant.typingAvatarUrl || participant.avatarUrl || undefined,
            color: participant.bubbleColor,
        }));
    }, [selectedMockedChat]);

    const scriptedMessages = useMemo<ReadonlyArray<ChatMessage>>(() => {
        if (!selectedMockedChat) {
            return [];
        }

        const baseTimestamp = Date.now();

        return selectedMockedChat.messages.map((message, index) => {
            const createdAt = selectedMockedChat.settings.showTimestamps
                ? (new Date(baseTimestamp + replayOffsetsMs[index]!).toISOString() as string_date_iso8601)
                : undefined;

            return {
                id: message.id,
                sender: message.senderId,
                content: message.content,
                isComplete: true,
                createdAt,
            };
        });
    }, [replayOffsetsMs, selectedMockedChat]);

    if (!selectedMockedChat) {
        return (
            <div className="flex min-h-[calc(var(--agents-server-app-height)-var(--agents-server-header-height))] flex-col items-center justify-center gap-4 px-4 text-center text-slate-600">
                <h1 className="text-2xl font-semibold text-slate-900">No mocked chats available</h1>
                <p className="max-w-xl text-sm">
                    Create your first mocked chat preset in the editor, then open this viewer in a new window for
                    recording.
                </p>
                <Link
                    href="/system/utilities/mocked-chats"
                    className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                    Open mocked chats editor
                </Link>
            </div>
        );
    }

    return (
        <div className="flex min-h-[calc(var(--agents-server-app-height)-var(--agents-server-header-height))] w-full min-w-0 overflow-hidden bg-slate-100">
            <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white p-4 md:flex md:flex-col">
                <div className="flex-1 overflow-y-auto">
                    <ul className="space-y-2">
                        {mockedChats.map((chat) => {
                            const isSelected = chat.id === selectedMockedChat.id;
                            return (
                                <li key={chat.id}>
                                    <Link
                                        href={buildViewerHref(chat.id)}
                                        className={`block rounded-lg border px-3 py-2 text-sm transition ${
                                            isSelected
                                                ? 'border-blue-300 bg-blue-50 text-blue-900'
                                                : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        <p className="truncate font-semibold">{chat.name}</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {chat.messages.length} messages
                                        </p>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </aside>

            <section className="flex min-w-0 flex-1 flex-col overflow-hidden p-4">
                <MockedChat
                    key={`${selectedMockedChat.id}:${replayNonce}`}
                    title={selectedMockedChat.name}
                    layout="STANDALONE"
                    messages={scriptedMessages}
                    participants={participants}
                    isResettable={!selectedMockedChat.settings.loopPlayback}
                    isCopyButtonEnabled={false}
                    isSpeechPlaybackEnabled={false}
                    isPausable={false}
                    isSaveButtonEnabled={false}
                    appendMessagesLocallyOnSend={true}
                    messageOffsetsMs={replayOffsetsMs}
                    delayConfig={resolveDelayConfigByTimingPreset(selectedMockedChat.settings.timingPreset)}
                    onSimulationComplete={
                        selectedMockedChat.settings.loopPlayback
                            ? () => {
                                  setReplayNonce((nonce) => nonce + 1);
                              }
                            : undefined
                    }
                />
            </section>
        </div>
    );
}

/**
 * Builds one link URL for selecting mocked chats in the viewer.
 */
function buildViewerHref(mockedChatId: string): string {
    const params = new URLSearchParams();
    params.set('chat', mockedChatId);
    return `/system/utilities/mocked-chats/view?${params.toString()}`;
}

/**
 * Resolves deterministic delay configuration from a timing preset.
 */
function resolveDelayConfigByTimingPreset(timingPreset: MockedChatTimingPreset) {
    if (timingPreset === 'FAST') {
        return {
            waitAfterWord: 20,
            extraWordDelay: 0,
            beforeFirstMessage: 0,
            thinkingBetweenMessages: 0,
            longPauseChance: 0,
        };
    }

    if (timingPreset === 'SLOW') {
        return {
            waitAfterWord: 90,
            extraWordDelay: 20,
            beforeFirstMessage: 0,
            thinkingBetweenMessages: 0,
            longPauseChance: 0,
        };
    }

    return {
        waitAfterWord: 45,
        extraWordDelay: 10,
        beforeFirstMessage: 0,
        thinkingBetweenMessages: 0,
        longPauseChance: 0,
    };
}
