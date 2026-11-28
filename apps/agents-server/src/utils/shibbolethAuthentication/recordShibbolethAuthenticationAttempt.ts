import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import type { Json } from '@/src/database/schema';
import { getShibbolethAuthenticationAttemptTableName } from './getShibbolethAuthenticationAttemptTableName';
import type { ShibbolethRequestDetails } from './shibbolethAuthenticationTypes';

/**
 * Options for recording a Shibboleth authentication attempt.
 *
 * @private type of `shibbolethAuthentication`
 */
type RecordShibbolethAuthenticationAttemptOptions = {
    readonly stage: string;
    readonly status: string;
    readonly requestDetails?: ShibbolethRequestDetails;
    readonly userId?: number | null;
    readonly email?: string | null;
    readonly displayName?: string | null;
    readonly nameId?: string | null;
    readonly relayState?: string | null;
    readonly errorMessage?: string | null;
    readonly rawAttributes?: Json | null;
};

/**
 * Records one Shibboleth authentication attempt.
 *
 * @param options - Attempt details.
 *
 * @private function of `shibbolethAuthentication`
 */
export async function recordShibbolethAuthenticationAttempt(
    options: RecordShibbolethAuthenticationAttemptOptions,
): Promise<void> {
    try {
        const supabase = $provideSupabaseForServer();
        const tableName = await getShibbolethAuthenticationAttemptTableName();
        const { error } = await supabase.from(tableName).insert({
            stage: options.stage,
            status: options.status,
            userId: options.userId ?? null,
            email: options.email ?? null,
            displayName: options.displayName ?? null,
            nameId: options.nameId ?? null,
            relayState: options.relayState ?? null,
            ip: options.requestDetails?.ip ?? null,
            userAgent: options.requestDetails?.userAgent ?? null,
            errorMessage: options.errorMessage ?? null,
            rawAttributes: options.rawAttributes ?? null,
        } as never);

        if (error) {
            console.error('Failed to record Shibboleth authentication attempt:', error);
        }
    } catch (error) {
        console.error('Failed to record Shibboleth authentication attempt:', error);
    }
}
