import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../../database/schema';
import { normalizeEmailAddressForIdentity } from './agentEmailAddress';

/**
 * Authentication marker for users created from inbound email.
 */
const EMAIL_AUTHENTICATION_PROVIDER = 'EMAIL';

/**
 * Non-login password marker for users created from inbound email.
 */
const EMAIL_PASSWORDLESS_USER_PASSWORD_HASH = 'email-passwordless-user';

/**
 * User fields added by the external-authentication migration but not present in the generated base schema.
 */
type EmailAdHocUserInsert = AgentsServerDatabase['public']['Tables']['User']['Insert'] & {
    readonly email: string;
    readonly displayName: null;
    readonly authenticationProvider: typeof EMAIL_AUTHENTICATION_PROVIDER;
};

/**
 * Finds or creates the passwordless ad-hoc user representing an email sender.
 */
export async function findOrCreateEmailAdHocUser(sender: string): Promise<{ readonly id: number; readonly email: string }> {
    const email = normalizeEmailAddressForIdentity(sender);
    const supabase = await $provideSupabaseForServer();
    const tableName = await $getTableName('User');
    const { data: existingUser, error: findError } = await supabase
        .from(tableName)
        .select('id, username')
        .eq('username', email)
        .maybeSingle();

    if (findError) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to find the ad-hoc email user \`${email}\`.

                **Cause:** \`${findError.message}\`
            `),
        );
    }

    if (existingUser) {
        return { id: existingUser.id, email };
    }

    const now = new Date().toISOString();
    const insertPayload: EmailAdHocUserInsert = {
        username: email,
        passwordHash: EMAIL_PASSWORDLESS_USER_PASSWORD_HASH,
        isAdmin: false,
        email,
        displayName: null,
        authenticationProvider: EMAIL_AUTHENTICATION_PROVIDER,
        createdAt: now,
        updatedAt: now,
    };
    const { data: insertedUser, error: insertError } = await supabase
        .from(tableName)
        .insert(insertPayload)
        .select('id, username')
        .single();

    if (!insertError && insertedUser) {
        return { id: insertedUser.id, email };
    }

    if (insertError?.code === '23505') {
        const { data: racedUser, error: raceFindError } = await supabase
            .from(tableName)
            .select('id, username')
            .eq('username', email)
            .single();

        if (!raceFindError && racedUser) {
            return { id: racedUser.id, email };
        }
    }

    throw new DatabaseError(
        spaceTrim(`
            Failed to create the ad-hoc email user \`${email}\`.

            **Cause:** \`${insertError?.message || 'The database did not return the created user.'}\`
        `),
    );
}
