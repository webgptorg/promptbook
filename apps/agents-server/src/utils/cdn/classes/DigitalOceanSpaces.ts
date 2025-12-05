import { GetObjectCommand, PutObjectCommand, PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3';
import { NotYetImplementedError } from '@promptbook-local/core';
import { gzip, ungzip } from 'node-gzip';
import { TODO_USE } from '../../../../../../src/utils/organization/TODO_USE';
import { validateMimeType } from '../../validators/validateMimeType';
import type { IFile, IIFilesStorageWithCdn } from '../interfaces/IFilesStorage';

type IDigitalOceanSpacesConfig = {
    readonly bucket: string;
    readonly pathPrefix: string;
    readonly endpoint: string;
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
    readonly cdnPublicUrl: URL;
    readonly gzip: boolean;

    // TODO: [⛳️] Probbably prefix should be in this config not on the consumer side
};

export class DigitalOceanSpaces implements IIFilesStorageWithCdn {
    public get cdnPublicUrl() {
        return this.config.cdnPublicUrl;
    }

    private s3: S3Client;

    public constructor(private readonly config: IDigitalOceanSpacesConfig) {
        this.s3 = new S3Client({
            region: 'auto',
            endpoint: 'https://' + config.endpoint,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
        });
    }

    public getItemUrl(key: string): URL {
        return new URL(this.config.pathPrefix + '/' + key, this.cdnPublicUrl);
    }

    public async getItem(key: string): Promise<IFile | null> {
        const parameters = {
            Bucket: this.config.bucket,
            Key: this.config.pathPrefix + '/' + key,
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
                Key: this.config.pathPrefix + '/' + key,
                ContentType: processedFile.type,
                ...putObjectRequestAdditional,
                Body: processedFile.data,
                // TODO: Public read access / just private to extending class
                ACL: 'public-read',
            }),
        );

        if (!uploadResult.ETag) {
            throw new Error(`Upload result does not contain ETag`);
        }
    }
}

/**
 * TODO: Implement Read-only mode
 * TODO: [☹️] Unite with `PromptbookStorage` and move to `/src/...`
 */
