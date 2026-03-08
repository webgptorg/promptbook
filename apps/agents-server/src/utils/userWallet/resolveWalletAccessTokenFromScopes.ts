import type { UserWalletRow } from './UserWalletRow';
import { provideUserWalletTable } from './provideUserWalletTable';

/**
 * Options for resolving wallet access token from scoped fallbacks.
 *
 * @private function of `userWallet`
 */
type ResolveWalletAccessTokenFromScopesOptions = {
    userId?: number;
    agentPermanentId?: string;
    service: string;
    key: string;
    errorContext: string;
};

/**
 * Finds latest wallet access token by one exact scope key.
 *
 * @private function of `resolveWalletAccessTokenFromScopes`
 */
type FindLatestWalletAccessTokenOptions = {
    userId?: number;
    isUserScoped: boolean;
    isGlobal: boolean;
    agentPermanentId?: string;
    service: string;
    key: string;
    errorContext: string;
};

/**
 * Token lookup options with one optional ownership preference.
 *
 * @private function of `resolveWalletAccessTokenFromScopes`
 */
type FetchLatestWalletAccessTokenOptions = FindLatestWalletAccessTokenOptions & {
    ownerUserId?: number;
};

/**
 * Resolves wallet access token from all supported scope combinations.
 *
 * @private function of `userWallet`
 */
export async function resolveWalletAccessTokenFromScopes(
    options: ResolveWalletAccessTokenFromScopesOptions,
): Promise<string | undefined> {
    if (options.agentPermanentId) {
        const userAndAgentScoped = await findLatestWalletAccessToken({
            userId: options.userId,
            isUserScoped: true,
            isGlobal: false,
            agentPermanentId: options.agentPermanentId,
            service: options.service,
            key: options.key,
            errorContext: options.errorContext,
        });
        if (userAndAgentScoped) {
            return userAndAgentScoped;
        }

        const agentScoped = await findLatestWalletAccessToken({
            userId: options.userId,
            isUserScoped: false,
            isGlobal: false,
            agentPermanentId: options.agentPermanentId,
            service: options.service,
            key: options.key,
            errorContext: options.errorContext,
        });
        if (agentScoped) {
            return agentScoped;
        }
    }

    const userScoped = await findLatestWalletAccessToken({
        userId: options.userId,
        isUserScoped: true,
        isGlobal: true,
        service: options.service,
        key: options.key,
        errorContext: options.errorContext,
    });
    if (userScoped) {
        return userScoped;
    }

    return findLatestWalletAccessToken({
        userId: options.userId,
        isUserScoped: false,
        isGlobal: true,
        service: options.service,
        key: options.key,
        errorContext: options.errorContext,
    });
}

/**
 * Finds latest wallet access token by exact scope.
 *
 * @private function of `resolveWalletAccessTokenFromScopes`
 */
async function findLatestWalletAccessToken(options: FindLatestWalletAccessTokenOptions): Promise<string | undefined> {
    if (options.isUserScoped && !options.userId) {
        return undefined;
    }

    if (!options.isGlobal && !options.agentPermanentId) {
        return undefined;
    }

    if (!options.isUserScoped && options.userId) {
        const preferredOwnedToken = await fetchLatestWalletAccessToken({
            ...options,
            ownerUserId: options.userId,
        });
        if (preferredOwnedToken) {
            return preferredOwnedToken;
        }
    }

    return fetchLatestWalletAccessToken(options);
}

/**
 * Fetches latest wallet access token using one optional owner-user preference.
 *
 * @private function of `resolveWalletAccessTokenFromScopes`
 */
async function fetchLatestWalletAccessToken(options: FetchLatestWalletAccessTokenOptions): Promise<string | undefined> {
    const userWalletTable = await provideUserWalletTable();
    let query = userWalletTable
        .select('*')
        .eq('isUserScoped', options.isUserScoped)
        .eq('recordType', 'ACCESS_TOKEN')
        .eq('service', options.service)
        .eq('key', options.key)
        .is('deletedAt', null)
        .order('updatedAt', { ascending: false })
        .limit(1);

    if (options.ownerUserId) {
        query = query.eq('userId', options.ownerUserId);
    } else if (options.isUserScoped && options.userId) {
        query = query.eq('userId', options.userId);
    }

    if (options.isGlobal) {
        query = query.eq('isGlobal', true).is('agentPermanentId', null);
    } else {
        query = query.eq('isGlobal', false).eq('agentPermanentId', options.agentPermanentId || '');
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
        throw new Error(`Failed to resolve ${options.errorContext} token from wallet: ${error.message}`);
    }

    const row = data as UserWalletRow | null;
    const token = row?.secret?.trim();
    return token || undefined;
}
