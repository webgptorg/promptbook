import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';

/**
 * Default lock lifetime for expensive image generation operations.
 */
const DEFAULT_LOCK_TTL_MS = 1000 * 60 * 5;

/**
 * Default polling interval while waiting for another process to finish image generation.
 */
const DEFAULT_WAIT_INTERVAL_MS = 1000;

/**
 * Default timeout for waiting on a generated image to appear.
 */
const DEFAULT_TIMEOUT_MS = 1000 * 60;

/**
 * Persisted image record returned from cache or generation.
 */
export type GeneratedImageStorageRecord = {
    filename: string;
    prompt: string;
    cdnUrl: string;
    cdnKey: string;
    source: 'cache' | 'generated';
};

/**
 * Configures cache+lock behavior for image generation.
 */
export type EnsureGeneratedImageOptions = {
    filename: string;
    prompt: string;
    lockKey: string;
    /**
     * Generates and uploads the image and returns resulting CDN fields.
     */
    createImage: () => Promise<Pick<GeneratedImageStorageRecord, 'cdnUrl' | 'cdnKey'>>;
    timeoutMs?: number;
    lockTtlMs?: number;
    waitIntervalMs?: number;
};

/**
 * Minimal error shape used by Supabase PostgREST responses in this helper.
 */
type SupabaseErrorLike = {
    code?: string;
    message: string;
};

/**
 * Minimal response shape for `.single()` reads.
 */
type SupabaseSingleResponse = {
    data: unknown;
    error: SupabaseErrorLike | null;
};

/**
 * Minimal response shape for write queries.
 */
type SupabaseWriteResponse = {
    error: SupabaseErrorLike | null;
};

/**
 * Minimal chained API shape needed by dynamic-table helpers.
 */
type SupabaseLike = {
    from: (tableName: string) => {
        select: (columns: string) => {
            eq: (column: string, value: string) => {
                single: () => Promise<SupabaseSingleResponse>;
            };
        };
        insert: (values: unknown) => Promise<SupabaseWriteResponse>;
        delete: () => {
            eq: (column: string, value: string) => Promise<SupabaseWriteResponse>;
        };
    };
};

/**
 * Returns a loosely typed Supabase client for dynamic-table helpers.
 */
function getSupabaseUnsafe(): SupabaseLike {
    return $provideSupabaseForServer() as unknown as SupabaseLike;
}

/**
 * Sleeps for the specified duration.
 */
async function sleep(milliseconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Reads a generated image from storage by filename.
 */
async function readExistingImageByFilename(
    imageTableName: string,
    filename: string,
): Promise<Omit<GeneratedImageStorageRecord, 'source'> | null> {
    const supabase = getSupabaseUnsafe();
    const { data, error } = await supabase
        .from(imageTableName)
        .select('filename,prompt,cdnUrl,cdnKey')
        .eq('filename', filename)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }

    const imageRow = data as
        | {
              filename: string;
              prompt: string;
              cdnUrl: string;
              cdnKey: string;
          }
        | null;

    if (!imageRow) {
        return null;
    }

    return {
        filename: String(imageRow.filename),
        prompt: String(imageRow.prompt),
        cdnUrl: String(imageRow.cdnUrl),
        cdnKey: String(imageRow.cdnKey),
    };
}

/**
 * Attempts to acquire a generation lock.
 */
async function tryAcquireGenerationLock(lockTableName: string, lockKey: string, lockTtlMs: number): Promise<boolean> {
    const supabase = getSupabaseUnsafe();
    const { error } = await supabase.from(lockTableName).insert({
        lockKey,
        expiresAt: new Date(Date.now() + lockTtlMs).toISOString(),
    });

    if (!error) {
        return true;
    }

    if (error.code === '23505' || error.code === '409' || error.message.toLowerCase().includes('duplicate')) {
        return false;
    }

    throw error;
}

/**
 * Deletes a generation lock if it exists.
 */
async function releaseGenerationLock(lockTableName: string, lockKey: string): Promise<void> {
    const supabase = getSupabaseUnsafe();
    const { error } = await supabase.from(lockTableName).delete().eq('lockKey', lockKey);

    if (error && error.code !== 'PGRST116') {
        throw error;
    }
}

/**
 * Clears an expired lock so another request can continue generation.
 */
async function clearExpiredGenerationLock(lockTableName: string, lockKey: string): Promise<void> {
    const supabase = getSupabaseUnsafe();
    const { data, error } = await supabase.from(lockTableName).select('expiresAt').eq('lockKey', lockKey).single();

    if (error) {
        if (error.code === 'PGRST116') {
            return;
        }
        throw error;
    }

    const lockRow = data as { expiresAt: string } | null;

    if (!lockRow?.expiresAt) {
        return;
    }

    if (new Date(lockRow.expiresAt).getTime() > Date.now()) {
        return;
    }

    await releaseGenerationLock(lockTableName, lockKey);
}

/**
 * Returns a cached generated image record or creates one under a distributed lock.
 */
export async function ensureGeneratedImage(options: EnsureGeneratedImageOptions): Promise<GeneratedImageStorageRecord> {
    const {
        filename,
        prompt,
        lockKey,
        createImage,
        timeoutMs = DEFAULT_TIMEOUT_MS,
        lockTtlMs = DEFAULT_LOCK_TTL_MS,
        waitIntervalMs = DEFAULT_WAIT_INTERVAL_MS,
    } = options;

    const supabase = getSupabaseUnsafe();
    const imageTableName = await $getTableName('Image');
    const lockTableName = await $getTableName('GenerationLock');
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        const existingImage = await readExistingImageByFilename(imageTableName, filename);
        if (existingImage) {
            return {
                ...existingImage,
                source: 'cache',
            };
        }

        const lockAcquired = await tryAcquireGenerationLock(lockTableName, lockKey, lockTtlMs);
        if (lockAcquired) {
            try {
                const existingImageAfterLock = await readExistingImageByFilename(imageTableName, filename);
                if (existingImageAfterLock) {
                    return {
                        ...existingImageAfterLock,
                        source: 'cache',
                    };
                }

                const createdImage = await createImage();
                const storedImage = {
                    filename,
                    prompt,
                    cdnUrl: createdImage.cdnUrl,
                    cdnKey: createdImage.cdnKey,
                };

                const { error: insertError } = await supabase.from(imageTableName).insert(storedImage);
                if (insertError) {
                    const existingImageAfterInsert = await readExistingImageByFilename(imageTableName, filename);
                    if (existingImageAfterInsert) {
                        return {
                            ...existingImageAfterInsert,
                            source: 'cache',
                        };
                    }
                    throw insertError;
                }

                return {
                    ...storedImage,
                    source: 'generated',
                };
            } finally {
                await releaseGenerationLock(lockTableName, lockKey);
            }
        }

        await clearExpiredGenerationLock(lockTableName, lockKey);
        await sleep(waitIntervalMs);
    }

    throw new Error(`Timeout waiting for image generation (${filename})`);
}
