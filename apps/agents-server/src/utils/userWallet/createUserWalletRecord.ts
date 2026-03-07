import type { CreateUserWalletRecordOptions, UserWalletRecord, UserWalletRecordType } from './UserWalletRecord';
import { findExistingWalletRecord } from './findExistingWalletRecord';
import { mapUserWalletRow } from './mapUserWalletRow';
import { normalizeWalletPayload } from './normalizeWalletPayload';
import { provideUserWalletTable } from './provideUserWalletTable';
import { updateUserWalletRecord } from './updateUserWalletRecord';

/**
 * Creates one wallet record or updates existing record with the same scope identity.
 */
export async function createUserWalletRecord(options: CreateUserWalletRecordOptions): Promise<UserWalletRecord> {
    const payload = normalizeWalletPayload(options);
    const existing = await findExistingWalletRecord(payload);
    if (existing) {
        return updateUserWalletRecord({
            userId: options.userId,
            walletId: existing.id,
            agentPermanentId: payload.agentPermanentId ?? null,
            isUserScoped: payload.isUserScoped ?? false,
            isGlobal: payload.isGlobal ?? false,
            recordType: payload.recordType as UserWalletRecordType,
            service: payload.service,
            key: payload.key,
            jsonSchema: payload.jsonSchema,
            username: payload.username ?? undefined,
            password: payload.password ?? undefined,
            secret: payload.secret ?? undefined,
            cookies: payload.cookies ?? undefined,
        });
    }

    const userWalletTable = await provideUserWalletTable();
    const now = new Date().toISOString();
    const { data, error } = await userWalletTable
        .insert({
            ...payload,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
        })
        .select('*')
        .single();

    if (error || !data) {
        throw new Error(error?.message || 'Failed to create wallet record.');
    }

    return mapUserWalletRow(data);
}
