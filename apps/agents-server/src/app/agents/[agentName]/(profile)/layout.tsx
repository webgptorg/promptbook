'use server';

import { DeletedAgentBanner } from '@/src/components/DeletedAgentBanner';
import { $provideServer } from '@/src/tools/$provideServer';
import { formatAgentNamingText } from '@/src/utils/agentNaming';
import { getDefaultChatPreferences } from '@/src/utils/chatPreferences';
import { getAgentNaming } from '@/src/utils/getAgentNaming';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { getThinkingMessages } from '@/src/utils/thinkingMessages';
import { saturate } from '@promptbook-local/color';
import { NotFoundError, PROMPTBOOK_COLOR } from '@promptbook-local/core';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { resolveAgentAvatarImageUrl } from '../../../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { Color } from '../../../../../../../src/utils/color/Color';
import { resolveSpeechRecognitionLanguage } from '../../../../../../../src/utils/language/getBrowserPreferredSpeechRecognitionLanguage';
import { $sideEffect } from '../../../../../../../src/utils/organization/$sideEffect';
import { getAgentFolderContext, getAgentName, getAgentProfile, isAgentDeleted } from '../_utils';
import { getAgentLinks } from '../agentLinks';
import { AgentPageContextProvider, type AgentPageContextValue } from '../AgentPageContext';
import { AgentProfileWrapper } from '../AgentProfileWrapper';
import { generateAgentMetadata } from '../generateAgentMetadata';
import { ServiceWorkerRegister } from '../ServiceWorkerRegister';

export const generateMetadata = generateAgentMetadata;

type AgentProfileLayoutProps = {
    readonly children: ReactNode;
    readonly params: Promise<{ agentName: string }>;
    readonly searchParams: Promise<{ headless?: string }>;
};

export default async function AgentProfileLayout({ children, params, searchParams }: AgentProfileLayoutProps) {
    const agentName = await getAgentName(params);
    const requestHeaders = await headers();
    $sideEffect(requestHeaders);
    const speechRecognitionLanguage = resolveSpeechRecognitionLanguage({
        acceptLanguageHeader: requestHeaders.get('accept-language'),
    });
    const isAdmin = await isUserAdmin();
    const { headless: headlessParam } = await searchParams;
    const isHeadless = headlessParam !== undefined;
    const folderContext = await getAgentFolderContext(agentName, isAdmin);
    const agentNaming = await getAgentNaming();

    let agentProfile;
    try {
        agentProfile = await getAgentProfile(agentName);
    } catch (error) {
        if (
            error instanceof NotFoundError ||
            (error instanceof Error &&
                (error.message.includes('Cannot coerce the result to a single JSON object') ||
                    error.message.includes('JSON object requested, multiple (or no) results returned')))
        ) {
            notFound();
        }
        throw error;
    }

    const { publicUrl } = await $provideServer();
    const agentUrl = `${publicUrl.href}${encodeURIComponent(agentName)}`;
    const agentEmail = `${agentName}@${publicUrl.hostname}`;

    const brandColor = Color.fromSafe(agentProfile.meta.color || PROMPTBOOK_COLOR);
    const brandColorHex = brandColor.then(saturate(-0.5)).toHex();

    const fallbackName = formatAgentNamingText('Agent', agentNaming);
    const fullname = (agentProfile.meta.fullname || agentProfile.agentName || fallbackName) as string;
    const isDeleted = await isAgentDeleted(agentName);

    const thinkingMessages = await getThinkingMessages();
    const chatPreferences = await getDefaultChatPreferences();

    const actionLinks = getAgentLinks(agentProfile.permanentId || agentName, (text) =>
        formatAgentNamingText(text, agentNaming),
    ).filter((link) => link.id === 'book' || link.id === 'integration');

    const actions = (
        <>
            {actionLinks.map((link) => (
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
    );

    const avatarSrc =
        resolveAgentAvatarImageUrl({ agent: agentProfile, baseUrl: publicUrl.href }) ||
        `/agents/${encodeURIComponent(agentProfile.permanentId || agentName)}/images/default-avatar.png`;

    const agentContextValue: AgentPageContextValue = {
        agentName,
        agentUrl,
        fullname,
        avatarSrc,
        brandColorHex,
        brandColor: agentProfile.meta.color ?? null,
        speechRecognitionLanguage,
        thinkingMessages,
        defaultIsSoundsOn: chatPreferences.defaultIsSoundsOn,
        defaultIsVibrationOn: chatPreferences.defaultIsVibrationOn,
    };

    const deletedMessage = formatAgentNamingText(
        'This agent has been deleted. You can restore it from the Recycle Bin.',
        agentNaming,
    );

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
                folderContext={folderContext}
                actions={actions}
            >
                {isDeleted ? (
                    <DeletedAgentBanner message={deletedMessage} />
                ) : (
                    <AgentPageContextProvider value={agentContextValue}>{children}</AgentPageContextProvider>
                )}
            </AgentProfileWrapper>
        </>
    );
}
