'use client';

import { book, createAgentLlmExecutionTools } from '@promptbook-local/core';
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
                dangerouslyAllowBrowser: true,
            });
        } catch (error) {
            console.error('Failed to create OpenAI tools:', error);
            return null;
        }
    }, [openaiApiKey]);

    const agentLlmTools = useMemo(() => {
        if (!openaiLlmTools) {
            return null;
        }
        try {
            return createAgentLlmExecutionTools({
                llmTools: openaiLlmTools,
                agentSource: book`
                    Pavol Hejný

                    PERSONA Pavol Hejný. Interested in Coding, AI, Business
                    META LINK https://www.facebook.com/hejny
                    META IMAGE https://collboard.fra1.cdn.digitaloceanspaces.com/ptbk/social-images/scontent-lga3-1.xx.fbcdn.net/78/78b62041a759f07e57da163985ee20d21e1bef612a031f3243066c0ece166d53.jpg

                    STYLE 1. **Tone and Voice**: The overall tone across the posts varies from casual to professional, interspersed with humorous elements. The voice is generally informative, with a conversational style that often engages the reader directly, particularly when discussing technical or AI-related topics.

                    2. **Language Patterns**: The author uses a mix of technical jargon related to AI, coding, and technology ("CRUD formulářů", "AI agenti", "LLM prompty") and more casual, approachable language. There is frequent use of rhetorical questions and direct questions to the audience, indicating a reflective and inclusive communication approach.

                    3. **Communication Style**: The posts are primarily direct and informative, with a clear focus on engaging the audience by sharing insights, asking questions, and offering information through links and prompts. Storytelling is evident when discussing past events or future possibilities, particularly within the AI and tech community.

                    4. **Personality Traits**: The posts reflect a curious, innovative, and forward-thinking personality, with a strong inclination towards humor, community involvement, and education.

                    5. **Content Themes**: Key themes include technological advancements, AI developments, coding, community hackathons, and general tech community activities. There's a strong focus on AI's practical applications and theoretical questions about its future.

                    6. **Formatting Preferences**: The use of emojis and hashtags is moderately frequent, enhancing the casual tone of some posts. Line breaks are used to separate thoughts and ideas clearly. There is also notable use of exaggerated letter elongation for emphasis ("veeeeeeeelká") and philosophical or pseudo-scientific formatting in some humorous posts.

                    7. **Engagement Style**: Engagement with the audience is proactive, with questions posed directly to readers and calls to action ("Doražte dneska večer"). Posts are designed to stimulate conversation and reflection among the readers.

                    **Concise Summary:**

                    1. **Core Voice Characteristics**: The core traits of Pavol Hejný's writing include a conversational and approachable voice, combined with a professional and reflective tone when discussing technology and AI.

                    2. **Distinctive Language Patterns**: He frequently employs technical terminology related to AI and coding, coupled with a casual language style that includes the use of emojis and rhetorical questions to engage the audience.

                    3. **Communication Approach**: His messages are mainly structured in an informative yet direct manner, often incorporating questions and direct calls to action that encourage interactivity and engagement from the audience.

                    4. **Personality Expression**: His personality shines through as innovative, community-oriented, and humorous, particularly when discussing complex AI topics or reflecting on technological advancements in a casual, approachable manner.


                    RULE Add button suggestions for quick user actions, for example:

                    [Say Hello](?message=Hello!)
                    [Ask for help](?message=I need help with ...)
                    [Just say thanks](?message=Thanks!)
                `,
            });
        } catch (error) {
            console.error('Failed to create Agent tools:', error);
            return null;
        }
    }, [openaiLlmTools]);

    const scenarios = {
        'mock-basic': {
            name: 'Mocked Chat (No storage)',
            description: 'Simple chat with mocked echo LLM',
            llmTools: mockedLlmTools,
        },
        'mock-persistent': {
            name: 'Mocked Chat (Persistent)',
            description: 'Chat with mocked LLM and localStorage persistence - messages survive page refresh',
            llmTools: mockedLlmTools,
        },
        openai: {
            name: 'OpenAI Chat',
            description: 'Chat with OpenAI GPT models',
            llmTools: openaiLlmTools,
        },
        'pavol-hejny-agent': {
            name: 'Pavol Hejny`s Agent',
            description: 'Chat with Agent representing Pavol Hejny based on Promptbook persona',
            llmTools: agentLlmTools,
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
                return (
                    <LlmChat
                        {...commonProps}
                        placeholderMessageContent="Ask the mocked echo LLM anything..."
                        isFocusedOnLoad={false}
                        isSaveButtonEnabled={true}
                    />
                );
            case 'mock-persistent':
                return (
                    <LlmChat
                        {...commonProps}
                        persistenceKey="demo-mock-chat"
                        placeholderMessageContent="This mock chat persists in localStorage - try refreshing the page!"
                        isFocusedOnLoad={false}
                        isSaveButtonEnabled={true}
                    />
                );
            case 'openai':
                return (
                    <LlmChat
                        {...commonProps}
                        persistenceKey="demo-openai-chat"
                        placeholderMessageContent="This OpenAI chat persists in localStorage - try refreshing the page!"
                        isFocusedOnLoad={false}
                        isSaveButtonEnabled={true}
                    />
                );
            case 'pavol-hejny-agent':
                return (
                    <LlmChat
                        {...commonProps}
                        persistenceKey="demo-pavol-hejny-agent"
                        placeholderMessageContent="This Pavol Hejny's Agent chat persists in localStorage - try refreshing the page!"
                        isFocusedOnLoad={false}
                        isSaveButtonEnabled={true}
                    />
                );
            default:
                return <div className="text-red-600">Unknown scenario</div>;
        }
    };

    const currentScenario = scenarios[scenario as keyof typeof scenarios];
    const isOpenAiScenario = scenario.startsWith('openai');

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
                            <p className="text-xs text-red-600 mt-1">API key is required for OpenAI scenarios</p>
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
                        <strong>LLM Provider:</strong> {currentScenario.llmTools.title} -{' '}
                        {currentScenario.llmTools.description}
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
                                <li>
                                    • <strong>Persistence:</strong> Messages are saved to localStorage
                                </li>
                                <li>• Try refreshing the page - your conversation will be restored!</li>
                                <li>• Use the Reset button to clear both UI and localStorage</li>
                            </>
                        )}
                        {scenario.startsWith('openai-') && (
                            <li>
                                • <strong>Security:</strong> API key is stored locally in your browser
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
}
