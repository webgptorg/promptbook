'use client';

import Link from 'next/link';
import { AlertTriangleIcon, QrCodeIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PromptbookQrCode } from '@promptbook-local/components';
import { showConfirm } from '@/src/components/AsyncDialogs/asyncDialogs';
import {
    MOCKED_CHAT_VIEWPORT_PRESETS,
    createDefaultMockedChatPreset,
    createMockedChatId,
    createMockedChatMessageId,
    createMockedChatParticipantId,
    type MockedChatParticipant,
    type MockedChatPreset,
    type MockedChatScriptedMessage,
    type MockedChatTimingPreset,
    type MockedChatViewportPreset,
} from '@/src/utils/mockedChatsSchema';

/**
 * API endpoint used by the mocked-chat editor.
 */
const MOCKED_CHATS_API_ENDPOINT = '/api/system/mocked-chats';

/**
 * Fallback offset distance when adding new scripted messages.
 */
const DEFAULT_NEW_MESSAGE_OFFSET_STEP_MS = 1_200;

/**
 * Warning displayed in the editor explaining public visibility.
 */
const MOCKED_CHATS_PUBLIC_WARNING_MESSAGE =
    'Mocked chats are publicly viewable by URL. Never include private or sensitive information in mocked-chat data.';

/**
 * Properties for mocked-chat editor client.
 */
type MockedChatsEditorClientProps = {
    initialMockedChats: Array<MockedChatPreset>;
};

/**
 * API payload returned by mocked-chat routes.
 */
type MockedChatsApiPayload = {
    mockedChats: Array<MockedChatPreset>;
};

/**
 * Mocked chat editor under `System -> Utilities`.
 */
