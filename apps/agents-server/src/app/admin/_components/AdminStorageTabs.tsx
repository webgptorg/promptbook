import { AdminRouteTabs, type AdminRouteTabItem } from './AdminRouteTabs';

/**
 * Supported storage pages shown to super-admins.
 *
 * @private storage admin UI type
 */
export type AdminStoragePage = 'internal-s3' | 'files';

/**
 * Route-backed storage navigation shared by `/admin/internal-s3` and `/admin/files`.
 *
 * @private storage admin UI constant
 */
const ADMIN_STORAGE_NAVIGATION_ITEMS: ReadonlyArray<AdminRouteTabItem<AdminStoragePage>> = [
    {
        id: 'internal-s3',
        href: '/admin/internal-s3',
        label: 'Internal S3',
        description: 'VPS-wide bundled object storage visible only to the superadmin.',
    },
    {
        id: 'files',
        href: '/admin/files',
        label: 'Server files',
        description: 'Uploaded files tracked for the currently selected server.',
    },
];

/**
 * Props accepted by `AdminStorageTabs`.
 *
 * @private storage admin UI type
 */
type AdminStorageTabsProps = {
    /**
     * Currently active storage page.
     */
    readonly activePage: AdminStoragePage;
};

/**
 * Shared tabs interlinking global internal S3 storage and current-server files.
 *
 * @private storage admin UI component
 */
export function AdminStorageTabs({ activePage }: AdminStorageTabsProps) {
    return <AdminRouteTabs activeTabId={activePage} items={ADMIN_STORAGE_NAVIGATION_ITEMS} />;
}
