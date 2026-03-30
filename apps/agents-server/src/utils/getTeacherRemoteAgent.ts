import { RemoteAgent } from '@promptbook-local/core';
import { getWellKnownAgentUrl } from './getWellKnownAgentUrl';

/**
 * Shared in-flight Teacher agent connection promise.
 */
let pendingTeacherRemoteAgent: Promise<RemoteAgent> | null = null;

/**
 * Connected Teacher agent reused across server-side chat requests.
 */
let cachedTeacherRemoteAgent: RemoteAgent | null = null;

/**
 * Resolves the well-known Teacher agent once and reuses the connected remote profile afterwards.
 */
export async function getTeacherRemoteAgent(): Promise<RemoteAgent> {
    if (cachedTeacherRemoteAgent) {
        return cachedTeacherRemoteAgent;
    }

    if (pendingTeacherRemoteAgent) {
        return pendingTeacherRemoteAgent;
    }

    pendingTeacherRemoteAgent = (async (): Promise<RemoteAgent> => {
        try {
            const teacherRemoteAgent = await RemoteAgent.connect({
                agentUrl: await getWellKnownAgentUrl('TEACHER'),
            });
            cachedTeacherRemoteAgent = teacherRemoteAgent;
            return teacherRemoteAgent;
        } finally {
            pendingTeacherRemoteAgent = null;
        }
    })();

    return pendingTeacherRemoteAgent;
}
