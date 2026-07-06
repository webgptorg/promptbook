import { normalizeOptionalText } from './serverBackupRowUtilities';
import type { BackupAgentPreview, WalletRow } from './serverBackupTypes';

/**
 * Creates the redacted wallet representation written into per-user backups.
 *
 * @param walletRow - Persisted wallet row.
 * @param agentPreviewByPermanentId - Agent preview lookup for scoped records.
 * @returns Redacted wallet record safe for backup export.
 *
 * @private function of `createServerBackupZipStream`
 */
export function createRedactedWalletBackupRecord(
    walletRow: WalletRow,
    agentPreviewByPermanentId: ReadonlyMap<string, BackupAgentPreview>,
): Record<string, unknown> {
    return {
        id: walletRow.id,
        createdAt: walletRow.createdAt,
        updatedAt: walletRow.updatedAt,
        isUserScoped: walletRow.isUserScoped,
        isGlobal: walletRow.isGlobal,
        deletedAt: walletRow.deletedAt,
        recordType: walletRow.recordType,
        service: walletRow.service,
        key: walletRow.key,
        jsonSchema: walletRow.jsonSchema,
        username: walletRow.username,
        agent: walletRow.agentPermanentId ? agentPreviewByPermanentId.get(walletRow.agentPermanentId) || null : null,
        hasPassword: Boolean(normalizeOptionalText(walletRow.password)),
        hasSecret: Boolean(normalizeOptionalText(walletRow.secret)),
        hasCookies: Boolean(normalizeOptionalText(walletRow.cookies)),
    };
}
