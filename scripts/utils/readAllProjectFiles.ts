import { readFile } from 'fs';
import { promisify } from 'util';
import { findAllProjectFiles } from './findAllProjectFiles';

export async function readAllProjectFiles(): Promise<
    Array<{ path: string; content: string }>
> {
    return await Promise.all(
        (
            await findAllProjectFiles()
        ).map(async (path) => ({
            path,
            content: await promisify(readFile)(path, 'utf8'),
        })),
    );
}


/**
 * TODO: !! Use fs/promises instead of fs
 */