'use client';

import { BookEditor } from '@promptbook-local/components';
import { validateBook } from '@promptbook-local/core';
import { ChevronDown, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AgentsPanel } from './AgentsPanel';
import { getStories, saveStories } from './actions';
import { CHAT_STREAM_KEEP_ALIVE_TOKEN } from '@/constants/streaming';
import {
    createStory,
    getStoryBodyFromContent,
    getStoryTitleFromContent,
    type Story,
    type StoryAvailableAgent,
    type StoryMode,
} from './storyUtils';

const STORY_EXPORT_FORMATS = [
    { format: 'txt', label: 'Plain text (.txt)' },
    { format: 'md', label: 'Markdown (.md)' },
] as const;

/**
 * API shape returned by `/api/agents`.
 */
type AgentsApiResponse = {
    agents?: Array<{
        agentName: string;
        meta?: {
            fullname?: string | null;
        };
    }>;
};

/**
 * Story writing client for `/experiments/story`.
 */
export function StoryClient() {
    const [stories, setStories] = useState<Array<Story>>([]);
    const [activeStoryId, setActiveStoryId] = useState('');
    const [isLoadingStories, setIsLoadingStories] = useState(true);
    const [availableAgents, setAvailableAgents] = useState<Array<StoryAvailableAgent>>([]);
    const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
    const [generatingAgentName, setGeneratingAgentName] = useState<string | null>(null);
    const [agentErrorMessage, setAgentErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        getStories()
            .then((loadedStories) => {
                setStories(loadedStories);
            })
            .finally(() => {
                setIsLoadingStories(false);
            });
    }, []);

    useEffect(() => {
        let isCancelled = false;

        async function loadAgents() {
            const response = await fetch('/api/agents');
            if (!response.ok) {
                return;
            }

            const data = (await response.json()) as AgentsApiResponse;
            const mappedAgents =
                data.agents?.map((agent) => ({
                    agentName: agent.agentName,
                    label: agent.meta?.fullname?.trim() || agent.agentName,
                })) || [];

            mappedAgents.sort((left, right) => left.label.localeCompare(right.label));

            if (!isCancelled) {
                setAvailableAgents(mappedAgents);
            }
        }

        loadAgents().catch((error) => {
            console.error('Failed to load agents for story picker.', error);
        });

        return () => {
            isCancelled = true;
        };
    }, []);

    useEffect(() => {
        if (isLoadingStories) {
            return;
        }
        saveStories(stories).catch((error) => {
            console.error('Failed to persist stories.', error);
        });
    }, [stories, isLoadingStories]);

    useEffect(() => {
        if (stories.length === 0) {
            if (activeStoryId !== '') {
                setActiveStoryId('');
            }
            return;
        }

        const hasActiveStory = stories.some((story) => story.id === activeStoryId);
        if (!hasActiveStory) {
            setActiveStoryId(stories[0].id);
        }
    }, [stories, activeStoryId]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') {
                return;
            }

            event.preventDefault();
            setIsSaveMenuOpen((isOpen) => !isOpen);
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const activeStory = useMemo(
        () => stories.find((story) => story.id === activeStoryId),
        [stories, activeStoryId],
    );

    const availableAgentLabelMap = useMemo(
        () => new Map(availableAgents.map((agent) => [agent.agentName, agent.label])),
        [availableAgents],
    );

    const handleAddStory = () => {
        const defaultAgentName = availableAgents[0]?.agentName;
        const newStory = createStory(defaultAgentName ? [defaultAgentName] : []);
        setStories((currentStories) => [...currentStories, newStory]);
        setActiveStoryId(newStory.id);
    };

    const handleDeleteStory = (id: string) => {
        setStories((currentStories) => currentStories.filter((story) => story.id !== id));
        setIsSaveMenuOpen(false);
    };

    const handleContentChange = (newContent: string) => {
        setStories((currentStories) =>
            currentStories.map((story) =>
                story.id === activeStoryId
                    ? {
                          ...story,
                          content: newContent,
                      }
                    : story,
            ),
        );
    };

    const handleAddAgent = (agentName: string) => {
        setStories((currentStories) =>
            currentStories.map((story) =>
                story.id === activeStoryId
                    ? {
                          ...story,
                          agentNames: Array.from(new Set([...story.agentNames, agentName])),
                      }
                    : story,
            ),
        );
    };

    const handleAgentClick = async (agentName: string) => {
        if (!activeStory || generatingAgentName) {
            return;
        }

        const agentLabel = availableAgentLabelMap.get(agentName) || agentName;
        const storyId = activeStory.id;
        const requestMessage = buildStoryContinuationMessage(activeStory, agentLabel);

        setGeneratingAgentName(agentName);
        setAgentErrorMessage(null);

        try {
            const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: requestMessage,
                }),
            });

            if (!response.ok) {
                const payload = (await response
                    .json()
                    .catch(() => null)) as { error?: { message?: string } } | null;
                const errorText = payload?.error?.message ?? 'The agent refused to continue the story.';
                throw new Error(errorText);
            }

            const rawText = await response.text();
            const sanitized = sanitizeAgentResponse(rawText);
            const formattedParagraph = formatParagraphForMode(sanitized, activeStory.mode, agentLabel);

            if (formattedParagraph.length === 0) {
                throw new Error('The agent returned an empty paragraph. Please try again.');
            }

            setStories((currentStories) =>
                currentStories.map((story) =>
                    story.id === storyId
                        ? {
                              ...story,
                              content: appendParagraphToStoryContent(story.content, formattedParagraph),
                          }
                        : story,
                ),
            );
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Unable to continue the story right now. Please try again.';
            console.error('Failed to continue story with agent', agentName, error);
            setAgentErrorMessage(message);
        } finally {
            setGeneratingAgentName(null);
        }
    };

    if (isLoadingStories) {
        return <div className="p-6">Loading stories...</div>;
    }

    if (!activeStory) {
        return (
            <div className="flex h-full items-center justify-center">
                <button onClick={handleAddStory} className="rounded bg-blue-600 px-4 py-2 text-white">
                    Create your first story
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <div className="border-b border-yellow-400 bg-yellow-100 px-4 py-3 text-yellow-700" role="alert">
                <p className="font-bold">Experimental App</p>
                <p className="text-sm">This is an experimental app. Features may change or be removed at any time.</p>
            </div>
            <div className="flex h-full">
                <div className="w-1/4 border-r bg-gray-50 p-4">
                    <h2 className="mb-4 text-xl font-bold">Stories</h2>
                    <ul>
                        {stories.map((story) => (
                            <li key={story.id} className="mb-2">
                                <button
                                    onClick={() => {
                                        setActiveStoryId(story.id);
                                        setIsSaveMenuOpen(false);
                                    }}
                                    className={`w-full rounded p-2 text-left ${
                                        story.id === activeStoryId ? 'bg-blue-100' : ''
                                    }`}
                                >
                                    {getStoryTitleFromContent(story.content)}
                                </button>
                            </li>
                        ))}
                    </ul>
                    <button onClick={handleAddStory} className="mt-4 rounded bg-blue-600 px-3 py-2 text-sm text-white">
                        New Story
                    </button>
                </div>
                <div className="flex w-3/4 flex-col">
                    <div className="flex items-center justify-between border-b p-4">
                        <h2 className="truncate text-2xl font-bold">{getStoryTitleFromContent(activeStory.content)}</h2>
                        <div className="ml-4 flex items-center gap-3">
                            <select
                                value={activeStory.mode}
                                onChange={(event) =>
                                    setStories((currentStories) =>
                                        currentStories.map((story) =>
                                            story.id === activeStoryId
                                                ? {
                                                      ...story,
                                                      mode: event.target.value as Story['mode'],
                                                  }
                                                : story,
                                        ),
                                    )
                                }
                                className="rounded border p-2 text-sm"
                            >
                                <option value="beletrie">Beletrie</option>
                                <option value="dramatic">Dramatic</option>
                            </select>
                            <div className="relative">
                                <button
                                    onClick={() => setIsSaveMenuOpen((isOpen) => !isOpen)}
                                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    <Save className="h-4 w-4" />
                                    Save
                                    <ChevronDown className="h-4 w-4" />
                                </button>
                                {isSaveMenuOpen && (
                                    <div className="absolute right-0 top-full z-20 mt-1 min-w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                                        {STORY_EXPORT_FORMATS.map((storyExportFormat) => (
                                            <a
                                                key={storyExportFormat.format}
                                                href={`/api/story/export?storyId=${activeStory.id}&format=${storyExportFormat.format}`}
                                                download
                                                onClick={() => setIsSaveMenuOpen(false)}
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                                {storyExportFormat.label}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => handleDeleteStory(activeStory.id)}
                                className="rounded bg-red-600 px-3 py-2 text-sm text-white"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                    <div className="flex-grow p-4">
                        <BookEditor
                            value={validateBook(activeStory.content)}
                            onChange={(newSource) => {
                                handleContentChange(newSource);
                            }}
                            isReadonly={false}
                        />
                    </div>
                    <div className="px-4 pb-2 text-xs text-gray-500">
                        Story name is the first line in the editor. Edit it directly there.
                    </div>
                    <AgentsPanel
                        availableAgents={availableAgents}
                        selectedAgentNames={activeStory.agentNames}
                        onAgentClick={handleAgentClick}
                        onAddAgent={handleAddAgent}
                        loadingAgentName={generatingAgentName}
                    />
                    {agentErrorMessage && (
                        <div className="px-4 py-2 text-sm text-red-700">{agentErrorMessage}</div>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Builds the prompt message sent to an agent to continue the story.
 *
 * @param story - Story data driving the continuation.
 * @param agentLabel - Display name of the agent that should continue the story.
 * @returns The user message sent to `/api/chat`.
 */
function buildStoryContinuationMessage(story: Story, agentLabel: string): string {
    const title = getStoryTitleFromContent(story.content);
    const body = getStoryBodyFromContent(story.content).trim();
    const storyContext = body.length > 0 ? body : 'The story is just beginning.';
    const instructions =
        story.mode === 'dramatic'
            ? `You are ${agentLabel}. Continue the scene with one paragraph of dialogue that starts with "${agentLabel}:" and keeps the tone dramatic.`
            : `You are ${agentLabel}. Continue the narrative with one paragraph that flows naturally from the existing story.`;

    return [
        `Story title: ${title}`,
        `Story mode: ${story.mode}`,
        '',
        'Current story:',
        storyContext,
        '',
        instructions,
        'Return only the paragraph you write and do not mention you are AI.',
    ].join('\n');
}

/**
 * Removes keep-alive pings and tool call payloads from the raw text returned by the agent.
 *
 * @param rawText - Raw markdown stream returned by `/agents/[agentName]/api/chat`.
 * @returns Cleaned paragraph that can be appended to the story.
 */
function sanitizeAgentResponse(rawText: string): string {
    const normalized = rawText.replace(/\r\n/g, '\n');
    const keepAliveSequence = `\n${CHAT_STREAM_KEEP_ALIVE_TOKEN}\n`;
    let cleaned = '';
    let index = 0;

    while (index < normalized.length) {
        if (normalized.startsWith(keepAliveSequence, index)) {
            index += keepAliveSequence.length;
            continue;
        }

        if (normalized.startsWith('\n{"toolCalls":', index)) {
            const nextLineIndex = normalized.indexOf('\n', index + 1);
            index = nextLineIndex === -1 ? normalized.length : nextLineIndex + 1;
            continue;
        }

        cleaned += normalized[index];
        index += 1;
    }

    return cleaned.trim();
}

/**
 * Ensures the generated paragraph matches the selected story mode.
 *
 * @param paragraph - Sanitized paragraph returned by the agent.
 * @param mode - Currently selected story mode.
 * @param agentLabel - Display name of the agent that continues the story.
 * @returns Paragraph adjusted for the story mode.
 */
function formatParagraphForMode(paragraph: string, mode: StoryMode, agentLabel: string): string {
    const trimmedParagraph = paragraph.trim();
    if (trimmedParagraph.length === 0) {
        return '';
    }

    if (mode === 'dramatic' && !trimmedParagraph.startsWith(`${agentLabel}:`)) {
        return `${agentLabel}: ${trimmedParagraph}`;
    }

    return trimmedParagraph;
}

/**
 * Appends the generated paragraph as a new paragraph to the story content.
 *
 * @param content - Existing story content including title and body.
 * @param paragraph - Paragraph to append.
 * @returns Story content with the new paragraph appended as a separate section.
 */
function appendParagraphToStoryContent(content: string, paragraph: string): string {
    const trimmedStory = content.trimEnd();
    const trimmedParagraph = paragraph.trim();
    if (trimmedParagraph.length === 0) {
        return trimmedStory;
    }

    return `${trimmedStory}\n\n${trimmedParagraph}\n`;
}
