import { NextResponse } from 'next/server';
import { spaceTrim } from 'spacetrim';
import { NotFoundError } from '../../../../../../../../src/errors/NotFoundError';
import { applyCloudflareDnsRecordInstructions } from '../../../../../utils/cloudflare/applyCloudflareDnsRecordInstructions';
import type { DnsRecordInstruction, DnsRecordSelection } from '../../../../../utils/dnsRecords/DnsRecordInstruction';
import { resolveDnsRecordBatchPlan } from '../../../../../utils/dnsRecords/resolveDnsRecordBatchPlan';
import { isUserAdmin } from '../../../../../utils/isUserAdmin';
import { isUserGlobalAdmin } from '../../../../../utils/isUserGlobalAdmin';

/**
 * Payload sent by the Cloudflare DNS wizard.
 */
type CloudflareDnsWizardRequestBody = {
    /**
     * Cloudflare API token pasted by the administrator, empty when the VPS token should be used.
     */
    readonly apiToken?: string;

    /**
     * Domain whose DNS records are configured.
     */
    readonly domain?: string;

    /**
     * Whether all shown records or one shown alternative has to be configured.
     */
    readonly recordSelection?: DnsRecordSelection;

    /**
     * DNS records shown in the DNS manual.
     */
    readonly records?: ReadonlyArray<DnsRecordInstruction>;
};

/**
 * Writes the DNS records of one manual into Cloudflare in one batch.
 *
 * @param request - Cloudflare DNS wizard request.
 * @returns Result of every imported record.
 */
export async function POST(request: Request) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = ((await request.json().catch(() => null)) || {}) as CloudflareDnsWizardRequestBody;
    const domain = (body.domain || '').trim();
    const records = body.records || [];

    if (!domain || records.length === 0) {
        return NextResponse.json(
            {
                error: spaceTrim(`
                    Both \`domain\` and \`records\` are required to import DNS records into Cloudflare.
                `),
            },
            { status: 400 },
        );
    }

    // Note: `CLOUDFLARE_API_TOKEN` belongs to the whole VPS, so only a super admin may write DNS records with it.
    //       Every other administrator has to provide their own token.
    const configuredApiToken = (await isUserGlobalAdmin()) ? process.env.CLOUDFLARE_API_TOKEN || '' : '';
    const apiToken = ((body.apiToken || '').trim() || configuredApiToken).trim();

    if (!apiToken) {
        return NextResponse.json(
            {
                error: spaceTrim(`
                    A Cloudflare API token is required.

                    Create a token with the **Edit zone DNS** template in Cloudflare and paste it above. Only a super
                    admin can import with the \`CLOUDFLARE_API_TOKEN\` configured on this VPS.
                `),
            },
            { status: 400 },
        );
    }

    // Note: The batch plan is resolved again on the server, so that placeholder values and record alternatives can
    //       never be written into Cloudflare even when the browser sends them.
    const { applicableRecords } = resolveDnsRecordBatchPlan({
        records,
        recordSelection: body.recordSelection === 'one' ? 'one' : 'all',
    });

    if (applicableRecords.length === 0) {
        return NextResponse.json(
            {
                error: spaceTrim(`
                    None of the records for \`${domain}\` can be imported automatically.

                    Add them manually or fill in their placeholder values first.
                `),
            },
            { status: 400 },
        );
    }

    try {
        const application = await applyCloudflareDnsRecordInstructions({
            apiToken,
            domain,
            records: applicableRecords,
        });

        return NextResponse.json(application);
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to import the DNS records into Cloudflare.',
            },
            { status: error instanceof NotFoundError ? 404 : 502 },
        );
    }
}
