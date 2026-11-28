'use client';

import type { StreamUserChatOptions, UserChatDetail } from '../userChatClient';
import { fetchUserChatApiResponse } from './fetchUserChatApiResponse';

/**
 * One newline-delimited frame emitted by the canonical user-chat stream endpoint.
 */
type UserChatStreamFrame =
    | {
          type: 'snapshot';
          payload: UserChatDetail;
      }
    | {
          type: 'keepalive';
      };

/**
 * Parses and dispatches one newline-delimited chat stream frame.
 */
function processUserChatStreamLine(line: string, onSnapshot: (chatDetail: UserChatDetail) => void): void {
    const normalizedLine = line.trim();
    if (!normalizedLine) {
        return;
    }

    const frame = JSON.parse(normalizedLine) as UserChatStreamFrame;
    if (frame.type === 'snapshot') {
        onSnapshot(frame.payload);
    }
}

/**
 * Streams canonical chat snapshots for one active user chat until the request is aborted or the connection ends.
 *
 * @private shared helper for the Agents Server browser client
 */
export async function streamUserChat(
    agentName: string,
    chatId: string,
    options: StreamUserChatOptions,
): Promise<void> {
    const response = await fetchUserChatApiResponse(
        `/agents/${encodeURIComponent(agentName)}/api/user-chats/${encodeURIComponent(chatId)}/stream`,
        {
            method: 'GET',
            cache: 'no-store',
            signal: options.signal,
        },
        'Failed to stream chat.',
    );

    if (!response.body) {
        throw new Error('Chat stream did not include a readable body.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let bufferedText = '';

    try {
        let isDoneReading = false;

        while (!isDoneReading) {
            const { done, value } = await reader.read();
            bufferedText += decoder.decode(value || new Uint8Array(), { stream: !done });
            const lines = bufferedText.split('\n');
            bufferedText = lines.pop() || '';

            for (const line of lines) {
                processUserChatStreamLine(line, options.onSnapshot);
            }

            if (done) {
                isDoneReading = true;
            }
        }

        if (bufferedText.trim().length > 0) {
            processUserChatStreamLine(bufferedText, options.onSnapshot);
        }
    } finally {
        reader.releaseLock();
    }
}
