import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabase } from '@/src/database/$provideSupabase';
import { $provideUntrackedCdnForServer } from '@/src/tools/$provideCdnForServer';
import { getSafeCdnPath } from '@/src/utils/cdn/utils/getSafeCdnPath';
import { serializeError } from '@promptbook-local/utils';
import type { PostgrestSingleResponse, SupabaseClient } from '@supabase/supabase-js';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { assertsError } from '../../../../../../src/errors/assertsError';
import { DatabaseError } from '../../../../../../src/errors/DatabaseError';
import { LimitReachedError } from '../../../../../../src/errors/LimitReachedError';
import { NotAllowed } from '../../../../../../src/errors/NotAllowed';
import { getUserIdFromRequest } from '../../../../src/utils/getUserIdFromRequest';
import type { AgentsServerDatabase } from '../../../database/schema';
import { FILE_SECURITY_CHECKERS } from '../../../file-security-checkers';
import { getMaxFileUploadSizeBytes } from '../../../utils/serverLimits';

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
 * Form-data field containing the uploaded file for S3-backed server uploads.
 *
 * @private
 */
const SERVER_ROUTED_UPLOAD_FILE_FIELD = 'file';

/**
 * Form-data field containing the requested CDN object key for S3-backed server uploads.
 *
 * @private
 */
const SERVER_ROUTED_UPLOAD_PATHNAME_FIELD = 'pathname';

/**
 * Form-data field containing upload purpose for S3-backed server uploads.
 *
 * @private
 */
const SERVER_ROUTED_UPLOAD_PURPOSE_FIELD = 'purpose';

/**
 * Form-data field containing content type for S3-backed server uploads.
 *
 * @private
 */
const SERVER_ROUTED_UPLOAD_CONTENT_TYPE_FIELD = 'contentType';

/**
 * Multipart content type prefix used by server-routed S3 uploads.
 *
 * @private
 */
const MULTIPART_FORM_DATA_CONTENT_TYPE = 'multipart/form-data';

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
function resolveUploadClientPayload(clientPayload: string | null | undefined): {
    purpose: string;
    contentType: string;
} {
    const payload = parseJsonRecord(clientPayload) as UploadClientPayload;

    return {
        purpose: normalizeUploadPurpose(payload.purpose),
        contentType: normalizeUploadContentType(payload.contentType),
    };
}

/**
 * Checks whether the upload request uses the server-routed multipart protocol.
 *
 * @private
 */
function isServerRoutedUploadRequest(request: NextRequest): boolean {
    return (request.headers.get('content-type') || '').toLowerCase().includes(MULTIPART_FORM_DATA_CONTENT_TYPE);
}

/**
 * Reads a string field from multipart form data.
 *
 * @private
 */
function getFormDataString(formData: FormData, fieldName: string): string | null {
    const value = formData.get(fieldName);

    return typeof value === 'string' ? value : null;
}

/**
 * Normalizes a client-provided CDN pathname into a relative object key.
 *
 * @private
 */
function normalizeServerUploadPathname(value: unknown, fallbackFilename: string): string {
    const rawPathname = typeof value === 'string' ? value : fallbackFilename;
    const normalizedPathname = rawPathname
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\/+/g, '')
        .replace(/\/+/g, '/');

    if (!normalizedPathname || normalizedPathname.split('/').includes('..')) {
        throw new NotAllowed('Upload pathname must be a safe relative CDN path.');
    }

    return getSafeCdnPath({ pathname: normalizedPathname });
}

/**
 * Runs configured file-security checks for an uploaded public URL.
 *
 * @private
 */
async function checkUploadedFileSecurity(storageUrl: string): Promise<Record<string, unknown>> {
    const securityResults: Record<string, unknown> = {};

    for (const checkerId in FILE_SECURITY_CHECKERS) {
        try {
            const checker = FILE_SECURITY_CHECKERS[checkerId]!;
            console.info(`🛡️ Checking file security with ${checker.title} (${storageUrl})...`);
            const result = await checker.checkFile(storageUrl);
            securityResults[checkerId] = result;
            console.info(`🛡️ Security check result from ${checker.title}:`, result.status);
        } catch (error) {
            console.error(`🛡️ Security check failed for ${checkerId}:`, error);
            securityResults[checkerId] = {
                isSafe: false,
                status: 'ERROR',
                confidence: 0,
                message: error instanceof Error ? error.message : String(error),
            };
        }
    }

    return securityResults;
}

/**
 * Inserts a completed file row for a server-routed upload.
 *
 * @private
 */
