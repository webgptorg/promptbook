import { SupabaseClient } from '@supabase/supabase-js';
import { $getTableName } from '../../../database/$getTableName';
import { AgentsServerDatabase } from '../../../database/schema';
import type { IFile, IIFilesStorageWithCdn } from '../interfaces/IFilesStorage';

export class TrackedFilesStorage implements IIFilesStorageWithCdn {
    public constructor(
        private readonly inner: IIFilesStorageWithCdn,
        private readonly supabase: SupabaseClient<AgentsServerDatabase>,
    ) {}

    public get cdnPublicUrl(): URL {
        return this.inner.cdnPublicUrl;
    }

    public get pathPrefix(): string | undefined {
        return this.inner.pathPrefix;
    }

    public getItemUrl(key: string): URL {
        return this.inner.getItemUrl(key);
    }

    public async getItem(key: string): Promise<IFile | null> {
        return this.inner.getItem(key);
    }

    public async removeItem(key: string): Promise<void> {
        return this.inner.removeItem(key);
    }

    public async setItem(key: string, file: IFile): Promise<void> {
        await this.inner.setItem(key, file);

        try {
            const { userId, purpose } = file;
            const cdnUrl = this.getItemUrl(key).href;

            await this.supabase.from(await $getTableName('File')).insert({
                userId: userId || null,
                fileName: key,
                fileSize: file.fileSize ?? file.data.length,
                fileType: file.type,
                cdnUrl,
                purpose: purpose || 'UNKNOWN',
            });
        } catch (error) {
            console.error('Failed to track upload:', error);
        }
    }
}
