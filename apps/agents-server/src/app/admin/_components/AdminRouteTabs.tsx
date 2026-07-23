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

    /**
     * Short description shown below the label.
     */
    readonly description: string;
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
        <div className={`grid gap-3 ${items.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            {items.map((item) => {
                const isActive = item.id === activeTabId;

                return (
                    <Link
                        key={item.id}
                        href={item.href}
                        className={`rounded-2xl border px-4 py-4 transition ${
                            isActive
                                ? 'border-blue-300 bg-blue-50 text-blue-900 shadow-sm'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow-sm'
                        }`}
                    >
                        <div className="text-sm font-semibold">{item.label}</div>
                        <div className={`mt-1 text-sm ${isActive ? 'text-blue-800' : 'text-slate-500'}`}>
                            {item.description}
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
