import { NextResponse } from 'next/server';
import { $provideAgentCollectionForServer } from '../../tools/$provideAgentCollectionForServer';

export async function GET() {
    const collection = await $provideAgentCollectionForServer();
    const agents = await collection.listAgents();
    return NextResponse.json(agents);
}
