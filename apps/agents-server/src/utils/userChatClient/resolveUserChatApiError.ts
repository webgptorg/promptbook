'use client';

import { UserChatApiError } from './UserChatApiError';

/**
 * Structured payload returned by user-chat API errors.
 */
type UserChatApiErrorPayload = {
    error?: unknown;
    code?: unknown;
    details?: unknown;
};

/**
 * Normalizes unknown API payload to one structured error payload object.
 */
function normalizeUserChatApiErrorPayload(payload: unknown): UserChatApiErrorPayload {
    if (!payload || typeof payload !== 'object') {
        return {};
    }

    return payload as UserChatApiErrorPayload;
}

/**
 * Resolves best-effort user-facing error message from API payload.
 */
function resolveUserChatApiErrorMessage(payload: UserChatApiErrorPayload, fallbackMessage: string): string {
    if (typeof payload.error === 'string' && payload.error.trim().length > 0) {
        return payload.error;
    }

    return fallbackMessage;
}

/**
 * Resolves best-effort machine-readable API error code.
 */
function resolveUserChatApiErrorCode(payload: UserChatApiErrorPayload): string | null {
    if (typeof payload.code === 'string' && payload.code.trim().length > 0) {
        return payload.code;
    }

    return null;
}

/**
 * Resolves friendly error from failed user-chat API response.
 *
 * @private function of userChatClient
 */
export async function resolveUserChatApiError(response: Response, fallbackMessage: string): Promise<UserChatApiError> {
    const rawPayload = await response.json().catch(() => ({}));
    const payload = normalizeUserChatApiErrorPayload(rawPayload);

    return new UserChatApiError(resolveUserChatApiErrorMessage(payload, fallbackMessage), {
        status: response.status,
        code: resolveUserChatApiErrorCode(payload),
        details: payload.details,
        url: response.url,
    });
}
