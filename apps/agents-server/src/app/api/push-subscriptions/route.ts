import { NextResponse } from 'next/server';
import { resolveCurrentUserIdentity } from '@/src/utils/currentUserIdentity';
import {
    deleteUserPushSubscriptionByEndpoint,
    deleteUserPushSubscriptionById,
    updateUserPushSubscriptionFocus,
    upsertUserPushSubscription,
} from '@/src/utils/userPushSubscriptions';

/**
 * Stores or refreshes the current browser push subscription.
 */
export async function PUT(request: Request): Promise<NextResponse<{ subscriptionId: string } | { error: string }>> {
    const currentUserIdentity = await resolveCurrentUserIdentity();
    if (!currentUserIdentity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json()) as {
            subscription?: {
                endpoint?: unknown;
                keys?: {
                    p256dh?: unknown;
                    auth?: unknown;
                };
            };
            userAgent?: unknown;
        };

        const endpoint = normalizeRequiredString(body.subscription?.endpoint);
        const p256dh = normalizeRequiredString(body.subscription?.keys?.p256dh);
        const auth = normalizeRequiredString(body.subscription?.keys?.auth);

        if (!endpoint || !p256dh || !auth) {
            return NextResponse.json({ error: 'Invalid push subscription payload.' }, { status: 400 });
        }

        const subscription = await upsertUserPushSubscription({
            userId: currentUserIdentity.userId,
            endpoint,
            p256dh,
            auth,
            userAgent: typeof body.userAgent === 'string' ? body.userAgent : null,
        });

        console.info('[push-notification]', 'subscription_created', {
            userId: currentUserIdentity.userId,
            subscriptionId: subscription.id,
        });

        return NextResponse.json({ subscriptionId: subscription.id });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to save push subscription.',
            },
            { status: 500 },
        );
    }
}

/**
 * Removes the current browser push subscription.
 */
export async function DELETE(request: Request): Promise<NextResponse<{ ok: true } | { error: string }>> {
    const currentUserIdentity = await resolveCurrentUserIdentity();
    if (!currentUserIdentity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json().catch(() => ({}))) as {
            subscriptionId?: unknown;
            endpoint?: unknown;
        };
        const subscriptionId = normalizeRequiredString(body.subscriptionId);
        const endpoint = normalizeRequiredString(body.endpoint);

        if (!subscriptionId && !endpoint) {
            return NextResponse.json({ error: 'Missing subscription identifier.' }, { status: 400 });
        }

        if (subscriptionId) {
            await deleteUserPushSubscriptionById({
                userId: currentUserIdentity.userId,
                subscriptionId,
            });
        }

        if (endpoint) {
            await deleteUserPushSubscriptionByEndpoint({
                userId: currentUserIdentity.userId,
                endpoint,
            });
        }

        console.info('[push-notification]', 'subscription_removed', {
            userId: currentUserIdentity.userId,
            subscriptionId: subscriptionId || null,
            endpoint: endpoint || null,
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to remove push subscription.',
            },
            { status: 500 },
        );
    }
}

/**
 * Updates the focused-chat heartbeat for one stored push subscription.
 */
export async function PATCH(request: Request): Promise<NextResponse<{ ok: true } | { error: string }>> {
    const currentUserIdentity = await resolveCurrentUserIdentity();
    if (!currentUserIdentity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json()) as {
            subscriptionId?: unknown;
            isChatFocused?: unknown;
            focusedAgentPermanentId?: unknown;
            focusedChatId?: unknown;
        };
        const subscriptionId = normalizeRequiredString(body.subscriptionId);

        if (!subscriptionId || typeof body.isChatFocused !== 'boolean') {
            return NextResponse.json({ error: 'Invalid push focus payload.' }, { status: 400 });
        }

        await updateUserPushSubscriptionFocus({
            userId: currentUserIdentity.userId,
            subscriptionId,
            isChatFocused: body.isChatFocused,
            focusedAgentPermanentId:
                typeof body.focusedAgentPermanentId === 'string' ? body.focusedAgentPermanentId : null,
            focusedChatId: typeof body.focusedChatId === 'string' ? body.focusedChatId : null,
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to update push focus state.',
            },
            { status: 500 },
        );
    }
}

/**
 * Normalizes one required non-empty string request field.
 */
function normalizeRequiredString(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}
