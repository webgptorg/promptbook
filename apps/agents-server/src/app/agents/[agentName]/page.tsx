'use server';

import { $provideServer } from '@/src/tools/$provideServer';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { saturate } from '@promptbook-local/color';
import { PROMPTBOOK_COLOR } from '@promptbook-local/core';
import { notFound } from 'next/navigation';
import { Color } from '../../../../../../src/utils/color/Color';
import { getAgentName, getAgentProfile } from './_utils';
import { getAgentLinks } from './agentLinks';
import { AgentProfileChat } from './AgentProfileChat';
import { AgentProfileWrapper } from './AgentProfileWrapper';
import { generateAgentMetadata } from './generateAgentMetadata';
import { ServiceWorkerRegister } from './ServiceWorkerRegister';

export const generateMetadata = generateAgentMetadata;

export default async function AgentPage({
    params,
    searchParams,
}: {
    params: Promise<{ agentName: string }>;
    searchParams: Promise<{ headless?: string }>;
}) {
    const agentName = await getAgentName(params);
    const isAdmin = await isUserAdmin();
    const { headless: headlessParam } = await searchParams;
    const isHeadless = headlessParam !== undefined;

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

    const brandColor = Color.fromSafe(agentProfile.meta.color || PROMPTBOOK_COLOR);
    const brandColorHex = brandColor.then(saturate(-0.5)).toHex();

    const fullname = (agentProfile.meta.fullname || agentProfile.agentName || 'Agent') as string;

    return (
        <>
            <ServiceWorkerRegister scope={`/agents/${encodeURIComponent(agentName)}/`} />
            <AgentProfileWrapper
                agent={agentProfile}
                agentUrl={agentUrl}
                agentEmail={agentEmail}
                agentName={agentName}
                brandColorHex={brandColorHex}
                isAdmin={isAdmin}
                isHeadless={isHeadless}
                actions={
                    <>
                        {getAgentLinks(agentName)
                            .filter((link) => ['Edit Book', 'Integration', 'All Links'].includes(link.title))
                            .map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
                                    title={link.title}
                                >
                                    <div className="p-2 rounded-full bg-white/40 group-hover:bg-white/60 transition-colors shadow-sm">
                                        <link.icon className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium text-sm">{link.title}</span>
                                </a>
                            ))}
                    </>
                }
            >
                <AgentProfileChat
                    agentUrl={agentUrl}
                    agentName={agentName}
                    fullname={fullname}
                    brandColorHex={brandColorHex}
                />
            </AgentProfileWrapper>
        </>
    );
}

/**
 * TODO: [🐱‍🚀] Make this page look nice - 🃏
 * TODO: [🐱‍🚀] Show usage of LLM
 * TODO: [🚗] Components and pages here should be just tiny UI wraper around proper agent logic and conponents
 * TODO: [🎣][🧠] Maybe do API / Page for transpilers, Allow to export each agent
 */
