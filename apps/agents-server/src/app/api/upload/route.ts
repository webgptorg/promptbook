import { serializeError } from '@promptbook-local/utils';
import { NextRequest, NextResponse } from 'next/server';
import { assertsError } from '../../../../../../src/errors/assertsError';
import { string_url } from '../../../../../../src/types/typeAliases';
import { $provideCdnForServer } from '../../../../src/tools/$provideCdnForServer';
import { getUserFileCdnKey } from '../../../../src/utils/cdn/utils/getUserFileCdnKey';
import { getUserIdFromRequest } from '../../../../src/utils/getUserIdFromRequest';
import { getMetadata } from '../../../database/getMetadata';

export async function POST(request: NextRequest) {
    try {
        // Parse the request to get filename, content type, and file size
        const { filename, contentType, fileSize, purpose } = await request.json();

        if (!filename || !contentType) {
            return NextResponse.json(
                { message: 'Missing filename or contentType in request body' },
                { status: 400 },
            );
        }

        let maxFileSizeMb = Number((await getMetadata('MAX_FILE_UPLOAD_SIZE_MB')) || '50'); // <- TODO: [🌲] To /config.ts

        if (Number.isNaN(maxFileSizeMb)) {
            maxFileSizeMb = 50; // <- TODO: [🌲] To /config.ts
        }

        const maxFileSize = maxFileSizeMb * 1024 * 1024;

        // Validate file size
        if (fileSize && fileSize > maxFileSize) {
            return NextResponse.json(
                { message: `File size exceeds maximum allowed size of ${maxFileSizeMb}MB` },
                { status: 400 },
            );
        }

        // Get CDN configuration
        const cdn = $provideCdnForServer();
        const key = getUserFileCdnKey(Buffer.from([]), filename); // Empty buffer for key generation

        const userId = await getUserIdFromRequest(request);

        // Track upload intent and create placeholder/url using setItem
        await cdn.setItem(key, {
            type: contentType,
            data: Buffer.from([]),
            userId: userId || undefined,
            purpose: purpose || 'GENERIC_UPLOAD', // Default purpose
            fileSize, // Pass the declared file size
        });

        const url = cdn.getItemUrl(key).href;

        return NextResponse.json({
            uploadUrl: url as string_url,
            fileUrl: url as string_url
        }, { status: 200 });

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
