import type { Profile } from '@node-saml/node-saml';
import { SHIBBOLETH_AUTHENTICATION_METADATA_KEYS } from '@/src/constants/shibbolethAuth';
import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { getMetadataMap } from '@/src/database/getMetadata';
import type { AgentsServerDatabase } from '@/src/database/schema';
import { extractShibbolethProfileAttributes } from './extractShibbolethProfileAttributes';
import { getShibbolethUserIdentityTableName } from './getShibbolethUserIdentityTableName';
import {
    LOCAL_AND_SHIBBOLETH_AUTHENTICATION_PROVIDER,
    LOCAL_AUTHENTICATION_PROVIDER,
    SHIBBOLETH_AUTHENTICATION_PROVIDER,
    SHIBBOLETH_PASSWORDLESS_USER_PASSWORD_HASH,
    SHIBBOLETH_USER_SELECT_COLUMNS,
} from './shibbolethAuthenticationConstants';
import type { ShibbolethProfileAttributes, ShibbolethUserIdentityRow } from './shibbolethAuthenticationTypes';

/**
 * User table row fields needed while linking Shibboleth identities.
 *
 * @private type of `shibbolethAuthentication`
 */
type UserRowWithShibbolethColumns = Pick<
    AgentsServerDatabase['public']['Tables']['User']['Row'],
    'id' | 'username' | 'isAdmin'
> & {
    readonly email?: string | null;
    readonly displayName?: string | null;
    readonly authenticationProvider?: string | null;
};

/**
 * User insert shape with Shibboleth profile columns added by migration.
 *
 * @private type of `shibbolethAuthentication`
 */
type UserInsertWithShibbolethColumns = AgentsServerDatabase['public']['Tables']['User']['Insert'] & {
    readonly email?: string | null;
    readonly displayName?: string | null;
    readonly authenticationProvider?: string | null;
};

/**
 * User update shape with Shibboleth profile columns added by migration.
 *
 * @private type of `shibbolethAuthentication`
 */
type UserUpdateWithShibbolethColumns = AgentsServerDatabase['public']['Tables']['User']['Update'] & {
    readonly email?: string | null;
    readonly displayName?: string | null;
    readonly authenticationProvider?: string | null;
};

/**
 * Result of linking a SAML profile to an Agents Server user.
 *
 * @private type of `shibbolethAuthentication`
 */
type LinkedShibbolethUser = {
    readonly user: UserRowWithShibbolethColumns;
    readonly profileAttributes: ShibbolethProfileAttributes;
};

/**
 * Links a validated SAML profile to an Agents Server user, creating a passwordless user when needed.
 *
 * @param profile - Validated SAML profile from Node-SAML.
 * @returns Linked database user and extracted Shibboleth attributes.
 *
 * @private function of `shibbolethAuthentication`
 */
export async function findOrCreateShibbolethUser(profile: Profile): Promise<LinkedShibbolethUser> {
    const metadata = await getMetadataMap(SHIBBOLETH_AUTHENTICATION_METADATA_KEYS);
    const profileAttributes = extractShibbolethProfileAttributes(profile, metadata);
    const now = new Date().toISOString();
    const existingIdentity =
        (await findShibbolethIdentityByNameId(profileAttributes.nameId)) ||
        (await findShibbolethIdentityByEmail(profileAttributes.email));
    let user = existingIdentity ? await findUserRowById(existingIdentity.userId) : null;

    if (!user) {
        user = await findUserRowByEmail(profileAttributes.email);
    }

    if (!user) {
        user = await findUserRowByUsername(profileAttributes.email);
    }

    if (!user) {
        user = await insertShibbolethUser(profileAttributes, now);
    } else {
        user = await updateLinkedShibbolethUser(user, profileAttributes, now);
    }

    await upsertShibbolethIdentity(user, profileAttributes, existingIdentity, now);

    return {
        user,
        profileAttributes,
    };
}

/**
 * Finds one Shibboleth identity by persistent NameID.
 *
 * @private function of `shibbolethAuthentication`
 */
async function findShibbolethIdentityByNameId(nameId: string | null): Promise<ShibbolethUserIdentityRow | null> {
    if (!nameId) {
        return null;
    }

    const supabase = $provideSupabaseForServer();
    const tableName = await getShibbolethUserIdentityTableName();
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('nameId' as never, nameId as never)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to resolve Shibboleth identity by NameID: ${error.message}`);
    }

    return (data as ShibbolethUserIdentityRow | null) || null;
}

/**
 * Finds one Shibboleth identity by email.
 *
 * @private function of `shibbolethAuthentication`
 */
async function findShibbolethIdentityByEmail(email: string): Promise<ShibbolethUserIdentityRow | null> {
    const supabase = $provideSupabaseForServer();
    const tableName = await getShibbolethUserIdentityTableName();
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('email' as never, email as never)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to resolve Shibboleth identity by email: ${error.message}`);
    }

    return (data as ShibbolethUserIdentityRow | null) || null;
}

/**
 * Finds one user row by database id.
 *
 * @private function of `shibbolethAuthentication`
 */
