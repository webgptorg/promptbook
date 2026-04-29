import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import {
    findBookTranspilerForExport,
    listBookTranspilersForExport,
    resolveTranspiledAgentCodeExport,
} from '../../../../../utils/transpilers/resolveTranspiledAgentCodeExport';

/**
 * Lists transpilers available on the export-as-transpiled-code page.
 */
export async function GET() {
    if (!(await getCurrentUser())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        return NextResponse.json({ transpilers: listBookTranspilersForExport() });
    } catch (error) {
        console.error('Error getting transpilers:', error);
        return NextResponse.json({ error: 'Failed to get transpilers' }, { status: 500 });
    }
}

/**
 * Generates transpiled code for the selected agent and transpiler.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ agentName: string }> }) {
    if (!(await getCurrentUser())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const agentName = decodeURIComponent((await context.params).agentName);

    try {
        const { transpilerName } = await request.json();

        if (!transpilerName) {
            return NextResponse.json({ error: 'Transpiler name is required' }, { status: 400 });
        }

        const transpiler = findBookTranspilerForExport(transpilerName);
        if (!transpiler) {
            return NextResponse.json({ error: 'Transpiler not found' }, { status: 404 });
        }

        const exportPayload = await resolveTranspiledAgentCodeExport({
            agentName,
            localServerUrl: request.nextUrl.origin,
            transpiler,
        });
        if (!exportPayload) {
            return NextResponse.json({ error: 'Agent source not found' }, { status: 404 });
        }

        return NextResponse.json({
            code: exportPayload.transpiledCode,
            transpiler: exportPayload.transpiler,
        });
    } catch (error) {
        console.error('Error transpiling code:', error);
        return NextResponse.json({ error: 'Failed to transpile code' }, { status: 500 });
    }
}
