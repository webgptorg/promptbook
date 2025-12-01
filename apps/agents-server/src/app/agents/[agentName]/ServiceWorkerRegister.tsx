'use client';

import { useEffect } from 'react';

type ServiceWorkerRegisterProps = {
    scope: string;
};

export function ServiceWorkerRegister({ scope }: ServiceWorkerRegisterProps) {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js', { scope })
                .then((registration) => {
                    console.log('Service Worker registered with scope:', registration.scope);
                })
                .catch((error) => {
                    console.error('Service Worker registration failed:', error);
                });
        }
    }, [scope]);

    return null;
}
