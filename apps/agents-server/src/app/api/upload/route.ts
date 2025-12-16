import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabase } from '@/src/database/$provideSupabase';
import { serializeError } from '@promptbook-local/utils';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { assertsError } from '../../../../../../src/errors/assertsError';
import { getUserIdFromRequest } from '../../../../src/utils/getUserIdFromRequest';
import { getMetadata } from '../../../database/getMetadata';

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as HandleUploadBody;
        const userId = await getUserIdFromRequest(request);
        const supabase = $provideSupabase();

        // Handle Vercel Blob client upload protocol
        const jsonResponse = await handleUpload({
            body,
            request,
            token: process.env.VERCEL_BLOB_READ_WRITE_TOKEN!,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                // Authenticate user and validate upload

                // Parse client payload for additional metadata
                const payload = clientPayload ? JSON.parse(clientPayload) : {};
                const { purpose, contentType } = payload;

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
                const uploadPurpose = purpose || 'GENERIC_UPLOAD';
                const { data: insertedFile, error: insertError } = await supabase
                    .from(await $getTableName('File'))
                    .insert({
                        userId: userId || null,
                        fileName: pathname,
                        fileSize: 0, // <- Will be updated when upload completes
                        fileType: contentType || 'application/octet-stream',
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
                    allowedContentTypes: contentType ? [contentType] : undefined,
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
                    const payload = tokenPayload ? JSON.parse(tokenPayload) : {};
                    const { fileId, userId: tokenUserId, purpose: tokenPurpose, uploadPath } = payload;

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
                                purpose: tokenPurpose || 'GENERIC_UPLOAD',
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
                            .eq('id', fileId);

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
 */
