self.addEventListener('install', (event) => {
    // console.log('Service Worker installing.');
    // Perform install steps
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // console.log('Service Worker activating.');
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // console.log('Service Worker fetching.', event.request.url);
    const requestUrl = new URL(event.request.url);
    const isSameOrigin = requestUrl.origin === self.location.origin;
    const isApiRequest =
        isSameOrigin && (requestUrl.pathname.startsWith('/api/') || /\/agents\/[^/]+\/api\//.test(requestUrl.pathname));

    if (isApiRequest) {
        return;
    }

    // Simple pass-through fetch for non-API requests.
    event.respondWith(fetch(event.request));
});

self.addEventListener('push', (event) => {
    const payload = resolvePushPayload(event);
    if (!payload) {
        return;
    }

    event.waitUntil(
        self.registration.showNotification(payload.title, {
            body: payload.body,
            icon: payload.icon || undefined,
            tag: payload.tag,
            data: {
                url: payload.url,
            },
        }),
    );
});

self.addEventListener('notificationclick', (event) => {
    const notificationUrl = event.notification?.data?.url;
    const targetUrl = new URL(typeof notificationUrl === 'string' ? notificationUrl : '/', self.location.origin).href;
    event.notification.close();

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients) => {
            if (windowClients.length > 0) {
                const [firstWindowClient] = windowClients;
                if (typeof firstWindowClient.navigate === 'function') {
                    await firstWindowClient.navigate(targetUrl).catch(() => undefined);
                }

                await firstWindowClient.focus().catch(() => undefined);
                return;
            }

            await self.clients.openWindow(targetUrl);
        }),
    );
});

/**
 * Parses the structured payload delivered by the web push sender.
 */
function resolvePushPayload(event) {
    if (!event.data) {
        return null;
    }

    try {
        const payload = event.data.json();
        if (!payload || typeof payload !== 'object') {
            return null;
        }

        return {
            title: typeof payload.title === 'string' && payload.title ? payload.title : 'New message',
            body: typeof payload.body === 'string' ? payload.body : '',
            icon: typeof payload.icon === 'string' && payload.icon ? payload.icon : null,
            url: typeof payload.url === 'string' && payload.url ? payload.url : '/',
            tag: typeof payload.tag === 'string' && payload.tag ? payload.tag : undefined,
        };
    } catch {
        const fallbackBody = event.data.text();
        return {
            title: 'New message',
            body: typeof fallbackBody === 'string' ? fallbackBody : '',
            icon: null,
            url: '/',
            tag: undefined,
        };
    }
}
