'use client';

import { useState } from 'react';
import { Chat } from '../../../../../src/book-components/Chat/Chat/Chat';
import type { ChatMessage } from '../../../../../src/book-components/Chat/interfaces/ChatMessage';
import type { ChatParticipant } from '../../../../../src/book-components/Chat/interfaces/ChatParticipant';

export default function ChatPreview() {
    const [scenario, setScenario] = useState<string>('empty');
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    // Sample participants following DRY principle
    const participants: ChatParticipant[] = [
        {
            name: 'USER',
            fullname: 'You',
            isMe: true,
            color: '#3b82f6'
        },
        {
            name: 'ASSISTANT_1',
            fullname: 'AI Assistant',
            color: '#10b981',
            avatarSrc: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjMTBiOTgxIi8+Cjwvc3ZnPgo='
        },
        {
            name: 'ASSISTANT_2',
            fullname: 'Code Helper',
            color: '#f59e0b',
            avatarSrc: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggNkwxMCAxMkw4IDE4SDE2TDE4IDEyTDE2IDZIOFoiIGZpbGw9IiNmNTllMGIiLz4KPC9zdmc+Cg=='
        },
        {
            name: 'ASSISTANT_3',
            fullname: 'Writing Assistant',
            color: '#8b5cf6',
            avatarSrc: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMgMTdIMjFWMTlIM1YxN1pNNCA5TDIwIDEwVjEySDRWOVoiIGZpbGw9IiM4YjVjZjYiLz4KPC9zdmc+Cg=='
        }
    ];

    const scenarios = {
        empty: {
            name: 'Empty Chat',
            messages: []
        },
        simple: {
            name: 'Simple User-Assistant Chat',
            messages: [
                {
                    id: '1',
                    date: new Date(),
                    from: 'USER',
                    content: 'Hello! How can you help me today?',
                    isComplete: true
                },
                {
                    id: '2', 
                    date: new Date(),
                    from: 'ASSISTANT_1',
                    content: 'Hi there! I\'m here to help you with any questions or tasks you have. What would you like to work on?',
                    isComplete: true
                },
                {
                    id: '3',
                    date: new Date(),
                    from: 'USER', 
                    content: 'Can you help me understand React components?',
                    isComplete: true
                },
                {
                    id: '4',
                    date: new Date(),
                    from: 'ASSISTANT_1',
                    content: 'Absolutely! React components are the building blocks of React applications. They\'re reusable pieces of code that return JSX...',
                    isComplete: true
                }
            ]
        },
        multiParticipant: {
            name: 'Multi-Participant with User',
            messages: [
                {
                    id: '1',
                    date: new Date(),
                    from: 'USER',
                    content: 'I need help with both coding and writing. Can you both assist?',
                    isComplete: true
                },
                {
                    id: '2',
                    date: new Date(), 
                    from: 'ASSISTANT_2',
                    content: 'I\'ll help with the coding aspects! What programming language are you working with?',
                    isComplete: true
                },
                {
                    id: '3',
                    date: new Date(),
                    from: 'ASSISTANT_3',
                    content: 'And I can assist with any writing tasks you have. Documentation, content creation, etc.',
                    isComplete: true
                },
                {
                    id: '4',
                    date: new Date(),
                    from: 'USER',
                    content: 'Perfect! I\'m working on a JavaScript project and need to write some technical documentation for it.',
                    isComplete: true
                },
                {
                    id: '5',
                    date: new Date(),
                    from: 'ASSISTANT_2',
                    content: 'Great! For JavaScript, I recommend starting with clear function and class documentation using JSDoc comments...',
                    isComplete: true
                }
            ]
        },
        assistantsOnly: {
            name: 'Assistants Discussion (No User)',
            messages: [
                {
                    id: '1',
                    date: new Date(),
                    from: 'ASSISTANT_1',
                    content: 'I think the best approach for this optimization would be to implement caching.',
                    isComplete: true
                },
                {
                    id: '2',
                    date: new Date(),
                    from: 'ASSISTANT_2',
                    content: 'Good point! We could use Redis for caching. Here\'s a code example:<br/><pre><code>const cache = require("redis").createClient();</code></pre>',
                    isComplete: true
                },
                {
                    id: '3',
                    date: new Date(),
                    from: 'ASSISTANT_3',
                    content: 'Don\'t forget to document this properly. The documentation should explain:<br/>• Why caching was implemented<br/>• How to configure it<br/>• Performance benefits',
                    isComplete: true
                },
                {
                    id: '4',
                    date: new Date(),
                    from: 'ASSISTANT_1',
                    content: 'Excellent suggestions from both of you. This collaborative approach will give the user the best solution.',
                    isComplete: true
                }
            ]
        },
        loading: {
            name: 'Chat with Loading Message',
            messages: [
                {
                    id: '1',
                    date: new Date(),
                    from: 'USER',
                    content: 'What\'s the weather like today?',
                    isComplete: true
                },
                {
                    id: '2',
                    date: new Date(),
                    from: 'ASSISTANT_1',
                    content: 'Let me check the current weather conditions for you...',
                    isComplete: false
                }
            ]
        }
    };

    const handleScenarioChange = (newScenario: string) => {
        setScenario(newScenario);
        setMessages([...scenarios[newScenario as keyof typeof scenarios].messages]);
    };

    const handleMessage = async (content: string) => {
        // Add user message
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            date: new Date(),
            from: 'USER',
            content,
            isComplete: true
        };
        
        setMessages(prev => [...prev, userMessage]);
        
        // Simulate assistant response after a delay
        setTimeout(() => {
            const responses = [
                "That's an interesting question! Let me think about that...",
                "I can help you with that. Here's what I suggest...",
                "Good point! Based on what you've said...",
                "Let me provide some insights on that topic...",
            ];
            
            const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                date: new Date(),
                from: 'ASSISTANT_1',
                content: responses[Math.floor(Math.random() * responses.length)],
                isComplete: true
            };
            
            setMessages(prev => [...prev, assistantMessage]);
        }, 1000);
    };

    const handleReset = async () => {
        setMessages([]);
        setScenario('empty');
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chat Scenario:
                </label>
                <select 
                    value={scenario}
                    onChange={(e) => handleScenarioChange(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                >
                    {Object.entries(scenarios).map(([key, { name }]) => (
                        <option key={key} value={key}>{name}</option>
                    ))}
                </select>
            </div>
            
            <Chat
                messages={messages}
                participants={participants}
                onMessage={handleMessage}
                onReset={handleReset}
                placeholderMessageContent="Try typing a message to interact with the chat..."
            />
            
            <div className="text-sm text-gray-600">
                <p><strong>Current scenario:</strong> {scenarios[scenario as keyof typeof scenarios].name}</p>
                <p><strong>Participants:</strong> {participants.filter(p => 
                    messages.some(m => m.from === p.name)
                ).map(p => p.fullname).join(', ') || 'None'}</p>
            </div>
        </div>
    );
}
