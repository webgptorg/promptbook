'use client';

import { useMemo } from 'react';
import { humanizeAiText } from '../../../utils/markdown/humanizeAiText';
import { promptbookifyAiText } from '../../../utils/markdown/promptbookifyAiText';
import type { ChatMessage } from '../types/ChatMessage';
import { decodeJsonUnicodeEscapesInMarkdownText } from '../utils/decodeJsonUnicodeEscapesInMarkdownText';
import { extractCitationsFromMessage } from '../utils/parseCitationsFromContent';

/**
 * Inputs required to normalize rendered chat messages.
 *
 * @private function of `useChatPostprocessedMessages`
 */
type UseChatPostprocessedMessagesProps = {
    messages: ReadonlyArray<ChatMessage>;
    isAiTextHumanizedAndPromptbookified: boolean;
};

/**
 * Applies the same text normalization that Chat historically performed inline.
 *
 * @param message - Rendered chat message to normalize.
 * @returns Message with extracted citations and normalized rich-text fields.
 *
 * @private function of `useChatPostprocessedMessages`
 */
function postprocessChatMessage(message: ChatMessage): ChatMessage {
    const messageWithCitations = extractCitationsFromMessage(message);
    const normalizedReplyingTo = messageWithCitations.replyingTo
        ? {
              ...messageWithCitations.replyingTo,
              content: postprocessChatMessageContent(messageWithCitations.replyingTo.content),
          }
        : undefined;

    return {
        ...messageWithCitations,
        content: postprocessChatMessageContent(messageWithCitations.content),
        ...(normalizedReplyingTo ? { replyingTo: normalizedReplyingTo } : {}),
    };
}

/**
 * Applies markdown-safe text normalization to one chat message content value.
 *
 * @private utility of `useChatPostprocessedMessages`
 */
function postprocessChatMessageContent(content: ChatMessage['content']): ChatMessage['content'] {
    const decodedContent = decodeJsonUnicodeEscapesInMarkdownText(content);
    return promptbookifyAiText(humanizeAiText(decodedContent));
}

/**
 * Memoizes the render-only message normalization used by `<Chat/>`.
 *
 * @private function of `<Chat/>`
 */
export function useChatPostprocessedMessages({
    messages,
    isAiTextHumanizedAndPromptbookified,
}: UseChatPostprocessedMessagesProps): ReadonlyArray<ChatMessage> {
    return useMemo<ReadonlyArray<ChatMessage>>(() => {
        if (!isAiTextHumanizedAndPromptbookified) {
            return messages;
        }

        return messages.map(postprocessChatMessage);
    }, [messages, isAiTextHumanizedAndPromptbookified]);
}
