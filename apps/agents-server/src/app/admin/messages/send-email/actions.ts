'use server';

import { NotAllowed } from '../../../../../../../src/errors/NotAllowed';
import { spaceTrim } from '../../../../../../../src/utils/organization/spaceTrim';
import { sendEmailThroughStalwart } from '../../../../utils/email/sendEmailThroughStalwart';
import {
    assertEmailTestingSenderDomainAllowed,
    createEmailTestingOutboundEmail,
    readEmailTestingFormValues,
} from './emailTesting';
import { getEmailTestingAccessContext } from './emailTestingAccess';

/**
 * Sends an administrator-composed test email through the bundled Stalwart email service.
 */
export async function sendEmailAction(formData: FormData): Promise<void> {
    const accessContext = await getEmailTestingAccessContext();

    if (!accessContext) {
        throw new NotAllowed(
            spaceTrim(`
                You are not allowed to send test emails.
            `),
        );
    }

    const email = createEmailTestingOutboundEmail(readEmailTestingFormValues(formData));
    assertEmailTestingSenderDomainAllowed({
        sender: email.sender,
        currentServerDomain: accessContext.currentServerDomain,
        isGlobalAdmin: accessContext.isGlobalAdmin,
    });

    await sendEmailThroughStalwart(email);
}
