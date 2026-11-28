'use server';

import { NotAllowed } from '../../../../../../src/errors/NotAllowed';
import { spaceTrim } from '../../../../../../src/utils/organization/spaceTrim';
import { revalidatePath } from 'next/cache';
import { isUserGlobalAdmin } from '../../../utils/isUserGlobalAdmin';
import {
    captureStalwartSynchronizationResult,
    type StalwartSynchronizationResult,
} from '../../../utils/stalwart/captureStalwartSynchronizationResult';
import { synchronizeAllStalwartEmailDomains } from '../../../utils/stalwart/synchronizeAllStalwartEmailDomains';

/**
 * Synchronizes every registered Agents Server domain with the VPS-wide Stalwart service.
 */
export async function $synchronizeAllStalwartEmailDomains(): Promise<StalwartSynchronizationResult> {
    if (!(await isUserGlobalAdmin())) {
        throw new NotAllowed(
            spaceTrim(`
                You are not allowed to synchronize the VPS email server.
            `),
        );
    }

    const result = await captureStalwartSynchronizationResult(() => synchronizeAllStalwartEmailDomains());
    revalidatePath('/superadmin/email-server');
    return result;
}
