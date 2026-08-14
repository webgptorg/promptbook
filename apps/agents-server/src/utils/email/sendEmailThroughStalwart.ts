import { EnvironmentMismatchError } from '../../../../../src/errors/EnvironmentMismatchError';
import type { OutboundEmail } from '../../message-providers/email/_common/Email';
import { parseEmailAddress } from '../../message-providers/email/_common/utils/parseEmailAddress';
import { createStalwartMessageProviderFromEnvironment } from '../../message-providers/email/stalwart/StalwartMessageProvider';
import { sendMessage } from '../messages/sendMessage';
import { synchronizeStalwartEmailDomain } from '../stalwart/synchronizeStalwartEmailDomain';
import { getEmailAddressDomain } from './agentEmailAddress';

/**
 * Stable provider name stored with outbound Stalwart delivery attempts.
 */
const STALWART_MESSAGE_PROVIDER_NAME = 'STALWART';

/**
 * Sends and persists one outbound email through the bundled Stalwart SMTP submission service.
 */
export async function sendEmailThroughStalwart(message: OutboundEmail): Promise<void> {
    const provider = createStalwartMessageProviderFromEnvironment();
    if (!provider) {
        throw new EnvironmentMismatchError('`PTBK_STALWART_SMTP_PASSWORD` is not configured.');
    }

    const senderAddress = parseEmailAddress(message.sender).fullEmail;
    const senderDomain = getEmailAddressDomain(senderAddress);
    await synchronizeStalwartEmailDomain(senderDomain).catch((error) => {
        console.error('[stalwart-email]', 'pre_delivery_domain_synchronization_failed', {
            senderDomain,
            error,
        });
    });

    await sendMessage(message, {
        providers: [
            {
                providerName: STALWART_MESSAGE_PROVIDER_NAME,
                provider,
            },
        ],
    });
}
