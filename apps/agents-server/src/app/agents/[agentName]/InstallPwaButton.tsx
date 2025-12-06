'use client';

import { TODO_any } from '@promptbook-local/types';
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
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            style={{
                opacity: installPromptEvent ? 1 : 0.5,
                cursor: installPromptEvent ? 'pointer' : 'wait',
            }}
            aria-label="Install App"
            disabled={!installPromptEvent}
        >
            {/* Simple icon substitute: download arrow */}
            <ShoppingBagIcon className="mr-2 w-3 h-3" />
            Install
        </button>
    );
}
