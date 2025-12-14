import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideExecutionToolsForServer } from '@/src/tools/$provideExecutionToolsForServer';
import { $bookTranspilersRegister } from '../../../../../../../../src/transpilers/_common/register/$bookTranspilersRegister';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ agentName: string }> }) {
    const agentName = (await params).agentName;

    try {
        // Get available transpilers
        const transpilers = $bookTranspilersRegister.list().map(transpiler => ({
            name: transpiler.name,
            title: transpiler.title,
        }));

        return NextResponse.json({ transpilers });
    } catch (error) {
        console.error('Error getting transpilers:', error);
        return NextResponse.json({ error: 'Failed to get transpilers' }, { status: 500 });
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ agentName: string }> }) {
    const agentName = (await params).agentName;

    try {
        const { transpilerName } = await request.json();

        if (!transpilerName) {
            return NextResponse.json({ error: 'Transpiler name is required' }, { status: 400 });
        }

        // Get the transpiler
        const allTranspilers = $bookTranspilersRegister.list();
        const transpiler = allTranspilers.find(t => t.name === transpilerName);
        if (!transpiler) {
            return NextResponse.json({ error: 'Transpiler not found' }, { status: 404 });
        }

        // Get agent source
        const collection = await $provideAgentCollectionForServer();
        const agentSource = await collection.getAgentSource(agentName);

        if (!agentSource) {
            return NextResponse.json({ error: 'Agent source not found' }, { status: 404 });
        }

        // Get execution tools
        const tools = await $provideExecutionToolsForServer();

        // Transpile the code
        const transpiledCode = await transpiler.transpileBook(agentSource, tools);

        return NextResponse.json({
            code: transpiledCode,
            transpiler: {
                name: transpiler.name,
                title: transpiler.title,
            }
        });

    } catch (error) {
        console.error('Error transpiling code:', error);
        return NextResponse.json({ error: 'Failed to transpile code' }, { status: 500 });
    }
}
