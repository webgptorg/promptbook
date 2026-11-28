import {
    resolveUseEmailSmtpCredentialFromWallet,
    type ResolveUseEmailSmtpCredentialOptions,
} from './userWallet';

/**
 * Resolves SMTP credential payload for agent email from wallet records.
 */
export async function resolveUseEmailSmtpCredential(
    options: ResolveUseEmailSmtpCredentialOptions,
): Promise<string | undefined> {
    return resolveUseEmailSmtpCredentialFromWallet(options);
}
