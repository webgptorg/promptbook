'use client';

import { fetchUserChatApiResponse } from './fetchUserChatApiResponse';

/**
 * Executes one user-chat API request and parses the successful JSON response payload.
 *
 * @private function of userChatClient
 */
export async function requestUserChatApi<TResult>(
    path: string,
    requestInit: RequestInit,
    fallbackMessage: string,
): Promise<TResult> {
    const response = await fetchUserChatApiResponse(path, requestInit, fallbackMessage);
    return (await response.json()) as TResult;
}
