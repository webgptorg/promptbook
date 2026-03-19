import { PROMPTBOOK_COLOR } from '@promptbook-local/core';
import { MetadataRoute } from 'next';
import { loadChatConfiguration } from '@/src/utils/chatConfiguration';
import { AGENT_SHARE_TARGET_FILE_ACCEPT, createAgentShareTargetActionPath } from '@/src/utils/shareTarget';
import { Color } from '../../../../../../src/utils/color/Color';
import { $provideServer } from '../../../tools/$provideServer';
import { formatAgentNamingText } from '../../../utils/agentNaming';
import { getAgentNaming } from '../../../utils/getAgentNaming';
import { getAgentProfile } from './_utils';

/**
 * Manifest for one installed agent PWA.
 */
export default async function manifest({
    params,
}: {
    params: Promise<{ agentName: string }>;
}): Promise<MetadataRoute.Manifest> {
    const { publicUrl } = await $provideServer();
    const { isFileAttachmentsEnabled } = await loadChatConfiguration();
    const agentNaming = await getAgentNaming();
    const { agentName: rawAgentName } = await params;
    const agentName = decodeURIComponent(rawAgentName);

    try {
        const agentProfile = await getAgentProfile(agentName);
        const canonicalAgentId = agentProfile.permanentId || agentName;
        const name = agentProfile.meta.fullname || agentProfile.agentName;
        const short_name = agentProfile.agentName;
        const descriptionFallback = `${formatAgentNamingText('Agent', agentNaming)} ${name}`;
        const description = agentProfile.meta.description || agentProfile.personaDescription || descriptionFallback;
        const brandColor = Color.fromSafe(agentProfile.meta.color || PROMPTBOOK_COLOR);
        const theme_color = brandColor.toHex();
        const background_color = '#ffffff';
        const agentUrl = `${publicUrl.href}agents/${encodeURIComponent(canonicalAgentId)}`;

        return {
            id: agentUrl,
            name,
            short_name,
            description,
            start_url: `${agentUrl}?headless&utm_source=pwa&utm_medium=install&utm_campaign=agent_app`,
            scope: agentUrl,
            display_override: ['fullscreen', 'minimal-ui'],
            display: 'standalone',
            background_color,
            theme_color,
            launch_handler: {
                client_mode: 'navigate-existing',
            },
            share_target: {
                action: `${agentUrl.replace(/\/$/, '')}/share-target`,
                method: 'POST',
                enctype: 'multipart/form-data',
                params: {
                    title: 'title',
                    text: 'text',
                    url: 'url',
                    ...(isFileAttachmentsEnabled
                        ? {
                              files: {
                                  name: 'files',
                                  accept: [...AGENT_SHARE_TARGET_FILE_ACCEPT],
                              },
                          }
                        : {}),
                },
            },
            icons: [
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
            ],
            screenshots: [
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
            ],
        } satisfies MetadataRoute.Manifest;
    } catch (error) {
        console.warn(`Failed to generate agent manifest for ${agentName}`, error);

        return {
            id: `${publicUrl.href}agents/${encodeURIComponent(agentName)}`,
            name: agentName,
            short_name: agentName,
            start_url: `${publicUrl.href}agents/${encodeURIComponent(
                agentName,
            )}?headless&utm_source=pwa&utm_medium=install&utm_campaign=agent_app`,
            scope: `${publicUrl.href}agents/${encodeURIComponent(agentName)}`,
            display_override: ['fullscreen', 'minimal-ui'],
            display: 'standalone',
            background_color: '#ffffff',
            theme_color: PROMPTBOOK_COLOR.toHex(),
            launch_handler: {
                client_mode: 'navigate-existing',
            },
            share_target: {
                action: new URL(createAgentShareTargetActionPath(agentName), publicUrl).href,
                method: 'POST',
                enctype: 'multipart/form-data',
                params: {
                    title: 'title',
                    text: 'text',
                    url: 'url',
                },
            },
            icons: [],
        } satisfies MetadataRoute.Manifest;
    }
}
