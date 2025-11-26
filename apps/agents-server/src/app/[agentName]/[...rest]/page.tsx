import { notFound, redirect } from 'next/navigation';

export default async function RedirectPage({ params }: { params: Promise<{ agentName: string; rest: string[] }> }) {
    const { agentName, rest } = await params;

    if (agentName === 'agents' || agentName === 'api' || agentName.startsWith('.')) {
        notFound();
    }

    redirect(`/agents/${agentName}/${rest.join('/')}`);
}
