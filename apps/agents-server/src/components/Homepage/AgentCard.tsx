'use client';

import { generatePlaceholderAgentProfileImageUrl } from '@promptbook-local/core';
import { really_any } from '@promptbook-local/types';
import { EyeIcon, EyeOffIcon, RotateCcwIcon } from 'lucide-react';
import Link from 'next/link';
import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { useAgentBackground } from '../AgentProfile/useAgentBackground';

type AgentCardProps = {
    /**
     * @@@
     */
    readonly agent: AgentBasicInformation;

    /**
     * @@@
     */
    readonly href: string;

    /**
     * Base URL of the agents server
     */
    readonly publicUrl: URL;

    /**
     * @@@
     */
    readonly isAdmin?: boolean;

    /**
     * @@@
     */
    readonly onDelete?: (agentIdentifier: string) => void;

    /**
     * @@@
     */
    readonly onClone?: (agentIdentifier: string) => void;

    /**
     * @@@
     */
    readonly onToggleVisibility?: (agentIdentifier: string) => void;

    /**
     * @@@
     */
    readonly onRestore?: (agentIdentifier: string) => void;

    /**
     * @@@
     */
    readonly visibility?: 'PUBLIC' | 'PRIVATE';
};

const ACTION_BUTTON_CLASSES =
    'text-white px-3 py-1 rounded shadow text-xs font-medium transition-colors uppercase tracking-wider opacity-80 hover:opacity-100';

export function AgentCard({
    agent,
    href,
    isAdmin,
    publicUrl,
    onDelete,
    onClone,
    onToggleVisibility,
    onRestore,
    visibility,
}: AgentCardProps) {
    const { meta, agentName } = agent;
    const fullname = (meta.fullname as string) || agentName || 'Agent';
    const imageUrl = meta.image || generatePlaceholderAgentProfileImageUrl(agentName, publicUrl);
    const personaDescription = agent.personaDescription || '';

    const { brandColorLightHex, brandColorDarkHex, backgroundImage } = useAgentBackground(meta.color);

    return (
        <div className="relative h-full group">
            <Link href={href} className="block h-full transition-transform hover:scale-[1.02] duration-300">
                <div
                    className="h-full rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col border border-white/20"
                    style={{
                        background: `url("${backgroundImage}")`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    <div className="p-6 flex flex-col items-center flex-grow backdrop-blur-[2px]">
                        {/* Image container */}
                        <div
                            className="w-32 h-32 mb-4 shadow-lg overflow-hidden flex-shrink-0 bg-black/20"
                            style={{
                                boxShadow: `0 10px 20px -5px rgba(0, 0, 0, 0.2), 0 0 0 1px ${brandColorLightHex}40`,

                                // Note: Make it squircle
                                borderRadius: '50%',
                                ['cornerShape' as really_any /* <- Note: `cornerShape` is non standard CSS property */]:
                                    'squircle ',
                            }}
                        >
                            {imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={imageUrl} alt={fullname} className="w-full h-full object-cover" />
                            ) : (
                                <div
                                    className="w-full h-full flex items-center justify-center text-4xl font-bold text-white/80"
                                    style={{ backgroundColor: brandColorDarkHex }}
                                >
                                    {fullname.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>

                        <h3
                            className="text-lg font-bold text-gray-900 text-center leading-tight mb-2"
                            style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}
                        >
                            {fullname}
                        </h3>

                        <p className="text-sm text-gray-800 text-center line-clamp-3 leading-relaxed font-medium mix-blend-hard-light">
                            {personaDescription}
                        </p>
                    </div>
                </div>
            </Link>
            {isAdmin && onRestore && (
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                        className={`bg-green-500 hover:bg-green-600 ${ACTION_BUTTON_CLASSES}`}
                        onClick={(e) => {
                            e.preventDefault();
                            onRestore(agent.permanentId || agent.agentName);
                        }}
                        title="Restore agent"
                    >
                        <RotateCcwIcon className="w-3 h-3" />
                    </button>
                </div>
            )}
            {isAdmin && !onRestore && (
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                        className={`${
                            visibility === 'PUBLIC'
                                ? 'bg-green-500 hover:bg-green-600'
                                : 'bg-gray-500 hover:bg-gray-600'
                        } ${ACTION_BUTTON_CLASSES}`}
                        onClick={(e) => {
                            e.preventDefault();
                            onToggleVisibility?.(agent.permanentId || agent.agentName);
                        }}
                        title={`Make ${visibility === 'PUBLIC' ? 'private' : 'public'}`}
                    >
                        {visibility === 'PUBLIC' ? <EyeIcon className="w-3 h-3" /> : <EyeOffIcon className="w-3 h-3" />}
                    </button>
                    <button
                        className={`bg-blue-500 hover:bg-blue-600 ${ACTION_BUTTON_CLASSES}`}
                        onClick={(e) => {
                            e.preventDefault();
                            onClone?.(agent.permanentId || agent.agentName);
                        }}
                        title="Clone agent"
                    >
                        Clone
                    </button>
                    <button
                        className={`bg-red-500 hover:bg-red-600 ${ACTION_BUTTON_CLASSES}`}
                        onClick={(e) => {
                            e.preventDefault();
                            onDelete?.(agent.permanentId || agent.agentName);
                        }}
                        title="Delete agent"
                    >
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
}
