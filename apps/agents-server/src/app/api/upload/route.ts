import type { PostgrestSingleResponse, SupabaseClient } from '@supabase/supabase-js';
import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabase } from '@/src/database/$provideSupabase';
import { serializeError } from '@promptbook-local/utils';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { assertsError } from '../../../../../../src/errors/assertsError';
import { getUserIdFromRequest } from '../../../../src/utils/getUserIdFromRequest';
import { getMetadata } from '../../../database/getMetadata';
import type { AgentsServerDatabase } from '../../../database/schema';

/**
 * Additional metadata accepted from the client-side upload helper.
 *
 * @private
 */
type UploadClientPayload = {
    purpose?: unknown;
    contentType?: unknown;
};

/**
 * Generic object used for safe JSON parsing in upload payloads.
 *
 * @private
 */
type JsonRecord = Record<string, unknown>;

/**
 * Default purpose used for uploads when the client does not provide one.
 *
 * @private
 */
const DEFAULT_UPLOAD_PURPOSE = 'GENERIC_UPLOAD';

/**
 * Default MIME type used for unknown uploads.
 *
 * @private
 */
const DEFAULT_UPLOAD_CONTENT_TYPE = 'application/octet-stream';

/**
 * Minimal MIME type validation for values provided by client payload.
 *
 * @private
 */
const MIME_TYPE_PATTERN = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i;

/**
 * Safely parses a JSON string into an object; returns empty object on invalid payload.
 *
 * @private
 */
function parseJsonRecord(rawJson: string | null | undefined): JsonRecord {
    if (!rawJson) {
        return {};
    }

    try {
        const parsed = JSON.parse(rawJson);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {};
        }

        return parsed as JsonRecord;
    } catch {
        return {};
    }
}

/**
 * Normalizes upload purpose to a non-empty string.
 *
 * @private
 */
function normalizeUploadPurpose(value: unknown): string {
    if (typeof value !== 'string') {
        return DEFAULT_UPLOAD_PURPOSE;
    }

    const normalizedPurpose = value.trim();
    return normalizedPurpose === '' ? DEFAULT_UPLOAD_PURPOSE : normalizedPurpose;
}

/**
 * Normalizes a MIME type string while keeping a safe fallback for unknown values.
 *
 * @private
 */
function normalizeUploadContentType(value: unknown): string {
    if (typeof value !== 'string') {
        return DEFAULT_UPLOAD_CONTENT_TYPE;
    }

    const normalizedContentType = value.trim().toLowerCase();
    if (!MIME_TYPE_PATTERN.test(normalizedContentType)) {
        return DEFAULT_UPLOAD_CONTENT_TYPE;
    }

    return normalizedContentType;
}

/**
 * Extracts normalized upload metadata from client payload.
 *
 * @private
 */
