import { DNS_PROVIDER_GUIDES, type DnsProviderGuide } from '../../utils/dnsProviderGuides';

/**
 * Renders external DNS-provider help links shared by server and project DNS instructions.
 */
export function DnsProviderGuides({
    guides = DNS_PROVIDER_GUIDES,
    linkClassName,
}: {
    /**
     * Provider links to render. The common set is used by default.
     */
    readonly guides?: ReadonlyArray<DnsProviderGuide>;

    /**
     * Classes applied to every provider link.
     */
    readonly linkClassName: string;
}) {
    return (
        <div className="flex flex-wrap gap-3 text-xs">
            {guides.map((guide) => (
                <a
                    key={guide.href}
                    href={guide.href}
                    target="_blank"
                    rel="noreferrer"
                    className={linkClassName}
                >
                    {guide.label}
                </a>
            ))}
        </div>
    );
}
