import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { ensurePrivateDirectory, readPrivateFile, removePrivateFile, writePrivateFile } from '../app/files.js';
import type { HarnessPlugin } from '../harness/types.js';
import { environmentReference, type ResolvedReference } from '../tools/environment.js';
import type { HarnessToolRecord } from '../tools/model.js';

/** The explicit instance and secret to place in the new project's ignored .env. @private onboarding */
export type PreparedApiHarness = { readonly tool: HarnessToolRecord; readonly credential: ResolvedReference & { readonly value: string } };

/** Separate from the draft, uploads, App content, and the eventual Git worktree. */
const CREDENTIALS = 'harness-credentials';

/** Maps a key to an explicit API instance using only adapter-owned provider settings. @private onboarding */
export function prepareApiHarness(plugin: HarnessPlugin, value: string): PreparedApiHarness {
    const name = 'PTBK_' + plugin.variant + '_API_KEY';
    return {
        credential: { name, value, source: '.env' },
        tool: {
            type: 'HARNESS', variant: plugin.variant, name: plugin.id, isEnabled: true, authentication: 'API_KEY',
            apiKey: environmentReference(name), baseUrl: plugin.setupApiKey?.baseUrl,
        },
    };
}

/** Loads an already verified, explicitly selected API key under the engine user. @private onboarding */
export async function readPreparedApiHarness(root: string, plugin: HarnessPlugin): Promise<PreparedApiHarness | undefined> {
    if (!plugin.setupApiKey) return undefined;
    const value = await readPrivateFile(join(root, CREDENTIALS), plugin.id);
    return value === undefined ? undefined : prepareApiHarness(plugin, value);
}

/** Retains a verified key across reconnects until the project has its own copy. @private onboarding */
export async function savePreparedApiKey(root: string, plugin: HarnessPlugin, value: string): Promise<void> {
    const directory = join(root, CREDENTIALS);
    await ensurePrivateDirectory(directory);
    await writePrivateFile(directory, plugin.id, value);
}

/** Drops a staged API key when the owner switches to native sign-in. @private onboarding */
export async function discardPreparedApiKey(root: string, plugin: HarnessPlugin): Promise<void> {
    await removePrivateFile(join(root, CREDENTIALS), plugin.id);
}

/** Removes the staging copy when its work is complete. @private onboarding */
export async function discardPreparedApiKeys(root: string): Promise<void> {
    await rm(join(root, CREDENTIALS), { recursive: true, force: true });
}
