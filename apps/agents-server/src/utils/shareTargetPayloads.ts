import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import type { Json } from '@/src/database/schema';
import { FILE_SECURITY_CHECKERS } from '@/src/file-security-checkers';
import { $provideUntrackedCdnForServer } from '@/src/tools/$provideCdnForServer';
import { $provideServer } from '@/src/tools/$provideServer';
import { getUserFileCdnKey } from '@/src/utils/cdn/utils/getUserFileCdnKey';
import { validateMimeType } from '@/src/utils/validators/validateMimeType';
import { normalizeChatAttachments } from '@promptbook-local/core';
import type { TODO_any } from '@promptbook-local/types';
import { after } from 'next/server';
import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../src/errors/DatabaseError';
import { LimitReachedError } from '../../../../src/errors/LimitReachedError';
import { NotAllowed } from '../../../../src/errors/NotAllowed';
import type { ChatAttachment } from '../../../../src/utils/chat/chatAttachments';
import { $randomBase58 } from '../../../../src/utils/random/$randomBase58';
import { getMaxFileUploadSizeBytes } from './serverLimits';
import { isSupportedShareTargetFile } from './shareTarget';

/**
 * Length of generated share-target payload identifiers.
 */
const SHARE_TARGET_PAYLOAD_ID_LENGTH = 18;

/**
 * Default MIME type used when shared files do not provide one.
 */
const DEFAULT_SHARE_TARGET_FILE_MIME_TYPE = 'application/octet-stream';

/**
 * Upload purpose stored for files arriving via the Android share target.
 */
const SHARE_TARGET_FILE_PURPOSE = 'CHAT_ATTACHMENT';

/**
 * One pending share-sheet payload stored until the chat client auto-sends it.
 */
export type ShareTargetPayload = {
    id: string;
    agentPermanentId: string;
    message: string;
    attachments: Array<ChatAttachment>;
    createdAt: string;
    updatedAt: string;
    consumedAt: string | null;
};

/**
 * Raw database row stored for one pending share-target payload.
 */
type ShareTargetPayloadRow = {
    id: string;
    createdAt: string;
    updatedAt: string;
    agentPermanentId: string;
    message: string | null;
    attachments: Json;
    consumedAt: string | null;
};

/**
 * Provides the scoped Supabase query builder for `ShareTargetPayload`.
 */
async function provideShareTargetPayloadTable(): Promise<TODO_any> {
    const supabase = $provideSupabaseForServer() as TODO_any;
    const tableName = await getShareTargetPayloadTableName();

    return supabase.from(tableName);
}

/**
 * Stores one pending share-target payload until the chat UI consumes it.
 */
export async function storeShareTargetPayload(options: {
    agentPermanentId: string;
    message: string;
    attachments: ReadonlyArray<ChatAttachment>;
}): Promise<ShareTargetPayload> {
    const shareTargetPayloadTable = await provideShareTargetPayloadTable();
    const nowIso = new Date().toISOString();
    const insertPayload: ShareTargetPayloadRow = {
        id: $randomBase58(SHARE_TARGET_PAYLOAD_ID_LENGTH),
        createdAt: nowIso,
        updatedAt: nowIso,
        agentPermanentId: options.agentPermanentId,
        message: options.message,
        attachments: serializeShareTargetAttachments(options.attachments),
        consumedAt: null,
    };
    const { data, error } = await shareTargetPayloadTable.insert(insertPayload).select('*').maybeSingle();

    if (error) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to persist the pending Android share-target payload.

                ${error.message}
            `),
        );
    }

    if (!data) {
        throw new DatabaseError('Failed to store the pending Android share-target payload.');
    }

    return mapShareTargetPayloadRow(data as ShareTargetPayloadRow);
}

/**
 * Loads one pending share-target payload without consuming it.
 */
export async function peekShareTargetPayload(options: {
    shareTargetId: string;
    agentPermanentId: string;
}): Promise<ShareTargetPayload | null> {
    const shareTargetPayloadTable = await provideShareTargetPayloadTable();
    const { data, error } = await shareTargetPayloadTable
        .select('*')
        .eq('id', options.shareTargetId)
        .eq('agentPermanentId', options.agentPermanentId)
        .is('consumedAt', null)
        .maybeSingle();

    if (error) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to load the pending Android share-target payload.

                ${error.message}
            `),
        );
    }

    return data ? mapShareTargetPayloadRow(data as ShareTargetPayloadRow) : null;
}

