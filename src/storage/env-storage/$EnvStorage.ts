import * as dotenv from 'dotenv';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { normalizeTo_SCREAMING_CASE } from '../../_packages/utils.index';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { $provideEnvFilename } from '../../llm-providers/_common/register/$provideEnvFilename';
import type { string_filename } from '../../types/typeAliases';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { PromptbookStorage } from '../_common/PromptbookStorage';

/**
 * Stores data in .env variables
 *
 * Note: `$` is used to indicate that this function is not a pure function - it uses filesystem to access `.env` file and also writes to `process.env`
 *
 * @public exported from `@promptbook/core`
 */
export class $EnvStorage<TItem> implements PromptbookStorage<TItem> {
    private envFilename: string_filename | null = null;

    private async $provideOrCreateEnvFile(): Promise<string_filename> {
        if (this.envFilename !== null) {
            return this.envFilename;
        }

        let envFilename = await $provideEnvFilename();

        if (envFilename !== null) {
            this.envFilename = envFilename;
            return envFilename;
        }

        envFilename = join(process.cwd(), '.env');

        await writeFile(envFilename, '# This file was initialized by Promptbook', 'utf-8');

        this.envFilename = envFilename;
        return envFilename;
    }

    private transformKey(key: string): string {
        return normalizeTo_SCREAMING_CASE(key);
    }

    /**
     * Returns the number of key/value pairs currently present in the list associated with the object.
     */
    public get length(): number {
        throw new NotYetImplementedError('Method `$EnvStorage.length` not implemented.');
    }

    /**
     * Empties the list associated with the object of all key/value pairs, if there are any.
     */
    public clear(): void {
        throw new NotYetImplementedError('Method `$EnvStorage.clear` not implemented.');
    }

    /**
     * Returns the current value associated with the given key, or null if the given key does not exist in the list associated with the object.
     */
    public async getItem(key: string): Promise<TItem | null> {
        dotenv.config({ path: await this.$provideOrCreateEnvFile() });

        return (process.env[this.transformKey(key)] as TItem) || null;
    }

    /**
     * Returns the name of the nth key in the list, or null if n is greater than or equal to the number of key/value pairs in the object.
     */
    public key(index: number): string | null {
        TODO_USE(index);
        throw new NotYetImplementedError('Method `$EnvStorage.key` not implemented.');
    }

    /**
     * Sets the value of the pair identified by key to value, creating a new key/value pair if none existed for key previously.
     */
    public async setItem(key: string, value: TItem): Promise<void> {
        const envFilename = await this.$provideOrCreateEnvFile();
        const envContent = await readFile(envFilename, 'utf-8');

        const newEnvContent = `${envContent}\n\n\n${this.transformKey(key)}=${JSON.stringify(value)}\n`;
        // <- TODO: !!! Add note and use spacetrim
        writeFile(envFilename, newEnvContent, 'utf-8');
    }

    /**
     * Removes the key/value pair with the given key from the list associated with the object, if a key/value pair with the given key exists.
     */
    public removeItem(key: string): void {
        TODO_USE(key);
        throw new NotYetImplementedError('Method `$EnvStorage.removeItem` not implemented.');
    }
}
