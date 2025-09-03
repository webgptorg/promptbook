import type { ChatThread } from '../../../execution/ChatThread';
import type { CreateChatThreadOptions } from '../../../execution/ChatThread';
import type { AddMessageToChatThreadOptions } from '../../../execution/ChatThread';
import { createChatThread, addMessageToChatThread } from '../../../execution/utils/chatThreadUtils';

/**
 * Base mixin for adding threading capabilities to LlmExecutionTools implementations
 * This provides common thread management functionality that can be shared across all providers
 */
export abstract class LlmExecutionToolsWithThreading {
    /**
     * Creates a new chat thread
     */
    public createChatThread(options: CreateChatThreadOptions = {}): ChatThread {
        return createChatThread(options);
    }

    /**
     * Adds a message to an existing chat thread
     */
    public addMessageToThread(thread: ChatThread, messageOptions: AddMessageToChatThreadOptions): ChatThread {
        return addMessageToChatThread(thread, messageOptions);
    }
}
