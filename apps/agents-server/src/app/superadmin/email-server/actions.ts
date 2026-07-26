'use server';

import { NotAllowed } from '../../../../../../src/errors/NotAllowed';
import { spaceTrim } from '../../../../../../src/utils/organization/spaceTrim';
import { revalidatePath } from 'next/cache';
import { isUserGlobalAdmin } from '../../../utils/isUserGlobalAdmin';
import { synchronizeAllStalwartEmailDomains } from '../../../utils/stalwart/synchronizeAllStalwartEmailDomains';

/**
 * Synchronizes every registered Agents Server domain with the VPS-wide Stalwart service.
 */
export async function $synchronizeAllStalwartEmailDomains(): Promise<void> {
    if (!(await isUserGlobalAdmin())) {
        throw new NotAllowed(
            spaceTrim(`
                You are not allowed to synchronize the VPS email server.
            `),
        );
    }

    await synchronizeAllStalwartEmailDomains();
    revalidatePath('/superadmin/email-server');
}
