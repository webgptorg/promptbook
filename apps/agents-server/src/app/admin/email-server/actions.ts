'use server';

import { NotAllowed } from '../../../../../../src/errors/NotAllowed';
import { spaceTrim } from '../../../../../../src/utils/organization/spaceTrim';
import { revalidatePath } from 'next/cache';
import { $provideServer } from '../../../tools/$provideServer';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { synchronizeStalwartEmailDomain } from '../../../utils/stalwart/synchronizeStalwartEmailDomain';

/**
 * Synchronizes the current server's agents and transport settings to Stalwart.
 */
export async function $synchronizeStalwartEmailDomain(): Promise<void> {
    if (!(await isUserAdmin())) {
        throw new NotAllowed(
            spaceTrim(`
                You are not allowed to synchronize the Stalwart email server.
            `),
        );
    }

    const server = await $provideServer();
    await synchronizeStalwartEmailDomain(server.publicUrl.hostname);
    revalidatePath('/admin/email-server');
    revalidatePath('/superadmin/email-server');
}
