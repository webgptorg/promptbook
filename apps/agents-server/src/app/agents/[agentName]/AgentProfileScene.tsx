'use server';

import type { ReactNode } from 'react';

import { $provideServer } from '@/src/tools/$provideServer';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { saturate } from '@promptbook-local/color';
import { NotFoundError, PROMPTBOOK_COLOR } from '@promptbook-local/core';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { resolveAgentAvatarImageUrl } from '../../../../../../src/utils/agents/resolveAgentAvatarImageUrl';
import { Color } from '../../../../../../src/utils/color/Color';
import { resolveSpeechRecognitionLanguage } from '../../../../../../src/utils/language/getBrowserPreferredSpeechRecognitionLanguage';
import { DeletedAgentBanner } from '../../../components/DeletedAgentBanner';
import { formatAgentNamingText } from '../../../utils/agentNaming';
import { getAgentNaming } from '../../../utils/getAgentNaming';
import { getAgentFolderContext, getAgentName, getAgentProfile, isAgentDeleted } from './_utils';
import { getAgentLinks } from './agentLinks';
import { AgentProfileChat } from './AgentProfileChat';
import { AgentProfileWrapper } from './AgentProfileWrapper';
import { ServiceWorkerRegister } from './ServiceWorkerRegister';

/**
 * Attribution data passed to an optional chat overlay rendered on top of the profile scene.
 *
 * @private @@@
 */
export type AgentProfileSceneOverlayParams = {
    /**
     * Display name of the agent.
     */
    readonly agentName: string;

    /**
     * Full URL pointing at the agent profile.
     */
    readonly agentUrl: string;

    /**
     * Computed brand color used for buttons/backgrounds.
     */
    readonly brandColorHex: string;

    /**
     * Avatar image URL for the agent.
     */
    readonly avatarSrc: string;

    /**
     * Human-readable name shown across the UI.
     */
    readonly fullname: string;

    /**
     * Speech recognition language hint derived from the request headers.
     */
    readonly speechRecognitionLanguage?: string;

    /**
     * Whether the agent is deleted.
     */
    readonly isDeleted: boolean;
};

/**
 * Props that control rendering of the shared agent profile scene.
 *
 * @private @@@
 */
export type AgentProfileSceneProps = {
    /**
     * Route params that include the encoded agent name.
     */
    readonly params: Promise<{ agentName: string }>;

    /**
     * Whether the profile is rendered inside a headless/embed context.
     */
    readonly isHeadless: boolean;

    /**
     * Optional render callback that places additional UI (such as the chat overlay) on top of the profile.
     */
    readonly overlay?: (params: AgentProfileSceneOverlayParams) => ReactNode;
};

/**
 * Renders the agent profile, chat teaser, and optional overlay for nested child routes.
 *
 * @param props - Props describing the agent context and optional overlay renderer.
 * @returns The rendered profile scene.
 * @private @@@
 */
export async function AgentProfileScene(props: AgentProfileSceneProps) {
    const { params, isHeadless, overlay } = props;
    const agentName = await getAgentName(params);
    const requestHeaders = await headers();
    const speechRecognitionLanguage = resolveSpeechRecognitionLanguage({
        acceptLanguageHeader: requestHeaders.get('accept-language'),
    });
    const isAdmin = await isUserAdmin();
    const { publicUrl } = await $provideServer();
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

    const agentUrl = `${publicUrl.href}${encodeURIComponent(agentName)}`;
    const agentEmail = `${agentName}@${publicUrl.hostname}`;
    const brandColor = Color.fromSafe(agentProfile.meta.color || PROMPTBOOK_COLOR);
    const brandColorHex = brandColor.then(saturate(-0.5)).toHex();
    const fallbackName = formatAgentNamingText('Agent', agentNaming);
    const fullname = (agentProfile.meta.fullname || agentProfile.agentName || fallbackName) as string;
    const isDeleted = await isAgentDeleted(agentName);
    const avatarSrc =
        resolveAgentAvatarImageUrl({ agent: agentProfile, baseUrl: publicUrl.href }) ||
        `/agents/${encodeURIComponent(agentProfile.permanentId || agentName)}/images/default-avatar.png`;

    const renderedOverlay =
        !isDeleted && overlay
            ? overlay({
                  agentName,
                  agentUrl,
                  brandColorHex,
                  avatarSrc,
                  fullname,
                  speechRecognitionLanguage,
                  isDeleted,
              })
            : null;

    return (
        <>
            <ServiceWorkerRegister scope={`/agents/${encodeURIComponent(agentName)}/`} />
            <div className="relative">
                <AgentProfileWrapper
                    agent={agentProfile}
                    agentUrl={agentUrl}
                    publicUrl={publicUrl.href}
                    agentEmail={agentEmail}
                    agentName={agentName}
                    isAdmin={isAdmin}
                    isHeadless={isHeadless}
                    folderContext={folderContext}
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
                        avatarSrc={avatarSrc}
                        isDeleted={isDeleted}
                        speechRecognitionLanguage={speechRecognitionLanguage}
                    />
                </AgentProfileWrapper>
            </div>
            {renderedOverlay}
        </>
    );
}
