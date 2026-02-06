'use server';

import { $provideServer } from '@/src/tools/$provideServer';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { saturate } from '@promptbook-local/color';
import { NotFoundError, PROMPTBOOK_COLOR } from '@promptbook-local/core';
import { notFound } from 'next/navigation';
import { Color } from '../../../../../../src/utils/color/Color';
import { resolveAgentAvatarImageUrl } from '../../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { DeletedAgentBanner } from '../../../components/DeletedAgentBanner';
import { formatAgentNamingText } from '../../../utils/agentNaming';
import { getAgentNaming } from '../../../utils/getAgentNaming';
import { getAgentName, getAgentProfile, isAgentDeleted } from './_utils';
import { getAgentLinks } from './agentLinks';
import { AgentProfileChat } from './AgentProfileChat';
import { AgentProfileWrapper } from './AgentProfileWrapper';
import { generateAgentMetadata } from './generateAgentMetadata';
import { ServiceWorkerRegister } from './ServiceWorkerRegister';

export const generateMetadata = generateAgentMetadata;

/**
 * Renders the main agent profile page.
 *
 * @param params - Route params containing the agent name.
 * @param searchParams - Query parameters for the page.
 * @returns Agent profile UI.
 */
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
    const { publicUrl } = await $provideServer();
    const agentNaming = await getAgentNaming();

    let agentProfile;
    try {
        agentProfile = await getAgentProfile(agentName);
    } catch (error) {
        if (
            error instanceof NotFoundError ||
            (error instanceof Error &&
                // Note: This is a bit hacky, but valid way to check for specific error message
                (error.message.includes('Cannot coerce the result to a single JSON object') ||
                    error.message.includes('JSON object requested, multiple (or no) results returned')))
        ) {
            notFound();
        }
        throw error;
    }

    // Build agent page URL for QR and copy
    const agentUrl = `${publicUrl.href}${encodeURIComponent(agentName)}`;
    // <- TODO: [🐱‍🚀] Better

    const agentEmail = `${agentName}@${publicUrl.hostname}`;

    const brandColor = Color.fromSafe(agentProfile.meta.color || PROMPTBOOK_COLOR);
    const brandColorHex = brandColor.then(saturate(-0.5)).toHex();

    const fallbackName = formatAgentNamingText('Agent', agentNaming);
    const fullname = (agentProfile.meta.fullname || agentProfile.agentName || fallbackName) as string;
    const isDeleted = await isAgentDeleted(agentName);

    return (
        <>
            <ServiceWorkerRegister scope={`/agents/${encodeURIComponent(agentName)}/`} />
            <AgentProfileWrapper
                agent={agentProfile}
                agentUrl={agentUrl}
                publicUrl={publicUrl.href}
                agentEmail={agentEmail}
                agentName={agentName}
                isAdmin={isAdmin}
                isHeadless={isHeadless}
                actions={
                    <>
                        {getAgentLinks(agentProfile.permanentId || agentName, (text) =>
                            formatAgentNamingText(text, agentNaming),
                        )
                            .filter((link) => link.id === 'book' || link.id === 'integration')
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
                {isDeleted && <DeletedAgentBanner />}
                <AgentProfileChat
                    agentUrl={agentUrl}
                    agentName={agentName}
                    fullname={fullname}
                    brandColorHex={brandColorHex}
                    avatarSrc={
                        resolveAgentAvatarImageUrl({ agent: agentProfile, baseUrl: publicUrl.href }) ||
                        `/agents/${encodeURIComponent(agentProfile.permanentId || agentName)}/images/default-avatar.png`
                    }
                    isDeleted={isDeleted}
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
