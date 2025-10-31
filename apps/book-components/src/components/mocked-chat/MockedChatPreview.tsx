'use client';

import { useState } from 'react';
import spaceTrim from 'spacetrim';
import type { MockedChatDelayConfig } from '../../../../../src/book-components/Chat/MockedChat/MockedChat';
import { MockedChat } from '../../../../../src/book-components/Chat/MockedChat/MockedChat';
import { MOCKED_CHAT_DELAY_CONFIGS } from '../../../../../src/book-components/Chat/MockedChat/constants';
import type { ChatMessage } from '../../../../../src/book-components/Chat/types/ChatMessage';
import type { ChatParticipant } from '../../../../../src/book-components/Chat/types/ChatParticipant';

export default function MockedChatPreview() {
    const PREDEFINED_CONFIG_NAMES = Object.keys(MOCKED_CHAT_DELAY_CONFIGS);

    const [selectedConfigName, setSelectedConfigName] = useState<string>('NORMAL_FLOW');
    const [delayConfig, setDelayConfig] = useState<MockedChatDelayConfig>({ ...MOCKED_CHAT_DELAY_CONFIGS.NORMAL_FLOW });

    function handleSelectConfig(e: React.ChangeEvent<HTMLSelectElement>) {
        const configName = e.target.value;
        setSelectedConfigName(configName);
        // Deep copy to avoid mutation
        setDelayConfig(JSON.parse(JSON.stringify(MOCKED_CHAT_DELAY_CONFIGS[configName])));
    }

    // Sample participants
    const participants: Array<ChatParticipant> = [
        {
            name: 'USER',
            fullname: 'You',
            isMe: true,
            color: '#1D4ED8',
        },
        {
            name: 'ASSISTANT',
            fullname: 'AI Assistant',
            color: '#10b981',
            avatarSrc: 'https://randomuser.me/api/portraits/men/0.jpg',
        },
    ];

    // Sample messages for demonstration
    const messages: ChatMessage[] = [
        {
            id: '1',
            date: new Date(),
            from: 'USER',
            content: 'Hello! Can you help me understand how MockedChat works?',
            isComplete: true,
        },
        {
            id: '2',
            date: new Date(),
            from: 'ASSISTANT',
            content:
                'Of course! MockedChat simulates realistic typing behavior with configurable delays between words and messages.',
            isComplete: true,
        },
        {
            id: '3',
            date: new Date(),
            from: 'USER',
            content: 'That sounds really useful for demos and presentations.',
            isComplete: true,
        },
        {
            id: '4',
            date: new Date(),
            from: 'ASSISTANT',
            content:
                'Exactly! You can customize the timing to create more realistic chat demonstrations. The component supports delays before first message, thinking time between messages, and word-by-word typing simulation.',
            isComplete: true,
        },
        {
            id: '5',
            date: new Date(),
            from: 'USER',
            content: 'Great! How do I adjust those delays?',
            isComplete: true,
        },
        {
            id: '6',
            date: new Date(),
            from: 'ASSISTANT',
            content:
                'You can adjust the delays using the `delayConfig` prop, which accepts values in milliseconds for various delay types.',
            isComplete: true,
        },
        {
            id: '7',
            date: new Date(),
            from: 'USER',
            content: 'Thanks for the explanation! This will definitely enhance my presentations.',
            isComplete: true,
        },
        {
            id: '8',
            date: new Date(),
            from: 'ASSISTANT',
            content: "You're welcome! If you have any more questions, feel free to ask.",
            isComplete: true,
        },
        {
            id: '9',
            date: new Date(),
            from: 'USER',
            content: 'One last thing, can you show me an example of a longer message?',
            isComplete: true,
        },
        {
            id: '10',
            date: new Date(),
            from: 'ASSISTANT',
            content: spaceTrim(`

                Certainly! Here is an example of a longer message that demonstrates how the \`MockedChat\` component can handle more extensive content.

                This message is designed to showcase the word-by-word typing simulation feature, allowing you to see how each word appears sequentially,
                creating a more engaging and realistic chat experience. You can adjust the delay settings to make the typing speed faster or slower, depending on your presentation needs.
                This flexibility ensures that you can tailor the chat flow to suit the context of your demonstration, whether it's a quick interaction or a more detailed conversation.

                I hope this gives you a clear idea of how to utilize the \`MockedChat\` component effectively in your projects!

                `),
            isComplete: true,
        },
    ];

    const handleDelayChange = (key: keyof MockedChatDelayConfig, value: number) => {
        setDelayConfig((prev) => ({ ...prev, [key]: value }));
        setSelectedConfigName('CUSTOM');
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Delay Configuration</h3>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Predefined Config</label>
                    <select
                        value={selectedConfigName}
                        onChange={handleSelectConfig}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
                    >
                        {PREDEFINED_CONFIG_NAMES.map((name) => (
                            <option key={name} value={name}>
                                {name.replace('_', ' ')}
                            </option>
                        ))}
                        <option value="CUSTOM">Custom</option>
                    </select>
                    <div className="text-xs text-gray-500 mt-1">
                        {selectedConfigName !== 'CUSTOM'
                            ? `Using ${selectedConfigName.replace('_', ' ')} config`
                            : 'Custom configuration'}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Before First Message (ms)
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="10000"
                            step="100"
                            value={
                                typeof delayConfig.beforeFirstMessage === 'number'
                                    ? delayConfig.beforeFirstMessage
                                    : Array.isArray(delayConfig.beforeFirstMessage)
                                    ? delayConfig.beforeFirstMessage[0]
                                    : 1000
                            }
                            onChange={(e) => handleDelayChange('beforeFirstMessage', parseInt(e.target.value))}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Thinking Between Messages (ms)
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="10000"
                            step="100"
                            value={
                                typeof delayConfig.thinkingBetweenMessages === 'number'
                                    ? delayConfig.thinkingBetweenMessages
                                    : Array.isArray(delayConfig.thinkingBetweenMessages)
                                    ? delayConfig.thinkingBetweenMessages[0]
                                    : 2000
                            }
                            onChange={(e) => handleDelayChange('thinkingBetweenMessages', parseInt(e.target.value))}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Wait After Word (ms)</label>
                        <input
                            type="number"
                            min="0"
                            max="1000"
                            step="10"
                            value={
                                typeof delayConfig.waitAfterWord === 'number'
                                    ? delayConfig.waitAfterWord
                                    : Array.isArray(delayConfig.waitAfterWord)
                                    ? delayConfig.waitAfterWord[0]
                                    : 100
                            }
                            onChange={(e) => handleDelayChange('waitAfterWord', parseInt(e.target.value))}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Extra Word Delay (ms)</label>
                        <input
                            type="number"
                            min="0"
                            max="500"
                            step="10"
                            value={
                                typeof delayConfig.extraWordDelay === 'number'
                                    ? delayConfig.extraWordDelay
                                    : Array.isArray(delayConfig.extraWordDelay)
                                    ? delayConfig.extraWordDelay[0]
                                    : 50
                            }
                            onChange={(e) => handleDelayChange('extraWordDelay', parseInt(e.target.value))}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Long Pause Chance (0-1)</label>
                        <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            value={delayConfig.longPauseChance ?? 0.2}
                            onChange={(e) => handleDelayChange('longPauseChance', parseFloat(e.target.value))}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Long Pause Duration Min (ms)
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="10000"
                            step="100"
                            value={
                                Array.isArray(delayConfig.longPauseDuration) ? delayConfig.longPauseDuration[0] : 1200
                            }
                            onChange={(e) =>
                                setDelayConfig((prev) => ({
                                    ...prev,
                                    longPauseDuration: [
                                        parseInt(e.target.value),
                                        Array.isArray(prev.longPauseDuration) ? prev.longPauseDuration[1] : 3500,
                                    ],
                                }))
                            }
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Long Pause Duration Max (ms)
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="10000"
                            step="100"
                            value={
                                Array.isArray(delayConfig.longPauseDuration) ? delayConfig.longPauseDuration[1] : 3500
                            }
                            onChange={(e) =>
                                setDelayConfig((prev) => ({
                                    ...prev,
                                    longPauseDuration: [
                                        Array.isArray(prev.longPauseDuration) ? prev.longPauseDuration[0] : 1200,
                                        parseInt(e.target.value),
                                    ],
                                }))
                            }
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
                        />
                    </div>
                </div>

                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                    <p>
                        <strong>Tip:</strong> Adjust the delays to see how they affect the typing simulation. Lower
                        values make typing faster, higher values create more dramatic pauses.
                    </p>
                </div>
            </div>

            <MockedChat
                title="Mocked Chat"
                style={{ height: '500px' }}
                messages={messages}
                participants={participants}
                delayConfig={delayConfig}
                placeholderMessageContent="" // <- Note: No `placeholderMessageContent` to keep it clean
                isFocusedOnLoad={false}
                isSaveButtonEnabled={false}
                isCopyButtonEnabled={false}
                isResettable={true}
                isPausable={false}
            />

            <div className="text-sm text-gray-600">
                <p>
                    <strong>Component:</strong> MockedChat
                </p>
                <p>
                    <strong>Messages:</strong> {messages.length} sample messages
                </p>
                <p>
                    <strong>Features:</strong> Word-by-word typing simulation, configurable delays, realistic chat flow
                </p>
            </div>
        </div>
    );
}
