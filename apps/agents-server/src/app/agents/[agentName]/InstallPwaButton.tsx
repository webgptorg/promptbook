'use client';

import { ShoppingBagIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function InstallPwaButton() {
    const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [hasPrompted, setHasPrompted] = useState(false);

    useEffect(() => {
        function handleBeforeInstallPrompt(e: Event) {
            // Some browsers (Chrome) fire this event when PWA is installable
            e.preventDefault();
            setInstallPromptEvent(e as BeforeInstallPromptEvent);
        }

        function updateInstalledStatus() {
            const mediaMatch = window.matchMedia('(display-mode: standalone)');
            const standalone = mediaMatch.matches || (window.navigator as any).standalone === true;
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

    const onInstall = useCallback(async () => {
        if (!installPromptEvent) return;
        try {
            installPromptEvent.prompt();
            setHasPrompted(true);
            const choice = await installPromptEvent.userChoice.catch(() => null);
            if (choice?.outcome === 'accepted') {
                setIsInstalled(true);
            }
        } finally {
            // Clear stored event so button hides if dismissed
            setInstallPromptEvent(null);
        }
    }, [installPromptEvent]);

    if (isInstalled || (!installPromptEvent && hasPrompted)) return null;

    return (
        <button
            type="button"
            onClick={onInstall}
            className="flex-1 inline-flex items-center justify-center whitespace-nowrap bg-white hover:bg-gray-100 text-gray-800 px-4 py-2 rounded shadow font-semibold transition border border-gray-200"
            style={{
                opacity: installPromptEvent ? 1 : 0.5,
                cursor: installPromptEvent ? 'pointer' : 'wait',
            }}
            aria-label="Install App"
            disabled={!installPromptEvent}
        >
            {/* Simple icon substitute: download arrow */}
            <ShoppingBagIcon className="ml-2 w-4 h-4 mr-2" />
            Install
        </button>
    );
}
