import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { SERVERS, SUPABASE_TABLE_PREFIX } from '../../config';

// Note: Re-implementing normalizeTo_PascalCase to avoid importing from @promptbook-local/utils which might have Node.js dependencies
function normalizeTo_PascalCase(text: string): string {
    return text
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => {
            return word.toUpperCase();
        })
        .replace(/\s+/g, '');
}

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

    // Determine the table prefix based on the host
    const host = request.headers.get('host');
    let tablePrefix = SUPABASE_TABLE_PREFIX;

    if (host && SERVERS && SERVERS.length > 0) {
        if (SERVERS.some((server) => server === host)) {
            let serverName = host;
            serverName = serverName.replace(/\.ptbk\.io$/, '');
            serverName = normalizeTo_PascalCase(serverName);
            tablePrefix = `server_${serverName}_`;
        }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase configuration missing for API key validation');
        return {
            isValid: false,
            error: 'Server configuration error',
        };
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });

        const { data, error } = await supabase
            .from(`${tablePrefix}ApiTokens`)
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
