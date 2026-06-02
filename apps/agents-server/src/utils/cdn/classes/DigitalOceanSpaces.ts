import { GetObjectCommand, PutObjectCommand, PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3';
import { NotYetImplementedError } from '@promptbook-local/core';
import { gzip, ungzip } from 'node-gzip';
import { TODO_USE } from '../../../../../../src/utils/organization/TODO_USE';
import { validateMimeType } from '../../validators/validateMimeType';
import type { IFile, IIFilesStorageWithCdn } from '../interfaces/IFilesStorage';

/**
 * Configuration for digital ocean spaces.
 */
type IDigitalOceanSpacesConfig = {
    readonly bucket: string;
    readonly pathPrefix: string;
    readonly endpoint: string;
    readonly region?: string;
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
    readonly cdnPublicUrl: URL;
    readonly gzip: boolean;
    readonly forcePathStyle?: boolean;
    readonly isPublicReadAclEnabled?: boolean;

    // TODO: [⛳️] Probbably prefix should be in this config not on the consumer side
};

/**
 * Resolves the S3 endpoint URL, preserving explicit `http` endpoints for local MinIO.
 *
 * @private internal helper for DigitalOceanSpaces.
 */
function resolveS3Endpoint(endpoint: string): string {
    if (/^https?:\/\//i.test(endpoint)) {
        return endpoint;
    }

    return `https://${endpoint}`;
}

/**
 * Returns a URL object whose pathname ends with `/`.
 *
 * @private internal helper for DigitalOceanSpaces.
 */
function ensureTrailingSlashUrl(url: URL): URL {
    const normalizedUrl = new URL(url.href);

    if (!normalizedUrl.pathname.endsWith('/')) {
        normalizedUrl.pathname = `${normalizedUrl.pathname}/`;
    }

    return normalizedUrl;
}

/**
 * Class implementing digital ocean spaces.
 */
export class DigitalOceanSpaces implements IIFilesStorageWithCdn {
    public get cdnPublicUrl() {
        return this.config.cdnPublicUrl;
    }

    private s3: S3Client;

    public constructor(private readonly config: IDigitalOceanSpacesConfig) {
        this.s3 = new S3Client({
            region: config.region || 'auto',
            endpoint: resolveS3Endpoint(config.endpoint),
            forcePathStyle: config.forcePathStyle,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
        });
    }

    public getItemUrl(key: string): URL {
        return new URL(this.getStorageKey(key), ensureTrailingSlashUrl(this.cdnPublicUrl));
    }

    public async getItem(key: string): Promise<IFile | null> {
        const parameters = {
            Bucket: this.config.bucket,
            Key: this.getStorageKey(key),
        };

        try {
            const { Body, ContentType, ContentEncoding } = await this.s3.send(new GetObjectCommand(parameters));

            // const blob = new Blob([await Body?.transformToByteArray()!]);

            if (ContentEncoding === 'gzip') {
                return {
                    type: validateMimeType(ContentType),
                    data: await ungzip(await Body!.transformToByteArray()),
                };
            } else {
                return {
                    type: validateMimeType(ContentType),
                    data: (await Body!.transformToByteArray()) as Buffer,
                };
            }
        } catch (error) {
            if (error instanceof Error && error.name.match(/^NoSuchKey/)) {
                return null;
            } else {
                throw error;
            }
        }
    }

    public async removeItem(key: string): Promise<void> {
        TODO_USE(key);
        throw new NotYetImplementedError(`DigitalOceanSpaces.removeItem is not implemented yet`);
    }

    public async setItem(key: string, file: IFile): Promise<void> {
        // TODO: Put putObjectRequestAdditional into processedFile
        const putObjectRequestAdditional: Partial<PutObjectCommandInput> = {};

        let processedFile: IFile;
        if (this.config.gzip) {
            const gzipped = await gzip(file.data);
            const sizePercentageAfterCompression = gzipped.byteLength / file.data.byteLength;
            if (sizePercentageAfterCompression < 0.7) {
                // consolex.log(`Gzipping ${key} (${Math.floor(sizePercentageAfterCompression * 100)}%)`);
                processedFile = { ...file, data: gzipped };
                putObjectRequestAdditional.ContentEncoding = 'gzip';
            } else {
                processedFile = file;
                // consolex.log(`NOT Gzipping ${key} (${Math.floor(sizePercentageAfterCompression * 100)}%)`);
            }
        } else {
            processedFile = file;
        }

        const uploadResult = await this.s3.send(
            new PutObjectCommand({
                Bucket: this.config.bucket,
                Key: this.getStorageKey(key),
                ContentType: processedFile.type,
                ...putObjectRequestAdditional,
                Body: processedFile.data,
                // TODO: Public read access / just private to extending class
                ...(this.config.isPublicReadAclEnabled === false ? {} : { ACL: 'public-read' }),
            }),
        );

        if (!uploadResult.ETag) {
            throw new Error(`Upload result does not contain ETag`);
        }
    }

    /**
     * Builds the final object key used in the S3 bucket.
     *
     * @private internal helper for DigitalOceanSpaces.
     */
    private getStorageKey(key: string): string {
        const normalizedKey = key.replace(/^\/+/g, '');
        const normalizedPathPrefix = this.config.pathPrefix.replace(/^\/+|\/+$/g, '');

        if (!normalizedPathPrefix) {
            return normalizedKey;
        }

        return `${normalizedPathPrefix}/${normalizedKey}`;
    }
}

// TODO: Implement Read-only mode
// TODO: [☹️] Unite with `PromptbookStorage` and move to `/src/...`
