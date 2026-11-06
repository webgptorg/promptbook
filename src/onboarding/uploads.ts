import { createHash, randomUUID } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { assertPrivate, createPrivateFile, ensurePrivateDirectory, readPrivateFile, removePrivateFile, writePrivateFile } from '../app/files.js';
import { isImagePath } from '../ui/attachments.js';
import type { ComposedSegment } from '../ui/composer.js';

/** The engine's advertised per-file onboarding upload limit. @private onboarding */
export const MAX_ONBOARDING_UPLOAD_BYTES = 25 * 1024 * 1024;

/** The session is bounded independently of the per-file limit. */
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;

/** Max files referenced by one onboarding draft, from onboarding@1. @private onboarding */
export const MAX_ONBOARDING_FILES = 20;

/** The App FileMetadata for an engine-scoped, unscanned onboarding upload. @private onboarding */
export type OnboardingFile = {
    readonly id: string;
    readonly name: string;
    readonly contentType: string;
    readonly sizeBytes: number;
    readonly sha256: string;
    readonly purpose: 'upload';
    readonly agentId: null;
    readonly chatId: null;
    readonly runId: null;
    readonly scan: null;
    readonly versionCount: 1;
    readonly createdBy: string;
    readonly createdAt: string;
};

/** IDs belong to this store and have no path syntax. */
const FILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Returns only a portable leaf name for the shared attachment materializer. */
function safeName(name: string): string {
    const leaf = name.split(/[\\/]/).at(-1)?.replace(/[\u0000-\u001f\u007f]/g, '').trim().replace(/[. ]+$/, '');
    return leaf && !/^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(leaf) ? leaf.slice(0, 200) : 'attachment';
}

/** Engine-local, durable store for files@1 during initialization. @private onboarding */
export class OnboardingUploads {
    private pending: Promise<unknown> = Promise.resolve();

    public constructor(public readonly directory: string) {}

    /** Reads metadata only after checking that the file exists inside the draft. */
    public async get(id: string): Promise<OnboardingFile | undefined> {
        if (!FILE_ID.test(id)) return undefined;
        const metadata = await readPrivateFile(this.directory, id + '.json');
        return metadata ? JSON.parse(metadata) as OnboardingFile : undefined;
    }

    /** All completed uploads; an incomplete write is invisible. */
    public async list(): Promise<OnboardingFile[]> {
        const entries = await readdir(this.directory).catch((error: NodeJS.ErrnoException) => {
            if (error.code === 'ENOENT') return [];
            throw error;
        });
        const files = await Promise.all(entries.filter((name) => name.endsWith('.json')).map((name) => this.get(name.slice(0, -5))));
        return files.filter((file): file is OnboardingFile => file !== undefined);
    }

    /** Stores one immutable upload after checking both quotas under the same write queue. */
    public async put(blob: Blob, name: string, createdBy: string): Promise<OnboardingFile | undefined> {
        return await this.serialize(async () => {
            if (blob.size > MAX_ONBOARDING_UPLOAD_BYTES) return undefined;
            const files = await this.list();
            if (files.length >= MAX_ONBOARDING_FILES || files.reduce((total, file) => total + file.sizeBytes, blob.size) > MAX_TOTAL_BYTES) return undefined;
            await ensurePrivateDirectory(this.directory);
            const id = randomUUID();
            const bytes = Buffer.from(await blob.arrayBuffer());
            const file: OnboardingFile = {
                id, name: safeName(name), contentType: blob.type.slice(0, 255) || 'application/octet-stream',
                sizeBytes: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex'),
                purpose: 'upload', agentId: null, chatId: null, runId: null, scan: null, versionCount: 1,
                createdBy, createdAt: new Date().toISOString(),
            };
            await createPrivateFile(this.directory, id, bytes);
            await writePrivateFile(this.directory, id + '.json', JSON.stringify(file)).catch(async (error: unknown) => {
                await removePrivateFile(this.directory, id);
                throw error;
            });
            return file;
        });
    }

    /** Copies a file selected through the private, same-user CLI control channel. */
    public async putLocal(path: string): Promise<OnboardingFile | undefined> {
        const info = await stat(path);
        if (!info.isFile() || info.size > MAX_ONBOARDING_UPLOAD_BYTES) return undefined;
        return await this.put(new Blob([await readFile(path)]), basename(path), 'local-operator');
    }

    /** Downloads verified private bytes as an attachment. */
    public async download(id: string): Promise<Uint8Array<ArrayBuffer> | undefined> {
        if (!await this.get(id)) return undefined;
        const path = join(this.directory, id);
        await assertPrivate(path, 'file');
        return new Uint8Array(await readFile(path));
    }

    /** Deletes a temporary upload which no accepted answer references. */
    public async delete(id: string, protectedIds: () => readonly string[]): Promise<'deleted' | 'missing' | 'in-use'> {
        return await this.serialize(async () => {
            if (protectedIds().includes(id)) return 'in-use';
            if (!await this.get(id)) return 'missing';
            await removePrivateFile(this.directory, id + '.json');
            await removePrivateFile(this.directory, id);
            return 'deleted';
        });
    }

    /** The existing init writer consumes the brief and ordered, private attachment sources. */
    public async segments(intent: string, ids: readonly string[]): Promise<ComposedSegment[]> {
        const segments: ComposedSegment[] = [{ type: 'text', text: intent }];
        for (const id of ids) {
            const file = await this.get(id);
            if (!file) throw new Error('An attachment is missing. Return to the brief and upload it again.');
            const path = join(this.directory, id);
            await assertPrivate(path, 'file');
            segments.push({ type: 'text', text: '\n\n' }, { type: 'attachment', path, name: file.name, kind: isImagePath(file.name) ? 'image' : 'file' });
        }
        return segments;
    }

    /** Orders concurrent file mutations without making a failure block the next request. */
    private async serialize<T>(operation: () => Promise<T>): Promise<T> {
        const result = this.pending.then(operation);
        this.pending = result.catch(() => undefined);
        return await result;
    }
}
