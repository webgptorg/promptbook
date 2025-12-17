'use client';

import { book } from '@promptbook-local/core';
import { useEffect, useMemo, useState } from 'react';
import { Chat } from '../../../../../src/book-components/Chat/Chat/Chat';
import type { ChatMessage } from '../../../../../src/book-components/Chat/types/ChatMessage';
import type { ChatParticipant } from '../../../../../src/book-components/Chat/types/ChatParticipant';
import {
    assistantsOnlyScenario,
    chatButtonsScenario,
    chatWithChildrenScenario,
    chatWithFeedbackScenario,
    emptyScenario,
    loadingScenario,
    longThreadScenario,
    multiParticipantScenario,
    richFormattingScenario,
    simpleScenario,
} from './scenarios';

export default function ChatPreview() {
    const [scenario, setScenario] = useState<string>('empty');
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    // Sample participants following DRY principle
    const participants: Array<ChatParticipant> = [
        {
            name: 'USER',
            fullname: 'You',
            isMe: true,
        },
        {
            name: 'ASSISTANT_1',
            fullname: 'AI Assistant',
            color: '#10b981',
            avatarSrc: 'https://randomuser.me/api/portraits/men/0.jpg',
            agentSource: book`
                AI Assistant

                PERSONA a helpful and friendly AI assistant that provides information and answers questions.
                META IMAGE https://randomuser.me/api/portraits/men/0.jpg
                META COLOR #10b981
            `,
            // <- TODO: [🕛] Create here the entire `ChatParticipant` from book
        },
        {
            name: 'ASSISTANT_2',
            fullname: 'Code Helper',
            color: '#f59e0b',
            avatarSrc: 'https://randomuser.me/api/portraits/men/1.jpg',
        },
        {
            name: 'ASSISTANT_3',
            fullname: 'Writing Assistant',
            color: '#8b5cf6',
            avatarSrc: 'https://randomuser.me/api/portraits/men/2.jpg',
        },
    ];

    const scenarios = useMemo(
        () => ({
            empty: emptyScenario,
            simple: simpleScenario,
            multiParticipant: multiParticipantScenario,
            assistantsOnly: assistantsOnlyScenario,
            loading: loadingScenario,
            longThread: longThreadScenario,
            chatButtons: chatButtonsScenario,
            chatWithChildren: chatWithChildrenScenario,
            chatWithFeedback: chatWithFeedbackScenario,
            richFormatting: richFormattingScenario,
        }),
        [],
    );

    // Read scenario from URL parameter on component mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const scenarioParam = urlParams.get('scenario');

            if (scenarioParam && scenarios[scenarioParam as keyof typeof scenarios]) {
                setScenario(scenarioParam);
                setMessages([...scenarios[scenarioParam as keyof typeof scenarios].messages]);
            }
        }
    }, [scenarios]);

    const handleScenarioChange = (newScenario: string) => {
        setScenario(newScenario);
        setMessages([...scenarios[newScenario as keyof typeof scenarios].messages]);

        // Update URL parameter
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('scenario', newScenario);
            window.history.replaceState({}, '', url.toString());
        }
    };

    const handleMessage = async (content: string) => {
        // Add user message
        const userMessage: ChatMessage = {
            channel: 'PROMPTBOOK_CHAT',
            id: Date.now().toString(),
            createdAt: new Date(),
            sender: 'USER',
            content,
            isComplete: true,
        };

        setMessages((prev) => [...prev, userMessage]);

        // Simulate assistant response after a delay
        setTimeout(() => {
            const responses = [
                "That's an interesting question! Let me think about that...",
                "I can help you with that. Here's what I suggest...",
                "Good point! Based on what you've said...",
                'Let me provide some insights on that topic...',
            ];

            const assistantMessage: ChatMessage = {
                channel: 'PROMPTBOOK_CHAT',
                id: (Date.now() + 1).toString(),
                createdAt: new Date(),
                sender: 'ASSISTANT_1',
                content: responses[Math.floor(Math.random() * responses.length)],
                isComplete: true,
            };

            setMessages((prev) => [...prev, assistantMessage]);
        }, 1000);
    };

    const handleReset = async () => {
        setMessages([]);
        setScenario('empty');

        // Update URL parameter to empty scenario
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('scenario', 'empty');
            window.history.replaceState({}, '', url.toString());
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chat Scenario:</label>
                <select
                    value={scenario}
                    onChange={(e) => handleScenarioChange(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                >
                    {Object.entries(scenarios).map(([key, { name }]) => (
                        <option key={key} value={key}>
                            {name}
                        </option>
                    ))}
                </select>
            </div>

            <Chat
                title="Chat Preview"
                style={{ height: '800px' }}
                messages={messages}
                participants={participants}
                onMessage={handleMessage}
                onReset={handleReset}
                isFocusedOnLoad={false}
                isSaveButtonEnabled={true}
                {...(scenario === 'chatWithChildren'
                    ? {
                          children: (
                              <div
                                  style={{
                                      width: '100%',
                                      height: '100%',
                                      padding: 150,
                                      borderRadius: 8,
                                      //opacity: 0.5,
                                      backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.8), rgba(255 0 0 / 0.8))',
                                      //'url(https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                  }}
                              >
                                  <span>
                                      <strong>Custom children content: </strong>
                                      This area is rendered above the chat messages and above the input.
                                      <br />
                                      You can put anything here, such as tips, banners, or custom UI.
                                  </span>
                              </div>
                          ),
                      }
                    : {})}
                {...(['chatWithFeedback', 'loading'].includes(scenario)
                    ? {
                          onFeedback: () => window.alert('Feedback sent!'),
                      }
                    : {})}
            />

            {/*
            <div className="text-sm text-gray-600">
                <p>
                    <strong>Current scenario:</strong> {scenarios[scenario as keyof typeof scenarios].name}
                </p>
                <p>
                    <strong>Participants:</strong>{' '}
                    {participants
                        .filter((p) => messages.some((m) => m.from === p.name))
                        .map((p) => p.fullname)
                        .join(', ') || 'None'}
                </p>
            </div>
            */}
        </div>
    );
}
