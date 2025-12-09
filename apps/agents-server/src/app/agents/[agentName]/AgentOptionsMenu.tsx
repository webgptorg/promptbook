'use client';

import { TODO_any } from '@promptbook-local/types';
import {
    CopyIcon,
    CopyPlusIcon,
    DownloadIcon,
    MailIcon,
    MessageCircleQuestionIcon,
    MessageSquareIcon,
    MessageSquareShareIcon,
    MoreHorizontalIcon,
    QrCodeIcon,
    SmartphoneIcon,
    SquareSplitHorizontalIcon,
} from 'lucide-react';
import { Barlow_Condensed } from 'next/font/google';
import { useCallback, useEffect, useRef, useState } from 'react';
import { string_data_url, string_url_image } from '../../../../../../src/types/typeAliases';
import { getAgentLinks } from './agentLinks';

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const barlowCondensed = Barlow_Condensed({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-barlow-condensed',
});

type AgentOptionsMenuProps = {
    agentName: string;
    agentUrl: string;
    agentEmail: string;
    brandColorHex: string;
    isAdmin?: boolean;
    backgroundImage: string_url_image & string_data_url;
    onShowQrCode?: () => void;
};

export function AgentOptionsMenu({
    agentName,
    agentUrl,
    agentEmail,
    brandColorHex,
    isAdmin = false,
    backgroundImage,
    onShowQrCode,
}: AgentOptionsMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // PWA Install state
    const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        function handleBeforeInstallPrompt(e: Event) {
            e.preventDefault();
            setInstallPromptEvent(e as BeforeInstallPromptEvent);
        }

        function updateInstalledStatus() {
            const mediaMatch = window.matchMedia('(display-mode: standalone)');
            const standalone = mediaMatch.matches || (window.navigator as TODO_any).standalone === true;
            setIsInstalled(standalone);
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        updateInstalledStatus();
        window.matchMedia('(display-mode: standalone)').addEventListener('change', updateInstalledStatus);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.matchMedia('(display-mode: standalone)').removeEventListener('change', updateInstalledStatus);
        };
    }, []);

    const handleInstallApp = useCallback(async () => {
        if (!installPromptEvent) return;
        try {
            installPromptEvent.prompt();
            const choice = await installPromptEvent.userChoice.catch(() => null);
            if (choice?.outcome === 'accepted') {
                setIsInstalled(true);
            }
        } finally {
            setInstallPromptEvent(null);
        }
    }, [installPromptEvent]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCopy = async (value: string, label: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopyFeedback(label);
            setTimeout(() => setCopyFeedback(null), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    const links = getAgentLinks(agentName);
    const editBookLink = links.find((l) => l.title === 'Edit Book')!;
    const integrationLink = links.find((l) => l.title === 'Integration')!;
    const historyLink = links.find((l) => l.title === 'History & Feedback')!;
    const allLinksLink = links.find((l) => l.title === 'All Links')!;

    const menuItems = [
        {
            type: 'link' as const,
            href: `/agents/${encodeURIComponent(agentName)}/chat`,
            icon: MessageSquareShareIcon,
            label: 'Standalone Chat',
        },
        {
            type: 'link' as const,
            href: `/agents/${encodeURIComponent(agentName)}/book+chat`,
            icon: SquareSplitHorizontalIcon,
            label: 'Edit Book & Chat',
        },
        {
            type: 'link' as const,
            href: editBookLink.href,
            icon: editBookLink.icon,
            label: editBookLink.title,
        },
        { type: 'divider' as const },
        {
            type: 'link' as const,
            href: integrationLink.href,
            icon: integrationLink.icon,
            label: integrationLink.title,
        },
        {
            type: 'link' as const,
            href: historyLink.href,
            icon: historyLink.icon,
            label: historyLink.title, // 'History & Feedback'
        },
        {
            type: 'link' as const,
            href: allLinksLink.href,
            icon: allLinksLink.icon,
            label: allLinksLink.title,
        },
        { type: 'divider' as const },
        {
            type: 'action' as const,
            icon: CopyIcon,
            label: copyFeedback === 'URL' ? 'Copied!' : 'Copy Agent URL',
            onClick: () => handleCopy(agentUrl, 'URL'),
        },
        {
            type: 'action' as const,
            icon: MailIcon,
            label: copyFeedback === 'Email' ? 'Copied!' : 'Copy Agent Email',
            onClick: () => handleCopy(agentEmail, 'Email'),
        },
        {
            type: 'action' as const,
            icon: QrCodeIcon,
            label: 'Show QR Code',
            onClick: onShowQrCode,
        },
        // Install App - only show if PWA is installable and not already installed
        ...(!isInstalled && installPromptEvent
            ? [
                  {
                      type: 'action' as const,
                      icon: SmartphoneIcon,
                      label: 'Install App',
                      onClick: handleInstallApp,
                  },
              ]
            : []),
        // Admin-only items
        ...(isAdmin
            ? [
                  { type: 'divider' as const },
                  {
                      type: 'link' as const,
                      href: `/admin/chat-history?agentName=${encodeURIComponent(agentName)}`,
                      icon: MessageSquareIcon,
                      label: 'Chat History',
                  },
                  {
                      type: 'link' as const,
                      href: `/admin/chat-feedback?agentName=${encodeURIComponent(agentName)}`,
                      icon: MessageCircleQuestionIcon,
                      label: 'Chat Feedback',
                  },
                  {
                      type: 'link' as const,
                      href: `/agents/${encodeURIComponent(agentName)}/clone`,
                      icon: CopyPlusIcon,
                      label: 'Clone Agent',
                  },
                  {
                      type: 'link' as const,
                      href: `/agents/${encodeURIComponent(agentName)}/export`,
                      icon: DownloadIcon,
                      label: 'Export Agent',
                  },
                  // {
                  //     type: 'link' as const,
                  //     href: backgroundImage,
                  //     icon: DownloadIcon,
                  //     label: 'Download Background Image',
                  // },
              ]
            : []),
    ];

    return (
        <div ref={menuRef} className="relative z-[9999]">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-3 rounded-full hover:bg-white/30 transition-all duration-200"
                // style={{ backgroundColor: brandColorHex }}
                aria-label="More options"
            >
                <MoreHorizontalIcon className="w-5 h-5 text-black" />
            </button>

            {isOpen && (
                <div
                    className={`absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-[9999] animate-in fade-in slide-in-from-top-2 duration-200 ${barlowCondensed.className}`}
                >
                    {menuItems.map((item, index) => {
                        if (item.type === 'divider') {
                            return <div key={index} className="h-px bg-gray-100 my-2" />;
                        }

                        if (item.type === 'link') {
                            return (
                                <a
                                    key={index}
                                    href={item.href}
                                    className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <item.icon className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm font-medium">{item.label}</span>
                                </a>
                            );
                        }

                        return (
                            <button
                                key={index}
                                onClick={() => {
                                    item.onClick?.();
                                    if (item.label !== 'Show QR Code') {
                                        // Keep menu open for copy feedback
                                    }
                                }}
                                className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors w-full text-left"
                            >
                                <item.icon className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
