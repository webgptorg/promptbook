/**
 * System-menu hrefs that can display a running-activity indicator.
 *
 * @private type of Header
 */
type HeaderSystemActivityHref = '/superadmin/update';

/**
 * One resolved background activity together with the System-menu location it decorates.
 *
 * @private type of Header
 */
type HeaderSystemActivity = {
    /**
     * Fragment-free href of the System menu item to decorate.
     */
    readonly href: HeaderSystemActivityHref;

    /**
     * Whether the current viewer is permitted to see this activity.
     */
    readonly isShown: boolean;
};

/**
 * Inputs needed to decide which System activities the current viewer is allowed to see.
 *
 * @private type of Header
 */
export type ResolveHeaderSystemActivitiesOptions = {
    /**
     * Whether the current viewer is the environment-backed super-admin.
     */
    readonly isGlobalAdmin: boolean;

    /**
     * Whether a standalone VPS self-update is running right now.
     */
    readonly isSelfUpdateRunning?: boolean;
};

/**
 * Visibility of the currently running System activities.
 *
 * @private type of Header
 */
export type HeaderSystemActivities = {
    /**
     * Individual activities keyed by their System-menu destination.
     */
    readonly activities: ReadonlyArray<HeaderSystemActivity>;
};

/**
 * Resolves the complete running-activity registry for the current System menu.
 *
 * Mirrors the warning registry: each activity defines both its visibility policy and its menu
 * destination in one place, so operational progress never leaks to viewers who may not see the
 * matching administration page.
 *
 * @private function of Header
 */
export function resolveHeaderSystemActivities({
    isGlobalAdmin,
    isSelfUpdateRunning = false,
}: ResolveHeaderSystemActivitiesOptions): HeaderSystemActivities {
    return {
        activities: [
            {
                href: '/superadmin/update',
                isShown: Boolean(isGlobalAdmin && isSelfUpdateRunning),
            },
        ],
    };
}

/**
 * Checks whether a System menu href should display its running-activity indicator.
 *
 * @private function of Header
 */
export function isHeaderSystemActivityShownForHref(activities: HeaderSystemActivities, href: string): boolean {
    const hrefWithoutFragment = href.split('#', 1)[0];

    return activities.activities.some((activity) => activity.href === hrefWithoutFragment && activity.isShown);
}
