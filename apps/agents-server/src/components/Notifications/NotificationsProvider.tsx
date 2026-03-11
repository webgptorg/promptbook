'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Portal } from '../Portal/Portal';
import { SaveFailureNotice } from '../SaveFailureNotice/SaveFailureNotice';
import {
    dismissNotification,
    subscribeToNotificationDismissals,
    subscribeToNotifications,
    type FloatingNotification,
} from './notifications';

/**
 * Fixed corner offset used by the floating notification stack.
 */
const NOTIFICATION_STACK_TOP_CLASSNAME = 'top-[72px]';

/**
 * Component props for global notification provider.
 */
type NotificationsProviderProps = {
    readonly children: ReactNode;
};

/**
 * Safely stringifies details payloads for compact UI preview.
 */
function formatNotificationDetails(details: unknown): string | undefined {
    if (details === null || details === undefined) {
        return undefined;
    }

    if (typeof details === 'string') {
        return details;
    }

    if (details instanceof Error) {
        return details.stack || details.message;
    }

    try {
        return JSON.stringify(details, null, 2);
    } catch {
        return String(details);
    }
}

/**
 * Logs one clicked notification into the browser console in a verbose grouped format.
 */
function reportNotificationClick(notification: FloatingNotification): void {
    console.groupCollapsed(`[notification] ${notification.type.toUpperCase()}: ${notification.message}`);
    console.info('id', notification.id);
    console.info('type', notification.type);
    console.info('message', notification.message);
    console.info('details', notification.details);
    console.info('actionLabel', notification.actionLabel || null);
    console.info('hasAction', Boolean(notification.onAction));
    console.info('createdAt', new Date(notification.createdAt).toISOString());
    console.groupEnd();
}

/**
 * Mounts global floating notifications for the Agents Server UI.
 *
 * @private shared helper for the Agents Server UI
 */
export function NotificationsProvider({ children }: NotificationsProviderProps) {
    const [notifications, setNotifications] = useState<Array<FloatingNotification>>([]);

    const handleNotificationDismiss = useCallback((notificationId: string) => {
        setNotifications((previousNotifications) =>
            previousNotifications.filter((notification) => notification.id !== notificationId),
        );
    }, []);

    useEffect(() => {
        const unsubscribePush = subscribeToNotifications((notification) => {
            setNotifications((previousNotifications) => [
                notification,
                ...previousNotifications.filter((previousNotification) => previousNotification.id !== notification.id),
            ]);
        });

        const unsubscribeDismiss = subscribeToNotificationDismissals((notificationId) => {
            handleNotificationDismiss(notificationId);
        });

        return () => {
            unsubscribePush();
            unsubscribeDismiss();
        };
    }, [handleNotificationDismiss]);

    return (
        <>
            {children}
            <Portal>
                <section
                    className={`pointer-events-none fixed right-4 ${NOTIFICATION_STACK_TOP_CLASSNAME} z-[80] flex max-h-[calc(100dvh-84px)] w-[min(92vw,26rem)] flex-col gap-3 overflow-y-auto`}
                    aria-live="polite"
                    aria-label="Notifications"
                >
                    {notifications.map((notification) => (
                        <SaveFailureNotice
                            key={notification.id}
                            variant={notification.type}
                            message={notification.message}
                            details={formatNotificationDetails(notification.details)}
                            onAction={notification.onAction}
                            actionLabel={notification.actionLabel}
                            onDismiss={() => dismissNotification(notification.id)}
                            onClick={() => reportNotificationClick(notification)}
                            className="pointer-events-auto shadow-lg shadow-slate-900/15"
                        />
                    ))}
                </section>
            </Portal>
        </>
    );
}
