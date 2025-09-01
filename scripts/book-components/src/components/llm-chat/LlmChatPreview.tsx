'use client';

import { useMemo, useState } from 'react';
import { LlmChat } from '../../../../../src/book-components/Chat/LlmChat/LlmChat';
import type { ChatMessage } from '../../../../../src/book-components/Chat/types/ChatMessage';
import type { ChatParticipant } from '../../../../../src/book-components/Chat/types/ChatParticipant';
import { MockedEchoLlmExecutionTools } from '../../../../../src/llm-providers/mocked/MockedEchoLlmExecutionTools';

export default function LlmChatPreview() {
    const [scenario, setScenario] = useState<string>('basic');
    const llmTools = useMemo(() => new MockedEchoLlmExecutionTools({ isVerbose: true }), []);

    const scenarios = {
        basic: {
            name: 'Mock Chat',
            description: 'Simple chat with mocked echo LLM',
        },
    };

    const handleChange = (messages: ReadonlyArray<ChatMessage>, participants: ReadonlyArray<ChatParticipant>) => {
        console.log('Chat state changed:', { messages: messages.length, participants: participants.length });
    };


    const handleScenarioChange = (newScenario: string) => {
        setScenario(newScenario);
    };

    const renderChat = () => {
        const commonProps = {
            llmTools,
            onChange: handleChange,
            style: { height: '600px' },
        };

        switch (scenario) {
            case 'basic':
                return <LlmChat {...commonProps} placeholderMessageContent="Ask the mocked echo LLM anything..." />;

           
            default:
                return <></>;
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">LLM Chat Scenario:</label>
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

            {renderChat()}

            <div className="text-sm text-gray-600 space-y-2">
                <p>
                    <strong>Current scenario:</strong> {scenarios[scenario as keyof typeof scenarios].name}
                </p>
                <p>
                    <strong>Description:</strong> {scenarios[scenario as keyof typeof scenarios].description}
                </p>
                <p>
                    <strong>LLM Provider:</strong> {llmTools.title} - {llmTools.description}
                </p>
                <div className="bg-blue-50 p-3 rounded-md">
                    <p className="font-medium text-blue-800">How it works:</p>
                    <ul className="text-blue-700 text-xs mt-1 space-y-1">
                        <li>• Type a message and press Enter or click Send</li>
                        <li>• The component manages messages and participants internally</li>
                        <li>• Uses MockedEchoLlmExecutionTools which echoes back your input</li>
                        <li>• Shows loading states and task progress during LLM calls</li>
                        <li>• Automatically generates participants from LLM tools</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
