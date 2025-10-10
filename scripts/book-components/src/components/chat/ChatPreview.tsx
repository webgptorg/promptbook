'use client';

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
    simpleScenario,
} from './scenarios';

export default function ChatPreview() {
    const [scenario, setScenario] = useState<string>('empty');
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    // Sample participants following DRY principle
    const participants: ChatParticipant[] = [
        {
            name: 'USER',
            fullname: 'You',
            isMe: true,
            color: '#1D4ED8',
        },
        {
            name: 'ASSISTANT_1',
            fullname: 'AI Assistant',
            color: '#10b981',
            avatarSrc: 'https://randomuser.me/api/portraits/men/0.jpg',
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
            id: Date.now().toString(),
            date: new Date(),
            from: 'USER',
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
                id: (Date.now() + 1).toString(),
                date: new Date(),
                from: 'ASSISTANT_1',
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
            {/* Usage Examples */}
            <div className="mb-4 p-4 bg-gray-50 rounded">
                <div className="font-semibold mb-2">Usage Examples</div>
                <div>
                    <div>
                        <strong>Chat with children:</strong>
                        <pre style={{ background: '#f3f4f6', padding: 8, borderRadius: 6, marginTop: 4 }}>
                            {`<Chat
  messages={messages}
  participants={participants}
  onMessage={handleMessage}
  onReset={handleReset}
  children={
    <div>
      <strong>Custom children content:</strong>
      <span>This area is rendered above the chat messages and input.</span>
    </div>
  }
/>`}
                        </pre>
                        <span className="text-xs text-gray-500">
                            See scenario: <code>Chat with children</code> in the selector below.
                        </span>
                    </div>
                </div>
            </div>
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
                style={{ height: '800px' }}
                messages={messages}
                participants={participants}
                onMessage={handleMessage}
                onReset={handleReset}
                placeholderMessageContent="Try typing a message to interact with the chat..."
                isFocusedOnLoad={false}
                isSaveButtonEnabled={true}
                {...(scenario === 'chatWithChildren'
                    ? {
                          children: (
                              <div style={{ padding: 12, background: '#f3f4f6', borderRadius: 8, marginBottom: 8 }}>
                                  <strong>Custom children content:</strong>{' '}
                                  <span>
                                      This area is rendered above the chat messages and input. You can put anything
                                      here, such as tips, banners, or custom UI.
                                  </span>
                              </div>
                          ),
                      }
                    : {})}
                {...(scenario === 'chatWithFeedback'
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
