'use client';

import { useEffect, useMemo, useState } from 'react';
import { LlmChat } from '../../../../../src/book-components/Chat/LlmChat/LlmChat';
import type { ChatMessage } from '../../../../../src/book-components/Chat/types/ChatMessage';
import type { ChatParticipant } from '../../../../../src/book-components/Chat/types/ChatParticipant';
import { MockedEchoLlmExecutionTools } from '../../../../../src/llm-providers/mocked/MockedEchoLlmExecutionTools';
import { OpenAiExecutionTools } from '../../../../../src/llm-providers/openai/OpenAiExecutionTools';

const OPENAI_API_KEY_STORAGE_KEY = 'llm-chat-preview-openai-api-key';

export default function LlmChatPreview() {
    const [scenario, setScenario] = useState<string>('mock-basic');
    const [openaiApiKey, setOpenaiApiKey] = useState<string>('');

    // Load API key from localStorage on component mount
    useEffect(() => {
        const savedApiKey = localStorage.getItem(OPENAI_API_KEY_STORAGE_KEY);
        if (savedApiKey) {
            setOpenaiApiKey(savedApiKey);
        }
    }, []);

    // Save API key to localStorage whenever it changes
    useEffect(() => {
        if (openaiApiKey) {
            localStorage.setItem(OPENAI_API_KEY_STORAGE_KEY, openaiApiKey);
        } else {
            localStorage.removeItem(OPENAI_API_KEY_STORAGE_KEY);
        }
    }, [openaiApiKey]);

    const mockedLlmTools = useMemo(() => new MockedEchoLlmExecutionTools({ isVerbose: true }), []);

    const openaiLlmTools = useMemo(() => {
        if (!openaiApiKey) {
            return null;
        }
        try {
            return new OpenAiExecutionTools({
                apiKey: openaiApiKey,
                dangerouslyAllowBrowser: true
            });
        } catch (error) {
            console.error('Failed to create OpenAI tools:', error);
            return null;
        }
    }, [openaiApiKey]);

    const scenarios = {
        'mock-basic': {
            name: 'Mock Chat',
            description: 'Simple chat with mocked echo LLM',
            llmTools: mockedLlmTools,
        },
        'mock-persistent': {
            name: 'Mock Chat (Persistent)',
            description: 'Chat with mocked LLM and localStorage persistence - messages survive page refresh',
            llmTools: mockedLlmTools,
        },
        'openai-basic': {
            name: 'OpenAI Chat',
            description: 'Chat with real OpenAI GPT models',
            llmTools: openaiLlmTools,
        },
        'openai-persistent': {
            name: 'OpenAI Chat (Persistent)',
            description: 'Chat with OpenAI GPT models and localStorage persistence',
            llmTools: openaiLlmTools,
        },
    };

    const handleChange = (messages: ReadonlyArray<ChatMessage>, participants: ReadonlyArray<ChatParticipant>) => {
        console.log('Chat state changed:', { messages: messages.length, participants: participants.length });
    };

    const handleScenarioChange = (newScenario: string) => {
        setScenario(newScenario);
    };

    const handleApiKeyChange = (newApiKey: string) => {
        setOpenaiApiKey(newApiKey);
    };

    const renderChat = () => {
        const currentScenario = scenarios[scenario as keyof typeof scenarios];

        if (!currentScenario) {
            return <div className="text-red-600">Invalid scenario selected</div>;
        }

        if (!currentScenario.llmTools) {
            return (
                <div className="text-red-600 p-4 border border-red-300 rounded-md bg-red-50">
                    <p className="font-medium">OpenAI API Key Required</p>
                    <p className="text-sm mt-1">Please enter your OpenAI API key above to use OpenAI chat scenarios.</p>
                </div>
            );
        }

        const commonProps = {
            llmTools: currentScenario.llmTools,
            onChange: handleChange,
            style: { height: '600px' },
        };

        switch (scenario) {
            case 'mock-basic':
                return <LlmChat {...commonProps} placeholderMessageContent="Ask the mocked echo LLM anything..." />;
            case 'mock-persistent':
                return (
                    <LlmChat
                        {...commonProps}
                        persistenceKey="demo-mock-chat"
                        placeholderMessageContent="This mock chat persists in localStorage - try refreshing the page!"
                    />
                );
            case 'openai-basic':
                return <LlmChat {...commonProps} placeholderMessageContent="Ask OpenAI GPT anything..." />;
            case 'openai-persistent':
                return (
                    <LlmChat
                        {...commonProps}
                        persistenceKey="demo-openai-chat"
                        placeholderMessageContent="This OpenAI chat persists in localStorage - try refreshing the page!"
                    />
                );
            default:
                return <div className="text-red-600">Unknown scenario</div>;
        }
    };

    const currentScenario = scenarios[scenario as keyof typeof scenarios];
    const isOpenAiScenario = scenario.startsWith('openai-');

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">LLM Chat Scenario:</label>
                    <select
                        value={scenario}
                        onChange={(e) => handleScenarioChange(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                    >
                        {Object.entries(scenarios).map(([key, { name }]) => (
                            <option key={key} value={key}>
                                {name}
                            </option>
                        ))}
                    </select>
                </div>

                {isOpenAiScenario && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            OpenAI API Key:
                            <span className="text-xs text-gray-500 ml-1">(stored in localStorage)</span>
                        </label>
                        <input
                            type="password"
                            value={openaiApiKey}
                            onChange={(e) => handleApiKeyChange(e.target.value)}
                            placeholder="sk-..."
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                        {!openaiApiKey && (
                            <p className="text-xs text-red-600 mt-1">
                                API key is required for OpenAI scenarios
                            </p>
                        )}
                    </div>
                )}
            </div>

            {renderChat()}

            <div className="text-sm text-gray-600 space-y-2">
                <p>
                    <strong>Current scenario:</strong> {currentScenario?.name || 'Unknown'}
                </p>
                <p>
                    <strong>Description:</strong> {currentScenario?.description || 'No description available'}
                </p>
                {currentScenario?.llmTools && (
                    <p>
                        <strong>LLM Provider:</strong> {currentScenario.llmTools.title} - {currentScenario.llmTools.description}
                    </p>
                )}
                <div className="bg-blue-50 p-3 rounded-md">
                    <p className="font-medium text-blue-800">How it works:</p>
                    <ul className="text-blue-700 text-xs mt-1 space-y-1">
                        <li>• Type a message and press Enter or click Send</li>
                        <li>• The component manages messages and participants internally</li>
                        {scenario.startsWith('mock-') && (
                            <li>• Uses MockedEchoLlmExecutionTools which echoes back your input</li>
                        )}
                        {scenario.startsWith('openai-') && (
                            <li>• Uses real OpenAI GPT models for intelligent responses</li>
                        )}
                        <li>• Shows loading states and task progress during LLM calls</li>
                        <li>• Automatically generates participants from LLM tools</li>
                        {scenario.includes('persistent') && (
                            <>
                                <li>• <strong>Persistence:</strong> Messages are saved to localStorage</li>
                                <li>• Try refreshing the page - your conversation will be restored!</li>
                                <li>• Use the Reset button to clear both UI and localStorage</li>
                            </>
                        )}
                        {scenario.startsWith('openai-') && (
                            <li>• <strong>Security:</strong> API key is stored locally in your browser</li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
}
