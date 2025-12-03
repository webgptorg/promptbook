import { getMetadata } from '../database/getMetadata';
import { getEffectiveFederatedServers } from './getEffectiveFederatedServers';

/**
 * Reads FEDERATED_SERVERS metadata and returns a normalized list of server URLs.
 */
export async function getFederatedServersFromMetadata(): Promise<string[]> {
    const federatedServersString = (await getMetadata('FEDERATED_SERVERS')) || '';
    return getEffectiveFederatedServers(federatedServersString);
}
