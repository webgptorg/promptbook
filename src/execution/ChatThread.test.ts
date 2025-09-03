import { createChatThread, addMessageToChatThread, convertThreadToOpenAIMessages } from './utils/chatThreadUtils';

describe('ChatThread', () => {
    test('should create an empty chat thread', () => {
        const thread = createChatThread();
        
        expect(thread.id).toBeDefined();
        expect(thread.messages).toHaveLength(0);
        expect(thread.createdAt).toBeInstanceOf(Date);
        expect(thread.updatedAt).toBeInstanceOf(Date);
    });

    test('should create a chat thread with system message', () => {
        const systemMessage = 'You are a helpful assistant.';
        const thread = createChatThread({ systemMessage });
        
        expect(thread.messages).toHaveLength(1);
        expect(thread.messages[0].role).toBe('system');
        expect(thread.messages[0].content).toBe(systemMessage);
    });

    test('should add messages to a thread', () => {
        const thread = createChatThread();
        
        const threadWithUser = addMessageToChatThread(thread, {
            role: 'user',
            content: 'Hello!',
            name: 'USER',
        });
        
        expect(threadWithUser.messages).toHaveLength(1);
        expect(threadWithUser.messages[0].role).toBe('user');
        expect(threadWithUser.messages[0].content).toBe('Hello!');
        expect(threadWithUser.messages[0].name).toBe('USER');
        
        const threadWithAssistant = addMessageToChatThread(threadWithUser, {
            role: 'assistant',
            content: 'Hi there!',
            name: 'ASSISTANT',
        });
        
        expect(threadWithAssistant.messages).toHaveLength(2);
        expect(threadWithAssistant.messages[1].role).toBe('assistant');
        expect(threadWithAssistant.messages[1].content).toBe('Hi there!');
    });

    test('should convert thread to OpenAI format', () => {
        const thread = createChatThread({ systemMessage: 'You are helpful.' });
        
        const threadWithMessages = addMessageToChatThread(
            addMessageToChatThread(thread, {
                role: 'user',
                content: 'Hello!',
                name: 'USER',
            }),
            {
                role: 'assistant',
                content: 'Hi there!',
                name: 'ASSISTANT',
            }
        );
        
        const openAIMessages = convertThreadToOpenAIMessages(threadWithMessages);
        
        expect(openAIMessages).toHaveLength(3);
        expect(openAIMessages[0]).toEqual({
            role: 'system',
            content: 'You are helpful.',
        });
        expect(openAIMessages[1]).toEqual({
            role: 'user',
            content: 'Hello!',
            name: 'USER',
        });
        expect(openAIMessages[2]).toEqual({
            role: 'assistant',
            content: 'Hi there!',
            name: 'ASSISTANT',
        });
    });

    test('should update thread timestamps when adding messages', () => {
        const thread = createChatThread();
        const originalUpdatedAt = thread.updatedAt;
        
        // Wait a bit to ensure timestamp difference
        setTimeout(() => {
            const updatedThread = addMessageToChatThread(thread, {
                role: 'user',
                content: 'Test message',
            });
            
            expect(updatedThread.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
        }, 10);
    });
});
