import { forTime } from 'waitasecond';
import { UnexpectedError } from '../../../../../src/errors/UnexpectedError';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import type { StalwartConfiguration } from './StalwartConfiguration';
import { callStalwartJmapAllowingBootstrapMode } from './stalwartJmapClient';
import { buildStalwartMailServerHostname } from './stalwartMailBridge';

/**
 * Whether the initial setup of the bundled Stalwart instance is still pending or already finished.
 */
export type StalwartBootstrapState = 'pending' | 'done';

/**
 * Identifier of the single Stalwart bootstrap object.
 */
const STALWART_BOOTSTRAP_SINGLETON_ID = 'singleton';

/**
 * Management method used to ask Stalwart whether it left bootstrap mode.
 *
 * Until the bootstrap is finished, Stalwart answers every method except `x:Bootstrap/*` with
 * `{"type":"forbidden","description":"The server is in bootstrap mode. ..."}`, so an accepted answer is
 * the only reliable proof that the setup is complete. The state must **not** be derived from
 * `/etc/stalwart/config.json`, because that file is only the storage descriptor and says nothing about
 * the settings which Stalwart keeps in its data store.
 */
const STALWART_BOOTSTRAP_PROBE_METHOD_NAME = 'x:Domain/query';

/**
 * Number of times the bootstrap result is verified before it is reported as failed.
 */
const STALWART_BOOTSTRAP_VERIFICATION_ATTEMPT_COUNT = 15;

/**
 * Pause between two bootstrap verification attempts, which gives Stalwart time to apply its new
 * configuration and open its mail listeners.
 */
const STALWART_BOOTSTRAP_VERIFICATION_DELAY_MS = 1_000;

/**
 * Builds the initial setup which turns a freshly installed Stalwart into the mail server of one
 * Agents Server domain.
 *
 * This is the definition of the bootstrap contract for Agents Server: local storage, no ACME certificate
 * (nginx and certbot own every certificate on the VPS) and automatically generated DKIM keys for the
 * domain.
 *
 * Note: [📬] `install.sh` bootstraps a fresh VPS before Agents Server is built, so it cannot import this
 *       function and mirrors the very same value in `bootstrap_stalwart_mail_server`. Both places have to
 *       be changed together.
 */
export function buildStalwartBootstrapValue(domain: string): Readonly<Record<string, unknown>> {
    return {
        serverHostname: buildStalwartMailServerHostname(domain),
        defaultDomain: domain,
        requestTlsCertificate: false,
        generateDkimKeys: true,
    };
}

/**
 * Asks Stalwart itself whether its initial setup is still pending.
 */
export async function readStalwartBootstrapState(
    configuration: StalwartConfiguration,
): Promise<StalwartBootstrapState> {
    const { isBootstrapPending } = await callStalwartJmapAllowingBootstrapMode(
        configuration,
        STALWART_BOOTSTRAP_PROBE_METHOD_NAME,
        { filter: {}, limit: 1 },
    );

    return isBootstrapPending ? 'pending' : 'done';
}

/**
 * Finishes the initial Stalwart setup when it is still pending, so that a mail server which was left in
 * bootstrap mode recovers without any manual step on the VPS.
 *
 * @returns `true` when this call performed the bootstrap, `false` when it was already done.
 */
export async function ensureStalwartBootstrapCompleted(
    configuration: StalwartConfiguration,
    domain: string,
): Promise<boolean> {
    if ((await readStalwartBootstrapState(configuration)) === 'done') {
        return false;
    }

    console.info('[stalwart-email]', 'bootstrap_pending', { domain });
    await callStalwartJmapAllowingBootstrapMode(configuration, 'x:Bootstrap/set', {
        update: {
            [STALWART_BOOTSTRAP_SINGLETON_ID]: buildStalwartBootstrapValue(domain),
        },
    });

    // Note: Stalwart accepts the bootstrap immediately but leaves bootstrap mode only once it applied
    //       the new configuration, so the outcome is confirmed by asking the server again
    for (let attempt = 1; attempt <= STALWART_BOOTSTRAP_VERIFICATION_ATTEMPT_COUNT; attempt++) {
        if ((await readStalwartBootstrapState(configuration)) === 'done') {
            console.info('[stalwart-email]', 'bootstrap_completed', { domain, attempt });
            return true;
        }
        await forTime(STALWART_BOOTSTRAP_VERIFICATION_DELAY_MS);
    }

    throw new UnexpectedError(
        spaceTrim(`
            The bundled Stalwart mail server stayed in **bootstrap mode** after its initial setup for
            \`${domain}\` was submitted.

            Stalwart accepted \`x:Bootstrap/set\` but still refuses every management method, so it has
            not applied the new configuration. Restart the \`stalwart\` service on this VPS and
            synchronize the email server again.
        `),
    );
}
