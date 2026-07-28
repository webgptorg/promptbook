import { redirect } from 'next/navigation';

/**
 * Superadmin task-manager page showing durable background chat work across every server on the VPS.
 */
export default async function AdminVpsTaskManagerPage() {
    redirect('/superadmin/task-manager');
}
