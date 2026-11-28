import { PROMPTBOOK_COLOR } from '@promptbook-local/core';
import { MetadataRoute } from 'next';
import { getMetadata } from '../database/getMetadata';
import { $provideServer } from '../tools/$provideServer';

/**
 * Manifest for PWA Progressive Web App
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
    const { publicUrl } = await $provideServer();
    const serverName = (await getMetadata('SERVER_NAME')) || 'Promptbook Agents Server';
    const serverDescription = (await getMetadata('SERVER_DESCRIPTION')) || 'Agents server powered by Promptbook';

    return {
        name: serverName,
        short_name: serverName,
        description: serverDescription,
        start_url: publicUrl.href + '?utm_source=pwa&utm_medium=install&utm_campaign=agents_server_app',
        display_override: ['fullscreen', 'minimal-ui'],
        display: 'standalone',
        background_color: PROMPTBOOK_COLOR.toHex(),
        theme_color: PROMPTBOOK_COLOR.toHex(),
        icons: [
            // TODO: Create icons for the server homepage
        ],
        scope: publicUrl.href,
    } satisfies MetadataRoute.Manifest;
}
