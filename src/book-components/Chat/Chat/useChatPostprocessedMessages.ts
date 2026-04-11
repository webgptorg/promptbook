'use client';

import { useMemo } from 'react';
import { humanizeAiText } from '../../../utils/markdown/humanizeAiText';
import { promptbookifyAiText } from '../../../utils/markdown/promptbookifyAiText';
import type { ChatMessage } from '../types/ChatMessage';
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
              content: promptbookifyAiText(humanizeAiText(messageWithCitations.replyingTo.content)),
          }
        : undefined;

    return {
        ...messageWithCitations,
        content: promptbookifyAiText(humanizeAiText(messageWithCitations.content)),
        ...(normalizedReplyingTo ? { replyingTo: normalizedReplyingTo } : {}),
    };
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
