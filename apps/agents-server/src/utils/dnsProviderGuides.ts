/**
 * One external DNS-provider help link shown with DNS setup guidance.
 *
 * @private shared by the Agents Server DNS instruction views
 */
export type DnsProviderGuide = {
    /**
     * Human-readable provider label.
     */
    readonly label: string;

    /**
     * Official provider help URL.
     */
    readonly href: string;
};

/**
 * Common DNS-provider help links shown with server and project DNS instructions.
 */
export const DNS_PROVIDER_GUIDES: ReadonlyArray<DnsProviderGuide> = [
    {
        label: 'Cloudflare DNS records',
        href: 'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/',
    },
    {
        label: 'GoDaddy DNS records',
        href: 'https://www.godaddy.com/help/manage-dns-records-680',
    },
    {
        label: 'Namecheap DNS records',
        href: 'https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-an-a-address-record-for-my-domain/',
    },
    {
        label: 'Squarespace DNS records',
        href: 'https://support.squarespace.com/hc/en-us/articles/360002101888-Adding-custom-DNS-records-to-your-Squarespace-managed-domain',
    },
];
