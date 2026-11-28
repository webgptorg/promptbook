import JSZip from 'jszip';
import { createRedactedWalletBackupRecord } from './createRedactedWalletBackupRecord';
import { loadAgentRows, loadTableRows, loadUserRows, type ServerBackupContext } from './serverBackupContext';
import { createBackupStem, createUniqueBackupFilename, ensureJsonFilename } from './serverBackupFilenames';
import { createAgentPreviewByPermanentId } from './serverBackupPreviews';
import { groupRowsBy } from './serverBackupRowUtilities';

/**
 * Writes one JSON file per user with related memories, structured data, and redacted wallet entries.
 *
 * @param zip - ZIP archive being assembled.
 * @param sectionRootPath - Root path for the users section.
 * @param context - Shared backup context.
 *
 * @private function of `createServerBackupZipStream`
 */
export async function appendUserBackupEntriesToZip(
    zip: JSZip,
    sectionRootPath: string,
    context: ServerBackupContext,
): Promise<void> {
    const [users, agents, memoryRows, userDataRows, walletRows] = await Promise.all([
        loadUserRows(context),
        loadAgentRows(context),
        loadTableRows(context.supabase, 'UserMemory'),
        loadTableRows(context.supabase, 'UserData'),
        loadTableRows(context.supabase, 'Wallet'),
    ]);
    const usedUserFilenames = new Set<string>();
    const agentPreviewByPermanentId = createAgentPreviewByPermanentId(agents);
    const memoryRowsByUserId = groupRowsBy(memoryRows, (row) => row.userId);
    const userDataRowsByUserId = groupRowsBy(userDataRows, (row) => row.userId);
    const walletRowsByUserId = groupRowsBy(walletRows, (row) => row.userId);

    for (const user of users) {
        const filename = createUniqueBackupFilename(
            usedUserFilenames,
            ensureJsonFilename(createBackupStem([user.username], `user-${user.id}`)),
            `user-${user.id}`,
        );
        const userMemoryRows = memoryRowsByUserId.get(user.id) || [];
        const scopedUserDataRows = userDataRowsByUserId.get(user.id) || [];
        const scopedWalletRows = walletRowsByUserId.get(user.id) || [];

        zip.file(
            `${sectionRootPath}/${filename}`,
            `${JSON.stringify(
                {
                    user: {
                        id: user.id,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt,
                        username: user.username,
                        isAdmin: user.isAdmin,
                        profileImageUrl: user.profileImageUrl,
                    },
                    memories: userMemoryRows.map((row) => ({
                        id: row.id,
                        createdAt: row.createdAt,
                        updatedAt: row.updatedAt,
                        content: row.content,
                        isGlobal: row.isGlobal,
                        deletedAt: row.deletedAt,
                        agent: row.agentPermanentId ? agentPreviewByPermanentId.get(row.agentPermanentId) || null : null,
                    })),
                    data: scopedUserDataRows.map((row) => ({
                        id: row.id,
                        createdAt: row.createdAt,
                        updatedAt: row.updatedAt,
                        key: row.key,
                        value: row.value,
                    })),
                    wallet: scopedWalletRows.map((row) => createRedactedWalletBackupRecord(row, agentPreviewByPermanentId)),
                },
                null,
                2,
            )}\n`,
        );
    }
}
