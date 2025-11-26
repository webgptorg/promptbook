import { nextRequestToNodeRequest } from '@/src/utils/cdn/utils/nextRequestToNodeRequest';
import { TODO_any } from '@promptbook-local/types';
import { serializeError } from '@promptbook-local/utils';
import formidable from 'formidable';
import { readFile } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { forTime } from 'waitasecond';
import { assertsError } from '../../../../../../src/errors/assertsError';
import { string_url } from '../../../../../../src/types/typeAliases';
import { keepUnused } from '../../../../../../src/utils/organization/keepUnused';
import { $provideCdnForServer } from '../../../../src/tools/$provideCdnForServer';
import { getUserFileCdnKey } from '../../../../src/utils/cdn/utils/getUserFileCdnKey';
import { validateMimeType } from '../../../../src/utils/validators/validateMimeType';

export async function POST(request: NextRequest) {
    try {
        await forTime(1);
        // await forTime(5000);

        const nodeRequest = await nextRequestToNodeRequest(request);

        const files = await new Promise<formidable.Files>((resolve, reject) => {
            const form = formidable({});
            form.parse(nodeRequest as TODO_any, (error, fields, files) => {
                keepUnused(fields);

                if (error) {
                    return reject(error);
                }
                resolve(files);
            });
        });

        const uploadedFiles = files.file;

        if (!uploadedFiles || uploadedFiles.length !== 1) {
            return NextResponse.json(
                { message: 'In form data there is not EXACTLY one "file" field' },
                { status: 400 },
            );
        }

        const uploadedFile = uploadedFiles[0]!;
        const fileBuffer = await readFile(uploadedFile.filepath);
        const cdn = $provideCdnForServer();
        const key = getUserFileCdnKey(fileBuffer, uploadedFile.originalFilename || uploadedFile.newFilename);

        await cdn.setItem(key, {
            type: validateMimeType(uploadedFile.mimetype),
            data: fileBuffer,
        });

        const fileUrl = cdn.getItemUrl(key);

        return NextResponse.json({ fileUrl: fileUrl.href as string_url }, { status: 201 });
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
