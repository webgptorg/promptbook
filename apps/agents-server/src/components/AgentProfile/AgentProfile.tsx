'use client';

import { colorToDataUrl } from '@promptbook-local/color';
import { generatePlaceholderAgentProfileImageUrl } from '@promptbook-local/core';
import { AgentBasicInformation, string_agent_permanent_id } from '@promptbook-local/types';
import { RepeatIcon } from 'lucide-react';
import { useState } from 'react';
import { AgentCapabilityChips } from './AgentCapabilityChips';
import { AgentProfileImage } from './AgentProfileImage';
import { AgentQrCode } from './AgentQrCode';
import { QrCodeModal } from './QrCodeModal';
import { useAgentBackground } from './useAgentBackground';

type AgentProfileProps = {
    /**
     * The agent to display
     */
    readonly agent: AgentBasicInformation;

    /**
     * The permanent ID of the agent
     */
    readonly permanentId: string_agent_permanent_id;

    /**
     * URL of the agent page
     *
     * @default undefined - If not provided, some features like QR code for link might be disabled or use generic link
     */
    readonly agentUrl?: string;

    /**
     * Base URL of the agents server
     */
    readonly publicUrl: URL;

    /**
     * Email of the agent
     */
    readonly agentEmail?: string;

    /**
     * Content for the menu (top right)
     *
     * @param props.onShowQrCode - Function to open QR code modal
     */
    readonly renderMenu?: (props: { onShowQrCode: () => void }) => React.ReactNode;

    /**
     * Content for the chat area
     */
    readonly children?: React.ReactNode;

    /**
     * Content for the secondary actions (links)
     */
    readonly actions?: React.ReactNode;

    /**
     * If true, hides the menu and actions for fullscreen/embedded view
     */
    readonly isHeadless?: boolean;

    /**
     * CSS class name
     */
    readonly className?: string;
};

