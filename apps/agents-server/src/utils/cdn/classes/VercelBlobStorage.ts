import { del, put } from '@vercel/blob';
import { validateMimeType } from '../../validators/validateMimeType';
import type { IFile, IIFilesStorageWithCdn } from '../interfaces/IFilesStorage';

type IVercelBlobStorageConfig = {
    readonly token: string;
    readonly cdnPublicUrl: URL;
    readonly pathPrefix?: string;
    // Note: Vercel Blob automatically handles compression/serving
};

export class VercelBlobStorage implements IIFilesStorageWithCdn {
    public get cdnPublicUrl() {
        return this.config.cdnPublicUrl;
    }

    public constructor(private readonly config: IVercelBlobStorageConfig) {}

    public getItemUrl(key: string): URL {
        const path = this.config.pathPrefix ? `${this.config.pathPrefix}/${key}` : key;
        return new URL(path, this.cdnPublicUrl);
    }

    public async getItem(key: string): Promise<IFile | null> {
        const url = this.getItemUrl(key);

        const response = await fetch(url);

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch blob from ${url}: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = response.headers.get('content-type') || 'application/octet-stream';

        return {
            type: validateMimeType(contentType),
            data: buffer,
        };
    }

    public async removeItem(key: string): Promise<void> {
        const url = this.getItemUrl(key).toString();
        await del(url, { token: this.config.token });
    }

    public async setItem(key: string, file: IFile): Promise<void> {
        const path = this.config.pathPrefix ? `${this.config.pathPrefix}/${key}` : key;
        
        await put(path, file.data, {
            access: 'public',
            addRandomSuffix: false,
            contentType: file.type,
            token: this.config.token,
            // Note: We rely on Vercel Blob for compression
        });
    }
}
