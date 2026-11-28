import * as dotenv from 'dotenv';
import {
    createCloudflareDnsRecordSyncPlan,
    resolveDesiredCloudflareDnsRecord,
} from './createCloudflareDnsRecordSyncPlan';
import { createVercelDomainSyncPlan, resolveDesiredProjectDomain } from './createVercelDomainSyncPlan';
import { logSyncEvent } from './logSyncEvent';
import { syncVercelDomainsMain } from './syncVercelDomainsMain';

dotenv.config();

export {
    createCloudflareDnsRecordSyncPlan,
    createVercelDomainSyncPlan,
    resolveDesiredCloudflareDnsRecord,
    resolveDesiredProjectDomain,
};

if (process.env.PROMPTBOOK_RUN_SYNC_VERCEL_DOMAINS_MAIN !== 'false') {
    syncVercelDomainsMain().catch((error) => {
        logSyncEvent('error', 'sync_failed', {
            message: error instanceof Error ? error.message : String(error),
        });
        process.exit(1);
    });
}
