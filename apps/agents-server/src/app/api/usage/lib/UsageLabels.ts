import { UsageActorType, UsageCallType } from '@/src/utils/usageAdmin';

/**
 * @private Provides human-readable labels for usage breakdowns.
 */
export const UsageLabels = {
    callTypeLabel,
    actorTypeLabel,
} as const;

/**
 * @private Human label for a call type.
 */
function callTypeLabel(callType: UsageCallType): string {
    if (callType === 'VOICE_CHAT') {
        return 'Voice chat';
    }
    if (callType === 'COMPATIBLE_API') {
        return 'Compatible API';
    }
    return 'Web chat';
}

/**
 * @private Human label for an actor type.
 */
function actorTypeLabel(actorType: UsageActorType): string {
    if (actorType === 'TEAM_MEMBER') {
        return 'Team member';
    }
    if (actorType === 'API_KEY') {
        return 'API key';
    }
    return 'Anonymous';
}
