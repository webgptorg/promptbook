import type { TODO_any } from '@promptbook-local/types';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { $provideServer } from '@/src/tools/$provideServer';

/**
 * Provides scoped Supabase query builder for `CalendarConnection`.
 *
 * @private function of calendarConnections
 */
export async function provideCalendarConnectionTable(): Promise<TODO_any> {
    const supabase = $provideSupabaseForServer() as TODO_any;
    const { tablePrefix } = await $provideServer();

    return supabase.from(`${tablePrefix}CalendarConnection`);
}
