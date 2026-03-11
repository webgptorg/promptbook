/**
 * Supported semantic variants of user-facing notifications.
 */
export type NotificationType = 'error' | 'warning' | 'info' | 'success';

/**
 * Optional behavior/details accepted by `notify*` helpers.
 */
export type NotifyOptions = {
    /**
     * Optional extra debugging details shown in UI and console report.
     */
    readonly details?: unknown;
    /**
     * Optional action button label.
     */
    readonly actionLabel?: string;
    /**
     * Optional action callback executed when action button is clicked.
     */
    readonly onAction?: () => void;
};

/**
 * Internal notification payload consumed by the provider.
 */
export type FloatingNotification = {
    readonly id: string;
    readonly type: NotificationType;
    readonly message: string;
    readonly details?: unknown;
    readonly actionLabel?: string;
    readonly onAction?: () => void;
    readonly createdAt: number;
};

/**
 * Listener used by the provider to receive new notifications.
 */
type NotificationPushListener = (notification: FloatingNotification) => void;

/**
 * Listener used by the provider to receive dismiss requests.
 */
type NotificationDismissListener = (notificationId: string) => void;

/**
 * Sequence counter used to build deterministic notification ids.
 */
let notificationIdSequence = 0;

/**
 * Registered listeners that consume new notification events.
 */
const notificationPushListeners = new Set<NotificationPushListener>();

/**
 * Registered listeners that consume explicit dismiss events.
 */
const notificationDismissListeners = new Set<NotificationDismissListener>();

/**
 * Queue of notification events fired before the provider is mounted.
 */
const pendingNotifications: Array<FloatingNotification> = [];

/**
 * Queue of dismiss events fired before the provider is mounted.
 */
const pendingDismissNotificationIds: Array<string> = [];

/**
 * Builds one unique id for a notification event.
 */
function createNotificationId(): string {
    notificationIdSequence += 1;
    return `notification-${Date.now()}-${notificationIdSequence}`;
}

/**
 * Emits one notification to mounted listeners or queues it until mounted.
 */
function emitNotification(notification: FloatingNotification): void {
    if (notificationPushListeners.size === 0) {
        pendingNotifications.push(notification);
        return;
    }

    for (const listener of notificationPushListeners) {
        listener(notification);
    }
}

/**
 * Emits one dismiss event to mounted listeners or queues it until mounted.
 */
function emitDismissNotification(notificationId: string): void {
    if (notificationDismissListeners.size === 0) {
        pendingDismissNotificationIds.push(notificationId);
        return;
    }

    for (const listener of notificationDismissListeners) {
        listener(notificationId);
    }
}

/**
 * Dispatches one notification with explicit variant and options.
 *
 * @private internal helper for the Agents Server UI
 */
export function notify(type: NotificationType, message: string, options: NotifyOptions = {}): string {
    const notification: FloatingNotification = {
        id: createNotificationId(),
        type,
        message,
        details: options.details,
        actionLabel: options.actionLabel,
        onAction: options.onAction,
        createdAt: Date.now(),
    };

    emitNotification(notification);
    return notification.id;
}

/**
 * Shows one floating error notification.
 *
 * @private shared helper for the Agents Server UI
 */
export function notifyError(message: string, options: NotifyOptions = {}): string {
    return notify('error', message, options);
}

/**
 * Shows one floating warning notification.
 *
 * @private shared helper for the Agents Server UI
 */
export function notifyWarning(message: string, options: NotifyOptions = {}): string {
    return notify('warning', message, options);
}

/**
 * Shows one floating informational notification.
 *
 * @private shared helper for the Agents Server UI
 */
export function notifyInfo(message: string, options: NotifyOptions = {}): string {
    return notify('info', message, options);
}

/**
 * Shows one floating success notification.
 *
 * @private shared helper for the Agents Server UI
 */
export function notifySuccess(message: string, options: NotifyOptions = {}): string {
    return notify('success', message, options);
}

/**
 * Requests dismissal of one notification by id.
 *
 * @private shared helper for the Agents Server UI
 */
export function dismissNotification(notificationId: string): void {
    emitDismissNotification(notificationId);
}

/**
 * Subscribes to notification push events.
 *
 * @private internal helper for the Agents Server UI
 */
export function subscribeToNotifications(listener: NotificationPushListener): () => void {
    notificationPushListeners.add(listener);

    if (pendingNotifications.length > 0) {
        for (const pendingNotification of pendingNotifications.splice(0, pendingNotifications.length)) {
            listener(pendingNotification);
        }
    }

    return () => {
        notificationPushListeners.delete(listener);
    };
}

/**
 * Subscribes to notification dismiss events.
 *
 * @private internal helper for the Agents Server UI
 */
export function subscribeToNotificationDismissals(listener: NotificationDismissListener): () => void {
    notificationDismissListeners.add(listener);

    if (pendingDismissNotificationIds.length > 0) {
        for (const pendingNotificationId of pendingDismissNotificationIds.splice(0, pendingDismissNotificationIds.length)) {
            listener(pendingNotificationId);
        }
    }

    return () => {
        notificationDismissListeners.delete(listener);
    };
}
