import { $provideCdnForServer } from '@/src/tools/$provideCdnForServer';
import type { InlineKnowledgeSourceFile, InlineKnowledgeSourceUploader } from '@promptbook-local/core';
import type { string_knowledge_source_link } from '@promptbook-local/types';
import { getSafeCdnPath } from '../cdn/utils/getSafeCdnPath';
import { getUserFileCdnKey } from '../cdn/utils/getUserFileCdnKey';

type CreateInlineKnowledgeUploaderOptions = {
    readonly purpose?: string;
    readonly userId?: number;
};

const uploadCache = new Map<string, Promise<string_knowledge_source_link>>();

/**
 * Creates an uploader that stores inline knowledge files in the CDN and tracks them via Supabase.
 */
export function createInlineKnowledgeSourceUploader(
    options: CreateInlineKnowledgeUploaderOptions = {},
): InlineKnowledgeSourceUploader {
    const cdn = $provideCdnForServer();
    const { purpose = 'KNOWLEDGE', userId } = options;

    return async (source) => {
        const rawKey = getUserFileCdnKey(source.buffer, source.filename);
        const safeKey = getSafeCdnPath({
            pathname: rawKey,
            pathPrefix: process.env.NEXT_PUBLIC_CDN_PATH_PREFIX,
        });

        if (uploadCache.has(safeKey)) {
            return uploadCache.get(safeKey)!;
        }

        const promise: Promise<string_knowledge_source_link> = (async () => {
            await cdn.setItem(safeKey, {
                type: source.mimeType,
                data: source.buffer,
                purpose,
                userId,
                fileSize: source.buffer.length,
            });
            return cdn.getItemUrl(safeKey).href;
        })();

        uploadCache.set(safeKey, promise);
        return promise;
    };
}
