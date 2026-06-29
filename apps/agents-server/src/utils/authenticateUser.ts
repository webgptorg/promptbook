import { $getTableName } from '../database/$getTableName';
import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';
import { AgentsServerDatabase } from '../database/schema';
import { verifyPassword } from './auth';
import {
    AUTHENTICATION_ATTEMPT_PURPOSES,
    checkAuthenticationAttemptRateLimit,
    createAuthenticationAttemptRateLimitErrorMessage,
    recordAuthenticationAttempt,
    recordRateLimitedAuthenticationAttempt,
    type AuthenticationAttemptPurpose,
    type AuthenticationAttemptRateLimitRejection,
} from './authenticationAttemptRateLimit';
import { isAdminPasswordEqual } from './isAdminPasswordEqual';

/**
 * Type describing authenticated user.
 *
 * @private internal Agents Server type
 */
export type AuthenticatedUser = {
    username: string;
    isAdmin: boolean;
    isGlobalAdmin?: boolean;
};

/**
 * Rate-limited authentication result for login surfaces.
 *
 * @private internal Agents Server type
 */
export type RateLimitedAuthenticationResult =
    | {
          readonly isRateLimited: true;
          readonly rateLimitRejection: AuthenticationAttemptRateLimitRejection;
          readonly message: string;
      }
    | {
          readonly isRateLimited: false;
          readonly user: AuthenticatedUser | null;
      };

/**
 * Options for password-checking login surfaces.
 *
 * @private internal Agents Server type
 */
export type RateLimitedAuthenticationOptions = {
    readonly requestIp: string;
    readonly purpose?: AuthenticationAttemptPurpose;
};

/**
 * Authenticates a user and records failed/successful login attempts with route-level rate limiting.
 *
 * @param username - Submitted username.
 * @param password - Submitted password.
 * @param options - Request identity and purpose for rate limiting and forensic logs.
 * @returns Authentication result, or a rate-limit rejection.
 *
 * @private internal Agents Server helper
 */
export async function authenticateUserWithRateLimit(
    username: string,
    password: string,
    options: RateLimitedAuthenticationOptions,
): Promise<RateLimitedAuthenticationResult> {
    const purpose = options.purpose ?? AUTHENTICATION_ATTEMPT_PURPOSES.LOGIN;
    const rateLimitDecision = checkAuthenticationAttemptRateLimit({
        requestIp: options.requestIp,
        username,
    });

    if (!rateLimitDecision.isAllowed) {
        recordRateLimitedAuthenticationAttempt({
            requestIp: options.requestIp,
            username,
            purpose,
            rejection: rateLimitDecision,
        });

        return {
            isRateLimited: true,
            rateLimitRejection: rateLimitDecision,
            message: createAuthenticationAttemptRateLimitErrorMessage(rateLimitDecision),
        };
    }

    const user = await authenticateUser(username, password);

    recordAuthenticationAttempt({
        requestIp: options.requestIp,
        username,
        purpose,
        isSuccessful: user !== null,
    });

    return {
        isRateLimited: false,
        user,
    };
}

/**
 * Handles authenticate user.
 *
 * @param username - Submitted username.
 * @param password - Submitted password.
 * @returns Authenticated user or `null` when credentials do not match.
 *
 * @private internal Agents Server helper
 */
export async function authenticateUser(username: string, password: string): Promise<AuthenticatedUser | null> {
    // 1. Check if it's the environment admin
    if (username === 'admin' && isAdminPasswordEqual(password)) {
        return { username: 'admin', isAdmin: true, isGlobalAdmin: true };
    }

    // 2. Check DB users
    try {
        const supabase = $provideSupabaseForServer();
        const { data: user, error } = await supabase
            .from(await $getTableName('User'))
            .select('*')
            .eq('username', username)
            .single();

        if (error || !user) {
            return null;
        }

        const userRow = user as AgentsServerDatabase['public']['Tables']['User']['Row'];
        const isValid = await verifyPassword(password, userRow.passwordHash);

        if (!isValid) {
            return null;
        }

        return { username: userRow.username, isAdmin: userRow.isAdmin, isGlobalAdmin: false };
    } catch (error) {
        console.error('Authentication error:', error);
        return null;
    }
}
