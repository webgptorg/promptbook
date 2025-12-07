'use server';

import { $provideServer } from '@/src/tools/$provideServer';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { PROMPTBOOK_COLOR } from '@promptbook-local/core';
import { notFound } from 'next/navigation';
import { Color } from '../../../../../../src/utils/color/Color';
import { darken } from '../../../../../../src/utils/color/operators/darken';
import { lighten } from '../../../../../../src/utils/color/operators/lighten';
import { getAgentName, getAgentProfile } from './_utils';
import { AgentProfileView } from './AgentProfileView';
import { generateAgentMetadata } from './generateAgentMetadata';
import { ServiceWorkerRegister } from './ServiceWorkerRegister';

export const generateMetadata = generateAgentMetadata;

export default async function AgentPage({ params }: { params: Promise<{ agentName: string }> }) {
    const agentName = await getAgentName(params);
    const isAdmin = await isUserAdmin();

    let agentProfile;
    try {
        agentProfile = await getAgentProfile(agentName);
    } catch (error) {
        if (
            error instanceof Error &&
            // Note: This is a bit hacky, but valid way to check for specific error message
            (error.message.includes('Cannot coerce the result to a single JSON object') ||
                error.message.includes('JSON object requested, multiple (or no) results returned'))
        ) {
            notFound();
        }
        throw error;
    }

    const { publicUrl } = await $provideServer();

    // Build agent page URL for QR and copy
    const agentUrl = `${publicUrl.href}${encodeURIComponent(agentName)}`;
    // <- TODO: [🐱‍🚀] Better

    const agentEmail = `${agentName}@${publicUrl.hostname}`;

    // Extract brand color from meta and create color variations
    const brandColor = Color.from(agentProfile.meta.color || PROMPTBOOK_COLOR);
    const brandColorHex = brandColor.toHex();
    const brandColorLightHex = brandColor.then(lighten(0.2)).toHex();
    const brandColorDarkHex = brandColor.then(darken(0.15)).toHex();

    const fullname = (agentProfile.meta.fullname || agentProfile.agentName || 'Agent') as string;
    const imageUrl = (agentProfile.meta.image as string) || null;

    return (
        <>
            <ServiceWorkerRegister scope={`/agents/${encodeURIComponent(agentName)}/`} />
            <AgentProfileView
                agentName={agentName}
                fullname={fullname}
                personaDescription={agentProfile.personaDescription || ''}
                imageUrl={imageUrl}
                agentUrl={agentUrl}
                agentEmail={agentEmail}
                brandColorHex={brandColorHex}
                brandColorLightHex={brandColorLightHex}
                brandColorDarkHex={brandColorDarkHex}
                meta={agentProfile.meta}
                isAdmin={isAdmin}
            />
        </>
    );
}

/**
 * TODO: [🐱‍🚀] Make this page look nice - 🃏
 * TODO: [🐱‍🚀] Show usage of LLM
 * TODO: [🚗] Components and pages here should be just tiny UI wraper around proper agent logic and conponents
 * TODO: [🎣][🧠] Maybe do API / Page for transpilers, Allow to export each agent
 */
