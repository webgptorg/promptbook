'use client';
import { useEffect, useState } from 'react';
import { forTime } from 'waitasecond';
import { Chat } from '../../Chat/Chat/Chat';
import type { ChatProps } from '../../Chat/Chat/ChatProps';
import type { ChatMessage } from '../../Chat/types/ChatMessage';

/**
 * Delay configuration for the MockedChat component
 *
 * @public exported from `@promptbook/components`
 */
export type MockedChatDelayConfig = {
    /**
     * Delay before showing the first message (in milliseconds)
     * @default 1000
     */
    beforeFirstMessage?: number;

    /**
     * Emulated thinking time between messages (in milliseconds)
     * @default 2000
     */
    thinkingBetweenMessages?: number;

    /**
     * Wait time after each written word (in milliseconds)
     * @default 100
     */
    waitAfterWord?: number;

    /**
     * Extra delay on top of the word waiting (in milliseconds)
     * @default 50
     */
    extraWordDelay?: number;
};

/**
 * Props for MockedChat component
 *
 * @public exported from `@promptbook/components`
 */
export type MockedChatProps = ChatProps & {
    /**
     * Optional delays configuration for emulating typing behavior
     */
    delayConfig?: MockedChatDelayConfig;
};

/**
 * MockedChat component that shows the same chat as Chat but emulates ongoing discussion
 * with realistic typing delays and thinking pauses.
 *
 * @public exported from `@promptbook/components`
 */
export function MockedChat(props: MockedChatProps) {
    const { delayConfig, messages: originalMessages, ...chatProps } = props;

    // Default delay configuration
    const delays: Required<MockedChatDelayConfig> = {
        beforeFirstMessage: delayConfig?.beforeFirstMessage ?? 1000,
        thinkingBetweenMessages: delayConfig?.thinkingBetweenMessages ?? 2000,
        waitAfterWord: delayConfig?.waitAfterWord ?? 100,
        extraWordDelay: delayConfig?.extraWordDelay ?? 50,
        ...delayConfig,
    };

    const [displayedMessages, setDisplayedMessages] = useState<ReadonlyArray<ChatMessage>>([]);
    const [isSimulationComplete, setIsSimulationComplete] = useState(false);

    useEffect(() => {
        let isCancelled = false;

        const simulateChat = async () => {
            // Reset state
            setDisplayedMessages([]);
            setIsSimulationComplete(false);

            if (originalMessages.length === 0) {
                setIsSimulationComplete(true);
                return;
            }

            // Wait before first message
            await forTime(delays.beforeFirstMessage);
            if (isCancelled) return;

            for (let i = 0; i < originalMessages.length; i++) {
                if (isCancelled) return;

                const currentMessage = originalMessages[i];
                if (!currentMessage) continue;

                // Add thinking delay between messages (except for the first one)
                if (i > 0) {
                    await forTime(delays.thinkingBetweenMessages);
                    if (isCancelled) return;
                }

                // Show incomplete message first (for typing effect)
                const incompleteMessage: ChatMessage = {
                    id: currentMessage.id,
                    date: currentMessage.date,
                    from: currentMessage.from,
                    content: '',
                    isComplete: false,
                    expectedAnswer: currentMessage.expectedAnswer,
                    isVoiceCall: currentMessage.isVoiceCall,
                };

                setDisplayedMessages(prev => [...prev, incompleteMessage]);

                // Split message content into words
                const words = currentMessage.content.split(' ');
                let currentContent = '';

                // Type each word with delay
                for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
                    if (isCancelled) return;

                    const word = words[wordIndex];
                    currentContent += (wordIndex > 0 ? ' ' : '') + word;

                    // Update the message with current content
                    const updatingMessage: ChatMessage = {
                        id: currentMessage.id,
                        date: currentMessage.date,
                        from: currentMessage.from,
                        content: currentContent,
                        isComplete: false,
                        expectedAnswer: currentMessage.expectedAnswer,
                        isVoiceCall: currentMessage.isVoiceCall,
                    };

                    setDisplayedMessages(prev => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1] = updatingMessage;
                        return newMessages;
                    });

                    // Wait after word with extra delay
                    await forTime(delays.waitAfterWord + delays.extraWordDelay);
                    if (isCancelled) return;
                }

                // Mark message as complete
                const completeMessage: ChatMessage = {
                    id: currentMessage.id,
                    date: currentMessage.date,
                    from: currentMessage.from,
                    content: currentMessage.content,
                    isComplete: true,
                    expectedAnswer: currentMessage.expectedAnswer,
                    isVoiceCall: currentMessage.isVoiceCall,
                };

                setDisplayedMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = completeMessage;
                    return newMessages;
                });

                // Small pause after completing the message
                await forTime(200);
                if (isCancelled) return;
            }

            setIsSimulationComplete(true);
        };

        simulateChat().catch(error => {
            if (!isCancelled) {
                console.error('Error in MockedChat simulation:', error);
                // Fallback to showing all messages immediately
                setDisplayedMessages(originalMessages);
                setIsSimulationComplete(true);
            }
        });

        return () => {
            isCancelled = true;
        };
    }, [originalMessages, delays.beforeFirstMessage, delays.thinkingBetweenMessages, delays.waitAfterWord, delays.extraWordDelay]);

    // Use the internal Chat component with simulated messages
    return (
        <Chat
            {...chatProps}
            messages={displayedMessages}
            // Disable input during simulation unless explicitly completed
            onMessage={isSimulationComplete ? chatProps.onMessage : undefined}
        />
    );
}
