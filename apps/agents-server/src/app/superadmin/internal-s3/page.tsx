import { redirect } from 'next/navigation';

/**
 * Forces legacy super-admin storage links to resolve on every request.
 */
export const dynamic = 'force-dynamic';

/**
 * Canonical internal S3 route.
 *
 * @private legacy route helper of `/superadmin/internal-s3`
 */
const INTERNAL_S3_ADMIN_ROUTE = '/admin/internal-s3';

/**
 * Props accepted by the legacy internal S3 route.
 *
 * @private route props of `/superadmin/internal-s3`
 */
type LegacyInternalS3PageProps = {
    /**
     * Query parameters forwarded to the canonical browser route.
     */
    readonly searchParams?: Promise<{
        readonly prefix?: string;
    }>;
};

/**
 * Redirects the previous internal S3 page to its canonical admin route.
 */
export default async function LegacyInternalS3Page({ searchParams }: LegacyInternalS3PageProps) {
    const resolvedSearchParams = await searchParams;

    redirect(buildLegacyInternalS3RedirectHref(resolvedSearchParams?.prefix));
}

/**
 * Builds the canonical redirect target for the legacy route.
 *
 * @param prefix - Optional browser prefix to preserve.
 * @returns Canonical internal S3 route href.
 * @private legacy route helper of `/superadmin/internal-s3`
 */
function buildLegacyInternalS3RedirectHref(prefix: string | undefined): string {
    if (!prefix) {
        return INTERNAL_S3_ADMIN_ROUTE;
    }

    const searchParams = new URLSearchParams();
    searchParams.set('prefix', prefix);
    return `${INTERNAL_S3_ADMIN_ROUTE}?${searchParams.toString()}`;
}