async function insertCompletedUploadFileRecord(options: {
    supabase: SupabaseClient<AgentsServerDatabase>;
    userId: number | null;
    fileName: string;
    fileSize: number;
    fileType: string;
    storageUrl: string;
    purpose: string;
    securityResult: AgentsServerDatabase['public']['Tables']['File']['Insert']['securityResult'];
}): Promise<number | null> {
    const {
        supabase,
        userId,
        fileName,
        fileSize,
        fileType,
        storageUrl,
        purpose,
        securityResult,
    } = options;
    const { data, error }: PostgrestSingleResponse<Pick<AgentsServerDatabase['public']['Tables']['File']['Row'], 'id'>> =
        await supabase
            .from(await $getTableName('File'))
            .insert({
                userId,
                fileName,
                fileSize,
                fileType,
                storageUrl,
                shortUrl: null,
                purpose,
                status: 'COMPLETED',
                securityResult,
            })
            .select('id')
            .single();

    if (error) {
        throw new DatabaseError(`Failed to create completed file record: ${error.message}`);
    }

    return data?.id ?? null;
}

/**
 * Handles direct multipart uploads for S3-compatible storage backends.
 *
 * @private
 */
async function handleServerRoutedUpload(request: NextRequest): Promise<NextResponse> {
    const formData = await request.formData();
    const uploadFile = formData.get(SERVER_ROUTED_UPLOAD_FILE_FIELD);

    if (!(uploadFile instanceof File)) {
        throw new NotAllowed('Upload request must contain a file.');
    }

    const userId = await getUserIdFromRequest(request);
    const purpose = normalizeUploadPurpose(getFormDataString(formData, SERVER_ROUTED_UPLOAD_PURPOSE_FIELD));
    const contentType = normalizeUploadContentType(
        getFormDataString(formData, SERVER_ROUTED_UPLOAD_CONTENT_TYPE_FIELD) || uploadFile.type,
    );
    const pathname = normalizeServerUploadPathname(
        getFormDataString(formData, SERVER_ROUTED_UPLOAD_PATHNAME_FIELD),
        uploadFile.name,
    );
    const maxFileSize = await getMaxFileUploadSizeBytes();

    if (uploadFile.size > maxFileSize) {
        throw new LimitReachedError(`Uploaded file exceeds the configured maximum size of ${maxFileSize} bytes.`);
    }

    const buffer = Buffer.from(await uploadFile.arrayBuffer());
    if (buffer.byteLength > maxFileSize) {
        throw new LimitReachedError(`Uploaded file exceeds the configured maximum size of ${maxFileSize} bytes.`);
    }

    const cdn = $provideUntrackedCdnForServer();
    await cdn.setItem(pathname, {
        type: contentType,
        data: buffer,
        userId: userId || undefined,
        purpose,
        fileSize: buffer.byteLength,
    });

    const storageUrl = cdn.getItemUrl(pathname).href;
    const securityResults = await checkUploadedFileSecurity(storageUrl);
    const securityResultForDatabase =
        securityResults as AgentsServerDatabase['public']['Tables']['File']['Insert']['securityResult'];
    const supabase: SupabaseClient<AgentsServerDatabase> = $provideSupabase();
    const fileId = await insertCompletedUploadFileRecord({
        supabase,
        userId: userId || null,
        fileName: pathname,
        fileSize: buffer.byteLength,
        fileType: contentType,
        storageUrl,
        purpose,
        securityResult: securityResultForDatabase,
    });

    return NextResponse.json({
        url: storageUrl,
        pathname,
        fileId,
        contentType,
        size: buffer.byteLength,
    });
}

/**
 * Handles post.
 */
export async function POST(request: NextRequest) {
    try {
        if (isServerRoutedUploadRequest(request)) {
            return await handleServerRoutedUpload(request);
        }

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

                const maxFileSize = await getMaxFileUploadSizeBytes();

                // Generate the proper path with prefix
                // Note: With client uploads, we use the original filename provided by the client
                // The file will be stored at: {pathPrefix}/user/files/{filename}
                const pathPrefix = process.env.NEXT_PUBLIC_CDN_PATH_PREFIX || '';

                // Create a DB record at the start of the upload to track it
                const uploadPurpose = purpose;
                const {
                    data: insertedFile,
                    error: insertError,
                }: PostgrestSingleResponse<Pick<AgentsServerDatabase['public']['Tables']['File']['Row'], 'id'>> =
                    await supabase
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

                    // Security checks
                    const securityResults = await checkUploadedFileSecurity(blob.url);
                    const securityResultForDatabase =
                        securityResults as AgentsServerDatabase['public']['Tables']['File']['Update']['securityResult'];

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
                                securityResult: securityResultForDatabase,
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
                                securityResult: securityResultForDatabase,
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

// TODO: !!!! Change uploaded URLs from `storageUrl` to `shortUrl`
// TODO: !!!! Record both `storageUrl` (actual storage location) and `shortUrl` in `File` table
// TODO: !!!! Record `purpose` in `File` table
// TODO: !!!! Record `userId` in `File` table
// TODO: !!!! Record all things into `File` table
// TODO: !!!! File type (mime type) of `.book` files should be `application/book` <- [🧠] !!!! Best mime type?!
