import { NEXT_PUBLIC_SITE_URL } from '@/config';
import { PROMPTBOOK_COLOR } from '@promptbook-local/core';
import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { Color } from '../../../../src/utils/color/Color';
import { getMetadata } from '../database/getMetadata';
import { getAgentProfile } from './agents/[agentName]/_utils';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
    const serverName = (await getMetadata('SERVER_NAME')) || 'Promptbook Agents Server';
    const serverDescription = (await getMetadata('SERVER_DESCRIPTION')) || 'Agents server powered by Promptbook';

    const referer = (await headers()).get('referer') || '';
    const isAgentManifest = referer.includes('/agents/');

    if (!isAgentManifest) {
        return {
            name: serverName,
            short_name: serverName,
            description: serverDescription,
            start_url: `${NEXT_PUBLIC_SITE_URL.href}`,
            display_override: ['fullscreen', 'minimal-ui'],
            display: 'standalone',
            background_color: PROMPTBOOK_COLOR.toHex(),
            theme_color: PROMPTBOOK_COLOR.toHex(),
            icons: [
                /* TODO: !!!! */
            ],
            scope: `${NEXT_PUBLIC_SITE_URL.href}`,
        } satisfies MetadataRoute.Manifest;
    }

    const agentName = decodeURIComponent(referer.split('/agents/')[1]?.split('/')[0]);

    try {
        const agentProfile = await getAgentProfile(agentName);

        const name = agentProfile.meta.fullname || agentProfile.agentName;
        const short_name = agentProfile.agentName;
        const description = agentProfile.meta.description || agentProfile.personaDescription || `Agent ${name}`;

        // Extract brand color from meta
        const brandColor = Color.from(agentProfile.meta.color || PROMPTBOOK_COLOR);
        const theme_color = brandColor.toHex();
        const background_color = '#ffffff';

        const agentUrl = `${NEXT_PUBLIC_SITE_URL.href}agents/${encodeURIComponent(agentName)}`;

        const icons: MetadataRoute.Manifest['icons'] = [
            {
                src: `${agentUrl}/images/icon-256.png`,
                sizes: '256x256',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: `${agentUrl}/images/icon-256.png`,
                sizes: '256x256',
                type: 'image/png',
                purpose: 'maskable',
            },
        ];

        const screenshots: MetadataRoute.Manifest['screenshots'] = [
            {
                src: `${agentUrl}/images/screenshot-fullhd.png`,
                sizes: '1920x1080',
                type: 'image/png',
                form_factor: 'wide',
                label: 'Full HD Screenshot',
            },
            {
                src: `${agentUrl}/images/screenshot-phone.png`,
                sizes: '1080x1920',
                type: 'image/png',
                form_factor: 'narrow',
                label: 'Phone Screenshot',
            },
        ];

        return {
            id: agentUrl,
            name,
            short_name,
            description,
            start_url: agentUrl,
            scope: agentUrl,
            display_override: ['fullscreen', 'minimal-ui'],
            display: 'standalone',
            background_color,
            theme_color,
            icons,
            screenshots,
        } satisfies MetadataRoute.Manifest;
    } catch (error) {
        console.warn(`Failed to generate manifest for agent ${agentName}`, error);
        return {
            name: agentName,
            short_name: agentName,
            start_url: `${NEXT_PUBLIC_SITE_URL.href}agents/${encodeURIComponent(agentName)}`,
            display_override: ['fullscreen', 'minimal-ui'],
            display: 'standalone',
            background_color: '#ffffff',
            theme_color: PROMPTBOOK_COLOR.toHex(),
            icons: [],
        } satisfies MetadataRoute.Manifest;
    }
}
