'use client';

import { AgentBasicInformation } from '@promptbook-local/types';
import { MessageCircleIcon, RepeatIcon } from 'lucide-react';
import { useState } from 'react';
import { AgentOptionsMenu } from './AgentOptionsMenu';
import { AgentQrCode } from './AgentQrCode';
import { QrCodeModal } from './QrCodeModal';

type AgentProfileViewProps = {
    agentName: string;
    fullname: string;
    personaDescription: string;
    imageUrl: string | null;
    agentUrl: string;
    agentEmail: string;
    brandColorHex: string;
    brandColorLightHex: string;
    brandColorDarkHex: string;
    brandColorsHex: string[];
    backgroundImage: string;
    meta: AgentBasicInformation['meta'];
    isAdmin?: boolean;
};

export function AgentProfileView({
    agentName,
    fullname,
    personaDescription,
    imageUrl,
    agentUrl,
    agentEmail,
    brandColorHex,
    brandColorLightHex,
    brandColorDarkHex,
    brandColorsHex,
    backgroundImage,
    meta,
    isAdmin = false,
}: AgentProfileViewProps) {
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);

    // Dynamic Font Loading
    const fontString = meta.font;
    let fontStyle: React.CSSProperties = {};

    if (fontString) {
        const primaryFont = fontString.split(',')[0].trim().replace(/['"]/g, '');
        const googleFontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(primaryFont)}:wght@400;600;700&display=swap`;

        fontStyle = {
            fontFamily: fontString,
        };

        // TODO: [🧠] Is this the best way to load fonts? Maybe use next/font/google?
        // But next/font/google requires known font at build time or generic loader which might be tricky dynamically.
        // Inserting a link tag is a simple dynamic solution.
    }

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
                className="min-h-[calc(100vh-60px)] w-full flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden"
                style={{
                    background: backgroundImage,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    ...fontStyle,
                }}
            >
                {/* Decorative background elements */}
                {/* [🧠] Are these needed when we have the noisy background? Maybe yes, for extra depth. */}
                <div
                    className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-20 blur-3xl"
                    style={{ backgroundColor: brandColorLightHex }}
                />
                <div
                    className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-15 blur-3xl"
                    style={{ backgroundColor: brandColorLightHex }}
                />

                {/* Options menu in top right */}
                <div className="absolute top-4 right-4 z-10">
                    <AgentOptionsMenu
                        agentName={agentName}
                        agentUrl={agentUrl}
                        agentEmail={agentEmail}
                        brandColorHex={brandColorHex}
                        isAdmin={isAdmin}
                        onShowQrCode={() => setIsQrModalOpen(true)}
                    />
                </div>

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
                    <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4">
                        {/* Agent name with custom font */}
                        <h1
                            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight"
                            style={{
                                // fontFamily: 'var(--font-poppins), Poppins, sans-serif', // <- [🧠] Should we keep this fallback or just use inherited font?
                                // Using inherited font from the wrapper div which has dynamic font
                                textShadow: '0 2px 20px rgba(0, 0, 0, 0.2)',
                            }}
                        >
                            {fullname}
                        </h1>

                        {/* Short description */}
                        <p className="text-lg md:text-xl text-white/90 max-w-lg leading-relaxed">
                            {personaDescription}
                        </p>

                        {/* Start Chat button */}
                        <a
                            href={`/agents/${encodeURIComponent(agentName)}/chat`}
                            className="mt-4 inline-flex items-center gap-3 px-8 py-4 rounded-full text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
                            style={{
                                backgroundColor: 'white',
                                color: brandColorHex,
                            }}
                        >
                            <MessageCircleIcon className="w-6 h-6" />
                            Start Chat
                        </a>
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