export function AgentProfile(props: AgentProfileProps) {
    const {
        agent,
        agentUrl = '',
        agentEmail = '',
        publicUrl,
        permanentId,
        renderMenu,
        children,
        actions,
        isHeadless = false,
        className,
    } = props;

    const { meta, agentName } = agent;
    const fullname = (meta.fullname as string) || agentName || 'Agent';
    const personaDescription = meta.description || agent.personaDescription || '';
    const imageUrl = meta.image || generatePlaceholderAgentProfileImageUrl(permanentId, publicUrl);

    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);

    // Dynamic Font Loading
    const fontString = meta.font;
    let fontStyle: React.CSSProperties = {};

    if (fontString) {
        // [🧠] TODO: Properly parse font string to get family name
        // const primaryFont = fontString.split(',')[0].trim().replace(/['"]/g, '');
        fontStyle = {
            fontFamily: fontString,
        };
    }

    // Compute Colors and Background
    const { brandColorHex, brandColorLightHex, brandColorDarkHex, backgroundImage } = useAgentBackground(meta.color);

    return (
        <>
            {fontString && (
                <style jsx global>{`
                    @import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(
                        fontString.split(',')[0].trim().replace(/['"]/g, ''),
                    )}:wght@400;600;700&display=swap');
                `}</style>
            )}

            {/* Full-screen background with agent color */}
            <div
                className={`w-full flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden ${
                    isHeadless ? 'min-h-screen' : 'min-h-[calc(100vh-60px)]'
                } ${className || ''}`}
                style={{
                    background: `url("${backgroundImage}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    ...fontStyle,
                }}
            >
                {/* Options menu in top right */}
                {!isHeadless && renderMenu && (
                    <div className="absolute top-4 right-4 z-[9999]">
                        {renderMenu({ onShowQrCode: () => setIsQrModalOpen(true) })}
                    </div>
                )}

                {/* Main profile content */}
                <div className="relative z-10 flex flex-col md:grid md:grid-cols-[auto_1fr] gap-y-6 md:gap-y-4 md:gap-x-12 max-w-5xl w-full items-center md:items-start">
                    {/* Agent image card (Flippable) */}
                    <div
                        className="flex-shrink-0 perspective-1000 group w-full md:w-auto md:row-start-1 md:col-start-1 md:row-span-3"
                        style={{ perspective: '1000px' }}
                    >
                        <div
                            className="relative w-full md:w-80 transition-all duration-700 transform-style-3d cursor-pointer max-w-sm mx-auto md:max-w-none md:mx-0"
                            style={{
                                aspectRatio: '1 / 1.618', // Golden Ratio
                                transformStyle: 'preserve-3d',
                                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                            }}
                            onClick={() => setIsFlipped(!isFlipped)}
                        >
                            {/* Front of Card (Image) */}
                            <div
                                className="absolute inset-0 w-full h-full backface-hidden rounded-lg md:rounded-3xl shadow-lg md:shadow-2xl overflow-hidden backdrop-blur-sm"
                                style={{
                                    backfaceVisibility: 'hidden',
                                    backgroundColor: brandColorDarkHex,
                                    boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px ${brandColorLightHex}40`,

                                    // Note: Make it squircle
                                    // borderRadius: '50%',
                                    // ['cornerShape' as really_any /* <- Note: `cornerShape` is non standard CSS property */]: 'squircle ',
                                }}
                            >
                                <AgentProfileImage
                                    src={imageUrl}
                                    alt={fullname}
                                    className="w-full h-full object-cover"
                                    style={{
                                        objectFit: 'cover',
                                        backgroundImage: `url(${colorToDataUrl(brandColorLightHex)})`,
                                    }}
                                />

                                {/* Flip hint icon */}
                                <div className="absolute bottom-2 md:bottom-4 right-2 md:right-4 bg-black/30 p-1 md:p-2 rounded-full text-white/80 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                                    <RepeatIcon className="w-3 h-3 md:w-5 md:h-5" />
                                </div>
                            </div>

                            {/* Back of Card (QR Code) */}
                            <div
                                className="absolute inset-0 w-full h-full backface-hidden rounded-lg md:rounded-3xl shadow-lg md:shadow-2xl overflow-hidden backdrop-blur-sm flex flex-col items-center justify-center p-2 md:p-6"
                                style={{
                                    backfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg)',
                                    background: `linear-gradient(135deg, ${brandColorLightHex} 0%, #ffffff 100%)`,
                                    boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px ${brandColorLightHex}40`,
                                }}
                            >
                                <div className="transform scale-90 md:scale-100">
                                    <AgentQrCode
                                        agentName={agentName}
                                        agentUrl={agentUrl}
                                        agentEmail={agentEmail}
                                        personaDescription={personaDescription}
                                        meta={meta}
                                        isJustVcardShown
                                    />
                                </div>

                                {/* Flip hint icon */}
                                <div className="absolute bottom-2 md:bottom-4 right-2 md:right-4 bg-black/10 p-1 md:p-2 rounded-full text-black/50 backdrop-blur-md">
                                    <RepeatIcon className="w-3 h-3 md:w-5 md:h-5" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Agent info - Header Area */}
                    <div className="w-full md:w-auto md:row-start-1 md:col-start-2 flex flex-col justify-center md:justify-start items-center md:items-start h-auto gap-4 md:gap-6 text-center md:text-left">
                        {/* Agent name with custom font */}
                        <h1
                            className="text-2xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-tight"
                            style={{
                                textShadow: '0 2px 20px rgba(255, 255, 255, 0.5)',
                            }}
                        >
                            {fullname}
                        </h1>

                        {/* Short description */}
                        <p className="text-sm md:text-xl text-gray-700 max-w-lg leading-relaxed font-medium line-clamp-3 md:line-clamp-none">
                            {personaDescription}
                        </p>

                        <AgentCapabilityChips agent={agent} />
                    </div>

                    {/* Chat Area */}
                    <div className="w-full md:col-span-1 md:col-start-2 mt-4 md:mt-0">{children}</div>

                    {/* Secondary Actions */}
                    {!isHeadless && (
                        <div className="w-full md:col-span-1 md:col-start-2 flex flex-wrap justify-center md:justify-start items-center gap-4 md:gap-6 mt-4 md:mt-2">
                            {actions}
                        </div>
                    )}
                </div>

                {/* Subtle gradient overlay at bottom */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
                    style={{
                        background: `linear-gradient(to top, ${brandColorDarkHex}40, transparent)`,
                    }}
                />
            </div>

            {/* QR Code Modal */}
            <QrCodeModal
                isOpen={isQrModalOpen}
                onClose={() => setIsQrModalOpen(false)}
                agentName={agentName}
                meta={meta}
                personaDescription={personaDescription}
                agentUrl={agentUrl}
                agentEmail={agentEmail}
                brandColorHex={brandColorHex}
            />
        </>
    );
}

/**
 * TODO: !!!! Use 3D badge @see https://vercel.com/blog/building-an-interactive-3d-event-badge-with-react-three-fiber
 */
