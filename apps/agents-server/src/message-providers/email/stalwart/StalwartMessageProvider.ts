import type { really_any } from '@promptbook-local/types';
import { buildStalwartMailBridgeAddress } from '../../../utils/stalwart/stalwartMailBridge';
import type { MessageProvider } from '../../interfaces/MessageProvider';
import type { OutboundEmail } from '../_common/Email';
import { parseEmailAddress } from '../_common/utils/parseEmailAddress';
import { SmtpMessageProvider } from '../smtp/SmtpMessageProvider';

/**
 * SMTP settings shared by every domain hosted by the bundled Stalwart service.
 */
export type StalwartMessageProviderConfiguration = {
    readonly host: string;
    readonly port: number;
    readonly isSecure: boolean;
    readonly isTlsCertificateValidationEnabled: boolean;
    readonly username: string | null;
    readonly password: string;
};

/**
 * Domain-aware Stalwart provider which authenticates through the bridge account matching the sender.
 */
export class StalwartMessageProvider implements MessageProvider {
    public constructor(private readonly configuration: StalwartMessageProviderConfiguration) {}

    /**
     * Sends one message through the bridge account belonging to its From domain.
     */
    public async send(message: OutboundEmail): Promise<really_any> {
        const senderAddress = parseEmailAddress(message.sender).fullEmail;
        const senderDomain = senderAddress.slice(senderAddress.lastIndexOf('@') + 1).toLowerCase();
        const provider = new SmtpMessageProvider({
            host: this.configuration.host,
            port: this.configuration.port,
            secure: this.configuration.isSecure,
            isTlsCertificateValidationEnabled: this.configuration.isTlsCertificateValidationEnabled,
            username: this.configuration.username || buildStalwartMailBridgeAddress(senderDomain),
            password: this.configuration.password,
        });

        return provider.send(message);
    }
}

/**
 * Submission port of a freshly bootstrapped Stalwart instance.
 *
 * Stalwart opens `smtp` on 25 and `submissions` on 465 (implicit TLS); it has **no** listener on the
 * STARTTLS submission port 587, so mail submitted there is refused.
 */
const STALWART_DEFAULT_SUBMISSION_PORT = 465;

/**
 * Builds the bundled Stalwart provider when its SMTP credential is configured.
 */
export function createStalwartMessageProviderFromEnvironment(): StalwartMessageProvider | null {
    const password = process.env.PTBK_STALWART_SMTP_PASSWORD;
    if (!password) {
        return null;
    }

    // Note: Port 465 speaks implicit TLS, so an unset `PTBK_STALWART_SMTP_SECURE` must default to `true`
    const configuredSecureValue = process.env.PTBK_STALWART_SMTP_SECURE?.trim();

    return new StalwartMessageProvider({
        host: process.env.PTBK_STALWART_SMTP_HOST || '127.0.0.1',
        port: Number(process.env.PTBK_STALWART_SMTP_PORT || STALWART_DEFAULT_SUBMISSION_PORT),
        isSecure: configuredSecureValue ? configuredSecureValue === 'true' : true,
        isTlsCertificateValidationEnabled:
            process.env.PTBK_STALWART_SMTP_TLS_REJECT_UNAUTHORIZED === 'true',
        username: process.env.PTBK_STALWART_SMTP_USERNAME?.trim() || null,
        password,
    });
}
