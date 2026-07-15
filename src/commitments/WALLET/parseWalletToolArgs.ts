import type {
    DeleteWalletRecordToolArgs,
    RequestWalletRecordToolArgs,
    RetrieveWalletRecordsToolArgs,
    StoreWalletRecordToolArgs,
    UpdateWalletRecordToolArgs,
    WalletRecordType,
    WalletRequestRecord,
    WalletToolRecord,
} from './WalletToolRuntimeAdapter';

/**
 * Parsed payload for retrieving wallet records.
 *
 * @private type of WalletCommitmentDefinition
 */
type ParsedRetrieveWalletRecordsArgs = {
    query?: string;
    recordType?: WalletRecordType;
    service?: string;
    key?: string;
    limit?: number;
};

/**
 * Parsed payload for updating an existing wallet record.
 *
 * @private type of WalletCommitmentDefinition
 */
type ParsedUpdateWalletRecordArgs = WalletToolRecord & {
    walletId: string;
};

/**
 * Parses store/update wallet payload.
 *
 * @private function of WalletCommitmentDefinition
 */
function parseWalletPayload(args: StoreWalletRecordToolArgs): WalletToolRecord {
    const recordType = parseWalletRecordType(args.recordType);
    return {
        recordType,
        service: parseWalletService(args.service),
        key: parseWalletKey(args.key),
        isUserScoped: args.isUserScoped === true,
        isGlobal: args.isGlobal === true,
        ...parseWalletSecrets({
            recordType,
            username: args.username,
            password: args.password,
            secret: args.secret,
            cookies: args.cookies,
        }),
    };
}

/**
 * Parses text argument and returns trimmed text when available.
 *
 * @private function of WalletCommitmentDefinition
 */
function normalizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed || undefined;
}

/**
 * Parses wallet service argument.
 *
 * @private function of WalletCommitmentDefinition
 */
function parseWalletService(value: unknown): string {
    return (normalizeOptionalText(value) || 'generic').toLowerCase();
}

/**
 * Parses wallet key argument.
 *
 * @private function of WalletCommitmentDefinition
 */
function parseWalletKey(value: unknown): string {
    return normalizeOptionalText(value) || 'default';
}

/**
 * Parses one wallet record id argument.
 *
 * @private function of WalletCommitmentDefinition
 */
function parseWalletId(value: unknown): string {
    const walletId = normalizeOptionalText(value);
    if (!walletId) {
        throw new Error('Wallet id is required.');
    }
    return walletId;
}

/**
 * Parses wallet record type.
 *
 * @private function of WalletCommitmentDefinition
 */
function parseWalletRecordType(value: unknown, fallback?: WalletRecordType): WalletRecordType {
    const normalizedType = normalizeOptionalText(value)?.toUpperCase();

    if (normalizedType === 'USERNAME_PASSWORD') {
        return 'USERNAME_PASSWORD';
    }
    if (normalizedType === 'SESSION_COOKIE') {
        return 'SESSION_COOKIE';
    }
    if (normalizedType === 'ACCESS_TOKEN') {
        return 'ACCESS_TOKEN';
    }
    if (fallback) {
        return fallback;
    }

    throw new Error('Unsupported wallet recordType. Expected one of: USERNAME_PASSWORD, SESSION_COOKIE, ACCESS_TOKEN.');
}

/**
 * Parses wallet secret fields according to record type.
 *
 * @private function of WalletCommitmentDefinition
 */
function parseWalletSecrets(args: {
    recordType: WalletRecordType;
    username?: unknown;
    password?: unknown;
    secret?: unknown;
    cookies?: unknown;
}): {
    username?: string;
    password?: string;
    secret?: string;
    cookies?: string;
} {
    const username = normalizeOptionalText(args.username);
    const password = normalizeOptionalText(args.password);
    const secret = normalizeOptionalText(args.secret);
    const cookies = normalizeOptionalText(args.cookies);

    if (args.recordType === 'USERNAME_PASSWORD') {
        if (!username || !password) {
            throw new Error('Both username and password are required for USERNAME_PASSWORD.');
        }
        return { username, password };
    }

    if (args.recordType === 'SESSION_COOKIE') {
        if (!cookies) {
            throw new Error('Cookies are required for SESSION_COOKIE.');
        }
        return { cookies };
    }

    if (!secret) {
        throw new Error('Secret is required for ACCESS_TOKEN.');
    }

    return { secret };
}

/**
 * Collection of WALLET tool argument parsers.
 *
 * @private function of WalletCommitmentDefinition
 */
export const parseWalletToolArgs = {
    /**
     * Parses retrieve arguments.
     */
    retrieve(args: RetrieveWalletRecordsToolArgs): ParsedRetrieveWalletRecordsArgs {
        const limit =
            typeof args.limit === 'number' && Number.isFinite(args.limit) ? Math.floor(args.limit) : undefined;

        return {
            query: normalizeOptionalText(args.query),
            recordType: normalizeOptionalText(args.recordType) ? parseWalletRecordType(args.recordType) : undefined,
            service: normalizeOptionalText(args.service) ? parseWalletService(args.service) : undefined,
            key: normalizeOptionalText(args.key) ? parseWalletKey(args.key) : undefined,
            limit: limit && limit > 0 ? Math.min(limit, 20) : undefined,
        };
    },

    /**
     * Parses store payload.
     */
    store(args: StoreWalletRecordToolArgs): WalletToolRecord {
        return parseWalletPayload(args);
    },

    /**
     * Parses update payload.
     */
    update(args: UpdateWalletRecordToolArgs): ParsedUpdateWalletRecordArgs {
        const walletId = parseWalletId(args.walletId);
        const record = parseWalletPayload(args);

        return {
            ...record,
            walletId,
        };
    },

    /**
     * Parses delete payload.
     */
    delete(args: DeleteWalletRecordToolArgs): { walletId: string } {
        return { walletId: parseWalletId(args.walletId) };
    },

    /**
     * Parses request payload for user wallet input prompt.
     */
    request(args: RequestWalletRecordToolArgs): WalletRequestRecord {
        return {
            recordType: parseWalletRecordType(args.recordType, 'ACCESS_TOKEN'),
            service: parseWalletService(args.service),
            key: parseWalletKey(args.key),
            message: normalizeOptionalText(args.message),
            isUserScoped: args.isUserScoped === true,
            isGlobal: args.isGlobal === true,
        };
    },
};
