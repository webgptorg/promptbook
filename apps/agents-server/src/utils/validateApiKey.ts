import { NextRequest } from 'next/server';
import { $getTableName } from '../database/$getTableName';
import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';

/**
 * Result of Api key validation.
 */
export type ApiKeyValidationResult = {
    isValid: boolean;
    token?: string;
    error?: string;
};

/**
 * Validates an API key from the Authorization header.
 * Returns validation result with status and optional error message.
 *
 * Note: This function provides explicit API key validation in addition to middleware.
 * Use this when you need to verify API key validity and return specific error messages.
 */
export async function validateApiKey(request: NextRequest): Promise<ApiKeyValidationResult> {
    const authHeader = request.headers.get('authorization');

    // If no auth header, check if user has a session cookie (logged in via web)
    if (!authHeader) {
        const hasSession = request.cookies.has('sessionToken');
        if (hasSession) {
            return { isValid: true };
        }
        return {
            isValid: false,
            error: 'Missing Authorization header. Provide a valid API key using "Authorization: Bearer ptbk_..."',
        };
    }

    if (!authHeader.startsWith('Bearer ')) {
        return {
            isValid: false,
            error: 'Invalid Authorization header format. Expected "Bearer <token>"',
        };
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return {
            isValid: false,
            error: 'No token provided in Authorization header',
        };
    }

    if (!token.startsWith('ptbk_')) {
        return {
            isValid: false,
            error: 'Invalid API key format. API keys must start with "ptbk_"',
        };
    }

    try {
        const supabase = $provideSupabaseForServer();

        const { data, error } = await supabase
            .from(await $getTableName(`ApiTokens`))
            .select('id, isRevoked')
            .eq('token', token)
            .single();

        if (error || !data) {
            return {
                isValid: false,
                error: 'Invalid API key',
            };
        }

        if (data.isRevoked) {
            return {
                isValid: false,
                error: 'API key has been revoked',
            };
        }

        return {
            isValid: true,
            token,
        };
    } catch (error) {
        console.error('Error validating API key:', error);
        return {
            isValid: false,
            error: 'Error validating API key',
        };
    }
}
