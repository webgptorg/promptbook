import type { CreateUserWalletRecordOptions, UserWalletRecordType } from './UserWalletRecord';
import type { UserWalletInsert, UserWalletJsonSchema } from './UserWalletRow';

/**
 * Normalizes wallet payload and validates scope and record-specific required fields.
 *
 * @private function of `userWallet`
 */
export function normalizeWalletPayload(options: CreateUserWalletRecordOptions): UserWalletInsert {
    const service = options.service.trim().toLowerCase();
    if (!service) {
        throw new Error('Wallet service is required.');
    }

    const key = options.key?.trim() || 'default';
    const isUserScoped = options.isUserScoped === true;
    const isGlobal = options.isGlobal === true;
    const agentPermanentId = isGlobal ? null : options.agentPermanentId?.trim() || null;

    if (!isGlobal && !agentPermanentId) {
        throw new Error('Agent-scoped wallet record requires `agentPermanentId`.');
    }

    const recordType = normalizeWalletRecordType(options.recordType);
    const username = options.username?.trim() || null;
    const password = options.password?.trim() || null;
    const secret = options.secret?.trim() || null;
    const cookies = options.cookies?.trim() || null;
    const jsonSchema = normalizeWalletJsonSchema(options.jsonSchema);

    if (recordType === 'USERNAME_PASSWORD' && (!username || !password)) {
        throw new Error('USERNAME_PASSWORD records require both username and password.');
    }

    if (recordType === 'SESSION_COOKIE' && !cookies) {
        throw new Error('SESSION_COOKIE records require cookies.');
    }

    if (recordType === 'ACCESS_TOKEN' && !secret) {
        throw new Error('ACCESS_TOKEN records require secret.');
    }

    return {
        userId: options.userId,
        isUserScoped,
        agentPermanentId,
        isGlobal,
        recordType,
        service,
        key,
        jsonSchema,
        username,
        password,
        secret,
        cookies,
    };
}

/**
 * Normalizes and validates one wallet record type.
 *
 * @private function of `normalizeWalletPayload`
 */
function normalizeWalletRecordType(value: unknown): UserWalletRecordType {
    if (value === 'USERNAME_PASSWORD') {
        return value;
    }

    if (value === 'SESSION_COOKIE') {
        return value;
    }

    if (value === 'ACCESS_TOKEN') {
        return value;
    }

    throw new Error('Unsupported wallet record type. Use USERNAME_PASSWORD, SESSION_COOKIE, or ACCESS_TOKEN.');
}

/**
 * Normalizes optional wallet JSON schema payload.
 *
 * @private function of `normalizeWalletPayload`
 */
function normalizeWalletJsonSchema(value: unknown): UserWalletJsonSchema {
    if (value === undefined || value === null) {
        return null;
    }

    let normalizedValue: unknown = value;
    if (typeof normalizedValue === 'string') {
        const trimmedValue = normalizedValue.trim();
        if (!trimmedValue) {
            return null;
        }

        try {
            normalizedValue = JSON.parse(trimmedValue);
        } catch {
            throw new Error('Wallet JSON schema must be valid JSON.');
        }
    }

    if (!normalizedValue || typeof normalizedValue !== 'object' || Array.isArray(normalizedValue)) {
        throw new Error('Wallet JSON schema must be a JSON object.');
    }

    try {
        return JSON.parse(JSON.stringify(normalizedValue)) as UserWalletJsonSchema;
    } catch {
        throw new Error('Wallet JSON schema must be serializable JSON.');
    }
}
