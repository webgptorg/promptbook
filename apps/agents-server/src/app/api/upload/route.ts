import { serializeError } from '@promptbook-local/utils';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { assertsError } from '../../../../../../src/errors/assertsError';
import { getUserIdFromRequest } from '../../../../src/utils/getUserIdFromRequest';
import { getMetadata } from '../../../database/getMetadata';

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as HandleUploadBody;

        // Handle Vercel Blob client upload protocol
        const jsonResponse = await handleUpload({
            body,
            request,
            token: process.env.VERCEL_BLOB_READ_WRITE_TOKEN!,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                // Authenticate user and validate upload
                const userId = await getUserIdFromRequest(request);

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

                return {
                    allowedContentTypes: contentType ? [contentType] : undefined,
                    maximumSizeInBytes: maxFileSize,
                    addRandomSuffix: true, // Add random suffix to avoid filename collisions since we can't hash content
                    tokenPayload: JSON.stringify({
                        userId: userId || null,
                        purpose: purpose || 'GENERIC_UPLOAD',
                    }),
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                // This callback is called after the upload completes
                // Can be used to update database with final blob URL
                console.info('Upload completed:', { blob, tokenPayload });

                // TODO: [🦑] Track the uploaded file in database if needed
            },
        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        assertsError(error);

        console.error(error);

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
