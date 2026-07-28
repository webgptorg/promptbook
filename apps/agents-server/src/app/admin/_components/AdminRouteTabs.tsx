import Link from 'next/link';

/**
 * One route-backed tab rendered in admin page sub-navigation.
 *
 * @private shared admin UI type
 */
export type AdminRouteTabItem<TTabId extends string = string> = {
    /**
     * Stable tab identifier.
     */
    readonly id: TTabId;

    /**
     * Route opened by the tab.
     */
    readonly href: string;

    /**
     * Main tab label.
     */
    readonly label: string;
};

/**
 * Props accepted by `AdminRouteTabs`.
 *
 * @private shared admin UI type
 */
type AdminRouteTabsProps<TTabId extends string> = {
    /**
     * Currently active tab id.
     */
    readonly activeTabId: TTabId;

    /**
     * Route-backed tabs to render.
     */
    readonly items: ReadonlyArray<AdminRouteTabItem<TTabId>>;
};

/**
 * Shared route-tab navigation used by admin pages that link sibling sections.
 *
 * @private shared admin UI component
 */
export function AdminRouteTabs<TTabId extends string>({ activeTabId, items }: AdminRouteTabsProps<TTabId>) {
    return (
        <nav aria-label="Admin page sections">
            <div className="flex flex-wrap items-center gap-1 border-b border-gray-200">
                {items.map((item) => {
                    const isActive = item.id === activeTabId;

                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            aria-current={isActive ? 'page' : undefined}
                            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                                isActive
                                    ? 'border-blue-600 text-blue-700'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            }`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
