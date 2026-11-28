import type { ChatMessage } from '../../../../src/book-components/Chat/types/ChatMessage';
import {
    type UserPushNotificationSettingsSnapshot,
} from './userPushNotificationSettings';
import {
    type UserPushSubscriptionRecord,
} from './userPushSubscriptions';
import type { UserChatRecord } from './userChat/UserChatRecord';
import { USER_CHAT_SOURCES } from './userChat/UserChatSource';
import webPush, { type PushSubscription, type WebPushError } from 'web-push';

/**
 * Focus heartbeat TTL used when suppressing notifications for the currently opened chat.
 */
const USER_PUSH_CHAT_FOCUS_TTL_MS = 45_000;

/**
 * Maximum length used for notification body previews.
 */
const USER_PUSH_NOTIFICATION_PREVIEW_MAX_LENGTH = 140;

/**
 * Payload delivered to the browser service worker.
 */
type UserChatPushNotificationPayload = {
    title: string;
    body: string;
    icon: string | null;
    url: string;
    tag: string;
};

/**
 * Options used when dispatching one user-chat push notification.
 */
export type SendUserChatPushNotificationOptions = {
    chat: UserChatRecord;
    message: Pick<ChatMessage, 'id' | 'content'>;
};

/**
 * Returns true when a subscription should be suppressed because it is actively focused on the same chat.
 */
export function isUserPushSubscriptionFocusedOnChat(
    subscription: Pick<
        UserPushSubscriptionRecord,
        'isChatFocused' | 'focusedAgentPermanentId' | 'focusedChatId' | 'focusUpdatedAt'
    >,
    chat: Pick<UserChatRecord, 'agentPermanentId' | 'id'>,
    nowTimestamp = Date.now(),
): boolean {
    if (!subscription.isChatFocused) {
        return false;
    }

    if (subscription.focusedAgentPermanentId !== chat.agentPermanentId || subscription.focusedChatId !== chat.id) {
        return false;
    }

    if (!subscription.focusUpdatedAt) {
        return false;
    }

    const focusUpdatedAtTimestamp = new Date(subscription.focusUpdatedAt).getTime();
    if (!Number.isFinite(focusUpdatedAtTimestamp)) {
        return false;
    }

    return nowTimestamp - focusUpdatedAtTimestamp <= USER_PUSH_CHAT_FOCUS_TTL_MS;
}

/**
 * Attempts to deliver one browser push notification for a completed agent reply.
 */
export async function sendUserChatPushNotification(
    options: SendUserChatPushNotificationOptions,
): Promise<void> {
    const { chat, message } = options;
    const [{ getUserPushNotificationSettingsSnapshotForUser }, { deleteUserPushSubscriptionByEndpoint, listUserPushSubscriptions }] =
        await Promise.all([import('./userPushNotificationSettings'), import('./userPushSubscriptions')]);

    if (chat.source !== USER_CHAT_SOURCES.WEB_UI) {
        console.info('[push-notification]', 'suppressed_ownership', {
            userId: chat.userId,
            chatId: chat.id,
            source: chat.source,
        });
        return;
    }

    const pushConfiguration = resolveUserPushConfiguration();
    if (!pushConfiguration) {
        console.info('[push-notification]', 'suppressed_unconfigured', {
            userId: chat.userId,
            chatId: chat.id,
        });
        return;
    }

    const settingsSnapshot = await getUserPushNotificationSettingsSnapshotForUser(chat.userId);
    if (!settingsSnapshot.enabled) {
        logUserPushNotificationSuppressed(chat, settingsSnapshot);
        return;
    }

    const subscriptions = await listUserPushSubscriptions(chat.userId);
    if (subscriptions.length === 0) {
        console.info('[push-notification]', 'suppressed_no_subscriptions', {
            userId: chat.userId,
            chatId: chat.id,
        });
        return;
    }

    const payload = await createUserChatPushNotificationPayload(chat, message);
    const nowTimestamp = Date.now();
    let attemptedCount = 0;
    let sentCount = 0;
    let focusSuppressedCount = 0;

    applyUserPushConfiguration(pushConfiguration);

    for (const subscription of subscriptions) {
        if (isUserPushSubscriptionFocusedOnChat(subscription, chat, nowTimestamp)) {
            focusSuppressedCount += 1;
            console.info('[push-notification]', 'suppressed_focus', {
                userId: chat.userId,
                chatId: chat.id,
                subscriptionId: subscription.id,
            });
            continue;
        }

        attemptedCount += 1;
        console.info('[push-notification]', 'send_attempt', {
            userId: chat.userId,
            chatId: chat.id,
            subscriptionId: subscription.id,
            messageId: message.id,
        });

        try {
            await webPush.sendNotification(
                createWebPushSubscription(subscription),
                JSON.stringify(payload),
                {
                    TTL: 60 * 60,
                    urgency: 'high',
                    topic: `chat-${chat.id}`,
                },
            );

            sentCount += 1;
        } catch (error) {
            console.error('[push-notification]', 'send_failed', {
                userId: chat.userId,
                chatId: chat.id,
                subscriptionId: subscription.id,
                messageId: message.id,
                error: serializeWebPushError(error),
            });

            if (isInvalidWebPushSubscriptionError(error)) {
                await deleteUserPushSubscriptionByEndpoint({
                    userId: chat.userId,
                    endpoint: subscription.endpoint,
                }).catch((deleteError) => {
                    console.error('[push-notification]', 'subscription_remove_failed', {
                        userId: chat.userId,
                        subscriptionId: subscription.id,
                        error: serializeWebPushError(deleteError),
                    });
                });

                console.info('[push-notification]', 'subscription_removed_invalid', {
                    userId: chat.userId,
                    chatId: chat.id,
                    subscriptionId: subscription.id,
                });
            }
        }
    }

    console.info('[push-notification]', 'send_complete', {
        userId: chat.userId,
        chatId: chat.id,
        messageId: message.id,
        attemptedCount,
        sentCount,
        focusSuppressedCount,
        storedEnabled: settingsSnapshot.storedEnabled,
        defaultEnabled: settingsSnapshot.defaultEnabled,
    });
}

