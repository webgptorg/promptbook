import { TriangleAlertIcon } from 'lucide-react';
import Link from 'next/link';

/**
 * Displays one concise administrator warning for a generated project domain with unresolved DNS.
 *
 * @private shared by Agent Projects administration views
 */
export function AgentProjectDnsWarning({ projectDomain }: { readonly projectDomain: string }) {
    return (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-amber-800">
            <TriangleAlertIcon className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <span>
                DNS is not ready for <code className="font-mono">{projectDomain}</code>.
            </span>
            <Link
                href="/superadmin/servers"
                className="font-semibold text-amber-800 underline decoration-amber-400 underline-offset-2 hover:text-amber-950"
            >
                Review DNS setup
            </Link>
        </div>
    );
}
