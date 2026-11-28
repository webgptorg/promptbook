'use client';

import Link from 'next/link';
import { Card } from '../../../../components/Homepage/Card';
import { useServerLanguage } from '../../../../components/ServerLanguage/ServerLanguageProvider';
import { useUserActivity } from '../../../../components/UsersList/useUserActivity';
import { formatServerLanguageHumanReadableDate } from '../../../../utils/localization/formatServerLanguageHumanReadableDate';
import { resolveChatHistoryMessageRole, resolveChatHistoryMessageText } from '../../../../utils/chatHistoryMessage';

/**
 * Props for the user activity table.
 *
 * @private component of <UserDetailClient/>
 */
type UserActivityTableProps = {
    readonly userId: number;
    readonly username: string;
};

/**
 * Builds the link from one activity row to the corresponding chat-history view.
 *
 * @private helper of <UserActivityTable/>
 */
function buildChatHistoryRowHref(userId: number, row: { agentName: string; chatId: string | null }): string {
    const searchParams = new URLSearchParams({ userId: String(userId), agentName: row.agentName });

    if (row.chatId) {
        searchParams.set('chatId', row.chatId);
        searchParams.set('view', 'chat');
    }

    return `/admin/chat-history?${searchParams.toString()}`;
}

/**
 * Renders recent chat activity for one user and links it to the full admin views.
 *
 * @private component of <UserDetailClient/>
 */
export function UserActivityTable({ userId, username }: UserActivityTableProps) {
    const { language, t } = useServerLanguage();
    const { error, isLoading, items, total } = useUserActivity(userId);
    const allChatHistoryHref = `/admin/chat-history?userId=${encodeURIComponent(String(userId))}`;
    const taskManagerHref = `/admin/task-manager?search=${encodeURIComponent(username)}&view=all`;

    return (
        <Card className="hover:border-gray-200 hover:shadow-md">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('users.activityTitle')}</h3>
                    <p className="mt-1 text-sm text-gray-500">{t('users.activityDescription')}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                    <Link href={allChatHistoryHref} className="font-medium text-blue-600 hover:text-blue-800">
                        {t('users.viewChatHistory')}
                    </Link>
                    <Link href={taskManagerHref} className="font-medium text-blue-600 hover:text-blue-800">
                        {t('users.viewTasks')}
                    </Link>
                </div>
            </div>

            <div className="mt-5 overflow-x-auto">
                {error ? <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
                {isLoading ? (
                    <div className="py-8 text-center text-sm text-gray-500">{t('users.activityLoading')}</div>
                ) : items.length === 0 ? (
                    <div className="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                        {t('users.noActivity')}
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-left font-medium text-gray-500">
                                    {t('users.activityTime')}
                                </th>
                                <th className="px-3 py-2 text-left font-medium text-gray-500">
                                    {t('users.activityAgent')}
                                </th>
                                <th className="px-3 py-2 text-left font-medium text-gray-500">
                                    {t('users.activityRole')}
                                </th>
                                <th className="px-3 py-2 text-left font-medium text-gray-500">
                                    {t('users.activityMessage')}
                                </th>
                                <th className="px-3 py-2 text-right font-medium text-gray-500">
                                    {t('users.activityAction')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {items.map((row) => (
                                <tr key={row.id} className="align-top hover:bg-gray-50">
                                    <td className="whitespace-nowrap px-3 py-3 text-gray-600">
                                        {formatServerLanguageHumanReadableDate(row.createdAt, language, {
                                            fallbackLabel: '-',
                                        })}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 font-medium text-gray-800">
                                        {row.agentName}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-gray-600">
                                        {resolveChatHistoryMessageRole(row.message)}
                                    </td>
                                    <td className="max-w-md px-3 py-3 text-gray-700">
                                        <div className="max-h-16 overflow-y-auto text-xs leading-snug">
                                            {resolveChatHistoryMessageText(row.message) || '-'}
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-right">
                                        <Link
                                            href={buildChatHistoryRowHref(userId, row)}
                                            className="font-medium text-blue-600 hover:text-blue-800"
                                        >
                                            {t('users.openActivity')}
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {total > items.length ? (
                <p className="mt-3 text-xs text-gray-500">
                    {t('users.activityShowing', { count: items.length, total })}
                </p>
            ) : null}
        </Card>
    );
}
