import { resolveStalwartApiUrl } from './resolveStalwartApiUrl';

/**
 * Environment-backed connection settings for the bundled Stalwart instance.
 */
export type StalwartConfiguration = {
    readonly apiUrl: string;
    readonly authorization: string | null;
    readonly hookToken: string | null;
    readonly smtpPassword: string | null;
    readonly isConfigured: boolean;
};

/**
 * Reads Stalwart API and transport configuration without exposing secret values to UI callers.
 */
export function readStalwartConfiguration(): StalwartConfiguration {
    const apiToken = process.env.PTBK_STALWART_API_TOKEN?.trim();
    const apiUsername = process.env.PTBK_STALWART_API_USERNAME?.trim();
    const apiPassword = process.env.PTBK_STALWART_API_PASSWORD;
    const authorization = apiToken
        ? `Bearer ${apiToken}`
        : apiUsername && apiPassword
          ? `Basic ${Buffer.from(`${apiUsername}:${apiPassword}`).toString('base64')}`
          : null;
    const hookToken = process.env.PTBK_STALWART_MTA_HOOK_TOKEN?.trim() || null;
    const smtpPassword = process.env.PTBK_STALWART_SMTP_PASSWORD || null;

    return {
        apiUrl: resolveStalwartApiUrl(process.env.PTBK_STALWART_API_URL),
        authorization,
        hookToken,
        smtpPassword,
        isConfigured: Boolean(authorization && hookToken && smtpPassword),
    };
}
