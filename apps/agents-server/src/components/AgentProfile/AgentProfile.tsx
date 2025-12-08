'use client';

import { AgentBasicInformation } from '@promptbook-local/types';
import { RepeatIcon } from 'lucide-react';
import { useState, useMemo } from 'react';
import spaceTrim from 'spacetrim';
import { Color } from '../../../../../src/utils/color/Color';
import { darken } from '../../../../../src/utils/color/operators/darken';
import { lighten } from '../../../../../src/utils/color/operators/lighten';
import { AgentQrCode } from './AgentQrCode';
import { QrCodeModal } from './QrCodeModal';

type AgentProfileProps = {
    /**
     * The agent to display
     */
    readonly agent: AgentBasicInformation;

    /**
     * URL of the agent page
     * 
     * @default undefined - If not provided, some features like QR code for link might be disabled or use generic link
     */
    readonly agentUrl?: string;

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
     * CSS class name
     */
    readonly className?: string;
};

export function AgentProfile(props: AgentProfileProps) {
    const { agent, agentUrl = '', agentEmail = '', renderMenu, children, actions, className } = props;
    const { meta, agentName } = agent;
    const fullname = (meta.fullname as string) || agentName || 'Agent';
    const personaDescription = agent.personaDescription || '';
    const imageUrl = (meta.image as string) || null;

    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);

    // Dynamic Font Loading
    const fontString = meta.font;
    let fontStyle: React.CSSProperties = {};

    if (fontString) {
        // [🧠] TODO: Properly parse font string to get family name
        const primaryFont = fontString.split(',')[0].trim().replace(/['"]/g, '');
        fontStyle = {
            fontFamily: fontString,
        };
    }

    // Compute Colors and Background
    const { brandColorHex, brandColorLightHex, brandColorDarkHex, backgroundImage } = useMemo(() => {
        // [🧠] Default color should be imported constant, but for now hardcoded fallback
        const PROMPTBOOK_COLOR_HEX = '#f15b24'; // TODO: Import PROMPTBOOK_COLOR
        const brandColorString = meta.color || PROMPTBOOK_COLOR_HEX;
        
        let brandColor;
        try {
            brandColor = Color.fromSafe(brandColorString.split(',')[0].trim());
        } catch {
            brandColor = Color.fromHex(PROMPTBOOK_COLOR_HEX);
        }

        const brandColorHex = brandColor.toHex();
        const brandColorLightHex = brandColor.then(lighten(0.2)).toHex();
        const brandColorDarkHex = brandColor.then(darken(0.15)).toHex();

        // Generate Noisy SVG Background
        const color1 = brandColor;
        // const color2 = brandColors[1] || brandColors[0]!; // Use secondary color if available? 
        // For simplicity using primary color for now or derive second one
        const color2 = brandColor; 

        // [🧠] Make colors much lighter for the background
        const color1Light = color1.then(lighten(0.3)).toHex();
        const color1Main = color1.toHex();
        const color1Dark = color1.then(darken(0.3)).toHex();

        const color2Light = color2.then(lighten(0.3)).toHex();
        const color2Main = color2.toHex();
        const color2Dark = color2.then(darken(0.3)).toHex();

        const svgContent = spaceTrim(`
            <svg xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1920 1080"
              width="1920" height="1080"
              preserveAspectRatio="xMidYMid slice">
              <defs>
                <!-- Bottom-left -->
                <radialGradient id="grad1" cx="0%" cy="100%" r="90%">
                  <stop offset="0%" stop-color="${color1Light}" />
                  <stop offset="50%" stop-color="${color1Main}" />
                  <stop offset="100%" stop-color="${color1Dark}" />
                </radialGradient>

                <!-- Bottom-right -->
                <radialGradient id="grad2" cx="100%" cy="100%" r="90%">
                  <stop offset="0%" stop-color="${color2Light}" />
                  <stop offset="50%" stop-color="${color2Main}" />
                  <stop offset="100%" stop-color="${color2Dark}" />
                </radialGradient>

                <!-- White top fade -->
                <linearGradient id="whiteTopGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
                  <stop offset="100%" stop-color="#ffffff" stop-opacity="0.3" />
                </linearGradient>

                <!-- Strong grain -->
                <filter id="grain" x="-10%" y="-10%" width="120%" height="120%">
                  <feTurbulence type="fractalNoise" baseFrequency="3.5" numOctaves="3" seed="8" result="noise" />
                  <feComponentTransfer>
                    <feFuncR type="linear" slope="3.5" intercept="-1.2" />
                    <feFuncG type="linear" slope="3.5" intercept="-1.2" />
                    <feFuncB type="linear" slope="3.5" intercept="-1.2" />
                    <feFuncA type="table" tableValues="0 0.8" />
                  </feComponentTransfer>
                </filter>
              </defs>

              <!-- White base -->
              <rect width="100%" height="100%" fill="#ffffff" />

              <!-- Gradients -->
              <rect width="100%" height="100%" fill="url(#grad1)" />
              <rect width="100%" height="100%" fill="url(#grad2)" style="mix-blend-mode:screen; opacity:0.85" />

              <!-- White fade on top -->
              <rect width="100%" height="100%" fill="url(#whiteTopGrad)" />

              <!-- Strong visible noise -->
              <rect width="100%" height="100%" filter="url(#grain)"
                style="mix-blend-mode:soft-light; opacity:1.2" />
            </svg>
        `);

        const backgroundImage = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;

        return { brandColorHex, brandColorLightHex, brandColorDarkHex, backgroundImage };
    }, [meta.color]);

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
                className={`min-h-[calc(100vh-60px)] w-full flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden ${className || ''}`}
                style={{
                    background: `url("${backgroundImage}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    ...fontStyle,
                }}
            >
                {/* Options menu in top right */}
                {renderMenu && (
                    <div className="absolute top-4 right-4 z-10">
                        {renderMenu({ onShowQrCode: () => setIsQrModalOpen(true) })}
                    </div>
                )}

                {/* Main profile content */}
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12 max-w-5xl w-full">
                    {/* Agent image card (Flippable) */}
                    <div className="flex-shrink-0 perspective-1000 group" style={{ perspective: '1000px' }}>
                        <div
                            className="relative w-72 md:w-80 transition-all duration-700 transform-style-3d cursor-pointer"
                            style={{
                                aspectRatio: '1 / 1.62', // Golden Ratio
                                transformStyle: 'preserve-3d',
                                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                            }}
                            onClick={() => setIsFlipped(!isFlipped)}
                        >
                            {/* Front of Card (Image) */}
                            <div
                                className="absolute inset-0 w-full h-full backface-hidden rounded-3xl shadow-2xl overflow-hidden border-4 border-white/20 backdrop-blur-sm"
                                style={{
                                    backfaceVisibility: 'hidden',
                                    backgroundColor: brandColorDarkHex,
                                    boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px ${brandColorLightHex}40`,
                                }}
                            >
                                {imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={imageUrl} alt={fullname} className="w-full h-full object-cover" />
                                ) : (
                                    <div
                                        className="w-full h-full flex items-center justify-center text-8xl font-bold text-white/80"
                                        style={{ backgroundColor: brandColorDarkHex }}
                                    >
                                        {fullname.charAt(0).toUpperCase()}
                                    </div>
                                )}

                                {/* Flip hint icon */}
                                <div className="absolute bottom-4 right-4 bg-black/30 p-2 rounded-full text-white/80 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                                    <RepeatIcon className="w-5 h-5" />
                                </div>
                            </div>

                            {/* Back of Card (QR Code) */}
                            <div
                                className="absolute inset-0 w-full h-full backface-hidden rounded-3xl shadow-2xl overflow-hidden border-4 border-white/20 backdrop-blur-sm flex flex-col items-center justify-center p-6"
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
                                    />
                                </div>

                                {/* Flip hint icon */}
                                <div className="absolute bottom-4 right-4 bg-black/10 p-2 rounded-full text-black/50 backdrop-blur-md">
                                    <RepeatIcon className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Agent info */}
                    <div className="flex flex-col items-center md:items-start text-center md:text-left gap-6">
                        {/* Agent name with custom font */}
                        <h1
                            className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight"
                            style={{
                                textShadow: '0 2px 20px rgba(255, 255, 255, 0.5)',
                            }}
                        >
                            {fullname}
                        </h1>

                        {/* Short description */}
                        <p className="text-lg md:text-xl text-gray-700 max-w-lg leading-relaxed font-medium">
                            {personaDescription}
                        </p>

                        {/* Chat */}
                        <div className="w-full">
                            {children}
                        </div>

                        {/* Secondary Actions */}
                        <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 md:gap-6 mt-2">
                            {actions}
                        </div>
                    </div>
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
