import { isHeaderSystemActivityShownForHref, resolveHeaderSystemActivities } from './resolveHeaderSystemActivities';

describe('resolveHeaderSystemActivities', () => {
    it('shows the running self-update only to the super admin', () => {
        expect(
            isHeaderSystemActivityShownForHref(
                resolveHeaderSystemActivities({ isGlobalAdmin: false, isSelfUpdateRunning: true }),
                '/superadmin/update',
            ),
        ).toBe(false);
        expect(
            isHeaderSystemActivityShownForHref(
                resolveHeaderSystemActivities({ isGlobalAdmin: true, isSelfUpdateRunning: true }),
                '/superadmin/update',
            ),
        ).toBe(true);
    });

    it('shows no activity while no self-update is running', () => {
        const activities = resolveHeaderSystemActivities({ isGlobalAdmin: true });

        expect(activities.activities.every((activity) => !activity.isShown)).toBe(true);
        expect(isHeaderSystemActivityShownForHref(activities, '/superadmin/update')).toBe(false);
    });

    it('does not decorate unrelated System menu destinations', () => {
        const activities = resolveHeaderSystemActivities({ isGlobalAdmin: true, isSelfUpdateRunning: true });

        expect(isHeaderSystemActivityShownForHref(activities, '/superadmin/servers')).toBe(false);
        expect(isHeaderSystemActivityShownForHref(activities, '/superadmin/resource-monitor')).toBe(false);
    });
});