/**
 * Marks one pending share-target payload as consumed after auto-send becomes eligible.
 */
export async function consumeShareTargetPayload(options: {
    shareTargetId: string;
    agentPermanentId: string;
}): Promise<void> {
    const shareTargetPayloadTable = await provideShareTargetPayloadTable();
    const nowIso = new Date().toISOString();
    const { error } = await shareTargetPayloadTable
        .update({
            updatedAt: nowIso,
            consumedAt: nowIso,
        })
        .eq('id', options.shareTargetId)
        .eq('agentPermanentId', options.agentPermanentId)
        .is('consumedAt', null);

    if (error) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to consume the pending Android share-target payload.

                ${error.message}
            `),
        );
    }
}

/**
 * Uploads one or more shared files and converts them into normal chat attachments.
 */
export async function createShareTargetAttachments(files: ReadonlyArray<File>): Promise<Array<ChatAttachment>> {
    if (files.length === 0) {
        return [];
    }

    const maxFileUploadBytes = await resolveMaxFileUploadBytes();

    return Promise.all(files.map((file) => createShareTargetAttachment(file, maxFileUploadBytes)));
}

/**
 * Maps one raw database row into the chat-facing share-target payload shape.
 */
function mapShareTargetPayloadRow(row: ShareTargetPayloadRow): ShareTargetPayload {
    return {
        id: row.id,
        agentPermanentId: row.agentPermanentId,
        message: typeof row.message === 'string' ? row.message : '',
        attachments: normalizeChatAttachments(row.attachments),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        consumedAt: row.consumedAt,
    };
}

/**
 * Serializes readonly chat attachments into mutable JSON data for persistence.
 */
function serializeShareTargetAttachments(attachments: ReadonlyArray<ChatAttachment>): Json {
    return attachments.map((attachment) => ({
        name: attachment.name,
        type: attachment.type,
        url: attachment.url,
    })) as Json;
}

/**
 * Uploads one shared file to blob storage and records it in the `File` admin table.
 */
async function createShareTargetAttachment(file: File, maxFileUploadBytes: number): Promise<ChatAttachment> {
    const normalizedFilename = resolveShareTargetFilename(file.name);
    if (!isSupportedShareTargetFile({ name: normalizedFilename, type: file.type })) {
        throw new NotAllowed(
            spaceTrim(`
                Shared file \`${normalizedFilename}\` is not supported.

                Supported Android share-target files are images and common document formats.
            `),
        );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength > maxFileUploadBytes) {
        throw new LimitReachedError(
            spaceTrim(`
                Shared file \`${normalizedFilename}\` exceeds the configured upload limit.

                Maximum supported size: **${formatMegabytes(maxFileUploadBytes)} MB**
            `),
        );
    }

    const mimeType = resolveShareTargetMimeType(file.type);
    const blobPath = getUserFileCdnKey(buffer, normalizedFilename);
    const cdn = $provideUntrackedCdnForServer();
    await cdn.setItem(blobPath, {
        data: buffer,
        type: mimeType,
        fileSize: buffer.byteLength,
        purpose: SHARE_TARGET_FILE_PURPOSE,
    }).catch((error) => {
        throw new DatabaseError(
            spaceTrim(`
                Failed to upload shared file \`${normalizedFilename}\`.

                ${error instanceof Error ? error.message : String(error)}
            `),
        );
    });
    const storageUrl = cdn.getItemUrl(blobPath).href;
    const fileRecordId = await insertShareTargetFileRecord({
        fileName: normalizedFilename,
        fileSize: buffer.byteLength,
        fileType: mimeType,
        storageUrl,
    });

    if (fileRecordId !== null) {
        after(() =>
            populateShareTargetFileSecurityResult({
                fileId: fileRecordId,
                storageUrl,
            }).catch((error) => {
                console.error('[share-target] Failed to finalize file security result', error);
            }),
        );
    }

    return {
        name: normalizedFilename,
        type: mimeType,
        url: storageUrl,
    };
}

