'use client';

import { createAnonymousUserRequestHeaders } from '../anonymousUserClient';
import { resolveUserChatApiError } from './resolveUserChatApiError';

/**
 * Executes one browser-originated request against the user-chat API and validates the response.
 *
 * @private function of userChatClient
 */
export async function fetchUserChatApiResponse(
    path: string,
    requestInit: RequestInit,
    fallbackMessage: string,
): Promise<Response> {
    const response = await fetch(path, {
        ...requestInit,
        headers: createAnonymousUserRequestHeaders(requestInit.headers),
    });

    if (!response.ok) {
        throw await resolveUserChatApiError(response, fallbackMessage);
    }

    return response;
}
