import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3';
import { gzip, ungzip } from 'node-gzip';
import { validateMimeType } from '../../validators/validateMimeType';
import type { IFile, IIFilesStorageWithCdn } from '../interfaces/IFilesStorage';

/**
 * Configuration for digital ocean spaces.
 */
type IDigitalOceanSpacesConfig = {
    readonly bucket: string;
    readonly pathPrefix: string;
    readonly endpoint: string;
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
    readonly cdnPublicUrl: URL;
    readonly gzip: boolean;
    readonly region?: string;
    readonly isPathStyleEndpoint?: boolean;
    readonly isPublicReadAclEnabled?: boolean;

    // TODO: [⛳️] Probbably prefix should be in this config not on the consumer side
};

/**
 * Class implementing digital ocean spaces.
 */
export class DigitalOceanSpaces implements IIFilesStorageWithCdn {
    public get cdnPublicUrl() {
        return this.config.cdnPublicUrl;
    }

    public get pathPrefix() {
        return this.config.pathPrefix;
    }

    private s3: S3Client;

    public constructor(private readonly config: IDigitalOceanSpacesConfig) {
        this.s3 = new S3Client({
            region: config.region || 'auto',
            endpoint: normalizeS3Endpoint(config.endpoint),
            forcePathStyle: config.isPathStyleEndpoint,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
        });
    }

    public getItemUrl(key: string): URL {
        return new URL(createStorageKey(this.config.pathPrefix, key), ensureTrailingSlash(this.cdnPublicUrl));
    }

    public async getItem(key: string): Promise<IFile | null> {
        const parameters = {
            Bucket: this.config.bucket,
            Key: createStorageKey(this.config.pathPrefix, key),
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
        await this.s3.send(
            new DeleteObjectCommand({
                Bucket: this.config.bucket,
                Key: createStorageKey(this.config.pathPrefix, key),
            }),
        );
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
                Key: createStorageKey(this.config.pathPrefix, key),
                ContentType: processedFile.type,
                ...putObjectRequestAdditional,
                Body: processedFile.data,
                ...(this.config.isPublicReadAclEnabled ? { ACL: 'public-read' } : {}),
            }),
        );

        if (!uploadResult.ETag) {
            throw new Error(`Upload result does not contain ETag`);
        }
    }
}

/**
 * Normalizes an S3 endpoint into a URL string accepted by the AWS SDK.
 *
 * @private utility of `DigitalOceanSpaces`
 */
function normalizeS3Endpoint(endpoint: string): string {
    if (/^https?:\/\//i.test(endpoint)) {
        return endpoint;
    }

    return `https://${endpoint}`;
}

/**
 * Ensures URL path resolution appends relative keys instead of replacing the last segment.
 *
 * @private utility of `DigitalOceanSpaces`
 */
function ensureTrailingSlash(url: URL): URL {
    const nextUrl = new URL(url.href);
    if (!nextUrl.pathname.endsWith('/')) {
        nextUrl.pathname = `${nextUrl.pathname}/`;
    }

    return nextUrl;
}

/**
 * Creates a provider object key from the optional configured path prefix and logical key.
 *
 * @private utility of `DigitalOceanSpaces`
 */
function createStorageKey(pathPrefix: string | undefined, key: string): string {
    const normalizedPrefix = (pathPrefix || '').replace(/^\/+|\/+$/g, '');
    const normalizedKey = key.replace(/^\/+/g, '');

    return normalizedPrefix ? `${normalizedPrefix}/${normalizedKey}` : normalizedKey;
}

// TODO: Implement Read-only mode
// TODO: [☹️] Unite with `PromptbookStorage` and move to `/src/...`
