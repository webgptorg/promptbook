import { MetadataRoute } from 'next';
import { Color } from '../../../../../../src/utils/color/Color';
import { getAgentName, getAgentProfile } from './_utils';

export default async function manifest({ params }: { params: Promise<{ agentName: string }> }): Promise<MetadataRoute.Manifest> {
    const agentName = await getAgentName(params);

    try {
        const agentProfile = await getAgentProfile(agentName);

        const name = agentProfile.meta.fullname || agentProfile.agentName;
        const short_name = agentProfile.agentName;
        const description = agentProfile.meta.description || agentProfile.personaDescription || `Agent ${name}`;
        
        // Extract brand color from meta
        const brandColor = Color.from(agentProfile.meta.color || '#3b82f6'); // Default to blue-600
        const theme_color = brandColor.toHex();
        const background_color = '#ffffff';

        // Extract image from meta
        const image = agentProfile.meta.image;
        
        const icons: MetadataRoute.Manifest['icons'] = [];

        if (image) {
             icons.push({
                src: image,
                sizes: 'any',
                type: 'image/png', // Assuming PNG or handling generic
                purpose: 'any'
            });
        } else {
             // Fallback icon
             icons.push({
                src: '/logo-blue-white-256.png',
                sizes: '256x256',
                type: 'image/png',
            });
        }

        return {
            name,
            short_name,
            description,
            start_url: `/agents/${encodeURIComponent(agentName)}`,
            display: 'standalone',
            background_color,
            theme_color,
            icons,
            // Scope is important to define the PWA boundary
            scope: `/agents/${encodeURIComponent(agentName)}/`,
        };
    } catch (error) {
        console.warn(`Failed to generate manifest for agent ${agentName}`, error);
        return {
            name: agentName,
            short_name: agentName,
            start_url: `/agents/${encodeURIComponent(agentName)}`,
            display: 'standalone',
            background_color: '#ffffff',
            theme_color: '#3b82f6',
            icons: [],
        };
    }
}