export function MockedChatsEditorClient(props: MockedChatsEditorClientProps) {
    const { initialMockedChats } = props;
    const initialSelectedChat = initialMockedChats[0] || null;

    const [savedChats, setSavedChats] = useState<Array<MockedChatPreset>>(initialMockedChats);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(initialSelectedChat?.id || null);
    const [draftChat, setDraftChat] = useState<MockedChatPreset>(
        initialSelectedChat ? cloneMockedChatPreset(initialSelectedChat) : createDefaultMockedChatPreset(),
    );
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const selectedSavedChat = useMemo(
        () => savedChats.find((chat) => chat.id === selectedChatId) || null,
        [savedChats, selectedChatId],
    );
    const isDraftPersisted = useMemo(() => savedChats.some((chat) => chat.id === draftChat.id), [savedChats, draftChat.id]);
    const isDraftDirty = useMemo(() => {
        if (!selectedSavedChat) {
            return true;
        }

        return JSON.stringify(selectedSavedChat) !== JSON.stringify(draftChat);
    }, [draftChat, selectedSavedChat]);

    const viewerHref = useMemo(() => buildMockedChatViewerHref(draftChat.id), [draftChat.id]);
    const [publicViewerUrl, setPublicViewerUrl] = useState<string | null>(null);

    useEffect(() => {
        setPublicViewerUrl(buildMockedChatViewerAbsoluteUrl(viewerHref));
    }, [viewerHref]);

    /**
     * Persists one full mocked-chat list and returns server-normalized records.
     */
    const persistMockedChats = async (nextMockedChats: Array<MockedChatPreset>): Promise<Array<MockedChatPreset>> => {
        const response = await fetch(MOCKED_CHATS_API_ENDPOINT, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ mockedChats: nextMockedChats }),
        });

        const payload = (await response.json().catch(() => ({}))) as Partial<MockedChatsApiPayload> & {
            error?: string;
        };

        if (!response.ok || !Array.isArray(payload.mockedChats)) {
            throw new Error(payload.error || 'Failed to save mocked chats.');
        }

        return payload.mockedChats;
    };

    /**
     * Selects one saved chat into the right-hand editor.
     */
    const selectSavedChat = (chatId: string) => {
        const selected = savedChats.find((chat) => chat.id === chatId);
        if (!selected) {
            return;
        }

        setSelectedChatId(selected.id);
        setDraftChat(cloneMockedChatPreset(selected));
        setStatusMessage(null);
        setErrorMessage(null);
    };

    /**
     * Starts a brand-new unsaved draft in the editor.
     */
    const handleCreateNewDraft = () => {
        setSelectedChatId(null);
        setDraftChat(createDefaultMockedChatPreset());
        setStatusMessage('Started a new mocked chat draft.');
        setErrorMessage(null);
    };

    /**
     * Creates a local duplicate draft from the current editor content.
     */
    const handleDuplicateDraft = () => {
        const duplicatedDraft = cloneMockedChatPreset(draftChat);
        duplicatedDraft.id = createMockedChatId();
        duplicatedDraft.name = buildCopyName(draftChat.name);
        duplicatedDraft.createdAt = new Date().toISOString();
        duplicatedDraft.updatedAt = duplicatedDraft.createdAt;

        setSelectedChatId(null);
        setDraftChat(duplicatedDraft);
        setStatusMessage('Created a duplicate draft. Save to persist it.');
        setErrorMessage(null);
    };

    /**
     * Saves the current draft by upserting by id.
     */
    const handleSave = async () => {
        setIsSaving(true);
        setErrorMessage(null);
        setStatusMessage(null);

        const nowIso = new Date().toISOString();
        const normalizedDraft = {
            ...cloneMockedChatPreset(draftChat),
            name: draftChat.name.trim() || 'Untitled mocked chat',
            updatedAt: nowIso,
            createdAt: selectedSavedChat?.createdAt || draftChat.createdAt || nowIso,
        } satisfies MockedChatPreset;

        const nextMockedChats = upsertMockedChatPreset(savedChats, normalizedDraft);

        try {
            const persistedChats = await persistMockedChats(nextMockedChats);
            setSavedChats(persistedChats);

            const persistedDraft = persistedChats.find((chat) => chat.id === normalizedDraft.id);
            if (persistedDraft) {
                setSelectedChatId(persistedDraft.id);
                setDraftChat(cloneMockedChatPreset(persistedDraft));
            }

            setStatusMessage('Mocked chat saved.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to save mocked chat.');
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * Saves the current draft as a new record with a fresh id.
     */
    const handleSaveAsNew = async () => {
        setIsSaving(true);
        setErrorMessage(null);
        setStatusMessage(null);

        const nowIso = new Date().toISOString();
        const duplicatedDraft = {
            ...cloneMockedChatPreset(draftChat),
            id: createMockedChatId(),
            name: buildCopyName(draftChat.name),
            createdAt: nowIso,
            updatedAt: nowIso,
        } satisfies MockedChatPreset;

        const nextMockedChats = upsertMockedChatPreset(savedChats, duplicatedDraft);

        try {
            const persistedChats = await persistMockedChats(nextMockedChats);
            setSavedChats(persistedChats);

            const persistedDuplicate = persistedChats.find((chat) => chat.id === duplicatedDraft.id);
            if (persistedDuplicate) {
                setSelectedChatId(persistedDuplicate.id);
                setDraftChat(cloneMockedChatPreset(persistedDuplicate));
            }

            setStatusMessage('Saved as a new mocked chat.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to save as new mocked chat.');
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * Deletes one persisted mocked chat after confirmation.
     */
    const handleDeleteChat = async (chatId: string) => {
        const targetChat = savedChats.find((chat) => chat.id === chatId);
        if (!targetChat) {
            return;
        }

        const confirmed = await showConfirm({
            title: 'Delete mocked chat',
            message: `Delete "${targetChat.name}"? This cannot be undone.`,
            confirmLabel: 'Delete mocked chat',
            cancelLabel: 'Cancel',
        }).catch(() => false);

        if (!confirmed) {
            return;
        }

        setIsSaving(true);
        setErrorMessage(null);
        setStatusMessage(null);

        const nextMockedChats = savedChats.filter((chat) => chat.id !== chatId);

        try {
            const persistedChats = await persistMockedChats(nextMockedChats);
            setSavedChats(persistedChats);

            const fallbackChat = persistedChats[0] || null;
            if (fallbackChat) {
                setSelectedChatId(fallbackChat.id);
                setDraftChat(cloneMockedChatPreset(fallbackChat));
            } else {
                setSelectedChatId(null);
                setDraftChat(createDefaultMockedChatPreset());
            }

            setStatusMessage('Mocked chat deleted.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to delete mocked chat.');
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * Adds one participant to the current draft.
     */
    const handleAddParticipant = () => {
        setDraftChat((previousDraft) => {
            const nextParticipants = [...previousDraft.participants];
            nextParticipants.push({
                id: createMockedChatParticipantId(),
                name: `Participant ${nextParticipants.length + 1}`,
                isMe: nextParticipants.length === 0,
                bubbleColor: '#2563eb',
                avatarUrl: null,
                typingAvatarUrl: null,
            });

            return {
                ...previousDraft,
                participants: nextParticipants,
            };
        });
    };

    /**
     * Updates one participant field in the draft.
     */
    const handleParticipantChange = <TField extends keyof MockedChatParticipant>(
        participantId: string,
        field: TField,
        value: MockedChatParticipant[TField],
    ) => {
        setDraftChat((previousDraft) => {
            let nextParticipants = previousDraft.participants.map((participant) => {
                if (participant.id !== participantId) {
                    return participant;
                }

                return {
                    ...participant,
                    [field]: value,
                };
            });

            if (field === 'isMe' && value === true) {
                nextParticipants = nextParticipants.map((participant) => ({
                    ...participant,
                    isMe: participant.id === participantId,
                }));
            }

            return {
                ...previousDraft,
                participants: nextParticipants,
                messages: previousDraft.messages.map((message) => ({
                    ...message,
                    senderId: nextParticipants.some((participant) => participant.id === message.senderId)
                        ? message.senderId
                        : nextParticipants[0]?.id || message.senderId,
                })),
            };
        });
    };

    /**
     * Removes one participant from the draft.
     */
    const handleRemoveParticipant = (participantId: string) => {
        setDraftChat((previousDraft) => {
            const remainingParticipants = previousDraft.participants.filter((participant) => participant.id !== participantId);
            if (remainingParticipants.length === 0) {
                return previousDraft;
            }

            if (!remainingParticipants.some((participant) => participant.isMe)) {
                remainingParticipants[0] = {
                    ...remainingParticipants[0],
                    isMe: true,
                };
            }

            const fallbackSenderId = remainingParticipants[0]?.id || 'USER';

            return {
                ...previousDraft,
                participants: remainingParticipants,
                messages: previousDraft.messages.map((message) => ({
                    ...message,
                    senderId: remainingParticipants.some((participant) => participant.id === message.senderId)
                        ? message.senderId
                        : fallbackSenderId,
                })),
            };
        });
    };

    /**
     * Adds one scripted message at the end of the sequence.
     */
    const handleAddMessage = () => {
        setDraftChat((previousDraft) => {
            const fallbackSenderId =
                previousDraft.participants.find((participant) => participant.isMe)?.id ||
                previousDraft.participants[0]?.id ||
                'USER';
            const previousOffset = previousDraft.messages[previousDraft.messages.length - 1]?.offsetMs || 0;

            const nextMessage: MockedChatScriptedMessage = {
                id: createMockedChatMessageId(),
                senderId: fallbackSenderId,
                content: 'New scripted message',
                offsetMs: previousOffset + DEFAULT_NEW_MESSAGE_OFFSET_STEP_MS,
            };

            return {
                ...previousDraft,
                messages: [...previousDraft.messages, nextMessage],
            };
        });
    };

    /**
     * Updates one scripted message field.
     */
    const handleMessageChange = <TField extends keyof MockedChatScriptedMessage>(
        messageId: string,
        field: TField,
        value: MockedChatScriptedMessage[TField],
    ) => {
        setDraftChat((previousDraft) => ({
            ...previousDraft,
            messages: previousDraft.messages.map((message) => {
                if (message.id !== messageId) {
                    return message;
                }

                return {
                    ...message,
                    [field]: value,
                };
            }),
        }));
    };

    /**
     * Removes one scripted message.
     */
    const handleRemoveMessage = (messageId: string) => {
        setDraftChat((previousDraft) => ({
            ...previousDraft,
            messages: previousDraft.messages.filter((message) => message.id !== messageId),
        }));
    };

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

                {(statusMessage || errorMessage) && (
                    <div
                        className={`rounded-xl border px-4 py-3 text-sm ${
                            errorMessage
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}
                    >
                        {errorMessage || statusMessage}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
                    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-900">My Mocked Chats</h2>
                            <button
                                type="button"
                                onClick={handleCreateNewDraft}
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
                                                        <p className="truncate text-sm font-semibold text-slate-900">
                                                            {chat.name}
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            Updated {formatMockedChatUpdatedAt(chat.updatedAt)}
                                                        </p>
                                                    </div>
                                                    <Link
                                                        href={buildMockedChatViewerHref(chat.id)}
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

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-1">
                                <h2 className="text-xl font-semibold text-slate-900">Editor</h2>
                                <p className="text-sm text-slate-600">
                                    {isDraftPersisted
                                        ? isDraftDirty
                                            ? 'Unsaved changes in this preset.'
                                            : 'All changes saved.'
                                        : 'Editing an unsaved draft.'}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={handleDuplicateDraft}
                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
                                >
                                    Duplicate
                                </button>
                                {isDraftPersisted && (
                                    <button
                                        type="button"
                                        onClick={() => void handleDeleteChat(draftChat.id)}
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
                                    onClick={() => void handleSaveAsNew()}
                                    disabled={isSaving}
                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-60"
                                >
                                    Save as New
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleSave()}
                                    disabled={isSaving}
                                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                                >
                                    {isSaving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>

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
                                        <PromptbookQrCode
                                            value={publicViewerUrl}
                                            size={180}
                                            className="flex justify-center"
                                        />
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

                        <div className="mt-6 space-y-8">
                            <section className="space-y-4">
                                <h3 className="text-lg font-semibold text-slate-900">General</h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <label className="space-y-1 text-sm text-slate-700">
                                        <span className="font-semibold">Preset name</span>
                                        <input
                                            type="text"
                                            value={draftChat.name}
                                            onChange={(event) =>
                                                setDraftChat((previousDraft) => ({
                                                    ...previousDraft,
                                                    name: event.target.value,
                                                }))
                                            }
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </label>
                                    <label className="space-y-1 text-sm text-slate-700">
                                        <span className="font-semibold">Background color</span>
                                        <input
                                            type="text"
                                            value={draftChat.settings.backgroundColor || ''}
                                            onChange={(event) =>
                                                setDraftChat((previousDraft) => ({
                                                    ...previousDraft,
                                                    settings: {
                                                        ...previousDraft.settings,
                                                        backgroundColor: event.target.value || null,
                                                    },
                                                }))
                                            }
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
                                        onChange={(event) =>
                                            setDraftChat((previousDraft) => ({
                                                ...previousDraft,
                                                settings: {
                                                    ...previousDraft.settings,
                                                    backgroundImageUrl: event.target.value || null,
                                                },
                                            }))
                                        }
                                        placeholder="https://example.com/background.png"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </label>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-slate-900">Participants</h3>
                                    <button
                                        type="button"
                                        onClick={handleAddParticipant}
                                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
                                    >
                                        Add participant
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {draftChat.participants.map((participant) => (
                                        <article key={participant.id} className="rounded-xl border border-slate-200 p-3">
                                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                                                <label className="space-y-1 text-xs text-slate-600">
                                                    <span className="font-semibold uppercase tracking-wide">Name</span>
                                                    <input
                                                        type="text"
                                                        value={participant.name}
                                                        onChange={(event) =>
                                                            handleParticipantChange(participant.id, 'name', event.target.value)
                                                        }
                                                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </label>
                                                <label className="space-y-1 text-xs text-slate-600">
                                                    <span className="font-semibold uppercase tracking-wide">Bubble color</span>
                                                    <input
                                                        type="text"
                                                        value={participant.bubbleColor}
                                                        onChange={(event) =>
                                                            handleParticipantChange(
                                                                participant.id,
                                                                'bubbleColor',
                                                                event.target.value,
                                                            )
                                                        }
                                                        placeholder="#2563eb"
                                                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </label>
                                                <label className="space-y-1 text-xs text-slate-600">
                                                    <span className="font-semibold uppercase tracking-wide">Avatar URL</span>
                                                    <input
                                                        type="url"
                                                        value={participant.avatarUrl || ''}
                                                        onChange={(event) =>
                                                            handleParticipantChange(
                                                                participant.id,
                                                                'avatarUrl',
                                                                event.target.value || null,
                                                            )
                                                        }
                                                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </label>
                                                <label className="space-y-1 text-xs text-slate-600">
                                                    <span className="font-semibold uppercase tracking-wide">
                                                        Typing avatar URL
                                                    </span>
                                                    <input
                                                        type="url"
                                                        value={participant.typingAvatarUrl || ''}
                                                        onChange={(event) =>
                                                            handleParticipantChange(
                                                                participant.id,
                                                                'typingAvatarUrl',
                                                                event.target.value || null,
                                                            )
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
                                                        onChange={(event) =>
                                                            handleParticipantChange(participant.id, 'isMe', event.target.checked)
                                                        }
                                                    />
                                                    Messages from this participant appear as me
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveParticipant(participant.id)}
                                                    disabled={draftChat.participants.length <= 1}
                                                    className="rounded-lg border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:border-red-400 disabled:opacity-60"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-slate-900">Messages</h3>
                                    <button
                                        type="button"
                                        onClick={handleAddMessage}
                                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
                                    >
                                        Add message
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {draftChat.messages.map((message, index) => (
                                        <article key={message.id} className="rounded-xl border border-slate-200 p-3">
                                            <div className="grid gap-3 md:grid-cols-[180px_160px_minmax(0,1fr)]">
                                                <label className="space-y-1 text-xs text-slate-600">
                                                    <span className="font-semibold uppercase tracking-wide">Sender</span>
                                                    <select
                                                        value={message.senderId}
                                                        onChange={(event) =>
                                                            handleMessageChange(message.id, 'senderId', event.target.value)
                                                        }
                                                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        {draftChat.participants.map((participant) => (
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
                                                            handleMessageChange(
                                                                message.id,
                                                                'offsetMs',
                                                                Math.max(0, Number(event.target.value) || 0),
                                                            )
                                                        }
                                                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </label>
                                                <label className="space-y-1 text-xs text-slate-600">
                                                    <span className="font-semibold uppercase tracking-wide">Content</span>
                                                    <textarea
                                                        value={message.content}
                                                        onChange={(event) =>
                                                            handleMessageChange(message.id, 'content', event.target.value)
                                                        }
                                                        className="min-h-[88px] w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </label>
                                            </div>
                                            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                                <span>Message #{index + 1}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveMessage(message.id)}
                                                    disabled={draftChat.messages.length <= 1}
                                                    className="rounded-lg border border-red-300 px-2 py-1 font-semibold text-red-700 hover:border-red-400 disabled:opacity-60"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-lg font-semibold text-slate-900">Playback Metadata</h3>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    <label className="space-y-1 text-sm text-slate-700">
                                        <span className="font-semibold">Timing preset</span>
                                        <select
                                            value={draftChat.settings.timingPreset}
                                            onChange={(event) =>
                                                setDraftChat((previousDraft) => ({
                                                    ...previousDraft,
                                                    settings: {
                                                        ...previousDraft.settings,
                                                        timingPreset: event.target.value as MockedChatTimingPreset,
                                                    },
                                                }))
                                            }
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
                                                setDraftChat((previousDraft) => ({
                                                    ...previousDraft,
                                                    settings: {
                                                        ...previousDraft.settings,
                                                        viewportPreset: event.target.value as MockedChatViewportPreset,
                                                    },
                                                }))
                                            }
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {Object.entries(MOCKED_CHAT_VIEWPORT_PRESETS).map(
                                                ([presetKey, presetMetadata]) => (
                                                    <option key={presetKey} value={presetKey}>
                                                        {presetMetadata.label}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </label>
                                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={draftChat.settings.showTimestamps}
                                            onChange={(event) =>
                                                setDraftChat((previousDraft) => ({
                                                    ...previousDraft,
                                                    settings: {
                                                        ...previousDraft.settings,
                                                        showTimestamps: event.target.checked,
                                                    },
                                                }))
                                            }
                                        />
                                        Show timestamps
                                    </label>
                                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={draftChat.settings.loopPlayback}
                                            onChange={(event) =>
                                                setDraftChat((previousDraft) => ({
                                                    ...previousDraft,
                                                    settings: {
                                                        ...previousDraft.settings,
                                                        loopPlayback: event.target.checked,
                                                    },
                                                }))
                                            }
                                        />
                                        Loop playback
                                    </label>
                                </div>
                            </section>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

/**
 * Clones one mocked-chat preset so editor state does not mutate saved references.
 */
function cloneMockedChatPreset(preset: MockedChatPreset): MockedChatPreset {
    return {
        ...preset,
        participants: preset.participants.map((participant) => ({ ...participant })),
        messages: preset.messages.map((message) => ({ ...message })),
        settings: {
            ...preset.settings,
        },
    };
}

/**
 * Upserts one mocked-chat preset by id while preserving list order by updated date.
 */
function upsertMockedChatPreset(
    presets: ReadonlyArray<MockedChatPreset>,
    incomingPreset: MockedChatPreset,
): Array<MockedChatPreset> {
    const existingIndex = presets.findIndex((preset) => preset.id === incomingPreset.id);
    const nextPresets = [...presets];

    if (existingIndex === -1) {
        nextPresets.push(incomingPreset);
    } else {
        nextPresets[existingIndex] = incomingPreset;
    }

    return nextPresets.sort((leftPreset, rightPreset) => Date.parse(rightPreset.updatedAt) - Date.parse(leftPreset.updatedAt));
}

/**
 * Formats one mocked chat timestamp for sidebar display.
 */
function formatMockedChatUpdatedAt(updatedAt: string): string {
    const date = new Date(updatedAt);
    if (Number.isNaN(date.getTime())) {
        return 'just now';
    }

    return date.toLocaleString();
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

/**
 * Builds a user-friendly duplicate name.
 */
function buildCopyName(name: string): string {
    const trimmedName = name.trim();
    if (!trimmedName) {
        return 'Untitled mocked chat copy';
    }

    return trimmedName.toLowerCase().endsWith('copy') ? trimmedName : `${trimmedName} copy`;
}
