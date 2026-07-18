'use server';

import { revalidatePath } from 'next/cache';
import { NotAllowed } from '../../../../../../src/errors/NotAllowed';
import { spaceTrim } from '../../../../../../src/utils/organization/spaceTrim';
import { terminateAgentProjectRuntimeById } from '@/src/utils/agentProjects/agentProjectRuntimeRegistry';
import { isUserGlobalAdmin } from '@/src/utils/isUserGlobalAdmin';

/**
 * Terminates one project runtime from the resource monitor.
 *
 * @param runtimeId - Runtime id to terminate.
 */
export async function $terminateAgentProjectRuntimeFromResourceMonitorAction(runtimeId: string): Promise<void> {
    if (!(await isUserGlobalAdmin())) {
        throw new NotAllowed(
            spaceTrim(`
                You are not allowed to terminate project runtimes from the resource monitor.
            `),
        );
    }

    await terminateAgentProjectRuntimeById(runtimeId);
    revalidatePath('/admin/resource-monitor');
}