/**
 * Inserts one admin-visible file row for a shared attachment.
 */
async function insertShareTargetFileRecord(options: {
    fileName: string;
    fileSize: number;
    fileType: string;
    storageUrl: string;
}): Promise<number | null> {
    try {
        const supabase = $provideSupabaseForServer() as TODO_any;
        const fileTableName = await $getTableName('File');
        const { data, error } = await supabase
            .from(fileTableName)
            .insert({
                fileName: options.fileName,
                fileSize: options.fileSize,
                fileType: options.fileType,
                storageUrl: options.storageUrl,
                shortUrl: null,
                purpose: SHARE_TARGET_FILE_PURPOSE,
                status: 'COMPLETED',
                agentId: null,
                securityResult: null,
            })
            .select('id')
            .maybeSingle();

        if (error) {
            console.error('[share-target] Failed to store uploaded file metadata', error);
            return null;
        }

        return typeof data?.id === 'number' ? data.id : null;
    } catch (error) {
        console.error('[share-target] Failed to insert shared file metadata', error);
        return null;
    }
}

/**
 * Populates best-effort file-security results after the share redirect has already returned.
 */
async function populateShareTargetFileSecurityResult(options: { fileId: number; storageUrl: string }): Promise<void> {
    const securityResult: Record<string, unknown> = {};

    for (const checkerId of Object.keys(FILE_SECURITY_CHECKERS)) {
        try {
            const checker = FILE_SECURITY_CHECKERS[checkerId]!;
            securityResult[checkerId] = await checker.checkFile(options.storageUrl);
        } catch (error) {
            securityResult[checkerId] = {
                isSafe: false,
                status: 'ERROR',
                confidence: 0,
                message: error instanceof Error ? error.message : String(error),
            };
        }
    }

    if (Object.keys(securityResult).length === 0) {
        return;
    }

    const supabase = $provideSupabaseForServer() as TODO_any;
    const fileTableName = await $getTableName('File');
    const { error } = await supabase
        .from(fileTableName)
        .update({
            securityResult,
        })
        .eq('id', options.fileId);

    if (error) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to update the shared file security result.

                ${error.message}
            `),
        );
    }
}

/**
 * Resolves the prefixed table name used for pending share-target payloads.
 */
async function getShareTargetPayloadTableName(): Promise<string> {
    const { tablePrefix } = await $provideServer();
    return `${tablePrefix}ShareTargetPayload`;
}

/**
 * Resolves the current max upload size from metadata with a stable fallback.
 */
async function resolveMaxFileUploadBytes(): Promise<number> {
    return getMaxFileUploadSizeBytes();
}

/**
 * Resolves one readable filename for a shared attachment.
 */
function resolveShareTargetFilename(rawFilename: string): string {
    const normalizedFilename = rawFilename.trim();
    return normalizedFilename === '' ? 'shared-file' : normalizedFilename;
}

/**
 * Resolves one safe MIME type for a shared attachment upload.
 */
function resolveShareTargetMimeType(rawMimeType: string): string {
    try {
        return validateMimeType(rawMimeType || DEFAULT_SHARE_TARGET_FILE_MIME_TYPE);
    } catch {
        return DEFAULT_SHARE_TARGET_FILE_MIME_TYPE;
    }
}

/**
 * Formats byte sizes into a human-readable megabyte string for validation errors.
 */
function formatMegabytes(bytes: number): string {
    return (bytes / (1024 * 1024)).toFixed(0);
}
