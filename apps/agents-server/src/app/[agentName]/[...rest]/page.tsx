import { redirect } from 'next/navigation';

export default async function RedirectPage({ params }: { params: Promise<{ agentName: string; rest: string[] }> }) {
    const { agentName, rest } = await params;
    redirect(`/agents/${agentName}/${rest.join('/')}`);
}