function resolveUploadClientPayload(clientPayload: string | null | undefined): { purpose: string; contentType: string } {
    const payload = parseJsonRecord(clientPayload) as UploadClientPayload;

    return {
        purpose: normalizeUploadPurpose(payload.purpose),
        contentType: normalizeUploadContentType(payload.contentType),
    };
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as HandleUploadBody;
        const userId = await getUserIdFromRequest(request);
        const supabase: SupabaseClient<AgentsServerDatabase> = $provideSupabase();

        // Handle Vercel Blob client upload protocol
        const jsonResponse = await handleUpload({
            body,
            request,
            token: process.env.VERCEL_BLOB_READ_WRITE_TOKEN!,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                // Authenticate user and validate upload

                // Parse client payload for additional metadata
                const { purpose, contentType } = resolveUploadClientPayload(clientPayload);

                let maxFileSizeMb = Number((await getMetadata('MAX_FILE_UPLOAD_SIZE_MB')) || '50'); // <- TODO: [🌲] To /config.ts
                if (Number.isNaN(maxFileSizeMb)) {
                    maxFileSizeMb = 50; // <- TODO: [🌲] To /config.ts
                }
                const maxFileSize = maxFileSizeMb * 1024 * 1024;

                // Generate the proper path with prefix
                // Note: With client uploads, we use the original filename provided by the client
                // The file will be stored at: {pathPrefix}/user/files/{filename}
                const pathPrefix = process.env.NEXT_PUBLIC_CDN_PATH_PREFIX || '';

                // Create a DB record at the start of the upload to track it
                const uploadPurpose = purpose;
                const { data: insertedFile, error: insertError }: PostgrestSingleResponse<Pick<AgentsServerDatabase['public']['Tables']['File']['Row'], 'id'>> = await supabase
                    .from(await $getTableName('File'))
                    .insert({
                        userId: userId || null,
                        fileName: pathname,
                        fileSize: 0, // <- Will be updated when upload completes
                        fileType: contentType,
                        storageUrl: null, // <- To be updated on completion
                        shortUrl: null, // <- To be updated on completion
                        purpose: uploadPurpose,
                        status: 'UPLOADING',
                    })
                    .select('id')
                    .single();

                if (insertError) {
                    console.error('🔼 Failed to create file record:', insertError);
                }

                console.info('🔼 Upload started, tracking file:', {
                    pathname,
                    fileId: insertedFile?.id,
                    purpose: uploadPurpose,
                });

                return {
                    maximumSizeInBytes: maxFileSize,
                    addRandomSuffix: true, // Add random suffix to avoid filename collisions since we can't hash content
                    tokenPayload: JSON.stringify({
                        userId: userId || null,
                        purpose: uploadPurpose,
                        fileId: insertedFile?.id || null,
                        uploadPath: pathname,
                        pathPrefix,
                    }),
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                // !!!!
                // ⚠️ IMPORTANT: This callback is a WEBHOOK called by Vercel's servers AFTER the upload completes
                // - It runs in a DIFFERENT request context (not the original user request)
                // - It WON'T work in local development (Vercel can't reach localhost)
                // - All data must come from tokenPayload (userId, fileId, etc.)
                // - Need to create a fresh supabase client here
                console.info('🔼 Upload completed (webhook callback):', { blob, tokenPayload });

                try {
                    const payload = parseJsonRecord(tokenPayload);
                    const fileId = typeof payload.fileId === 'number' ? payload.fileId : null;
                    const tokenUserId = typeof payload.userId === 'number' ? payload.userId : null;
                    const tokenPurpose = normalizeUploadPurpose(payload.purpose);
                    const uploadPath = typeof payload.uploadPath === 'string' ? payload.uploadPath : null;

                    // Create fresh supabase client for this webhook context
                    const supabase = $provideSupabase();

                    if (fileId) {
                        // Update the existing record by ID
                        const { error: updateError } = await supabase
                            .from(await $getTableName('File'))
                            .update({
                                userId: tokenUserId || null,
                                fileSize: 0, // <- !!!!
                                fileType: blob.contentType,
                                storageUrl: blob.url,
                                // <- TODO: !!!! Split between storageUrl and shortUrl
                                purpose: tokenPurpose,
                                status: 'COMPLETED',
                            })
                            .eq('id', fileId);

                        if (updateError) {
                            console.error('🔼 Failed to update file record:', updateError);
                        } else {
                            console.info('🔼 File record updated successfully:', { fileId, shortUrl: blob.url });
                        }
                    } else if (uploadPath) {
                        // Fallback: Update by uploadPath if fileId is not available
                        const { error: updateError } = await supabase
                            .from(await $getTableName('File'))
                            .update({
                                fileSize: 0, // <- !!!!
                                fileType: blob.contentType,
                                storageUrl: blob.url,
                                status: 'COMPLETED',
                            })
                            .eq('fileName', uploadPath)
                            .eq('status', 'UPLOADING');

                        if (updateError) {
                            console.error('🔼 Failed to update file record by uploadPath:', updateError);
                        }
                    }
                } catch (error) {
                    console.error('🔼 Error in onUploadCompleted:', error);
                }
            },
        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        assertsError(error);

        console.error('🔼', error);

        return new Response(
            JSON.stringify(
                serializeError(error),
                // <- TODO: [🐱‍🚀] Rename `serializeError` to `errorToJson`
                null,
                4,
                // <- TODO: [🐱‍🚀] Allow to configure pretty print for agent server
            ),
            {
                status: 400, // <- TODO: [🐱‍🚀] Make `errorToHttpStatusCode`
                headers: { 'Content-Type': 'application/json' },
            },
        );
    }
}

/**
 * TODO: !!!! Change uploaded URLs from `storageUrl` to `shortUrl`
 * TODO: !!!! Record both `storageUrl` (actual storage location) and `shortUrl` in `File` table
 * TODO: !!!! Record `purpose` in `File` table
 * TODO: !!!! Record `userId` in `File` table
 * TODO: !!!! Record all things into `File` table
 * TODO: !!!! File type (mime type) of `.book` files should be `application/book` <- [🧠] !!!! Best mime type?!
 */