/**
 * Builds the service-worker payload for one completed chat message.
 */
async function createUserChatPushNotificationPayload(
    chat: UserChatRecord,
    message: Pick<ChatMessage, 'id' | 'content'>,
): Promise<UserChatPushNotificationPayload> {
    const [
        { $provideAgentCollectionForServer },
        { $provideAgentReferenceResolver },
        { resolveAgentAvatarImageUrl },
        { shortenText },
        { textToPreviewText },
        { resolveCurrentOrInternalServerOrigin },
        { resolveServerAgentContext },
    ] = await Promise.all([
        import('@/src/tools/$provideAgentCollectionForServer'),
        import('@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver'),
        import('../../../../src/utils/agents/resolveAgentAvatarImageUrl'),
        import('./shortenText'),
        import('./textToPreviewText'),
        import('./resolveCurrentOrInternalServerOrigin'),
        import('./resolveServerAgentContext'),
    ]);
    const serverOrigin = await resolveCurrentOrInternalServerOrigin();
    const collection = await $provideAgentCollectionForServer();
    const fallbackResolver = await $provideAgentReferenceResolver();
    const resolvedAgentContext = await resolveServerAgentContext({
        collection,
        agentIdentifier: chat.agentPermanentId,
        localServerUrl: serverOrigin,
        fallbackResolver,
    });
    const agentProfile = resolvedAgentContext.resolvedAgentProfile;
    const agentIdentifier = agentProfile.permanentId || resolvedAgentContext.parentAgentPermanentId;
    const agentDisplayName = agentProfile.meta.fullname || agentProfile.agentName || agentIdentifier;
    const icon =
        resolveAgentAvatarImageUrl({ agent: agentProfile, baseUrl: serverOrigin }) ||
        `${serverOrigin}/agents/${encodeURIComponent(agentIdentifier)}/images/default-avatar.png`;
    const previewText = shortenText(
        textToPreviewText(message.content) || 'New message',
        USER_PUSH_NOTIFICATION_PREVIEW_MAX_LENGTH,
    );

    return {
        title: agentDisplayName,
        body: previewText,
        icon,
        url: `${serverOrigin}/agents/${encodeURIComponent(agentIdentifier)}/chat?chat=${encodeURIComponent(chat.id)}`,
        tag: `chat:${chat.id}`,
    };
}

/**
 * Resolves the current server-side web push configuration or returns `null` when incomplete.
 */
function resolveUserPushConfiguration():
    | {
          subject: string;
          publicKey: string;
          privateKey: string;
      }
    | null {
    const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY?.trim();
    const privateKey = process.env.WEB_PUSH_PRIVATE_KEY?.trim();
    const subject = process.env.WEB_PUSH_SUBJECT?.trim() || 'mailto:notifications@promptbook.local';

    if (!publicKey || !privateKey) {
        return null;
    }

    return {
        subject,
        publicKey,
        privateKey,
    };
}

/**
 * Applies VAPID configuration before sending notifications.
 */
function applyUserPushConfiguration(configuration: {
    subject: string;
    publicKey: string;
    privateKey: string;
}): void {
    webPush.setVapidDetails(configuration.subject, configuration.publicKey, configuration.privateKey);
}

/**
 * Converts one stored DB subscription row into the format expected by `web-push`.
 */
function createWebPushSubscription(subscription: UserPushSubscriptionRecord): PushSubscription {
    return {
        endpoint: subscription.endpoint,
        keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
        },
    };
}

/**
 * Logs one disabled-notification suppression with the resolved preference snapshot.
 */
function logUserPushNotificationSuppressed(
    chat: UserChatRecord,
    settingsSnapshot: UserPushNotificationSettingsSnapshot,
): void {
    console.info('[push-notification]', 'suppressed_disabled', {
        userId: chat.userId,
        chatId: chat.id,
        storedEnabled: settingsSnapshot.storedEnabled,
        defaultEnabled: settingsSnapshot.defaultEnabled,
    });
}

/**
 * Returns true when the push service explicitly reported the subscription as gone or invalid.
 */
function isInvalidWebPushSubscriptionError(error: unknown): boolean {
    const statusCode = (error as Partial<WebPushError> | undefined)?.statusCode;
    return statusCode === 404 || statusCode === 410;
}

/**
 * Converts unknown push errors into a compact structured payload for logs.
 */
function serializeWebPushError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            statusCode: (error as Partial<WebPushError>).statusCode ?? null,
            endpoint: (error as Partial<WebPushError>).endpoint ?? null,
        };
    }

    return {
        message: String(error),
    };
}
