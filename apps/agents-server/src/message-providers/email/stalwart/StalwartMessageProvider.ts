import type { really_any } from '@promptbook-local/types';
import { getEmailAddressDomain } from '../../../utils/email/agentEmailAddress';
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
 * Loopback host used by the bundled Stalwart installation.
 */
const STALWART_DEFAULT_SMTP_HOST = '127.0.0.1';

/**
 * Submission port of a freshly bootstrapped Stalwart instance.
 *
 * Stalwart opens `smtp` on 25 and `submissions` on 465 (implicit TLS); it has **no** listener on the
 * STARTTLS submission port 587, so mail submitted there is refused.
 */
const STALWART_DEFAULT_SUBMISSION_PORT = 465;

/**
 * Submission port written by older Agents Server installers for the bundled local Stalwart service.
 */
const STALWART_LEGACY_LOCAL_SUBMISSION_PORT = 587;

/**
 * Hostnames which address the bundled Stalwart service on the same VPS.
 */
const STALWART_LOCAL_SMTP_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

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
        const senderDomain = getEmailAddressDomain(senderAddress);
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
 * Resolves Stalwart SMTP settings while repairing the legacy local `587` configuration.
 *
 * Existing standalone VPS installations can retain explicit `587` / non-secure values in the
 * running process even after the installer defaults change. Only the known local Stalwart endpoint
 * is migrated; explicitly configured remote SMTP servers keep their supplied port and TLS mode.
 */
export function resolveStalwartMessageProviderConfiguration(
    environment: NodeJS.ProcessEnv,
): StalwartMessageProviderConfiguration | null {
    const password = environment.PTBK_STALWART_SMTP_PASSWORD;
    if (!password) {
        return null;
    }

    const host = environment.PTBK_STALWART_SMTP_HOST?.trim() || STALWART_DEFAULT_SMTP_HOST;
    const configuredPort = Number(environment.PTBK_STALWART_SMTP_PORT || STALWART_DEFAULT_SUBMISSION_PORT);
    const configuredSecureValue = environment.PTBK_STALWART_SMTP_SECURE?.trim();
    const isLegacyLocalSubmissionConfiguration =
        STALWART_LOCAL_SMTP_HOSTS.has(host.toLowerCase()) && configuredPort === STALWART_LEGACY_LOCAL_SUBMISSION_PORT;

    return {
        host,
        port: isLegacyLocalSubmissionConfiguration ? STALWART_DEFAULT_SUBMISSION_PORT : configuredPort,
        isSecure: isLegacyLocalSubmissionConfiguration
            ? true
            : configuredSecureValue
            ? configuredSecureValue === 'true'
            : true,
        isTlsCertificateValidationEnabled: environment.PTBK_STALWART_SMTP_TLS_REJECT_UNAUTHORIZED === 'true',
        username: environment.PTBK_STALWART_SMTP_USERNAME?.trim() || null,
        password,
    };
}

/**
 * Builds the bundled Stalwart provider when its SMTP credential is configured.
 */
export function createStalwartMessageProviderFromEnvironment(): StalwartMessageProvider | null {
    const configuration = resolveStalwartMessageProviderConfiguration(process.env);
    if (!configuration) {
        return null;
    }

    return new StalwartMessageProvider(configuration);
}