async function findUserRowById(userId: number): Promise<UserRowWithShibbolethColumns | null> {
    const supabase = $provideSupabaseForServer();
    const { data, error } = await supabase
        .from(await $getTableName('User'))
        .select(SHIBBOLETH_USER_SELECT_COLUMNS)
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to resolve Shibboleth user by id: ${error.message}`);
    }

    return (data as UserRowWithShibbolethColumns | null) || null;
}

/**
 * Finds one user row by email.
 *
 * @private function of `shibbolethAuthentication`
 */
async function findUserRowByEmail(email: string): Promise<UserRowWithShibbolethColumns | null> {
    const supabase = $provideSupabaseForServer();
    const { data, error } = await supabase
        .from(await $getTableName('User'))
        .select(SHIBBOLETH_USER_SELECT_COLUMNS)
        .eq('email' as never, email as never)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to resolve Shibboleth user by email: ${error.message}`);
    }

    return (data as UserRowWithShibbolethColumns | null) || null;
}

/**
 * Finds one user row by username.
 *
 * @private function of `shibbolethAuthentication`
 */
async function findUserRowByUsername(username: string): Promise<UserRowWithShibbolethColumns | null> {
    const supabase = $provideSupabaseForServer();
    const { data, error } = await supabase
        .from(await $getTableName('User'))
        .select(SHIBBOLETH_USER_SELECT_COLUMNS)
        .eq('username', username)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to resolve Shibboleth user by username: ${error.message}`);
    }

    return (data as UserRowWithShibbolethColumns | null) || null;
}

/**
 * Inserts a new passwordless Shibboleth user.
 *
 * @private function of `shibbolethAuthentication`
 */
async function insertShibbolethUser(
    profileAttributes: ShibbolethProfileAttributes,
    now: string,
): Promise<UserRowWithShibbolethColumns> {
    const supabase = $provideSupabaseForServer();
    const userInsert: UserInsertWithShibbolethColumns = {
        username: profileAttributes.email,
        passwordHash: SHIBBOLETH_PASSWORDLESS_USER_PASSWORD_HASH,
        isAdmin: false,
        email: profileAttributes.email,
        displayName: profileAttributes.displayName,
        authenticationProvider: SHIBBOLETH_AUTHENTICATION_PROVIDER,
        createdAt: now,
        updatedAt: now,
    };
    const { data, error } = await supabase
        .from(await $getTableName('User'))
        .insert(userInsert)
        .select(SHIBBOLETH_USER_SELECT_COLUMNS)
        .single();

    if (error) {
        throw new Error(`Failed to create Shibboleth user: ${error.message}`);
    }

    return data as unknown as UserRowWithShibbolethColumns;
}

/**
 * Updates Shibboleth profile columns on an existing user row.
 *
 * @private function of `shibbolethAuthentication`
 */
async function updateLinkedShibbolethUser(
    user: UserRowWithShibbolethColumns,
    profileAttributes: ShibbolethProfileAttributes,
    now: string,
): Promise<UserRowWithShibbolethColumns> {
    const supabase = $provideSupabaseForServer();
    const nextAuthenticationProvider =
        user.authenticationProvider === LOCAL_AUTHENTICATION_PROVIDER || !user.authenticationProvider
            ? LOCAL_AND_SHIBBOLETH_AUTHENTICATION_PROVIDER
            : user.authenticationProvider;
    const userUpdate: UserUpdateWithShibbolethColumns = {
        email: profileAttributes.email,
        displayName: profileAttributes.displayName,
        authenticationProvider: nextAuthenticationProvider,
        updatedAt: now,
    };
    const { data, error } = await supabase
        .from(await $getTableName('User'))
        .update(userUpdate)
        .eq('id', user.id)
        .select(SHIBBOLETH_USER_SELECT_COLUMNS)
        .single();

    if (error) {
        throw new Error(`Failed to update Shibboleth user: ${error.message}`);
    }

    return data as unknown as UserRowWithShibbolethColumns;
}

/**
 * Creates or updates the Shibboleth identity link.
 *
 * @private function of `shibbolethAuthentication`
 */
async function upsertShibbolethIdentity(
    user: UserRowWithShibbolethColumns,
    profileAttributes: ShibbolethProfileAttributes,
    existingIdentity: ShibbolethUserIdentityRow | null,
    now: string,
): Promise<void> {
    const supabase = $provideSupabaseForServer();
    const tableName = await getShibbolethUserIdentityTableName();
    const identityPayload = {
        userId: user.id,
        email: profileAttributes.email,
        displayName: profileAttributes.displayName,
        nameId: profileAttributes.nameId,
        nameIdFormat: profileAttributes.nameIdFormat,
        unstructuredName: profileAttributes.unstructuredName,
        eduPersonPrincipalName: profileAttributes.eduPersonPrincipalName,
        rawAttributes: profileAttributes.rawAttributes,
        lastLoggedInAt: now,
        loginCount: Number(existingIdentity?.loginCount || 0) + 1,
        updatedAt: now,
    };

    if (existingIdentity) {
        const { error } = await supabase
            .from(tableName)
            .update(identityPayload as never)
            .eq('id' as never, existingIdentity.id as never);
        if (error) {
            throw new Error(`Failed to update Shibboleth identity: ${error.message}`);
        }
        return;
    }

    const { error } = await supabase.from(tableName).insert({
        ...identityPayload,
        createdAt: now,
    } as never);

    if (error) {
        throw new Error(`Failed to create Shibboleth identity: ${error.message}`);
    }
}
