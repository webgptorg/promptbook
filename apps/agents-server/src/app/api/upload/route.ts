import { serializeError } from '@promptbook-local/utils';
import { NextRequest, NextResponse } from 'next/server';
import { spaceTrim } from 'spacetrim';
import { assertsError } from '../../../../../../src/errors/assertsError';
import { LimitReachedError } from '../../../../../../src/errors/LimitReachedError';
import { NotAllowed } from '../../../../../../src/errors/NotAllowed';
import { UnexpectedError } from '../../../../../../src/errors/UnexpectedError';
import { $getTableName } from '../../../database/$getTableName';
import { $provideSupabase } from '../../../database/$provideSupabase';
import type { AgentsServerDatabase } from '../../../database/schema';
import {
    $provideCdnForServer,
    isSelfContainedS3StorageSelected,
    resolveCdnPublicUrlForServer,
} from '../../../tools/$provideCdnForServer';
import { $provideServer } from '../../../tools/$provideServer';
import { getSafeCdnPath } from '../../../utils/cdn/utils/getSafeCdnPath';
import { FILE_SECURITY_CHECKERS } from '../../../file-security-checkers';
import { getUserIdFromRequest } from '../../../utils/getUserIdFromRequest';
import { getMaxFileUploadSizeBytes } from '../../../utils/serverLimits';
import { resolveFileUploadAvailability } from '../../../utils/upload/fileUploadAvailability';
import { validateMimeType } from '../../../utils/validators/validateMimeType';

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
 * Regular expression for path segments that are safe to keep as public object keys.
 *
 * @private
 */
const SAFE_UPLOAD_PATH_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~!$&'()*+,;=:@/-]*$/;

/**
 * Parsed upload request.
 *
 * @private
 */
type ParsedUploadRequest = {
    file: File;
    pathname: string;
    purpose: string;
    contentType: string;
};

/**
 * Server context returned by `$provideServer`.
 *
 * @private
 */
type ProvidedServer = Awaited<ReturnType<typeof $provideServer>>;

/**
 * Normalizes upload purpose to a non-empty string.
 *
 * @private
 */
function normalizeUploadPurpose(value: FormDataEntryValue | null): string {
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
function normalizeUploadContentType(value: FormDataEntryValue | null, fallbackContentType: string): string {
    const candidate = typeof value === 'string' && value.trim() ? value.trim() : fallbackContentType;

    try {
        return validateMimeType(candidate || DEFAULT_UPLOAD_CONTENT_TYPE);
    } catch {
        return DEFAULT_UPLOAD_CONTENT_TYPE;
    }
}

/**
 * Resolves and validates the storage key requested by the browser.
 *
 * @private
 */
function resolveUploadPathname(value: FormDataEntryValue | null): string {
    if (typeof value !== 'string') {
        throw new UnexpectedError('Upload request is missing `pathname`.');
    }

    const pathname = value.trim().replace(/\\/g, '/').replace(/^\/+/, '');

    if (
        pathname === '' ||
        pathname.includes('/../') ||
        pathname.startsWith('../') ||
        pathname.endsWith('/..') ||
        !SAFE_UPLOAD_PATH_PATTERN.test(pathname)
    ) {
        throw new UnexpectedError(
            spaceTrim(`
                Upload request contains an invalid \`pathname\`.

                The upload key must be a relative CDN path without parent-directory segments.
            `),
        );
    }

    return getSafeCdnPath({
        pathname,
        pathPrefix: process.env.NEXT_PUBLIC_CDN_PATH_PREFIX,
    });
}

/**
 * Parses the multipart request accepted by `/api/upload`.
 *
 * @private
 */
async function parseUploadRequest(request: NextRequest): Promise<ParsedUploadRequest> {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
        throw new UnexpectedError('Upload request is missing `file`.');
    }

    return {
        file,
        pathname: resolveUploadPathname(formData.get('pathname')),
        purpose: normalizeUploadPurpose(formData.get('purpose')),
        contentType: normalizeUploadContentType(formData.get('contentType'), file.type),
    };
}

/**
 * Runs all configured file-security checkers against the uploaded public URL.
 *
 * @private
 */
async function checkUploadedFileSecurity(storageUrl: string): Promise<Record<string, unknown>> {
    const securityResults: Record<string, unknown> = {};

    for (const checkerId of Object.keys(FILE_SECURITY_CHECKERS)) {
        try {
            const checker = FILE_SECURITY_CHECKERS[checkerId]!;
            securityResults[checkerId] = await checker.checkFile(storageUrl);
        } catch (error) {
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
 * Stores security results for the file row created by `TrackedFilesStorage`.
 *
 * @private
 */
async function updateUploadedFileSecurityResult(
    storageUrl: string,
    securityResult: Record<string, unknown>,
): Promise<void> {
    if (Object.keys(securityResult).length === 0) {
        return;
    }

    const supabase = $provideSupabase();
    const securityResultForDatabase =
        securityResult as AgentsServerDatabase['public']['Tables']['File']['Update']['securityResult'];
    const { error } = await supabase
        .from(await $getTableName('File'))
        .update({ securityResult: securityResultForDatabase })
        .eq('storageUrl', storageUrl);

    if (error) {
        console.error('Failed to update uploaded file security result:', error);
    }
}

/**
 * Ensures the current server/domain can accept file uploads.
 *
 * @param providedServer - Current server routing context.
 * @throws `NotAllowed` when uploads would be published without a server domain.
 * @private
 */
function assertFileUploadAvailable(providedServer: ProvidedServer): void {
    const fileUploadAvailability = resolveFileUploadAvailability({
        serverId: providedServer.id,
        serverPublicUrl: providedServer.publicUrl,
        isSelfContainedS3StorageSelected: isSelfContainedS3StorageSelected(),
    });

    if (!fileUploadAvailability.isUploadAvailable) {
        throw new NotAllowed(fileUploadAvailability.message || 'File uploads are not available for this server.');
    }
}

/**
 * Handles file upload requests.
 */
export async function POST(request: NextRequest) {
    try {
        const providedServer = await $provideServer();
        assertFileUploadAvailable(providedServer);

        const { file, pathname, purpose, contentType } = await parseUploadRequest(request);
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const maxFileSize = await getMaxFileUploadSizeBytes();

        if (fileBuffer.byteLength > maxFileSize) {
            throw new LimitReachedError(
                spaceTrim(`
                    Uploaded file \`${file.name}\` exceeds the configured upload limit.

                    Maximum supported size: **${maxFileSize} bytes**
                `),
            );
        }

        const cdn = $provideCdnForServer({
            cdnPublicUrl: resolveCdnPublicUrlForServer(providedServer.publicUrl),
        });
        const storageUrl = cdn.getItemUrl(pathname).href;
        const userId = await getUserIdFromRequest(request);

        await cdn.setItem(pathname, {
            type: contentType,
            data: fileBuffer,
            purpose,
            userId: userId || undefined,
            fileSize: fileBuffer.byteLength,
        });

        const securityResult = await checkUploadedFileSecurity(storageUrl);
        await updateUploadedFileSecurityResult(storageUrl, securityResult);

        return NextResponse.json({
            url: storageUrl,
            pathname,
            contentType,
            size: fileBuffer.byteLength,
        });
    } catch (error) {
        assertsError(error);

        console.error('Upload failed:', error);

        const serializedError = serializeError(error);

        return NextResponse.json(
            {
                ...serializedError,
                error: serializedError.message,
            },
            {
                status: error instanceof NotAllowed ? 403 : 400, // <- TODO: [🐱‍🚀] Make `errorToHttpStatusCode`
            },
        );
    }
}
