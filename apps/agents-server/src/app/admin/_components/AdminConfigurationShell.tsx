import type { ReactNode } from 'react';
import { AdminRouteTabs, type AdminRouteTabItem } from './AdminRouteTabs';

/**
 * Supported admin configuration pages shown in the shared sub-navigation.
 *
 * @private admin configuration UI helper
 */
type AdminConfigurationPage = 'environment' | 'metadata' | 'limits';

/**
 * One shared navigation item rendered in the configuration shell.
 *
 * @private admin configuration UI helper
 */
const ADMIN_CONFIGURATION_NAVIGATION_ITEMS: ReadonlyArray<AdminRouteTabItem<AdminConfigurationPage>> = [
    {
        id: 'environment',
        href: '/admin/environment',
        label: 'Environment variables',
        description: 'VPS-wide .env values with secrets masked in the browser.',
    },
    {
        id: 'metadata',
        href: '/admin/metadata',
        label: 'Metadata',
        description: 'Domain-specific feature flags, text settings, and compatibility keys.',
    },
    {
        id: 'limits',
        href: '/admin/limits',
        label: 'Limits',
        description: 'Operational quotas, retry windows, upload caps, and rate limits.',
    },
];

/**
 * Props accepted by the shared admin configuration shell.
 *
 * @private admin configuration UI helper
 */
type AdminConfigurationShellProps = {
    readonly activePage: AdminConfigurationPage;
    readonly children: ReactNode;
};

/**
 * Shared page shell used by the Environment variables, Metadata, and Limits admin pages.
 */
export function AdminConfigurationShell({ activePage, children }: AdminConfigurationShellProps) {
    return (
        <div className="w-full max-w-screen-xl mx-auto px-2 py-8 sm:px-4 md:px-8">
            <div className="mt-20 mb-8 space-y-3">
                <div>
                    <h1 className="text-3xl font-light text-gray-900">Server configuration</h1>
                    <p className="mt-1 max-w-3xl text-sm text-gray-500">
                        Manage VPS-wide environment variables, domain-specific metadata, and dedicated operational
                        limits from one configuration area.
                    </p>
                </div>
                <AdminRouteTabs activeTabId={activePage} items={ADMIN_CONFIGURATION_NAVIGATION_ITEMS} />
            </div>

            {children}
        </div>
    );
}
